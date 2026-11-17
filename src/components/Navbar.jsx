import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'

export default function Navbar() {
  const { reload, status } = useLibrary()
  return (
    <header className="nav">
      <Link to="/" className="logo">
        MY<span>N</span>FLIX
      </Link>
      <button
        className="icon-btn"
        onClick={reload}
        title="Check Drive for new videos"
        aria-label="Refresh library"
        disabled={status === 'unconfigured'}
      >
        <RefreshCw size={18} />
      </button>
    </header>
  )
}
