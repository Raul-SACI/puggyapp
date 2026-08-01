import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useOnboarding } from '../lib/OnboardingContext'
import { PiggyMascot } from './PiggyMascot'
import { WelcomeTour } from './WelcomeTour'
import { DashboardScreen } from './DashboardScreen'
import { IncomesScreen } from './IncomesScreen'
import { ExpensesScreen } from './ExpensesScreen'
import { InvestmentsScreen } from './InvestmentsScreen'
import { GoalsScreen } from './GoalsScreen'
import { AccountsScreen } from './AccountsScreen'

type Tab = 'dashboard' | 'ingresos' | 'gastos' | 'cuentas' | 'inversiones' | 'objetivos'

export function AppShell() {
  const { signOut } = useAuth()
  const { restartTour } = useOnboarding()
  const [tab, setTab] = useState<Tab>('dashboard')

  const mascot = tab === 'gastos' ? 'sad' : tab === 'inversiones' ? 'invest' : 'coins'

  return (
    <div className="app-shell">
      <WelcomeTour />
      <header className="topbar">
        <span className="topbar-brand">
          <PiggyMascot variant={mascot} size={44} />
          Puggy
        </span>
        <div className="topbar-actions">
          <button
            type="button"
            className="btn-help"
            onClick={restartTour}
            aria-label="Ver la guía otra vez"
            title="Ver la guía"
          >
            ?
          </button>
          <button type="button" className="btn-ghost" onClick={signOut}>
            Salir
          </button>
        </div>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && <DashboardScreen />}
        {tab === 'ingresos' && <IncomesScreen />}
        {tab === 'gastos' && <ExpensesScreen />}
        {tab === 'cuentas' && <AccountsScreen />}
        {tab === 'inversiones' && <InvestmentsScreen />}
        {tab === 'objetivos' && <GoalsScreen />}
      </main>

      <nav className="bottom-nav">
        <button
          type="button"
          className={tab === 'dashboard' ? 'nav-item nav-active' : 'nav-item'}
          onClick={() => setTab('dashboard')}
        >
          <span className="nav-ico">📊</span>
          Dashboard
        </button>
        <button
          type="button"
          className={tab === 'ingresos' ? 'nav-item nav-active' : 'nav-item'}
          onClick={() => setTab('ingresos')}
        >
          <span className="nav-ico">💰</span>
          Ingresos
        </button>
        <button
          type="button"
          className={tab === 'gastos' ? 'nav-item nav-active' : 'nav-item'}
          onClick={() => setTab('gastos')}
        >
          <span className="nav-ico">🧾</span>
          Gastos
        </button>
        <button
          type="button"
          className={tab === 'cuentas' ? 'nav-item nav-active' : 'nav-item'}
          onClick={() => setTab('cuentas')}
        >
          <span className="nav-ico">💳</span>
          Cuentas
        </button>
        <button
          type="button"
          className={tab === 'inversiones' ? 'nav-item nav-active' : 'nav-item'}
          onClick={() => setTab('inversiones')}
        >
          <span className="nav-ico">📈</span>
          Inversiones
        </button>
        <button
          type="button"
          className={tab === 'objetivos' ? 'nav-item nav-active' : 'nav-item'}
          onClick={() => setTab('objetivos')}
        >
          <span className="nav-ico">🎯</span>
          Objetivos
        </button>
      </nav>
    </div>
  )
}
