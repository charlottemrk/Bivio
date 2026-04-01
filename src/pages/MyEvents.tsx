import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { formatDateRange } from '../lib/utils'

type EventRow = {
  id: string; short_id: string; name: string; emoji: string
  event_type: string; date_start: string; date_end: string | null
  destination_address: string; organizer_id: string
}

const TYPE_BG: Record<string, string> = {
  weekend: '#eaf5c4', wedding: '#fce7f3', festival: '#fef3eb',
  retreat: '#d6f5ea', sport: '#dbeafe', other: '#eaf5c4',
}

export default function MyEvents() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [organized, setOrganized] = useState<EventRow[]>([])
  const [joined, setJoined]       = useState<EventRow[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
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

  const all      = [...organized, ...joined]
  const upcoming = all.filter(e => new Date(e.date_start) >= new Date())
  const past     = all.filter(e => new Date(e.date_start) < new Date())

  const EventCard = ({ event }: { event: EventRow }) => (
    <div
      onClick={() => navigate(`/event/${event.short_id}`)}
      style={{
        background: 'var(--color-surface)', borderRadius: 20,
        border: '1px solid var(--color-border)', overflow: 'hidden', cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(26,26,24,0.05), 0 4px 12px rgba(26,26,24,0.05)',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Color strip */}
      <div style={{
        height: 72, padding: '12px 16px',
        background: TYPE_BG[event.event_type] || TYPE_BG.other,
        display: 'flex', alignItems: 'flex-end',
      }}>
        <span style={{ fontSize: 32 }}>{event.emoji}</span>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>{event.name}</div>
          {event.organizer_id === user?.id
            ? <Badge variant="violet">Organisateur</Badge>
            : <Badge variant="success">Invité</Badge>
          }
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>{formatDateRange(event.date_start, event.date_end)}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>📍 {event.destination_address}</div>
      </div>
    </div>
  )

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Chargement...</div>

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>Mes events</h1>
        <Button onClick={() => navigate('/events/new')} size="sm">+ Créer</Button>
      </div>

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>À venir</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div style={{ marginBottom: 28, opacity: 0.7 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Passés</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Aucun event pour le moment</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 24 }}>Crée ton premier event en 2 minutes</div>
          <Button onClick={() => navigate('/events/new')} size="md">Créer un event →</Button>
        </div>
      )}
    </div>
  )
}
