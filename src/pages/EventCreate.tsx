import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { Input, TextArea } from '../components/Input'
import { AddressSearch } from '../components/AddressSearch'
import { Card, SectionLabel } from '../components/Card'
import { generateShortId } from '../lib/utils'
import type { GeoResult } from '../lib/geocoding'

const EVENT_TYPES = [
  { id: 'weekend', label: 'Weekend', emoji: '🏡' },
  { id: 'wedding', label: 'Mariage', emoji: '💒' },
  { id: 'festival', label: 'Festival', emoji: '🎪' },
  { id: 'retreat', label: 'Retraite', emoji: '🧘' },
  { id: 'sport', label: 'Sport', emoji: '⛰️' },
  { id: 'other', label: 'Autre', emoji: '🎉' },
]

const CONTRIBUTION_POLICIES = [
  { id: 'no_preference', label: 'Pas de préférence', desc: 'Libre entre les participants' },
  { id: 'fixed_per_km',  label: 'Prix fixe au km',   desc: 'Calculé selon la distance' },
  { id: 'free_gift',     label: 'Gratuit + cadeau',   desc: 'Le conducteur précise ce qu\'il aimerait' },
]

export default function EventCreate() {
  const { user, loading: authLoading, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving]                 = useState(false)
  const [name, setName]                     = useState('')
  const [eventType, setEventType]           = useState('weekend')
  const [dateStart, setDateStart]           = useState('')
  const [dateEnd, setDateEnd]               = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [destinationGeo, setDestinationGeo] = useState<GeoResult | null>(null)
  const [description, setDescription]       = useState('')
  const [contributionPolicy, setContributionPolicy] = useState('no_preference')

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode]           = useState<'signup' | 'login'>('signup')
  const [authEmail, setAuthEmail]         = useState('')
  const [authPassword, setAuthPassword]   = useState('')
  const [authSent, setAuthSent]           = useState(false)
  const [authError, setAuthError]         = useState<string | null>(null)
  const [authLoading2, setAuthLoading2]   = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      const t = setTimeout(() => setShowAuthModal(true), 400)
      return () => clearTimeout(t)
    }
  }, [authLoading, user])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail || !authPassword) return
    setAuthLoading2(true)
    setAuthError(null)
    if (authMode === 'login') {
      const { error } = await signInWithPassword(authEmail, authPassword)
      setAuthLoading2(false)
      if (error) setAuthError('Email ou mot de passe incorrect.')
    } else {
      const { error } = await signUpWithPassword(authEmail, authPassword)
      setAuthLoading2(false)
      if (error) setAuthError('Une erreur est survenue. Cet email est peut-être déjà utilisé.')
      else setAuthSent(true)
    }
  }

  const handleAuthGoogle = async () => {
    setAuthError(null)
    const { error } = await signInWithGoogle()
    if (error) setAuthError('Connexion Google impossible.')
  }

  const selectedType = EVENT_TYPES.find(t => t.id === eventType)

  const handleCreate = async () => {
    if (!user || !name || !dateStart || !destinationAddress) return
    setSaving(true)
    const shortId = generateShortId()
    const { error } = await supabase.from('events').insert({
      organizer_id: user.id, short_id: shortId,
      name, emoji: selectedType?.emoji || '🎉', event_type: eventType,
      date_start: dateStart, date_end: dateEnd || null,
      destination_address: destinationAddress,
      destination_lat: destinationGeo?.lat || null,
      destination_lng: destinationGeo?.lng || null,
      description: description || null,
      contribution_policy: contributionPolicy,
    })
    setSaving(false)
    if (!error) navigate(`/event/${shortId}`)
  }

  return (
    <div style={{ position: 'relative' }}>

      {/* Auth modal overlay */}
      {showAuthModal && !user && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          background: 'rgba(26,26,24,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.25s ease',
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 24,
            padding: '32px 28px',
            width: '100%',
            maxWidth: 380,
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          }}>
            {authSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>Vérifie tes mails</h2>
                <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 20 }}>
                  Un lien de confirmation a été envoyé à <strong style={{ color: 'var(--color-text)' }}>{authEmail}</strong>
                </p>
                <button onClick={() => setAuthSent(false)} style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                  Utiliser un autre email
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <img src="/bivio-light.svg" alt="Bivio" style={{ height: 26, marginBottom: 16 }} />
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.4px' }}>
                    {authMode === 'login' ? 'Connexion' : 'Bienvenue sur Bivio'}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
                    {authMode === 'login' ? 'Content de te revoir !' : 'Crée un compte pour continuer.'}
                  </p>
                </div>

                {/* Google */}
                <button
                  onClick={handleAuthGoogle}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: '11px 16px', borderRadius: 12, border: '1.5px solid var(--color-border)',
                    background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 14,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continuer avec Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>ou</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                </div>

                <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Input value={authEmail} onChange={setAuthEmail} placeholder="nom@email.com" type="email" label="Adresse email" autoFocus />
                  <Input value={authPassword} onChange={setAuthPassword} placeholder="••••••••" type="password" label="Mot de passe" />
                  {authError && (
                    <div style={{ background: 'var(--color-red-light)', color: 'var(--color-red)', fontSize: 13, borderRadius: 12, padding: '10px 14px', fontWeight: 600 }}>
                      {authError}
                    </div>
                  )}
                  <Button type="submit" disabled={!authEmail || !authPassword || authLoading2} size="lg" fullWidth>
                    {authLoading2 ? '...' : authMode === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
                  </Button>
                </form>

                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 16, paddingTop: 14, textAlign: 'center' }}>
                  {authMode === 'signup' ? (
                    <>
                      <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Déjà un compte ? </span>
                      <button onClick={() => { setAuthMode('login'); setAuthError(null); setAuthPassword('') }} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                        Se connecter
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Pas encore de compte ? </span>
                      <button onClick={() => { setAuthMode('signup'); setAuthError(null); setAuthPassword('') }} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                        S'inscrire
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    <div className="animate-fade-up" style={{ paddingTop: 8, filter: showAuthModal && !user ? 'blur(2px)' : 'none', pointerEvents: showAuthModal && !user ? 'none' : 'auto', transition: 'filter 0.3s' }}>
      <div style={{ paddingBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.5px', marginBottom: 6 }}>Créer un event</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>Remplis les infos essentielles, tu pourras éditer plus tard</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Type */}
        <Card>
          <SectionLabel>Type d'event</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {EVENT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setEventType(t.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 6px', borderRadius: 14, border: `1.5px solid`,
                  borderColor: eventType === t.id ? 'var(--color-violet)' : 'var(--color-border)',
                  background: eventType === t.id ? 'var(--color-violet-light)' : 'var(--color-surface)',
                  color: eventType === t.id ? 'var(--color-violet)' : 'var(--color-text-2)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{t.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{t.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Info */}
        <Card>
          <SectionLabel>Informations</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input value={name} onChange={setName} label="Nom de l'event" placeholder="Weekend Château de Léa" autoFocus />
            <TextArea value={description} onChange={setDescription} label="Description (optionnel)" placeholder="Gîte avec piscine, prévoir serviette ☀️" rows={2} />
          </div>
        </Card>

        {/* Dates & destination */}
        <Card>
          <SectionLabel>Quand & où</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Input value={dateStart} onChange={setDateStart} label="Début" type="date" />
            <Input value={dateEnd} onChange={setDateEnd} label="Fin (optionnel)" type="date" />
          </div>
          <AddressSearch
            value={destinationAddress}
            onChange={(val, geo) => { setDestinationAddress(val); if (geo) setDestinationGeo(geo) }}
            label="Destination"
            placeholder="Domaine des Pins, Fontainebleau..."
          />
        </Card>

        {/* Contribution */}
        <Card>
          <SectionLabel>Contribution des passagers</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CONTRIBUTION_POLICIES.map(p => {
              const sel = contributionPolicy === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setContributionPolicy(p.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 14,
                    border: `1.5px solid ${sel ? 'var(--color-violet)' : 'var(--color-border)'}`,
                    background: sel ? 'var(--color-violet-light)' : 'var(--color-surface)',
                    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'flex-start', gap: 12,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: `2px solid ${sel ? 'var(--color-violet)' : 'var(--color-border-2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-violet)' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: sel ? 'var(--color-violet)' : 'var(--color-text)', marginBottom: 2 }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{p.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <Button onClick={handleCreate} disabled={!name || !dateStart || !destinationAddress || saving} size="lg" fullWidth>
          {saving ? 'Création...' : "Créer l'event →"}
        </Button>
      </div>
    </div>
    </div>
  )
}
