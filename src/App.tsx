import { useAuth } from './lib/AuthContext'
import { OnboardingProvider } from './lib/OnboardingContext'
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

  return session ? (
    <OnboardingProvider>
      <AppShell />
    </OnboardingProvider>
  ) : (
    <AuthScreen />
  )
}
