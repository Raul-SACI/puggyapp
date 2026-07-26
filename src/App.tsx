import { useAuth } from './lib/AuthContext'
import { AuthScreen } from './components/AuthScreen'
import { AppShell } from './components/AppShell'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="center-screen">
        <p>Cargando…</p>
      </div>
    )
  }

  return session ? <AppShell /> : <AuthScreen />
}
