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

