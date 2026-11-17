import { useCallback, useEffect, useMemo, useState } from 'react'
import { LibraryContext } from '../lib/LibraryContext'
import { API_URL, fetchLibrary, setKey } from '../lib/drive'

const POLL_MS = 60_000 // re-check the Drive folder every minute

export default function LibraryProvider({ children }) {
  const [state, setState] = useState({
    shows: [],
    status: API_URL ? 'loading' : 'unconfigured',
    updated: null,
  })

  const load = useCallback(async (fresh = false) => {
    if (!API_URL) return
    try {
      const data = await fetchLibrary(fresh)
      if (data.error === 'unauthorized') {
        setState((s) => ({ ...s, status: 'locked' }))
        return
      }
      setState({ shows: data.shows || [], status: 'ready', updated: data.updated })
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
      unlock: (key) => {
        setKey(key)
        setState((s) => ({ ...s, status: 'loading' }))
        load(true)
      },
    }),
    [state, load],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
