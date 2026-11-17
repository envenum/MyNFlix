export const API_URL = import.meta.env.VITE_DRIVE_API_URL || ''

const SESSION_STORE = 'mynflix-session'
const lastKey = (user) => `mynflix-last-${user || 'guest'}`

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_STORE) || 'null')
    return s && s.user && s.pin ? s : null
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

export async function fetchLibrary(session, fresh = false) {
  const url = new URL(API_URL)
  if (session) {
    url.searchParams.set('user', session.user)
    url.searchParams.set('pin', session.pin)
  }
  if (fresh) url.searchParams.set('fresh', '1')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

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
