import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Income, IncomeOverride, InflationRate } from '../lib/types'
import { IncomesList } from './IncomesList'
import { IncomesCalendar } from './IncomesCalendar'
import { IncomesAnalysis } from './IncomesAnalysis'

type SubTab = 'lista' | 'calendario' | 'analisis'

export function IncomesScreen() {
  const [subtab, setSubtab] = useState<SubTab>('lista')
  const [incomes, setIncomes] = useState<Income[]>([])
  const [overrides, setOverrides] = useState<IncomeOverride[]>([])
  const [inflation, setInflation] = useState<InflationRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    // .range(0, 999): Supabase corta en 1000 filas; paginamos cuando haga falta.
    const [incRes, ovRes, inflRes] = await Promise.all([
      supabase
        .from('incomes')
        .select('*')
        .order('income_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(0, 999),
      supabase.from('income_overrides').select('*').range(0, 999),
      supabase.from('inflation_rates').select('*').range(0, 999),
    ])

    if (incRes.error) setError(incRes.error.message)
    else setIncomes((incRes.data ?? []) as Income[])

    // Si alguna tabla nueva todavía no existe (falta correr el SQL), no rompemos.
    setOverrides(ovRes.error ? [] : ((ovRes.data ?? []) as IncomeOverride[]))
    setInflation(inflRes.error ? [] : ((inflRes.data ?? []) as InflationRate[]))

    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="screen">
      <div className="subtabs">
        <button
          type="button"
          className={subtab === 'lista' ? 'subtab subtab-on' : 'subtab'}
          onClick={() => setSubtab('lista')}
        >
          Lista
        </button>
        <button
          type="button"
          className={subtab === 'calendario' ? 'subtab subtab-on' : 'subtab'}
          onClick={() => setSubtab('calendario')}
        >
          Calendario
        </button>
        <button
          type="button"
          className={subtab === 'analisis' ? 'subtab subtab-on' : 'subtab'}
          onClick={() => setSubtab('analisis')}
        >
          Análisis
        </button>
      </div>

      {subtab === 'lista' && (
        <IncomesList incomes={incomes} loading={loading} error={error} reload={reload} />
      )}
      {subtab === 'calendario' && (
        <IncomesCalendar incomes={incomes} overrides={overrides} reload={reload} />
      )}
      {subtab === 'analisis' && (
        <IncomesAnalysis
          incomes={incomes}
          overrides={overrides}
          inflation={inflation}
          reload={reload}
        />
      )}
    </div>
  )
}
