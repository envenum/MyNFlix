import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Play, Search } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'
import { cleanName, getLast, sortEpisodes } from '../lib/drive'
import ShowCard from '../components/ShowCard'
import StatusScreen from '../components/StatusScreen'

export default function Home() {
  const { shows, status, user, role } = useLibrary()
  const [q, setQ] = useState('')
  const guest = role === 'guest'
  const last = guest ? null : getLast(user)

  const term = q.trim().toLowerCase()
  const results = useMemo(() => {
    if (!term) return null
    return shows.flatMap((show) =>
      sortEpisodes(show.episodes)
        .filter((ep) => `${show.name} ${ep.name}`.toLowerCase().includes(term))
        .map((ep) => ({ show, ep })),
    )
  }, [shows, term])

  if (status !== 'ready') return <StatusScreen />

  return (
    <main className="page">
      {guest && <p className="warn">Guest preview: you can browse titles but not play videos.</p>}

      <label className="search">
        <Search size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your library"
          aria-label="Search"
        />
      </label>

      {results ? (
        results.length ? (
          <ul className="list">
            {results.map(({ show, ep }) => (
              <li key={ep.id || `${show.id}-${ep.name}`}>
                {guest ? (
                  <div className="row locked">
                    <Lock size={16} />
                    <span className="row-main">{cleanName(ep.name)}</span>
                    <span className="row-sub">{show.name}</span>
                  </div>
                ) : (
                  <Link to={`/watch/${show.id}/${ep.id}`} className="row">
                    <Play size={16} />
                    <span className="row-main">{cleanName(ep.name)}</span>
                    <span className="row-sub">{show.name}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="notice">No matches.</p>
        )
      ) : (
        <>
          {last && (
            <Link to={`/watch/${last.showId}/${last.fileId}`} className="resume">
              <Play size={18} /> Continue: {cleanName(last.name)}
            </Link>
          )}
          {shows.length ? (
            <div className="grid">
              {shows.map((s) => (
                <ShowCard key={s.id} show={s} />
              ))}
            </div>
          ) : (
            <p className="notice">No videos found yet. Add some to your Drive folder.</p>
          )}
        </>
      )}
    </main>
  )
}
