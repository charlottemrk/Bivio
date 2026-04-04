import type { ReactNode, CSSProperties } from 'react'

type Props = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
  padding?: number
}

export function Card({ children, style, onClick, padding = 16 }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 20,
        border: '1px solid var(--color-border)',
        padding,
        boxShadow: '0 1px 3px rgba(26,26,24,0.06), 0 4px 16px rgba(26,26,24,0.06)',
        cursor: onClick ? 'pointer' : undefined,
        transition: onClick ? 'box-shadow 0.15s, transform 0.1s' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
      {children}
    </div>
  )
}

export function Divider() {
  return <div style={{ height: 1, background: 'var(--color-border)', margin: '12px 0' }} />
}

// Keep named export for backward compat
export const Section = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ marginBottom: 16, ...style }}>{children}</div>
)
