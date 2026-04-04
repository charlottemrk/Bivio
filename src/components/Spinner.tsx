type Props = {
  message?: string
}

export function Spinner({ message = 'Chargement…' }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 16,
      color: 'var(--color-text-3)',
    }}>
      <div style={{
        width: 24,
        height: 24,
        border: '2px solid var(--color-border)',
        borderTopColor: 'var(--color-violet)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
    </div>
  )
}
