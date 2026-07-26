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
