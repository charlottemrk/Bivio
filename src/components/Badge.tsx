import type { ReactNode, CSSProperties } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'violet' | 'orange'

const VARS: Record<Variant, CSSProperties> = {
  default: { background: 'var(--color-surface-2)', color: 'var(--color-text-2)' },
  violet:  { background: 'var(--color-violet-light)', color: 'var(--color-violet)' },
  success: { background: 'var(--color-green-light)', color: '#1a7a5e' },
  warning: { background: 'var(--color-amber-light)', color: 'var(--color-amber)' },
  error:   { background: 'var(--color-red-light)', color: 'var(--color-red)' },
  orange:  { background: 'var(--color-peach-light)', color: '#b05a1a' },
}

type Props = {
  children: ReactNode
  variant?: Variant
  color?: string   // custom hex for dynamic badge colors
}

export function Badge({ children, variant = 'default', color }: Props) {
  const style: CSSProperties = color
    ? { background: `${color}1a`, color }
    : VARS[variant]

  return (
    <span style={{
      ...style,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 8,
      fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
