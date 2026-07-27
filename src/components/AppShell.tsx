import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { PiggyMascot } from './PiggyMascot'
import { DashboardScreen } from './DashboardScreen'
import { IncomesScreen } from './IncomesScreen'
import { ExpensesScreen } from './ExpensesScreen'
import { InvestmentsScreen } from './InvestmentsScreen'
import { GoalsScreen } from './GoalsScreen'

type Tab = 'dashboard' | 'ingresos' | 'gastos' | 'inversiones' | 'objetivos'

export function AppShell() {
  const { signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('dashboard')

  const mascot = tab === 'gastos' ? 'sad' : tab === 'inversiones' ? 'invest' : 'coins'

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="topbar-brand">
          <PiggyMascot variant={mascot} size={44} />
          Puggy
        </span>
        <button type="button" className="btn-ghost" onClick={signOut}>
          Salir
        </button>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && <DashboardScreen />}
        {tab === 'ingresos' && <IncomesScreen />}
        {tab === 'gastos' && <ExpensesScreen />}
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
