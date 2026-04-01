import { useState } from 'react'

type InputProps = {
  value: string
  onChange: (v: string) => void
  label?: string
  placeholder?: string
  type?: string
  hint?: string
  autoFocus?: boolean
}

export function Input({ value, onChange, label, placeholder, type = 'text', hint, autoFocus }: InputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', height: 46, padding: '0 14px',
          background: 'var(--color-surface)',
          border: `1.5px solid ${focused ? 'var(--color-violet)' : 'var(--color-border-2)'}`,
          borderRadius: 14, fontSize: 15, color: 'var(--color-text)',
          fontFamily: 'inherit',
          boxShadow: focused ? '0 0 0 3px rgba(124,196,0,0.15)' : 'none',
          outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      />
      {hint && <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-3)' }}>{hint}</p>}
    </div>
  )
}

type TextAreaProps = {
  value: string
  onChange: (v: string) => void
  label?: string
  placeholder?: string
  hint?: string
  rows?: number
}

export function TextArea({ value, onChange, label, placeholder, hint, rows = 3 }: TextAreaProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px', resize: 'none',
          background: 'var(--color-surface)',
          border: `1.5px solid ${focused ? 'var(--color-violet)' : 'var(--color-border-2)'}`,
          borderRadius: 14, fontSize: 15, color: 'var(--color-text)',
          fontFamily: 'inherit',
          boxShadow: focused ? '0 0 0 3px rgba(124,196,0,0.15)' : 'none',
          outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      />
      {hint && <p style={{ marginTop: 5, fontSize: 12, color: 'var(--color-text-3)' }}>{hint}</p>}
    </div>
  )
}

type SelectProps = {
  value: string
  onChange: (v: string) => void
  label?: string
  children: React.ReactNode
}

export function Select({ value, onChange, label, children }: SelectProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', height: 46, padding: '0 14px', appearance: 'none',
          background: 'var(--color-surface)',
          border: `1.5px solid ${focused ? 'var(--color-violet)' : 'var(--color-border-2)'}`,
          borderRadius: 14, fontSize: 15, color: 'var(--color-text)',
          fontFamily: 'inherit',
          boxShadow: focused ? '0 0 0 3px rgba(124,196,0,0.15)' : 'none',
          outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {children}
      </select>
    </div>
  )
}
