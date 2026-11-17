// Profile names only. PINs are checked by the Apps Script server and never stored here.
export const PROFILES = [
  { id: 'radiation', name: 'Radiation', color: '#e50914' },
  { id: 'peterpal', name: 'Peterpal', color: '#2d7ff9' },
  { id: 'robotics', name: 'Robotics', color: '#22b07d' },
  { id: 'melodie', name: 'Melodie', color: '#b455e8' },
]

export const findProfile = (id) => PROFILES.find((p) => p.id === id)
