import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Account, Investment } from '../lib/types'
import { InvestmentsList } from './InvestmentsList'
import { InvestmentsAnalysis } from './InvestmentsAnalysis'

type SubTab = 'lista' | 'analisis'

export function InvestmentsScreen() {
  const [subtab, setSubtab] = useState<SubTab>('lista')
  const [items, setItems] = useState<Investment[]>([])
  const [cuentas, setCuentas] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    const [inv, acc] = await Promise.all([
      supabase
        .from('investments')
        .select('*')
        .order('invested_at', { ascending: false })
        .order('created_at', { ascending: false })
        .range(0, 999),
      supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true })
        .range(0, 999),
    ])
    if (inv.error) setError(inv.error.message)
    else setItems((inv.data ?? []) as Investment[])
    setCuentas(acc.error ? [] : ((acc.data ?? []) as Account[]))
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="screen">
      <div className="subtabs">
        <button type="button" className={subtab === 'lista' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('lista')}>
          Cartera
        </button>
        <button type="button" className={subtab === 'analisis' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('analisis')}>
          Análisis
        </button>
      </div>

      {subtab === 'lista' && (
        <InvestmentsList items={items} loading={loading} error={error} reload={reload} cuentas={cuentas} />
      )}
      {subtab === 'analisis' && <InvestmentsAnalysis items={items} />}
    </div>
  )
}
