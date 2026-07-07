import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function safeParseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  const raw = String(value).trim()
  if (!raw) return null

  let normalized = raw
  const looksLikeDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw)
  if (looksLikeDateOnly) {
    normalized = `${raw}T12:00:00`
  }

  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

export function formatDateBR(value: unknown, fallback: string = '—'): string {
  const d = safeParseDate(value)
  if (!d) return fallback
  return d.toLocaleDateString('pt-BR')
}

export function formatDateTimeBR(value: unknown, fallback: string = '—'): string {
  const d = safeParseDate(value)
  if (!d) return fallback
  return d.toLocaleString('pt-BR')
}

export function safeTimeOf(value: unknown): number {
  const d = safeParseDate(value)
  return d ? d.getTime() : 0
}

/**
 * Parse a decimal number from a string that may use either a period or a
 * comma as the decimal separator. Returns NaN for empty / invalid input.
 *
 * Why this exists: <input type="number"> ignores commas in pt-BR locales, and
 * parseFloat("30,5") returns 30 (stops at the comma). Operators in the field
 * type "30,5" naturally, so we normalize before parsing.
 *
 * Handles the common cases:
 *   parseDecimal('30,5')     => 30.5
 *   parseDecimal('30.5')     => 30.5
 *   parseDecimal(' 40,5 ')   => 40.5
 *   parseDecimal('1.234,56') => 1234.56  (BR thousands + decimal)
 *   parseDecimal('1,234.56') => 1234.56  (EN thousands + decimal)
 *   parseDecimal('')          => NaN
 *   parseDecimal('abc')       => NaN
 *   parseDecimal(42)          => 42
 */
export function parseDecimal(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (value === null || value === undefined) return NaN
  const raw = String(value).trim()
  if (!raw) return NaN

  // Strip internal whitespace, then normalize the decimal separator to '.'.
  let normalized = raw.replace(/\s+/g, '').replace(/,/g, '.')

  // If we ended up with more than one dot, treat the last one as the decimal
  // separator and the rest as thousands grouping. Covers "1.234,56" and
  // "1,234.56" and "1.234.567" (without a decimal) — we just collapse.
  const dotCount = (normalized.match(/\./g) || []).length
  if (dotCount > 1) {
    const lastDot = normalized.lastIndexOf('.')
    const intPart = normalized.slice(0, lastDot).replace(/\./g, '')
    const decPart = normalized.slice(lastDot + 1)
    normalized = `${intPart}.${decPart}`
  }

  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

/**
 * True when the string represents a parseable decimal number. Useful for
 * early-return validation in forms (e.g. "show error if not isDecimal(...)").
 */
export function isDecimal(value: unknown): boolean {
  return Number.isFinite(parseDecimal(value))
}

