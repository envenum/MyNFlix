export const API_URL = import.meta.env.VITE_DRIVE_API_URL || ''

const KEY_STORE = 'mynflix-key'
const LAST_STORE = 'mynflix-last'

export function getKey() {
  try {
    return localStorage.getItem(KEY_STORE) || ''
  } catch {
    return '' // storage unavailable
  }
}

export function setKey(value) {
  try {
    localStorage.setItem(KEY_STORE, value)
  } catch {
    // storage unavailable
  }
}

export function getLast() {
  try {
    return JSON.parse(localStorage.getItem(LAST_STORE) || 'null')
  } catch {
    return null
  }
}

export function setLast(entry) {
  try {
    localStorage.setItem(LAST_STORE, JSON.stringify(entry))
  } catch {
    // storage unavailable
  }
}

export async function fetchLibrary(fresh = false) {
  const url = new URL(API_URL)
  const key = getKey()
  if (key) url.searchParams.set('key', key)
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
