import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'
import { cleanName, isPlayable, openUrl, previewUrl, setLast, sortEpisodes } from '../lib/drive'
import StatusScreen from '../components/StatusScreen'

export default function Watch() {
  const { showId, fileId } = useParams()
  const { shows, status } = useLibrary()

  const show = shows.find((s) => s.id === showId)
  const episodes = show ? sortEpisodes(show.episodes) : []
  const index = episodes.findIndex((e) => e.id === fileId)
  const ep = episodes[index]

  useEffect(() => {
    if (ep) setLast({ showId, fileId, name: ep.name })
  }, [ep, showId, fileId])

  if (status !== 'ready') return <StatusScreen />
  if (!show || !ep) return <p className="notice">Not found. <Link to="/">Back home</Link></p>

  const prev = episodes[index - 1]
  const next = episodes[index + 1]

  return (
    <main className="page">
      <Link to={`/show/${show.id}`} className="back">
        <ChevronLeft size={18} /> {show.name}
      </Link>

      <div className="player">
        <iframe
          key={ep.id}
          src={previewUrl(ep.id)}
          title={cleanName(ep.name)}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>

      <h1 className="title">{cleanName(ep.name)}</h1>

      {!isPlayable(ep.ext) && (
        <p className="warn">
          .{ep.ext} files usually can’t be played by Drive’s web player. If this is blank or
          says it can’t play, convert it to MP4 (H.264/AAC) and re-upload it.{' '}
          <a href={openUrl(ep.id)} target="_blank" rel="noreferrer">
            Open in Drive <ExternalLink size={12} />
          </a>
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
