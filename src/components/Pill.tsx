type Props = {
  children: React.ReactNode
  selected: boolean
  onClick: () => void
  color?: 'violet' | 'peach' | 'green'
}

const SELECTED_BG: Record<string, string> = {
  violet: 'var(--color-violet)',
  peach:  'var(--color-peach)',
  green:  'var(--color-green)',
}

export function Pill({ children, selected, onClick, color = 'violet' }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 99,
        fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        border: `1.5px solid ${selected ? SELECTED_BG[color] : 'var(--color-border-2)'}`,
        background: selected ? SELECTED_BG[color] : 'var(--color-surface)',
        color: selected ? '#fff' : 'var(--color-text-2)',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}
