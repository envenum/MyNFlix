import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { GUEST_ID, colorFor, displayName } from '../lib/profiles'
import { fetchProfiles } from '../lib/drive'
import { useLibrary } from '../lib/LibraryContext'

export default function Login() {
  const { login, error } = useLibrary()
  const [profiles, setProfiles] = useState(null) // null = still loading
  const [loadError, setLoadError] = useState('')
  const [pick, setPick] = useState(null) // chosen username, waiting for PIN
  const [adminMode, setAdminMode] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [pin, setPin] = useState('')

  useEffect(() => {
    let alive = true
    fetchProfiles()
      .then((d) => {
        if (!alive) return
        if (Array.isArray(d.profiles)) setProfiles(d.profiles)
        else if (d.error === 'misconfigured')
          setLoadError('The server has no users yet. Add the USERS script property (see README).')
        else setLoadError('The Apps Script is out of date. Paste the latest Code.gs and deploy a new version.')
      })
      .catch(() => alive && setLoadError('Could not reach Drive.'))
    return () => {
      alive = false
    }
  }, [])

  const onPin = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 5)
    setPin(digits)
    if (digits.length === 5) {
      login(pick, digits)
      setPin('')
    }
  }

  const reset = () => {
    setPick(null)
    setAdminMode(false)
    setAdminName('')
    setPin('')
  }

  if (loadError) return <p className="notice">{loadError}</p>
  if (!profiles) return <p className="notice">Loading profiles…</p>

  if (pick)
    return (
      <main className="login">
        <span className="avatar big" style={{ background: colorFor(pick) }}>
          {displayName(pick).slice(0, 1)}
        </span>
        <h1 className="title">{displayName(pick)}</h1>
        <p className="muted">Enter your 5-digit PIN</p>
        {error && <p className="login-error">{error}</p>}
        <input
          className="input pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          value={pin}
          onChange={onPin}
          placeholder="• • • • •"
          aria-label="PIN"
          autoFocus
        />
        <button className="back" onClick={reset}>
          <ChevronLeft size={18} /> Switch profile
        </button>
      </main>
    )

  if (adminMode)
    return (
      <main className="login">
        <h1 className="title">Admin sign-in</h1>
        {error && <p className="login-error">{error}</p>}
        <form
          className="login"
          onSubmit={(e) => {
            e.preventDefault()
            if (adminName.trim()) setPick(adminName.trim().toLowerCase())
          }}
        >
          <input
            className="input"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Admin username"
            aria-label="Admin username"
            autoCapitalize="none"
            autoFocus
          />
          <button className="btn" type="submit">
            Continue
          </button>
        </form>
        <button className="back" onClick={reset}>
          <ChevronLeft size={18} /> Back
        </button>
      </main>
    )

  return (
    <main className="login">
      <h1 className="title">Who’s watching?</h1>
      {error && <p className="login-error">{error}</p>}
      <div className="profiles">
        {profiles.map((p) => (
          <button
            key={p.id}
            className="profile"
            onClick={() => (p.id === GUEST_ID ? login(GUEST_ID) : setPick(p.id))}
          >
            <span className="avatar" style={{ background: colorFor(p.id) }}>
              {displayName(p.id).slice(0, 1)}
            </span>
            <span>{displayName(p.id)}</span>
          </button>
        ))}
      </div>
      <button className="back" onClick={() => setAdminMode(true)}>
        Admin sign-in
      </button>
    </main>
  )
}
