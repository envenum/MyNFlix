import { useCallback, useEffect, useMemo, useState } from 'react'
import { LibraryContext } from '../lib/LibraryContext'
import { API_URL, clearSession, fetchLibrary, getSession, setSession } from '../lib/drive'

const POLL_MS = 60_000 // re-check the Drive folder every minute

const ERRORS = {
  unauthorized: 'Wrong PIN. Try again.',
  locked: 'Too many wrong tries. Wait 15 minutes and try again.',
  misconfigured: 'The server has no users set up yet (see README).',
  forbidden: 'That account is not allowed to do this.',
}

const SIGNED_OUT = { shows: [], updated: null, user: null, role: null, status: 'login', error: '' }

function initialState() {
  const session = getSession()
  return {
    shows: [],
    updated: null,
    user: session ? session.user : null,
    role: null,
    error: '',
    status: !API_URL ? 'unconfigured' : session ? 'loading' : 'login',
  }
}

export default function LibraryProvider({ children }) {
  const [state, setState] = useState(initialState)

  const load = useCallback(async (fresh = false) => {
    const session = getSession()
    if (!API_URL || !session) return
    try {
      const data = await fetchLibrary(session, fresh)
      if (data.error) {
        clearSession()
        setState({ ...SIGNED_OUT, error: ERRORS[data.error] || 'Could not sign in.' })
        return
      }
      setState({
        shows: data.shows || [],
        updated: data.updated,
        user: session.user,
        role: data.role || 'user',
        status: 'ready',
        error: '',
      })
    } catch {
      setState((s) => (s.status === 'ready' ? s : { ...s, status: 'error' }))
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => load(), POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const value = useMemo(
    () => ({
      ...state,
      reload: () => load(true),
      login: (user, pin = '') => {
        setSession({ user, pin })
        setState({ ...SIGNED_OUT, user, status: 'loading' })
        load(true)
      },
      logout: () => {
        clearSession()
        setState(SIGNED_OUT)
      },
    }),
    [state, load],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
