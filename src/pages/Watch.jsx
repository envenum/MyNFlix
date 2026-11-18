import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'
import { cleanName, isPlayable, setLast, sortEpisodes } from '../lib/drive'
import Player from '../components/Player'
import StatusScreen from '../components/StatusScreen'

export default function Watch() {
  const { showId, fileId } = useParams()
  const { shows, status, user } = useLibrary()
  const navigate = useNavigate()

  const show = shows.find((s) => s.id === showId)
  const episodes = show ? sortEpisodes(show.episodes) : []
  const index = episodes.findIndex((e) => e.id === fileId)
  const ep = episodes[index]

  useEffect(() => {
    if (ep) setLast(user, { showId, fileId, name: ep.name })
  }, [ep, user, showId, fileId])

  if (status !== 'ready') return <StatusScreen />
  if (!show || !ep) return <p className="notice">Not found. <Link to="/">Back home</Link></p>

  const prev = episodes[index - 1]
  const next = episodes[index + 1]

  return (
    <main className="page">
      <Link to={`/show/${show.id}`} className="back">
        <ChevronLeft size={18} /> {show.name}
      </Link>

      <Player
        key={ep.id}
        ep={ep}
        user={user}
        hasNext={Boolean(next)}
        onEnded={() => next && navigate(`/watch/${show.id}/${next.id}`)}
      />

      <h1 className="title">{cleanName(ep.name)}</h1>

      {!isPlayable(ep.ext) && (
        <p className="warn">
          .{ep.ext} files usually can’t be played by the embedded player. For best compatibility,
          convert this video to MP4 (H.264/AAC) and re-upload it to your Drive library.
        </p>
      )}

      <div className="pager">
        {prev ? (
          <Link className="btn ghost" to={`/watch/${show.id}/${prev.id}`}>
            <ChevronLeft size={16} /> Previous
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="btn" to={`/watch/${show.id}/${next.id}`}>
            Next <ChevronRight size={16} />
          </Link>
        )}
      </div>
    </main>
  )
}
