import type { CSSProperties } from 'react'

type Props = {
  role: 'driver' | 'passenger'
  style?: CSSProperties
}

const ROLE_CONFIG = {
  driver: {
    emoji: '🚗',
    label: 'Conducteur',
    background: 'var(--color-violet-light)',
    color: 'var(--color-violet-dark)',
    border: '1px solid var(--color-violet)',
  },
  passenger: {
    emoji: '🙋',
    label: 'Passager',
    background: 'var(--color-peach-light)',
    color: '#b05a1a',
    border: '1px solid var(--color-peach)',
  },
}

export function RoleChip({ role, style }: Props) {
  const config = ROLE_CONFIG[role]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 700,
      background: config.background,
      color: config.color,
      border: config.border,
      ...style,
    }}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}
