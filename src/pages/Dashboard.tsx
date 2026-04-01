import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Card, SectionLabel } from '../components/Card'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'

export default function Dashboard() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const [event, setEvent]   = useState<any>(null)
  const [guests, setGuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!shortId || !user) return
    const load = async () => {
      const { data: ev } = await supabase.from('events').select('*').eq('short_id', shortId).single()
      if (!ev || ev.organizer_id !== user.id) { setLoading(false); return }
      setEvent(ev)
      const { data: g } = await supabase.from('event_guests').select('*, profiles(name, phone, city)').eq('event_id', ev.id).order('created_at', { ascending: true })
      setGuests(g || [])
      setLoading(false)
    }
    load()
  }, [shortId, user])

  const handleShare = async () => {
    const url = `${window.location.origin}/event/${shortId}`
    if (navigator.share) await navigator.share({ title: event?.name, url })
    else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Chargement...</div>
  if (!event)  return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Accès non autorisé</div>

  const confirmed    = guests.filter(g => g.status === 'confirmed')
  const matched      = guests.filter(g => g.status === 'matched')
  const pending      = guests.filter(g => g.status === 'registered')
  const drivers      = guests.filter(g => g.drives_this_event)
  const matchedTotal = confirmed.length + matched.length
  const progress     = guests.length > 0 ? (matchedTotal / guests.length) * 100 : 0

  return (
    <div className="animate-fade-up" style={{ paddingTop: 8 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 20 }}>
        <div>
          <div style={{ fontSize: 28, marginBottom: 4 }}>{event.emoji}</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2, letterSpacing: '-0.5px' }}>{event.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 3, fontWeight: 600 }}>{event.date_start}</p>
        </div>
        <Button onClick={handleShare} variant="secondary" size="sm">
          {copied ? '✓ Copié' : 'Partager'}
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { l: 'Inscrits',     v: guests.length,    c: 'var(--color-text)' },
          { l: 'Matchés',      v: matchedTotal,     c: 'var(--color-violet)' },
          { l: 'Confirmés',    v: confirmed.length, c: 'var(--color-green)' },
          { l: 'Conducteurs',  v: drivers.length,   c: 'var(--color-peach)' },
        ].map(s => (
          <div key={s.l} style={{
            background: 'var(--color-surface)', borderRadius: 16, padding: '10px 6px', textAlign: 'center',
            border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(26,26,24,0.04)',
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700, marginTop: 3, lineHeight: 1.2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Progression des matchings</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-violet)' }}>{matchedTotal}/{guests.length}</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--color-border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-violet)', borderRadius: 99, transition: 'width 0.5s' }} />
        </div>
        {progress === 100 && guests.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-green)', marginTop: 8, fontWeight: 700 }}>✓ Tout le monde est matché !</p>
        )}
      </Card>

      {/* Alert */}
      {pending.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'var(--color-amber-light)', borderRadius: 16, padding: '12px 14px', marginBottom: 12,
        }}>
          <span style={{ color: 'var(--color-amber)', fontSize: 16, flexShrink: 0 }}>⚠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-amber)', marginBottom: 2 }}>
              {pending.length} invité{pending.length > 1 ? 's' : ''} sans covoit'
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-amber)', opacity: 0.8 }}>
              {pending.map(g => g.profiles?.name || 'Invité').join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Guest list */}
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Tous les inscrits ({guests.length})</SectionLabel>
        {guests.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 12 }}>Aucun inscrit pour le moment</p>
            <Button onClick={handleShare} variant="secondary" size="sm">Partager le lien</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {guests.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={g.profiles?.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{g.profiles?.name || 'Invité'}</span>
                    {g.drives_this_event && <Badge color="#F4A261">🚗 Conducteur</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.departure_address}{g.seats_available > 0 && ` · ${g.seats_available} places`}
                  </div>
                </div>
                <Badge variant={g.status === 'confirmed' ? 'success' : g.status === 'matched' ? 'violet' : 'warning'}>
                  {g.status === 'confirmed' ? 'Confirmé' : g.status === 'matched' ? 'Matché' : 'En attente'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button onClick={handleShare} size="lg" fullWidth>
          {copied ? '✓ Lien copié !' : "Partager le lien d'inscription"}
        </Button>
        <Button onClick={() => navigate(`/event/${shortId}`)} variant="secondary" size="lg" fullWidth>
          Page publique
        </Button>
      </div>
    </div>
  )
}
