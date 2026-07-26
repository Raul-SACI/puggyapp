import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { PiggyLogo } from './PiggyLogo'
import { InicioScreen } from './InicioScreen'
import { IncomesScreen } from './IncomesScreen'
import { ExpensesScreen } from './ExpensesScreen'

type Tab = 'inicio' | 'ingresos' | 'gastos'

export function AppShell() {
  const { signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('inicio')

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="topbar-brand">
          <PiggyLogo size={28} />
          Puggy
        </span>
        <button type="button" className="btn-ghost" onClick={signOut}>
          Salir
        </button>
      </header>

      <main className="app-main">
        {tab === 'inicio' && <InicioScreen />}
        {tab === 'ingresos' && <IncomesScreen />}
        {tab === 'gastos' && <ExpensesScreen />}
      </main>

      <nav className="bottom-nav">
        <button
          type="button"
          className={tab === 'inicio' ? 'nav-item nav-active' : 'nav-item'}
          onClick={() => setTab('inicio')}
        >
          <span className="nav-ico">🏠</span>
          Inicio
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
      </nav>
    </div>
  )
}
