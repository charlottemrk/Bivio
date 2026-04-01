import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'login' | 'signup'

export default function Auth() {
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)
    if (mode === 'login') {
      const { error } = await signInWithPassword(email, password)
      setLoading(false)
      if (error) setError('Email ou mot de passe incorrect.')
      else navigate('/')
    } else {
      const { error } = await signUpWithPassword(email, password)
      setLoading(false)
      if (error) setError('Une erreur est survenue. Cet email est peut-être déjà utilisé.')
      else setSent(true)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError('Connexion Google impossible.')
  }

  if (sent) return (
    <div className="animate-fade-up" style={{ paddingTop: 64, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10 }}>Vérifie tes mails</h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 28px' }}>
        On a envoyé un lien de confirmation à <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
      </p>
      <button onClick={() => setSent(false)} style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
        Utiliser un autre email
      </button>
    </div>
  )

  return (
    <div className="animate-fade-up" style={{ paddingTop: 40, maxWidth: 380, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--color-violet-light)', color: 'var(--color-violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, marginBottom: 20 }}>
          ✦
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', marginBottom: 8, letterSpacing: '-0.5px' }}>
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-2)' }}>
          {mode === 'login' ? 'Content de te revoir !' : 'Rejoins Bivio en quelques secondes.'}
        </p>
      </div>

      {/* Google */}
      <button
        onClick={handleGoogle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 14, border: '1.5px solid var(--color-border)',
          background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16,
          transition: 'border-color 0.15s',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continuer avec Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input value={email} onChange={setEmail} placeholder="nom@email.com" type="email" label="Adresse email" autoFocus />
        <Input value={password} onChange={setPassword} placeholder="••••••••" type="password" label="Mot de passe" />

        {error && (
          <div style={{ background: 'var(--color-red-light)', color: 'var(--color-red)', fontSize: 13, borderRadius: 12, padding: '10px 14px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <Button type="submit" disabled={!email || !password || loading} size="lg" fullWidth>
          {loading ? '...' : mode === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
        </Button>
      </form>

      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 20, paddingTop: 16, textAlign: 'center' }}>
        {mode === 'login' ? (
          <>
            <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Pas encore de compte ? </span>
            <button onClick={() => { setMode('signup'); setError(null) }} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              S'inscrire
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Déjà un compte ? </span>
            <button onClick={() => { setMode('login'); setError(null) }} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Se connecter
            </button>
          </>
        )}
      </div>
    </div>
  )
}
