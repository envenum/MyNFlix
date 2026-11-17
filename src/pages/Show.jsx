import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Play } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'
import { cleanName, isPlayable, sortEpisodes } from '../lib/drive'
import StatusScreen from '../components/StatusScreen'

export default function Show() {
  const { showId } = useParams()
  const { shows, status } = useLibrary()

  if (status !== 'ready') return <StatusScreen />

  const show = shows.find((s) => s.id === showId)
  if (!show) return <p className="notice">Not found. <Link to="/">Back home</Link></p>

  return (
    <main className="page">
      <Link to="/" className="back">
        <ChevronLeft size={18} /> Library
      </Link>
      <h1 className="title">{show.name}</h1>
      <ul className="list">
        {sortEpisodes(show.episodes).map((ep) => (
          <li key={ep.id}>
            <Link to={`/watch/${show.id}/${ep.id}`} className="row">
              <Play size={16} />
              <span className="row-main">{cleanName(ep.name)}</span>
              {!isPlayable(ep.ext) && <span className="tag">.{ep.ext}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
