import { useLibrary } from '../lib/LibraryContext'
import Login from './Login'

// Shown instead of the library when it is not ready yet.
export default function StatusScreen() {
  const { status, reload } = useLibrary()

  if (status === 'login') return <Login />

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
