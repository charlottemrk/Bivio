import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { DEV_BYPASS_AUTH } from '../config'

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
  const navigate = useNavigate()
  const [organized, setOrganized] = useState<EventRow[]>([])
  const [joined, setJoined]       = useState<EventRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    const load = async () => {
      if (!user && !DEV_BYPASS_AUTH) { setLoading(false); return }

      if (DEV_BYPASS_AUTH && !user) {
        const { data } = await supabase.from('events').select('*').order('date_start', { ascending: false })
        setOrganized(data || [])
        setJoined([])
        setLoading(false)
        return
      }

      const [orgRes, joinRes] = await Promise.all([
        supabase.from('events').select('*').eq('organizer_id', user!.id).order('date_start', { ascending: false }),
        supabase.from('event_guests').select('event_id, events(*)').eq('profile_id', user!.id),
      ])
      setOrganized(orgRes.data || [])
      const joinedEvents = (joinRes.data || [])
        .map((g: any) => g.events).filter(Boolean)
        .filter((e: EventRow) => e.organizer_id !== user!.id)
      setJoined(joinedEvents)
      setLoading(false)
    }
    load()
  }, [user])

  const all      = [...organized, ...joined].sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())
  const now      = new Date()
  const upcoming = all.filter(e => new Date(e.date_start) >= now).sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
  const past     = all.filter(e => new Date(e.date_start) < now).sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())

  const firstName = profile?.name?.split(' ')[0] || (DEV_BYPASS_AUTH ? 'Dev' : 'toi')
  const hour = new Date().getHours()
  const greeting = hour < 18 ? 'Bonjour' : 'Bonsoir'

  const list = tab === 'upcoming' ? upcoming : past

  const EventRow = ({ event }: { event: EventRow }) => {
    const isOrg    = event.organizer_id === user?.id || (DEV_BYPASS_AUTH && !user)
    const dateObj  = new Date(event.date_start)
    const day      = dateObj.getDate()
    const month    = dateObj.toLocaleString('fr-FR', { month: 'short' })
    const weekday  = dateObj.toLocaleString('fr-FR', { weekday: 'short' })
    const location = event.destination_address?.split(',')[0] || ''
    const fallbackBg = TYPE_COLORS[event.event_type] || TYPE_COLORS.other
    const isPast   = new Date(event.date_start) < now

    return (
      <div
        onClick={() => navigate(`/event/${event.short_id}`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 0',
          borderBottom: '1px solid var(--color-border)',
          cursor: 'pointer',
          opacity: isPast ? 0.6 : 1,
          transition: 'opacity 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = isPast ? '0.6' : '1' }}
      >
        {/* Date column */}
        <div style={{
          width: 44, flexShrink: 0, textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {month}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1, margin: '1px 0' }}>
            {day}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'capitalize' }}>
            {weekday}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 44, background: 'var(--color-border)', flexShrink: 0 }} />

        {/* Event info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 400, color: 'var(--color-text)',
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.3, marginBottom: 3,
          }}>
            {event.name}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--color-text-3)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 4,
          }}>
            📍 {location}
          </div>
          <div style={{
            display: 'inline-flex',
            fontSize: 10, fontWeight: 700,
            color: isOrg ? 'var(--color-violet)' : 'var(--color-text-3)',
            background: isOrg ? 'var(--color-violet-light)' : 'var(--color-surface-2)',
            borderRadius: 6, padding: '2px 7px',
          }}>
            {isOrg ? 'Orga' : 'Invité'}
          </div>
        </div>

        {/* Thumbnail */}
        <div style={{
          width: 56, height: 56, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
          background: event.cover_image ? undefined : fallbackBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
        }}>
          {event.cover_image
            ? <img src={event.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : event.emoji
          }
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

      {/* ── Header ── */}
      <div style={{
        paddingTop: 32, paddingBottom: 24,
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
          + Créer
        </button>
      </div>

      {/* ── Tabs ── */}
      {all.length > 0 && (
        <div style={{
          display: 'flex', background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12, padding: 4, gap: 4, marginBottom: 8,
        }}>
          {(['upcoming', 'past'] as const).map(t => {
            const label = t === 'upcoming' ? `À venir${upcoming.length ? ` · ${upcoming.length}` : ''}` : `Passés${past.length ? ` · ${past.length}` : ''}`
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? 'var(--color-bg)' : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-text-3)',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

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

      {/* ── Empty tab state ── */}
      {all.length > 0 && list.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 16, color: 'var(--color-text-3)', fontSize: 14 }}>
          {tab === 'upcoming' ? 'Aucun event à venir' : 'Aucun event passé'}
        </div>
      )}

      {/* ── Event list ── */}
      {list.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {list.map(e => <EventRow key={e.id} event={e} />)}
        </div>
      )}
    </div>
  )
}
