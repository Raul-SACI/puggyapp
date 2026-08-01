import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

interface OnboardingValue {
  ready: boolean
  showTour: boolean
  tipsSeen: Record<string, boolean>
  finishTour: () => void
  restartTour: () => void
  markTipSeen: (key: string) => void
}

const OnboardingContext = createContext<OnboardingValue | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [tipsSeen, setTipsSeen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      const { data, error } = await supabase
        .from('user_prefs')
        .select('onboarding_done, tips_seen')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      const done = !error && data ? Boolean(data.onboarding_done) : false
      const tips =
        !error && data && data.tips_seen ? (data.tips_seen as Record<string, boolean>) : {}
      setTipsSeen(tips)
      setShowTour(!done) // usuario nuevo (o sin registro): mostramos el tour
      setReady(true)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  const persist = useCallback(
    async (patch: { onboarding_done?: boolean; tips_seen?: Record<string, boolean> }) => {
      if (!user) return
      await supabase
        .from('user_prefs')
        .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
    },
    [user],
  )

  const finishTour = useCallback(() => {
    setShowTour(false)
    void persist({ onboarding_done: true })
  }, [persist])

  const restartTour = useCallback(() => {
    setShowTour(true)
  }, [])

  const markTipSeen = useCallback(
    (key: string) => {
      setTipsSeen((prev) => {
        if (prev[key]) return prev
        const next = { ...prev, [key]: true }
        void persist({ tips_seen: next })
        return next
      })
    },
    [persist],
  )

  return (
    <OnboardingContext.Provider
      value={{ ready, showTour, tipsSeen, finishTour, restartTour, markTipSeen }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding debe usarse dentro de <OnboardingProvider>')
  return ctx
}
