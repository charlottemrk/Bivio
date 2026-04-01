import { getInitials } from '../lib/utils'

const PALETTE = [
  { bg: '#eaf5c4', fg: '#4a8a00' },
  { bg: '#fef3eb', fg: '#c2621a' },
  { bg: '#d6f5ea', fg: '#1a7a5e' },
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#fef3c7', fg: '#92400e' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
]

function colorFor(name?: string | null) {
  if (!name) return PALETTE[0]
  return PALETTE[name.charCodeAt(0) % PALETTE.length]
}

type AvatarProps = {
  name?: string | null
  size?: number
  color?: string
}

export function Avatar({ name, size = 36, color }: AvatarProps) {
  const letters = getInitials(name ?? null)
  const { bg, fg } = color ? { bg: `${color}22`, fg: color } : colorFor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36,
    }}>
      {letters}
    </div>
  )
}

type StackProps = {
  items: { name?: string | null; color?: string }[]
  max?: number
  size?: number
}

export function AvatarStack({ items, max = 4, size = 26 }: StackProps) {
  const shown = items.slice(0, max)
  const rest  = items.length - max
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((item, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: shown.length - i }}>
          <Avatar name={item.name} size={size} color={item.color} />
        </div>
      ))}
      {rest > 0 && (
        <div style={{
          marginLeft: -size * 0.3, width: size, height: size, borderRadius: '50%',
          background: 'var(--color-violet-light)', color: 'var(--color-text-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.3, fontWeight: 700,
        }}>
          +{rest}
        </div>
      )}
    </div>
  )
}
