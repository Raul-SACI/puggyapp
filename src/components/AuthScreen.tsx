import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { PiggyLogo } from './PiggyLogo'

type Mode = 'login' | 'register'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error
      }
      // Si sale bien, el cambio de sesión lo detecta AuthContext y cambia de pantalla solo.
    } catch (err) {
      setError(traducirError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">
          <PiggyLogo size={64} />
          <h1 className="brand-name">Puggy</h1>
          <p className="brand-tagline">Tu plata, clara de un vistazo.</p>
        </div>

        <div className="tabs">
          <button
            type="button"
            className={mode === 'login' ? 'tab tab-active' : 'tab'}
            onClick={() => {
              setMode('login')
              setError('')
            }}
          >
            Ingresar
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'tab tab-active' : 'tab'}
            onClick={() => {
              setMode('register')
              setError('')
            }}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Contraseña</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </label>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? 'Un momento…'
              : mode === 'login'
                ? 'Ingresar'
                : 'Crear mi cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}

function traducirError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/invalid login credentials/i.test(msg))
    return 'Email o contraseña incorrectos.'
  if (/user already registered/i.test(msg))
    return 'Ya existe una cuenta con ese email. Probá con "Ingresar".'
  if (/password should be at least/i.test(msg))
    return 'La contraseña debe tener al menos 6 caracteres.'
  if (/unable to validate email|invalid email/i.test(msg))
    return 'Revisá que el email esté bien escrito.'
  return 'Algo salió mal. Probá de nuevo en un momento.'
}
