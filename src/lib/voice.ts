/* Acceso al micrófono del navegador (Web Speech API). */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface VoiceRec {
  stop: () => void
  abort: () => void
}

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as Record<string, unknown>
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function startVoice(
  onResult: (t: string) => void,
  onError: (m: string) => void,
  onEnd: () => void,
): VoiceRec | null {
  const w = window as unknown as Record<string, unknown>
  const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => any) | undefined
  if (!SR) {
    onError('no-support')
    return null
  }
  const rec: any = new SR()
  rec.lang = 'es-AR'
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.continuous = false
  rec.onresult = (e: any) => {
    const t = e?.results?.[0]?.[0]?.transcript ?? ''
    onResult(String(t))
  }
  rec.onerror = (e: any) => onError(String(e?.error ?? 'error'))
  rec.onend = () => onEnd()
  rec.start()
  return { stop: () => rec.stop(), abort: () => rec.abort() }
}
