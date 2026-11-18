// Optional streaming relay (Cloudflare Worker, see worker/index.js). When VITE_STREAM_URL is empty
// the site keeps using Drive's embedded player.
export const STREAM_URL = (import.meta.env.VITE_STREAM_URL || '').replace(/\/+$/, '')

let cached = null

export async function getStreamToken(session) {
  if (!STREAM_URL || !session) throw new Error('streaming not configured')
  if (cached && cached.user === session.user && cached.expires > Date.now() + 60_000) return cached.token

  const res = await fetch(`${STREAM_URL}/token`, {
    method: 'POST',
    // text/plain keeps this a "simple" request, so the browser skips the CORS preflight
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ user: session.user, pin: session.pin }),
  })
  if (!res.ok) throw new Error(`token HTTP ${res.status}`)
  const data = await res.json()
  if (!data.token) throw new Error('no token')
  cached = { user: session.user, token: data.token, expires: data.expires }
  return data.token
}

export const streamSrc = (fileId, token) =>
  `${STREAM_URL}/stream/${fileId}?t=${encodeURIComponent(token)}`
