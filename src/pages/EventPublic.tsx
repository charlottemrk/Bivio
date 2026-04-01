import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Avatar, AvatarStack } from '../components/Avatar'
import { formatDateRange } from '../lib/utils'

type Event = {
  id: string; short_id: string; organizer_id: string; name: string; emoji: string
  event_type: string; date_start: string; date_end: string | null
  destination_address: string; description: string | null; contribution_policy: string
}
type Guest = {
  id: string; profile_id: string; status: string; departure_address: string
  profiles: { name: string | null }
}

const TYPE_ACCENT: Record<string, string> = {
  weekend: 'var(--color-primary-light)', wedding: '#fce7f3',
  festival: 'var(--color-peach-light)',  retreat: 'var(--color-green-light)',
  sport: '#dbeafe',                       other: 'var(--color-primary-light)',
}

export default function EventPublic() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const [event, setEvent]       = useState<Event | null>(null)
  const [guests, setGuests]     = useState<Guest[]>([])
  const [organizer, setOrganizer] = useState<{ name: string | null } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [myReg, setMyReg]       = useState<Guest | null>(null)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    if (!shortId) return
    const load = async () => {
      const { data: ev } = await supabase.from('events').select('*').eq('short_id', shortId).single()
      if (!ev) { setLoading(false); return }
      setEvent(ev)
      const [guestsRes, orgRes] = await Promise.all([
        supabase.from('event_guests').select('id, profile_id, status, departure_address, profiles(name)').eq('event_id', ev.id),
        supabase.from('profiles').select('name').eq('id', ev.organizer_id).single(),
      ])
      setGuests((guestsRes.data as any) || [])
      setOrganizer(orgRes.data)
      if (user) setMyReg((guestsRes.data as any)?.find((g: any) => g.profile_id === user.id) || null)
      setLoading(false)
    }
    load()
  }, [shortId, user])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) await navigator.share({ title: event?.name, url })
    else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleJoin = () => {
    if (!user) navigate(`/auth?redirect=/event/${shortId}/join`)
    else navigate(`/event/${shortId}/join`)
  }

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Chargement...</div>
  if (!event)  return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Event introuvable</div>

  const confirmed   = guests.filter(g => g.status === 'confirmed').length
  const pending     = guests.filter(g => g.status === 'registered').length
  const isOrganizer = user?.id === event.organizer_id
  const accent      = TYPE_ACCENT[event.event_type] || TYPE_ACCENT.other

  return (
    <div className="animate-fade-up" style={{ paddingTop: 8 }}>

      {/* Hero */}
      <div style={{
        margin: '-20px -20px 20px', padding: '24px 20px 20px',
        background: accent,
      }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>{event.emoji}</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.5px' }}>{event.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-2)', marginBottom: 4, fontWeight: 600 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 7h12M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {formatDateRange(event.date_start, event.date_end)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16, fontWeight: 600 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5C12.5 3.515 10.485 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          {event.destination_address}
        </div>
        {organizer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={organizer.name} size={28} />
            <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
              Organisé par <strong style={{ color: 'var(--color-text)' }}>{organizer.name || 'Organisateur'}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { v: guests.length, l: 'Inscrits' },
          { v: confirmed,     l: 'Confirmés' },
          { v: pending,       l: 'En attente' },
        ].map(s => (
          <div key={s.l} style={{
            background: 'var(--color-surface)', borderRadius: 16,
            border: '1px solid var(--color-border)', padding: '12px 8px', textAlign: 'center',
            boxShadow: '0 1px 3px rgba(26,26,24,0.05)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      {event.description && (
        <Card style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.6 }}>{event.description}</p>
        </Card>
      )}

      {/* Guest list */}
      {guests.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Qui vient</span>
            <AvatarStack items={guests.map(g => ({ name: (g.profiles as any)?.name }))} max={5} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {guests.slice(0, 5).map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={(g.profiles as any)?.name} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{(g.profiles as any)?.name || 'Invité'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.departure_address}</div>
                </div>
                <Badge variant={g.status === 'confirmed' ? 'success' : g.status === 'matched' ? 'violet' : 'warning'}>
                  {g.status === 'confirmed' ? 'Confirmé' : g.status === 'matched' ? 'Matché' : 'En attente'}
                </Badge>
              </div>
            ))}
          </div>
          {guests.length > 5 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 12 }}>+{guests.length - 5} autres inscrits</p>
          )}
        </Card>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isOrganizer ? (
          <>
            <Button onClick={() => navigate(`/event/${shortId}/dashboard`)} size="lg" fullWidth>
              Dashboard organisateur
            </Button>
            <Button onClick={handleShare} variant="secondary" size="lg" fullWidth>
              {copied ? '✓ Lien copié !' : 'Partager le lien'}
            </Button>
          </>
        ) : myReg ? (
          <>
            {myReg.status === 'registered' && (
              <Button onClick={() => navigate(`/event/${shortId}/matches`)} size="lg" fullWidth>
                Voir mes options de covoit' →
              </Button>
            )}
            {myReg.status === 'confirmed' && (
              <Button onClick={() => navigate(`/event/${shortId}/confirmed`)} size="lg" fullWidth>
                Voir ma confirmation →
              </Button>
            )}
            <Button onClick={handleShare} variant="secondary" size="lg" fullWidth>
              {copied ? '✓ Lien copié !' : "Partager à d'autres"}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleJoin} size="lg" fullWidth>
              Rejoindre l'event
            </Button>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', fontWeight: 600 }}>
              Covoit' organisé automatiquement · gratuit
            </p>
          </>
        )}
      </div>
    </div>
  )
}
