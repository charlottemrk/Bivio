import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { formatDateRange } from '../lib/utils'

type EventRow = {
  id: string; short_id: string; name: string; emoji: string
  event_type: string; date_start: string; date_end: string | null
  destination_address: string; organizer_id: string
  cover_image: string | null
}

const TYPE_COLORS: Record<string, string> = {
  weekend: '#d4edda', wedding: '#fce7f3', festival: '#fef3eb',
  retreat: '#d6f5ea', sport: '#dbeafe', other: '#eaf5c4',
}

export default function MyEvents() {
  const { user, profile } = useAuth()
  const navigate           = useNavigate()
  const [organized, setOrganized] = useState<EventRow[]>([])
  const [joined, setJoined]       = useState<EventRow[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const load = async () => {
      const [orgRes, joinRes] = await Promise.all([
        supabase.from('events').select('*').eq('organizer_id', user.id).order('date_start', { ascending: false }),
        supabase.from('event_guests').select('event_id, events(*)').eq('profile_id', user.id),
      ])
      setOrganized(orgRes.data || [])
      const joinedEvents = (joinRes.data || [])
        .map((g: any) => g.events).filter(Boolean)
        .filter((e: EventRow) => e.organizer_id !== user.id)
      setJoined(joinedEvents)
      setLoading(false)
    }
    load()
  }, [user])

  const all      = [...organized, ...joined].sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())
  const now      = new Date()
  const upcoming = all.filter(e => new Date(e.date_start) >= now)
  const past     = all.filter(e => new Date(e.date_start) < now).reverse()

  const firstName = profile?.name?.split(' ')[0] || 'toi'

  // Day greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonjour' : 'Bonsoir'

  const EventCard = ({ event, isPast }: { event: EventRow; isPast?: boolean }) => {
    const isOrg     = event.organizer_id === user?.id
    const dateObj   = new Date(event.date_start)
    const day       = dateObj.getDate()
    const month     = dateObj.toLocaleString('fr-FR', { month: 'short' })
    const location  = event.destination_address?.split(',')[0] || ''
    const fallbackBg = TYPE_COLORS[event.event_type] || TYPE_COLORS.other

    return (
      <div
        onClick={() => navigate(`/event/${event.short_id}`)}
        style={{
          background: 'var(--color-surface)',
          borderRadius: 18,
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'row',
          opacity: isPast ? 0.65 : 1,
          transition: 'box-shadow 0.15s, opacity 0.15s',
          boxShadow: '0 1px 3px rgba(26,26,24,0.05)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(26,26,24,0.10)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(26,26,24,0.05)' }}
      >
        {/* Thumbnail */}
        <div style={{
          width: 90, minWidth: 90, height: 90,
          background: event.cover_image ? `url(${event.cover_image}) center/cover` : fallbackBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: event.cover_image ? 0 : 32,
          flexShrink: 0,
        }}>
          {!event.cover_image && event.emoji}
        </div>

        {/* Content */}
        <div style={{ padding: '12px 14px', flex: 1, minWidth: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Date badge */}
          <div style={{
            flexShrink: 0, width: 38, textAlign: 'center',
            background: 'var(--color-bg)', borderRadius: 10,
            border: '1px solid var(--color-border)',
            padding: '4px 0',
          }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--color-violet)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {month}
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
              {day}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 400, color: 'var(--color-text)',
              lineHeight: 1.3, marginBottom: 3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: "'Instrument Serif', serif",
              fontStyle: 'italic',
            }}>
              {event.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600, marginBottom: 2 }}>
              {formatDateRange(event.date_start, event.date_end)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📍 {location}
            </div>
          </div>

          {/* Role badge */}
          <div style={{
            flexShrink: 0,
            fontSize: 11, fontWeight: 700,
            color: isOrg ? 'var(--color-violet)' : 'var(--color-text-3)',
            background: isOrg ? 'var(--color-violet-light)' : 'var(--color-surface-2)',
            borderRadius: 8, padding: '3px 8px',
          }}>
            {isOrg ? 'Orga' : 'Invité'}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>
      Chargement...
    </div>
  )

  return (
    <div className="animate-fade-up">

      {/* ── Header greeting ── */}
      <div style={{
        paddingTop: 32, paddingBottom: 28,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 4 }}>
            {greeting} 👋
          </div>
          <h1 style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 32, fontWeight: 400, color: 'var(--color-text)',
            letterSpacing: '-0.3px', lineHeight: 1.1,
          }}>
            {firstName}
          </h1>
        </div>
        <button
          onClick={() => navigate('/events/new')}
          style={{
            padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 800,
            background: 'var(--color-violet)', color: 'white',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0, marginTop: 6,
          }}
        >
          + Créer un event
        </button>
      </div>

      {/* ── Empty state ── */}
      {all.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 48, paddingBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
            Aucun event pour le moment
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 28 }}>
            Crée ton premier event en 2 minutes
          </div>
          <Button onClick={() => navigate('/events/new')} size="md">Créer un event →</Button>
        </div>
      )}

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-violet)', display: 'inline-block',
            }} />
            À venir · {upcoming.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}

      {/* ── Past ── */}
      {past.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            Passés · {past.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map(e => <EventCard key={e.id} event={e} isPast />)}
          </div>
        </section>
      )}
    </div>
  )
}
