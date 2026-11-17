// Profiles come from the server (Apps Script). Only helpers live here: no usernames or PINs.
export const GUEST_ID = 'guest'

const COLORS = ['#e50914', '#2d7ff9', '#22b07d', '#b455e8', '#f59e0b', '#06b6d4']

export function colorFor(id) {
  if (id === GUEST_ID) return '#52525b'
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

export const displayName = (id) => (id ? id.charAt(0).toUpperCase() + id.slice(1) : '')
