/**
 * MyNFlix stream relay (Cloudflare Worker)
 *
 * Streams a Google Drive video to the site's own player so viewers never see a Drive link.
 *
 *   POST /token          body: {"user":"…","pin":"…"}  ->  {"token":"…","expires":<ms>}
 *   GET  /stream/<id>?t=<token>                        ->  the video (supports Range / seeking)
 *
 * Settings (Worker > Settings > Variables and Secrets):
 *   ALLOWED_ORIGIN   text    your site origin, e.g. https://envenum.github.io  (comma-separate for more)
 *   APPS_SCRIPT_URL  text    your Apps Script /exec URL (used to check the PIN)
 *   DRIVE_API_KEY    secret  Google Cloud API key with the Drive API enabled
 *   TOKEN_SECRET     secret  any long random string (signs the short-lived tokens)
 */

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000
const ID_RE = /^[A-Za-z0-9_-]{10,80}$/
const enc = new TextEncoder()

function b64u(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sign(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function makeToken(env, user) {
  const exp = Date.now() + TOKEN_TTL_MS
  const body = `${exp}.${user}`
  return { token: `${body}.${await sign(env.TOKEN_SECRET, body)}`, expires: exp }
}

async function verifyToken(env, token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return false
  const [exp, user, sig] = parts
  if (!(Number(exp) > Date.now())) return false
  return safeEqual(sig, await sign(env.TOKEN_SECRET, `${exp}.${user}`))
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function corsHeaders(env, req) {
  const origin = req.headers.get('Origin')
  const h = { Vary: 'Origin' }
  if (origin && allowedOrigins(env).includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin
    h['Access-Control-Allow-Methods'] = 'GET, HEAD, POST, OPTIONS'
    h['Access-Control-Allow-Headers'] = 'Content-Type, Range'
    h['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
  }
  return h
}

function json(env, req, obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(env, req) },
  })
}

async function handleToken(req, env) {
  const origin = req.headers.get('Origin')
  if (origin && !allowedOrigins(env).includes(origin)) return json(env, req, { error: 'origin' }, 403)

  let body
  try {
    body = JSON.parse(await req.text())
  } catch {
    return json(env, req, { error: 'bad_request' }, 400)
  }
  const user = String(body.user || '').toLowerCase().trim()
  const pin = String(body.pin || '').trim()
  if (!/^[a-z0-9_]{2,20}$/.test(user) || !/^\d{5}$/.test(pin)) return json(env, req, { error: 'unauthorized' }, 401)

  const check = new URL(env.APPS_SCRIPT_URL)
  check.searchParams.set('action', 'check')
  check.searchParams.set('user', user)
  check.searchParams.set('pin', pin)

  let result
  try {
    const res = await fetch(check.toString(), { redirect: 'follow' })
    result = await res.json()
  } catch {
    return json(env, req, { error: 'upstream' }, 502)
  }
  // guests (and anything that is not a signed-in user/admin) never get a token
  if (!result || (result.role !== 'user' && result.role !== 'admin')) {
    return json(env, req, { error: result && result.error ? result.error : 'unauthorized' }, 401)
  }
  return json(env, req, await makeToken(env, user))
}

async function handleStream(req, env, id, url) {
  if (!ID_RE.test(id)) return new Response('Bad id', { status: 400 })
  if (!(await verifyToken(env, url.searchParams.get('t')))) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders(env, req) })
  }

  const drive = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(env.DRIVE_API_KEY)}`
  const headers = new Headers()
  const range = req.headers.get('Range')
  if (range) headers.set('Range', range)

  const upstream = await fetch(drive, { method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers })
  if (!upstream.ok && upstream.status !== 206) {
    // 403 is usually Drive's download quota or a file that is not shared; never echo upstream bodies
    const status = upstream.status === 404 ? 404 : upstream.status === 403 ? 403 : 502
    return new Response(`Video unavailable (${upstream.status})`, { status, headers: corsHeaders(env, req) })
  }

  const out = new Headers(corsHeaders(env, req))
  for (const name of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const v = upstream.headers.get(name)
    if (v) out.set(name, v)
  }
  out.set('Accept-Ranges', 'bytes')
  let type = upstream.headers.get('content-type') || ''
  if (!type.startsWith('video/')) type = 'video/mp4'
  out.set('Content-Type', type)
  out.set('Cache-Control', 'private, max-age=3600')
  out.set('X-Content-Type-Options', 'nosniff')

  return new Response(req.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: out })
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env, req) })

    if (url.pathname === '/token' && req.method === 'POST') return handleToken(req, env)

    const m = url.pathname.match(/^\/stream\/([^/]+)$/)
    if (m && (req.method === 'GET' || req.method === 'HEAD')) return handleStream(req, env, m[1], url)

    return new Response('MyNFlix stream relay', { status: 404 })
  },
}
