import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Pill } from '../components/Pill'
import { Avatar } from '../components/Avatar'
import { Card, SectionLabel } from '../components/Card'

const TRANSPORT_LABELS: Record<string, string> = { car: 'Voiture', train: 'Train / TER', bus: 'Bus / car' }

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef          = useRef<HTMLInputElement>(null)
  const [name, setName]         = useState('')
  const [phone, setPhone]     = useState('')
  const [city, setCity]       = useState('')
  const [hasLicense, setHasLicense]               = useState(false)
  const [drivesRegularly, setDrivesRegularly]     = useState(false)
  const [transportModes, setTransportModes]       = useState<string[]>(['car', 'train', 'bus'])
  const [defaultConstraints, setDefaultConstraints] = useState<string[]>([])
  const [shareContact, setShareContact]           = useState(true)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setCity(profile.city || '')
      setHasLicense(profile.has_license)
      setDrivesRegularly(profile.drives_regularly)
      setTransportModes(profile.transport_modes || ['car', 'train', 'bus'])
      setDefaultConstraints(profile.default_constraints || [])
      setShareContact(profile.share_contact)
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      setAvatarUrl(url)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      await refreshProfile()
    }
    setUploadingAvatar(false)
  }

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      name, phone, city, has_license: hasLicense, drives_regularly: drivesRegularly,
      transport_modes: transportModes, default_constraints: defaultConstraints,
      share_contact: shareContact, updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaving(false)
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const row: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
  const flexRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }

  return (
    <div className="animate-fade-up" style={{ paddingTop: 8 }}>

      {/* ── Back ── */}
      <button
        onClick={() => navigate('/events')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', padding: '4px 0 16px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← Mes événements
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 24 }}>
        {/* Avatar cliquable */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={name} size={64} src={avatarUrl} />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--color-violet)', border: '2px solid var(--color-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
              fontSize: 12, lineHeight: 1,
            }}
            aria-label="Changer la photo"
          >
            {uploadingAvatar ? '…' : '📷'}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)' }}>{name || 'Mon profil'}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{user?.email}</div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 12, color: 'var(--color-violet)', fontWeight: 600,
              fontFamily: 'inherit', marginTop: 2,
            }}
          >
            {avatarUrl ? 'Changer la photo' : '+ Ajouter une photo'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        <Card>
          <SectionLabel>Informations</SectionLabel>
          <div style={row}>
            <Input value={name} onChange={setName} label="Nom complet" placeholder="Léa Moreau" />
            <Input value={phone} onChange={setPhone} label="Téléphone" placeholder="06 12 34 56 78" type="tel" />
            <Input value={city} onChange={setCity} label="Ville" placeholder="Paris, Lyon..." />
          </div>
        </Card>

        <Card>
          <SectionLabel>Permis & conduite</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: hasLicense ? 10 : 0 }}>
            <Pill selected={hasLicense} onClick={() => setHasLicense(true)}>J'ai le permis</Pill>
            <Pill selected={!hasLicense} onClick={() => setHasLicense(false)}>Pas de permis</Pill>
          </div>
          {hasLicense && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill selected={drivesRegularly} onClick={() => setDrivesRegularly(true)}>Conduis régulièrement</Pill>
              <Pill selected={!drivesRegularly} onClick={() => setDrivesRegularly(false)}>Rarement</Pill>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>Modes de transport</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['car', 'train', 'bus'].map(mode => (
              <Pill key={mode} selected={transportModes.includes(mode)} onClick={() => toggle(transportModes, setTransportModes, mode)}>
                {TRANSPORT_LABELS[mode]}
              </Pill>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Contraintes habituelles</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['PMR', 'Animal', 'Enfant'].map(c => (
              <Pill key={c} selected={defaultConstraints.includes(c)} onClick={() => toggle(defaultConstraints, setDefaultConstraints, c)} color="peach">
                {c}
              </Pill>
            ))}
          </div>
        </Card>

        <Card>
          <div style={flexRow}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Partager mes coordonnées</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>Visible après confirmation du covoit'</div>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setShareContact(!shareContact)}
              style={{
                width: 44, height: 24, borderRadius: 99, flexShrink: 0, border: 'none', cursor: 'pointer',
                background: shareContact ? 'var(--color-violet)' : 'var(--color-border-2)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: shareContact ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </Card>

        <Button onClick={handleSave} disabled={saving || !name} size="lg" fullWidth>
          {saved ? '✓ Profil enregistré' : saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>

        <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

        <button
          onClick={signOut}
          style={{ width: '100%', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', fontFamily: 'inherit' }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
