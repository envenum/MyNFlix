import { useState } from 'react'
import { Link } from 'react-router-dom'
import { thumbUrl, sortEpisodes } from '../lib/drive'

export default function ShowCard({ show }) {
  const [broken, setBroken] = useState(false)
  const first = sortEpisodes(show.episodes)[0]
  const count = show.episodes.length

  return (
    <Link to={`/show/${show.id}`} className="card">
      <div className="card-img">
        {!broken && first ? (
          <img
            src={thumbUrl(first.id)}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="card-fallback">{show.name.slice(0, 1)}</span>
        )}
      </div>
      <div className="card-title">{show.name}</div>
      <div className="card-sub">
        {count} {count === 1 ? 'video' : 'videos'}
      </div>
    </Link>
  )
}
