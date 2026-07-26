import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

type Status = 'cargando' | 'listo' | 'error'

export function InicioScreen() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Status>('cargando')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!user) return
    let cancel = false

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle()
        if (error) throw error

        let display = data?.display_name ?? null
        if (!data) {
          const fallback = user.email ? user.email.split('@')[0] : 'amig@'
          const { error: insErr } = await supabase
            .from('profiles')
            .insert({ id: user.id, display_name: fallback })
          if (insErr) throw insErr
          display = fallback
        }

        if (!cancel) {
          setName(display || 'amig@')
          setStatus('listo')
        }
      } catch (err) {
        if (!cancel) {
          setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
          setStatus('error')
        }
      }
    })()

    return () => {
      cancel = true
    }
  }, [user])

  return (
    <div className="card welcome-card">
      {status === 'cargando' && <p>Cargando tu información…</p>}

      {status === 'listo' && (
        <>
          <h2 className="welcome-title">¡Hola, {name}! 👋</h2>
          <p className="welcome-text">
            Tu cuenta está lista y tus datos están protegidos: solo vos podés
            verlos.
          </p>
          <p className="welcome-hint">
            Tocá <strong>Ingresos</strong> abajo para empezar a cargar tu plata.
            Pronto sumamos gastos, inversiones y objetivos.
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <h2 className="welcome-title">Ups…</h2>
          <p className="welcome-text">No pudimos cargar tu información.</p>
          <p className="error-msg">{errorMsg}</p>
        </>
      )}
    </div>
  )
}
