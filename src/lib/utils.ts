import { nanoid } from 'nanoid'

export function generateShortId(): string {
  return nanoid(8)
}

export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

export function formatDateRange(start: string, end?: string | null): string {
  const s = formatDate(start)
  if (!end) return s
  const e = formatDate(end)
  return `${s} — ${e}`
}
