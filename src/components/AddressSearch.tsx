import { useState } from 'react'
import { searchAddressDebounced, type GeoResult } from '../lib/geocoding'

type Props = {
  value: string
  onChange: (value: string, geo?: GeoResult) => void
  placeholder?: string
  label?: string
  hint?: string
}

export function AddressSearch({ value, onChange, placeholder, label, hint }: Props) {
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [focused, setFocused]         = useState(false)

  const handleInput = (text: string) => {
    onChange(text)
    if (text.length >= 3) {
      setLoading(true)
      searchAddressDebounced(text, results => {
        setSuggestions(results)
        setOpen(results.length > 0)
        setLoading(false)
      })
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  const handleSelect = (r: GeoResult) => {
    const short = r.label.split(',').slice(0, 2).join(',').trim()
    onChange(short, r)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div style={{ position: 'relative' }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{label}</label>}

      <div style={{ position: 'relative' }}>
        {/* Pin icon */}
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5C12.5 3.515 10.485 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { setFocused(true); suggestions.length > 0 && setOpen(true) }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 150) }}
          placeholder={placeholder}
          style={{
            width: '100%', height: 46, paddingLeft: 40, paddingRight: 14,
            background: 'var(--color-surface)',
            border: `1.5px solid ${focused ? 'var(--color-violet)' : 'var(--color-border-2)'}`,
            borderRadius: 14, fontSize: 15, color: 'var(--color-text)', fontFamily: 'inherit',
            boxShadow: focused ? '0 0 0 3px rgba(124,196,0,0.15)' : 'none',
            outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        {loading && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <div className="w-4 h-4 border-2 border-border border-t-violet rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 50, width: '100%', marginTop: 6,
          background: 'var(--color-surface)', borderRadius: 14,
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(26,26,24,0.12)',
          overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => {
            const parts = s.label.split(',')
            const main  = parts[0]
            const sub   = parts.slice(1, 3).join(',').trim()
            return (
              <button
                key={i}
                type="button"
                onMouseDown={() => handleSelect(s)}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  background: 'none', border: 'none',
                  borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                  fontFamily: 'inherit',
                }}
              >
                <svg style={{ color: 'var(--color-text-3)', flexShrink: 0, marginTop: 2 }} width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5C12.5 3.515 10.485 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{main}</div>
                  {sub && <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{sub}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
      {hint && <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-3)' }}>{hint}</p>}
    </div>
  )
}
