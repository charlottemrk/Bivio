type Props = { total: number; taken: number; color?: string }

export function SeatBar({ total, taken, color = 'var(--color-violet)' }: Props) {
  const free = Math.max(total - taken, 0)
  const pct  = total > 0 ? Math.min((taken / total) * 100, 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>
          {free > 0 ? `${free} place${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}` : 'Complet'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{taken}/{total}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}
