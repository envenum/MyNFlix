import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { PROFILES } from '../lib/profiles'
import { useLibrary } from '../lib/LibraryContext'

export default function Login() {
  const { login, error } = useLibrary()
  const [profile, setProfile] = useState(null)
  const [pin, setPin] = useState('')

  const onChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 5)
    setPin(digits)
    if (digits.length === 5) {
      login(profile.id, digits)
      setPin('')
    }
  }

  if (!profile)
    return (
      <main className="login">
        <h1 className="title">Who’s watching?</h1>
        {error && <p className="login-error">{error}</p>}
        <div className="profiles">
          {PROFILES.map((p) => (
            <button key={p.id} className="profile" onClick={() => setProfile(p)}>
              <span className="avatar" style={{ background: p.color }}>
                {p.name.slice(0, 1)}
              </span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </main>
    )

  return (
    <main className="login">
      <span className="avatar big" style={{ background: profile.color }}>
        {profile.name.slice(0, 1)}
      </span>
      <h1 className="title">{profile.name}</h1>
      <p className="muted">Enter your 5-digit PIN</p>
      {error && <p className="login-error">{error}</p>}
      <input
        className="input pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        value={pin}
        onChange={onChange}
        placeholder="• • • • •"
        aria-label="PIN"
        autoFocus
      />
      <button className="back" onClick={() => { setProfile(null); setPin('') }}>
        <ChevronLeft size={18} /> Switch profile
      </button>
    </main>
  )
}
