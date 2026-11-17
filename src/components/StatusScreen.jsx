import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'

// Shown instead of the library when it is not ready yet.
export default function StatusScreen() {
  const { status, unlock, reload } = useLibrary()
  const [pw, setPw] = useState('')

  if (status === 'loading') return <p className="notice">Loading your library…</p>

  if (status === 'unconfigured')
    return (
      <div className="notice">
        <h2>Connect Google Drive</h2>
        <p>
          Set <code>VITE_DRIVE_API_URL</code> to your Apps Script web app URL. Steps are in the
          README under “Connect Google Drive”.
        </p>
      </div>
    )

  if (status === 'locked')
    return (
      <form
        className="notice"
        onSubmit={(e) => {
          e.preventDefault()
          unlock(pw)
        }}
      >
        <Lock size={28} />
        <h2>Enter password</h2>
        <input
          className="input"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        <button className="btn" type="submit">
          Unlock
        </button>
      </form>
    )

  return (
    <div className="notice">
      <h2>Couldn’t reach Drive</h2>
      <p>Check that the Apps Script web app is deployed with access set to “Anyone”.</p>
      <button className="btn" onClick={reload}>
        Try again
      </button>
    </div>
  )
}
