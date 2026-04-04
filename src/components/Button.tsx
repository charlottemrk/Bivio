import { useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

const BASE: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', border: 'none',
  transition: 'opacity 0.15s, transform 0.1s, filter 0.15s',
  WebkitTapHighlightColor: 'transparent',
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary:   { background: 'var(--color-violet)', color: '#fff' },
  secondary: { background: 'var(--color-surface)', color: 'var(--color-text)', border: '1.5px solid var(--color-border-2)' },
  ghost:     { background: 'transparent', color: 'var(--color-text-2)' },
  danger:    { background: 'var(--color-red-light)', color: 'var(--color-red)' },
}

const SIZES: Record<Size, CSSProperties> = {
  sm: { height: 34,  padding: '0 14px', fontSize: 13, borderRadius: 12 },
  md: { height: 42,  padding: '0 18px', fontSize: 14, borderRadius: 14 },
  lg: { height: 50,  padding: '0 22px', fontSize: 15, borderRadius: 16 },
}

type Props = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  style?: CSSProperties
}

export function Button({ children, onClick, disabled, type = 'button', variant = 'primary', size = 'md', fullWidth, style }: Props) {
  const [hovered, setHovered] = useState(false)

  const hoverStyle: CSSProperties = !disabled && hovered ? (
    variant === 'primary'
      ? { opacity: 0.88 }
      : variant === 'danger'
        ? { filter: 'brightness(0.96)' }
        : { background: 'var(--color-surface-2)' }
  ) : {}

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...SIZES[size],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...hoverStyle,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
