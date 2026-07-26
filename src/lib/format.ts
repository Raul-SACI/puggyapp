export type Currency = 'ARS' | 'USD'

/**
 * Convierte lo que el usuario escribe en un número de plata, cuidando los centavos.
 * Acepta coma o punto como separador decimal y separadores de miles.
 * Devuelve null si no es un número válido.
 *
 * Regla: el ÚLTIMO separador con 1 o 2 dígitos después se toma como decimales;
 * si tiene 3+ dígitos, se considera separador de miles (no decimales).
 * Ej: "1.500,50" -> 1500.50 · "1.500.000" -> 1500000 · "1500,5" -> 1500.5
 */
export function parseMoney(input: string): number | null {
  if (!input) return null
  let s = input.trim().replace(/\s/g, '').replace(/[^0-9.,]/g, '')
  if (!s) return null

  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  if (lastSep === -1) {
    s = s.replace(/[.,]/g, '')
  } else {
    const dec = s.slice(lastSep + 1).replace(/[.,]/g, '')
    if (dec.length === 1 || dec.length === 2) {
      const intPart = s.slice(0, lastSep).replace(/[.,]/g, '')
      s = `${intPart}.${dec}`
    } else {
      s = s.replace(/[.,]/g, '')
    }
  }

  const n = Number(s)
  if (!isFinite(n) || n < 0) return null
  // Redondeo a 2 decimales sin perder centavos por errores de coma flotante.
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Formatea un monto como plata, con su moneda (ARS o USD). */
export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Fecha de hoy en formato YYYY-MM-DD usando la fecha LOCAL (sin toISOString). */
export function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Muestra una fecha YYYY-MM-DD como "22 jul 2026" sin líos de zona horaria. */
export function formatDateLocal(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const meses = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ]
  if (!y || !m || !d) return iso
  return `${d} ${meses[m - 1]} ${y}`
}

/* ------------------- Ayudas para el Calendario (mes) ------------------- */

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** "Agosto 2026" (m es 1-12). */
export function monthLabel(y: number, m: number): string {
  return `${MESES[m - 1]} ${y}`
}

/** Cantidad de días de un mes (m es 1-12). Usa fecha local, sin toISOString. */
export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

/** Día de la semana del 1° del mes, con Lunes = 0 ... Domingo = 6. */
export function weekdayMondayFirst(y: number, m: number): number {
  const jsDay = new Date(y, m - 1, 1).getDay() // 0=Dom ... 6=Sáb
  return (jsDay + 6) % 7
}

/** Suma (o resta) meses. Devuelve {y, m} con m en 1-12. */
export function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 }
}

/** Primer día del mes en formato YYYY-MM-01. */
export function firstOfMonthISO(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}-01`
}

/** Separa una fecha YYYY-MM-DD en {y, m, d}. */
export function ymd(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/** Arma una fecha YYYY-MM-DD a partir de año, mes (1-12) y día. */
export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** ¿(ay,am) es anterior o igual a (by,bm)? (meses 1-12) */
export function monthLte(ay: number, am: number, by: number, bm: number): boolean {
  return ay < by || (ay === by && am <= bm)
}
