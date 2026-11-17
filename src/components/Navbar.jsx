import { Link } from 'react-router-dom'
import { LogOut, RefreshCw, Settings } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'
import { colorFor, displayName } from '../lib/profiles'

export default function Navbar() {
  const { reload, logout, status, user, role } = useLibrary()
  const signedIn = status === 'ready' || status === 'loading'

  return (
    <header className="nav">
      <Link to="/" className="logo">
        MY<span>N</span>FLIX
      </Link>
      <div className="nav-right">
        {signedIn && user && (
          <span className="nav-user">
            <span className="avatar small" style={{ background: colorFor(user) }}>
              {displayName(user).slice(0, 1)}
            </span>
            {displayName(user)}
          </span>
        )}
        {role === 'admin' && (
          <Link to="/admin" className="icon-btn" title="Manage users" aria-label="Manage users">
            <Settings size={18} />
          </Link>
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
