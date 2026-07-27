import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_INCOME_CATEGORIES } from '../lib/defaults'
import type { Category, Income, IncomeOverride, IncomeSource, InflationRate } from '../lib/types'
import { IncomesList } from './IncomesList'
import { IncomesCalendar } from './IncomesCalendar'
import { IncomesAnalysis } from './IncomesAnalysis'
import { RemindersView } from './RemindersView'
import { SaveCelebration } from './SaveCelebration'

type SubTab = 'lista' | 'calendario' | 'analisis' | 'recordatorios'

export function IncomesScreen() {
  const [subtab, setSubtab] = useState<SubTab>('lista')
  const [incomes, setIncomes] = useState<Income[]>([])
  const [overrides, setOverrides] = useState<IncomeOverride[]>([])
  const [inflation, setInflation] = useState<InflationRate[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [fuentes, setFuentes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [celebrate, setCelebrate] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    const [incRes, ovRes, inflRes, catRes, srcRes] = await Promise.all([
      supabase.from('incomes').select('*').order('income_date', { ascending: false }).order('created_at', { ascending: false }).range(0, 999),
      supabase.from('income_overrides').select('*').range(0, 999),
      supabase.from('inflation_rates').select('*').range(0, 999),
      supabase.from('categories').select('*').eq('kind', 'income').range(0, 999),
      supabase.from('income_sources').select('*').order('name').range(0, 999),
    ])

    if (incRes.error) setError(incRes.error.message)
    else setIncomes((incRes.data ?? []) as Income[])
    setOverrides(ovRes.error ? [] : ((ovRes.data ?? []) as IncomeOverride[]))
    setInflation(inflRes.error ? [] : ((inflRes.data ?? []) as InflationRate[]))

    // Categorías: si el usuario no tiene ninguna, sembramos las de arranque.
    let cats = catRes.error ? [] : (catRes.data as Category[]).map((c) => c.name)
    if (!catRes.error && cats.length === 0) {
      await supabase
        .from('categories')
        .insert(DEFAULT_INCOME_CATEGORIES.map((name) => ({ kind: 'income', name })))
      cats = DEFAULT_INCOME_CATEGORIES
    }
    setCategorias(cats)
    setFuentes(srcRes.error ? [] : (srcRes.data as IncomeSource[]).map((s) => s.name))

    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function addCategoria(name: string) {
    await supabase.from('categories').insert({ kind: 'income', name })
    await reload()
  }
  async function deleteCategoria(name: string) {
    await supabase.from('categories').delete().eq('kind', 'income').eq('name', name)
    await reload()
  }
  async function addFuente(name: string) {
    await supabase.from('income_sources').insert({ name })
    await reload()
  }
  async function deleteFuente(name: string) {
    await supabase.from('income_sources').delete().eq('name', name)
    await reload()
  }

  return (
    <div className="screen">
      {celebrate && <SaveCelebration kind="in" onDone={() => setCelebrate(false)} />}
      <div className="subtabs">
        <button type="button" className={subtab === 'lista' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('lista')}>
          Lista
        </button>
        <button type="button" className={subtab === 'calendario' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('calendario')}>
          Calendario
        </button>
        <button type="button" className={subtab === 'analisis' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('analisis')}>
          Análisis
        </button>
        <button type="button" className={subtab === 'recordatorios' ? 'subtab subtab-on' : 'subtab'} onClick={() => setSubtab('recordatorios')}>
          Recordatorios
        </button>
      </div>

      {subtab === 'lista' && (
        <IncomesList
          incomes={incomes}
          loading={loading}
          error={error}
          reload={reload}
          categorias={categorias}
          fuentes={fuentes}
          onAddCategoria={addCategoria}
          onDeleteCategoria={deleteCategoria}
          onAddFuente={addFuente}
          onDeleteFuente={deleteFuente}
          onSaved={() => setCelebrate(true)}
        />
      )}
      {subtab === 'calendario' && (
        <IncomesCalendar
          incomes={incomes}
          overrides={overrides}
          reload={reload}
          categorias={categorias}
          fuentes={fuentes}
          onSaved={() => setCelebrate(true)}
        />
      )}
      {subtab === 'analisis' && (
        <IncomesAnalysis incomes={incomes} overrides={overrides} inflation={inflation} reload={reload} />
      )}
      {subtab === 'recordatorios' && <RemindersView kind="cobro" />}
    </div>
  )
}
