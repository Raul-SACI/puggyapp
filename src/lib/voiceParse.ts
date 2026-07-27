import { daysInMonth, isoDate, parseMoney, todayLocal, ymd, type Currency } from './format'

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

// Quita acentos (combining marks U+0300–U+036F) para comparar más fácil.
const ACCENTS = new RegExp('[\\u0300-\\u036f]', 'g')
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(ACCENTS, '')
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function shiftDay(iso: string, delta: number): string {
  const d = ymd(iso)
  const dt = new Date(d.y, d.m - 1, d.d + delta)
  return isoDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}

/** Busca un ítem de una lista dentro del texto (por nombre o su primera palabra). */
function matchFromList(n: string, list: string[]): string | null {
  for (const item of list) if (n.includes(norm(item))) return item
  for (const item of list) {
    const key = norm(item).split('/')[0].trim().split(' ')[0]
    if (key.length >= 4 && n.includes(key)) return item
  }
  return null
}

export interface ParsedVoice {
  description: string
  amount: number | null
  currency: Currency
  category: string | null
  source: string | null
  method: string | null
  is_recurring: boolean
  date: string
}

interface Opts {
  categorias: string[]
  fuentes?: string[]
  metodos: string[]
  fallback: string
}

/** Convierte una frase hablada en español en los campos de un movimiento. */
export function parseVoice(text: string, opts: Opts): ParsedVoice {
  const n = ' ' + norm(text) + ' '
  const today = todayLocal()
  const H = ymd(today)

  // Monto: primer número que NO esté seguido de "de" (para no tomar el día "10 de julio")
  let amount: number | null = null
  for (const m of text.matchAll(/([0-9][0-9.]*(?:,[0-9]+)?)/g)) {
    const idx = (m.index ?? 0) + m[0].length
    const after = text.slice(idx, idx + 4).toLowerCase()
    if (!/^\s*de\s/.test(after)) {
      amount = parseMoney(m[0])
      break
    }
  }

  const currency: Currency = /dolar|usd|u\$s/.test(n) ? 'USD' : 'ARS'

  // Medio (de cobro / de pago)
  let method = matchFromList(n, opts.metodos)
  if (!method) {
    if (/\bqr\b/.test(n)) method = opts.metodos.find((x) => /transfer/.test(norm(x))) ?? method
    if (/mercado pago|billetera|virtual|\bmp\b/.test(n)) method = opts.metodos.find((x) => /billetera/.test(norm(x))) ?? method
  }

  // Fuente
  let source: string | null = null
  if (opts.fuentes && opts.fuentes.length) source = matchFromList(n, opts.fuentes)
  if (!source) {
    const fm = n.match(/fuente\s+(?:de\s+)?([a-z0-9ñ ]+?)(?:\s+(?:para|el|los|que|por|con|dia)\b|\s*$)/)
    if (fm && fm[1].trim()) source = titleCase(fm[1].trim())
  }

  // Categoría
  let category = matchFromList(n, opts.categorias)
  if (!category) {
    const cm = n.match(/categoria\s+(?:de\s+)?([a-z0-9ñ ]+?)(?:\s+(?:para|el|los|que|por|con|dia)\b|\s*$)/)
    if (cm && cm[1].trim()) category = titleCase(cm[1].trim())
  }

  // Fecha
  let date = today
  const md = n.match(/(\d{1,2})\s+de\s+([a-z]+)/)
  if (md && MESES[md[2]]) {
    const mo = MESES[md[2]]
    date = isoDate(H.y, mo, Math.min(parseInt(md[1], 10), daysInMonth(H.y, mo)))
  } else if (/\bhoy\b/.test(n)) {
    date = today
  } else if (/manana/.test(n)) {
    date = shiftDay(today, 1)
  } else if (/\bayer\b/.test(n)) {
    date = shiftDay(today, -1)
  } else {
    const sm = n.match(/\b(\d{1,2})[/-](\d{1,2})\b/)
    if (sm) {
      const mo = parseInt(sm[2], 10)
      if (mo >= 1 && mo <= 12) date = isoDate(H.y, mo, Math.min(parseInt(sm[1], 10), daysInMonth(H.y, mo)))
    }
  }

  const is_recurring = /todos los meses|mensual|cada mes|se repit/.test(n)
  const description = source || category || opts.fallback

  return { description, amount, currency, category, source, method, is_recurring, date }
}
