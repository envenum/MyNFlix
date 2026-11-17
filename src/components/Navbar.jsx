import { Link } from 'react-router-dom'
import { LogOut, RefreshCw } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'
import { findProfile } from '../lib/profiles'

export default function Navbar() {
  const { reload, logout, status, user } = useLibrary()
  const profile = findProfile(user)
  const signedIn = status === 'ready' || status === 'loading'

  return (
    <header className="nav">
      <Link to="/" className="logo">
        MY<span>N</span>FLIX
      </Link>
      <div className="nav-right">
        {signedIn && profile && (
          <span className="nav-user">
            <span className="avatar small" style={{ background: profile.color }}>
              {profile.name.slice(0, 1)}
            </span>
            {profile.name}
          </span>
        )}
        <button
          className="icon-btn"
          onClick={reload}
          title="Check Drive for new videos"
          aria-label="Refresh library"
          disabled={!signedIn}
        >
          <RefreshCw size={18} />
        </button>
        {signedIn && (
          <button className="icon-btn" onClick={logout} title="Switch profile" aria-label="Log out">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
