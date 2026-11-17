import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'
import { cleanName, setLast, sortEpisodes } from '../lib/drive'
import StatusScreen from '../components/StatusScreen'

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}

export default function Watch() {
  const { showId, fileId } = useParams()
  const { shows, status, user } = useLibrary()
  const videoRef = useRef(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoError, setVideoError] = useState(false)

  const show = shows.find((s) => s.id === showId)
  const episodes = show ? sortEpisodes(show.episodes) : []
  const index = episodes.findIndex((e) => e.id === fileId)
  const ep = episodes[index]

  useEffect(() => {
    if (ep) setLast(user, { showId, fileId, name: ep.name })
  }, [ep, user, showId, fileId])

  useEffect(() => {
    setDuration(0)
    setCurrentTime(0)
    setVideoError(false)
  }, [fileId])

  if (status !== 'ready') return <StatusScreen />
  if (!show || !ep) return <p className="notice">Not found. <Link to="/">Back home</Link></p>

  const prev = episodes[index - 1]
  const next = episodes[index + 1]
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const remaining = Math.max(0, duration - currentTime)
  const videoUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(ep.id)}`

  return (
    <main className="page">
      <Link to={`/show/${show.id}`} className="back">
        <ChevronLeft size={18} /> {show.name}
      </Link>

      <div className="player">
        <video
          ref={videoRef}
          key={ep.id}
          src={videoUrl}
          title={cleanName(ep.name)}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onDurationChange={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onError={() => setVideoError(true)}
        />
      </div>

      <h1 className="title">{cleanName(ep.name)}</h1>

      {videoError && (
        <p className="warn">
          This video could not be played directly from Google Drive. Check that it is shared as
          “Anyone with the link” and is an MP4 (H.264/AAC). Large files may be blocked by Drive's
          download confirmation or streaming limits.
        </p>
      )}

      <section className="playback-time" aria-label="Playback time">
        <div className="playback-time__labels">
          <span>{formatTime(currentTime)} elapsed</span>
          <span>{duration ? formatTime(duration) : 'Duration loading'}</span>
        </div>
        <input
          className="playback-time__progress"
          type="range"
          min="0"
          max={duration || 0}
          step="1"
          value={Math.min(currentTime, duration || 0)}
          aria-label="Seek video"
          disabled={!duration}
          style={{ '--playback-progress': `${progress}%` }}
          onChange={(event) => {
            const time = Number(event.target.value)
            if (videoRef.current) {
              videoRef.current.currentTime = time
              setCurrentTime(time)
            }
          }}
        />
        <p className="playback-time__remaining">
          {duration ? `-${formatTime(remaining)} remaining` : 'Waiting for video duration…'}
        </p>
      </section>

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
