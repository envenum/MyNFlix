import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, KeyRound, Trash2, UserPlus } from 'lucide-react'
import { useLibrary } from '../lib/LibraryContext'
import { adminCall, getSession, setSession } from '../lib/drive'
import { colorFor, displayName } from '../lib/profiles'
import StatusScreen from '../components/StatusScreen'

const MESSAGES = {
  bad_name: 'Username must be 2–20 letters, numbers or underscores (and not “guest”).',
  exists: 'That username already exists.',
  bad_pin: 'PIN must be exactly 5 digits.',
  not_found: 'User not found.',
  protected: 'Admin accounts cannot be removed.',
  unauthorized: 'Session expired. Log out and sign in again.',
  locked: 'Too many wrong tries. Wait 15 minutes.',
  forbidden: 'Admins only.',
}

const randomPin = () => String(10000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90000))

export default function Admin() {
  const { role, status } = useLibrary()
  const [users, setUsers] = useState([])
  const [msg, setMsg] = useState('')
  const [name, setName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (action, extra = {}) => {
    const session = getSession()
    if (!session) return false
    setBusy(true)
    setMsg('')
    try {
      const data = await adminCall(session, action, extra)
      if (data.error) {
        setMsg(MESSAGES[data.error] || 'Something went wrong.')
        return false
      }
      setUsers(data.users || [])
      return true
    } catch {
      setMsg('Could not reach Drive.')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (role === 'admin') run('listUsers')
  }, [role, run])

  if (status !== 'ready') return <StatusScreen />
  if (role !== 'admin') return <p className="notice">Admins only. <Link to="/">Back home</Link></p>

  const add = async (e) => {
    e.preventDefault()
    const added = name.trim().toLowerCase()
    if (await run('addUser', { name: added, newpin: newPin })) {
      setMsg(`Added ${added}. Give them PIN ${newPin}.`)
      setName('')
      setNewPin('')
    }
  }

  const remove = async (id) => {
    if (!window.confirm(`Remove ${displayName(id)}?`)) return
    if (await run('removeUser', { name: id })) setMsg(`Removed ${id}.`)
  }

  const changePin = async (id) => {
    const value = (window.prompt(`New 5-digit PIN for ${displayName(id)}`) || '').trim()
    if (!value) return
    if (await run('setPin', { name: id, newpin: value })) {
      const session = getSession()
      if (session && session.user === id) setSession({ ...session, pin: value })
      setMsg(`PIN updated for ${id}.`)
    }
  }

  return (
    <main className="page">
      <Link to="/" className="back">
        <ChevronLeft size={18} /> Library
      </Link>
      <h1 className="title">Manage users</h1>

      <ul className="list">
        {users.map((u) => (
          <li key={u.id} className="row">
            <span className="avatar small" style={{ background: colorFor(u.id) }}>
              {displayName(u.id).slice(0, 1)}
            </span>
            <span className="row-main">{displayName(u.id)}</span>
            <span className="tag">{u.role}</span>
            <button className="icon-btn" disabled={busy} onClick={() => changePin(u.id)} title="Change PIN" aria-label={`Change PIN for ${u.id}`}>
              <KeyRound size={16} />
            </button>
            {u.role !== 'admin' && (
              <button className="icon-btn" disabled={busy} onClick={() => remove(u.id)} title="Remove user" aria-label={`Remove ${u.id}`}>
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <h2 className="subtitle">Add user</h2>
      <form className="admin-form" onSubmit={add}>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Username"
          aria-label="Username"
          autoCapitalize="none"
          required
        />
        <input
          className="input"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="5-digit PIN"
          aria-label="PIN"
          inputMode="numeric"
          required
        />
        <button type="button" className="btn ghost" onClick={() => setNewPin(randomPin())}>
          Generate
        </button>
        <button className="btn" type="submit" disabled={busy}>
          <UserPlus size={16} /> Add
        </button>
      </form>
      {msg && <p className="admin-msg">{msg}</p>}
      <p className="muted">The guest profile is built in and can only browse titles.</p>
    </main>
  )
}
