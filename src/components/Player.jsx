import { useEffect, useState } from 'react'
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

  if (failed)
    return (
      <div className="player">
        <iframe
          src={previewUrl(ep.id)}
          title={cleanName(ep.name)}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
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
