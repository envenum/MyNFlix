export const API_URL = import.meta.env.VITE_DRIVE_API_URL || ''

const SESSION_STORE = 'mynflix-session'
const lastKey = (user) => `mynflix-last-${user || 'guest'}`

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_STORE) || 'null')
    return s && s.user ? s : null
  } catch {
    return null
  }
}

export function setSession(session) {
  try {
    localStorage.setItem(SESSION_STORE, JSON.stringify(session))
  } catch {
    // storage unavailable
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORE)
  } catch {
    // storage unavailable
  }
}

export function getLast(user) {
  try {
    return JSON.parse(localStorage.getItem(lastKey(user)) || 'null')
  } catch {
    return null
  }
}

export function setLast(user, entry) {
  try {
    localStorage.setItem(lastKey(user), JSON.stringify(entry))
  } catch {
    // storage unavailable
  }
}

async function request(params) {
  const url = new URL(API_URL)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const fetchProfiles = () => request({ action: 'profiles' })

export const fetchLibrary = (session, fresh = false) =>
  request({ user: session.user, pin: session.pin, fresh: fresh ? '1' : '' })

export const adminCall = (session, action, extra = {}) =>
  request({ action, user: session.user, pin: session.pin, ...extra })

export const previewUrl = (id) => `https://drive.google.com/file/d/${id}/preview`
export const openUrl = (id) => `https://drive.google.com/file/d/${id}/view`
export const thumbUrl = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w480`

export function cleanName(name) {
  return name
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sortEpisodes(episodes) {
  return [...episodes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

// .ts / .mkv / .avi etc. are not reliably playable by Drive's web player
export const PLAYABLE = ['mp4', 'm4v', 'mov', 'webm']
export const isPlayable = (ext) => PLAYABLE.includes((ext || '').toLowerCase())
