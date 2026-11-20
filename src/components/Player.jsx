import { useEffect, useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import { cleanName, getSession, isPlayable, previewUrl } from '../lib/drive'
import { STREAM_URL, getStreamToken, streamSrc } from '../lib/stream'
import VideoPlayer from './VideoPlayer'

// Uses the custom player when the streaming relay is configured and reachable;
// otherwise (or if the relay fails) falls back to Drive's embedded player.
// Render with key={ep.id} so state resets per episode.
export default function Player({ ep, user, hasNext, onEnded }) {
  const useRelay = Boolean(STREAM_URL) && isPlayable(ep.ext)
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(!useRelay)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!useRelay) return
    let alive = true
    getStreamToken(getSession())
      .then((token) => alive && setSrc(streamSrc(ep.id, token)))
      .catch((error) => {
        console.error('[MyNFlix] Cloudflare stream token request failed; using Google Drive fallback:', error)
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [useRelay, ep.id])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e) => e.key === 'Escape' && setExpanded(false)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  if (failed)
    return (
      <>
        <div className={`player${expanded ? ' expanded' : ''}`}>
          <iframe
            src={previewUrl(ep.id)}
            title={cleanName(ep.name)}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
          {expanded && (
            <button className="player-close" onClick={() => setExpanded(false)} aria-label="Close full screen">
              <X size={22} />
            </button>
          )}
        </div>
        {!expanded && (
          <button className="btn ghost player-expand" onClick={() => setExpanded(true)}>
            <Maximize2 size={16} /> Full screen
          </button>
        )}
      </>
    )

  if (!src)
    return (
      <div className="player player-loading">
        <span className="spinner" role="status" aria-label="Loading" />
      </div>
    )

  return (
    <VideoPlayer
      src={src}
      title={cleanName(ep.name)}
      storageKey={`mynflix-pos-${user}-${ep.id}`}
      hasNext={hasNext}
      onEnded={onEnded}
      onFail={() => setFailed(true)}
    />
  )
}
