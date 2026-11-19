import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize, Minimize, Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]
const HIDE_MS = 3000
const SAVE_EVERY_MS = 5000

function fmt(t) {
  if (!Number.isFinite(t) || t < 0) return '0:00'
  const s = Math.floor(t)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

function readPos(key) {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

function writePos(key, value) {
  try {
    if (value > 0) localStorage.setItem(key, String(Math.floor(value)))
    else localStorage.removeItem(key)
  } catch {
    // storage unavailable
  }
}

export default function VideoPlayer({ src, title, storageKey, hasNext, onEnded, onFail }) {
  const wrapRef = useRef(null)
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const hideRef = useRef(0)
  const lastSaveRef = useRef(0)
  const shownRef = useRef(true)
  const wasShownRef = useRef(true)
  const interactingRef = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [full, setFull] = useState(false)
  const [visible, setVisible] = useState(true)
  const [busy, setBusy] = useState(true)

  const reveal = useCallback(() => {
    shownRef.current = true
    setVisible(true)
    clearTimeout(hideRef.current)
    hideRef.current = setTimeout(() => {
      const v = videoRef.current
      const controls = controlsRef.current
      const focused = controls && controls.contains(document.activeElement)
      if (v && !v.paused && !interactingRef.current && !focused) {
        shownRef.current = false
        setVisible(false)
      }
    }, HIDE_MS)
  }, [])

  const keepControlsVisible = useCallback(() => {
    interactingRef.current = true
    shownRef.current = true
    setVisible(true)
    clearTimeout(hideRef.current)
  }, [])

  const releaseControls = useCallback(() => {
    interactingRef.current = false
    reveal()
  }, [reveal])

  useEffect(() => () => clearTimeout(hideRef.current), [])

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', onFs)

    const video = videoRef.current
    // iOS Safari uses the native video fullscreen mode instead of the
    // standard Fullscreen API on some versions.
    const onNativeStart = () => setFull(true)
    const onNativeEnd = () => setFull(false)
    video?.addEventListener('webkitbeginfullscreen', onNativeStart)
    video?.addEventListener('webkitendfullscreen', onNativeEnd)

    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      video?.removeEventListener('webkitbeginfullscreen', onNativeStart)
      video?.removeEventListener('webkitendfullscreen', onNativeEnd)
    }
  }, [])

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch((error) => console.warn('[MyNFlix] Video play failed:', error))
    else v.pause()
  }, [])

  const seekBy = useCallback((delta) => {
    const v = videoRef.current
    if (!v) return
    const max = Number.isFinite(v.duration) ? v.duration : Infinity
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), max)
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (v) v.muted = !v.muted
  }, [])

  const toggleFull = useCallback(async () => {
    const el = wrapRef.current
    const v = videoRef.current
    if (!el || !v) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }
      if (el.requestFullscreen) {
        await el.requestFullscreen()
        return
      }
    } catch (error) {
      console.warn('[MyNFlix] Standard fullscreen unavailable; trying iOS video fullscreen:', error)
    }

    // Safari on iPhone exposes fullscreen on the video element itself.
    if (typeof v.webkitEnterFullscreen === 'function') {
      try {
        v.webkitEnterFullscreen()
        return
      } catch (error) {
        console.warn('[MyNFlix] iOS fullscreen failed:', error)
      }
    }

    // Last-resort WebKit-prefixed element fullscreen, where available.
    if (typeof el.webkitRequestFullscreen === 'function') {
      try {
        el.webkitRequestFullscreen()
      } catch (error) {
        console.warn('[MyNFlix] WebKit fullscreen failed:', error)
      }
    }
  }, [])

  const cycleSpeed = () => {
    const v = videoRef.current
    if (!v) return
    const next = SPEEDS[(SPEEDS.indexOf(v.playbackRate) + 1) % SPEEDS.length] || 1
    v.playbackRate = next
  }

  const onKeyDown = (e) => {
    if (e.target instanceof HTMLInputElement && e.key !== 'f' && e.key !== 'm') return
    const handled = {
      ' ': toggle,
      k: toggle,
      ArrowLeft: () => seekBy(-10),
      j: () => seekBy(-10),
      ArrowRight: () => seekBy(10),
      l: () => seekBy(10),
      f: toggleFull,
      m: toggleMute,
      ArrowUp: () => {
        if (videoRef.current) videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1)
      },
      ArrowDown: () => {
        if (videoRef.current) videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1)
      },
    }[e.key]
    if (!handled) return
    e.preventDefault()
    handled()
    reveal()
  }

  const onLoadedMetadata = (e) => {
    const v = e.currentTarget
    setDuration(v.duration)
    const saved = readPos(storageKey)
    if (saved > 5 && saved < v.duration - 10) v.currentTime = saved
  }

  const onTimeUpdate = (e) => {
    const v = e.currentTarget
    setTime(v.currentTime)
    if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
    const now = Date.now()
    if (now - lastSaveRef.current > SAVE_EVERY_MS) {
      lastSaveRef.current = now
      writePos(storageKey, v.currentTime)
    }
  }

  const playedPct = duration ? (time / duration) * 100 : 0
  const bufferedPct = duration ? Math.max(playedPct, (buffered / duration) * 100) : 0
  const track = `linear-gradient(to right, var(--accent) ${playedPct}%, rgba(255,255,255,0.55) ${playedPct}% ${bufferedPct}%, rgba(255,255,255,0.25) ${bufferedPct}%)`

  return (
    <div
      ref={wrapRef}
      className={`vp${visible || !playing ? '' : ' hide-cursor'}`}
      tabIndex={0}
      role="region"
      aria-label={`Video player: ${title}`}
      onKeyDown={onKeyDown}
      onPointerMove={reveal}
      onPointerDown={() => {
        wasShownRef.current = shownRef.current
        reveal()
      }}
      onTouchStart={() => {
        wasShownRef.current = shownRef.current
        reveal()
      }}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          // First tap reveals controls; the next tap toggles playback.
          if (wasShownRef.current) toggle()
        }}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => {
          setPlaying(true)
          reveal()
        }}
        onPause={() => {
          setPlaying(false)
          setVisible(true)
          shownRef.current = true
          clearTimeout(hideRef.current)
        }}
        onWaiting={() => setBusy(true)}
        onCanPlay={() => setBusy(false)}
        onPlaying={() => setBusy(false)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted)
          setVolume(e.currentTarget.volume)
        }}
        onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
        onEnded={() => {
          writePos(storageKey, 0)
          setPlaying(false)
          if (onEnded) onEnded()
        }}
        onError={(e) => {
          console.error('[MyNFlix] Stream video failed:', {
            src,
            mediaError: e.currentTarget.error?.code,
            message: e.currentTarget.error?.message,
          })
          if (onFail) onFail()
        }}
      />

      <div className="vp-center">
        {busy ? (
          <span className="spinner" role="status" aria-label="Loading" />
        ) : (
          !playing && (
            <button className="vp-bigplay" onClick={toggle} aria-label="Play">
              <Play size={36} />
            </button>
          )
        )}
      </div>

      <div
        ref={controlsRef}
        className={`vp-controls${visible || !playing ? '' : ' hidden'}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          keepControlsVisible()
        }}
        onPointerUp={releaseControls}
        onPointerCancel={releaseControls}
        onTouchStart={(e) => {
          e.stopPropagation()
          keepControlsVisible()
        }}
        onTouchEnd={releaseControls}
        onFocusCapture={keepControlsVisible}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) releaseControls()
        }}
      >
        <input
          className="vp-seek"
          type="range"
          min={0}
          max={duration || 0}
          step="any"
          value={Math.min(time, duration || 0)}
          style={{ '--track': track }}
          onChange={(e) => {
            if (videoRef.current) videoRef.current.currentTime = Number(e.target.value)
            reveal()
          }}
          aria-label="Seek"
        />
        <div className="vp-row">
          <button className="vp-btn" onClick={() => { toggle(); reveal() }} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={22} /> : <Play size={22} />}
          </button>
          {hasNext && (
            <button className="vp-btn vp-next" onClick={() => onEnded && onEnded()} aria-label="Next episode">
              <SkipForward size={20} />
            </button>
          )}
          <button className="vp-btn vp-mute" onClick={() => { toggleMute(); reveal() }} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            className="vp-vol"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = videoRef.current
              if (!v) return
              v.volume = Number(e.target.value)
              v.muted = v.volume === 0
            }}
            aria-label="Volume"
          />
          <span className="vp-time">{fmt(time)} / {fmt(duration)}</span>
          <span className="vp-spacer" />
          <button className="vp-btn vp-speed" onClick={() => { cycleSpeed(); reveal() }} aria-label="Playback speed">
            {speed}x
          </button>
          <button
            className="vp-btn vp-fullscreen"
            onClick={() => { toggleFull(); reveal() }}
            aria-label={full ? 'Exit fullscreen' : 'Fullscreen'}
            title={full ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {full ? <Minimize size={21} /> : <Maximize size={21} />}
          </button>
        </div>
      </div>
    </div>
  )
}
