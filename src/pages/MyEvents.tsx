import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { formatDateRange } from '../lib/utils'
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
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 4 }}>
            {greeting} 👋
          </div>
          <h1 style={{
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
            fontSize: 32, fontWeight: 400, color: 'var(--color-text)',
            letterSpacing: '-0.3px', lineHeight: 1.1, marginBottom: 14,
          }}>
            {firstName}
          </h1>
          <button
            onClick={() => navigate('/events/new')}
            style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'var(--color-violet)', color: 'white',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Créer un event
          </button>
        </div>

        {/* Toggle — top right, Luma-style */}
        {all.length > 0 && (
          <div style={{
            display: 'flex', flexShrink: 0,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10, padding: 3, gap: 2,
            marginTop: 6,
          }}>
            {(['upcoming', 'past'] as const).map(t => {
              const active = tab === t
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: active ? 'var(--color-text)' : 'transparent',
                    color: active ? 'var(--color-bg)' : 'var(--color-text-3)',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t === 'upcoming' ? 'À venir' : 'Passés'}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Empty states ── */}
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
      {all.length > 0 && list.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--color-text-3)', fontSize: 14 }}>
          {tab === 'upcoming' ? 'Aucun event à venir' : 'Aucun event passé'}
        </div>
      )}

      {/* ── Timeline list ── */}
      {list.length > 0 && (
        <div>
          {list.map((event, index) => {
            const isOrg     = event.organizer_id === user?.id || (DEV_BYPASS_AUTH && !user)
            const isPast    = new Date(event.date_start) < now
            const isLast    = index === list.length - 1
            const dateObj   = new Date(event.date_start)
            const day       = dateObj.getDate()
            const month     = dateObj.toLocaleString('fr-FR', { month: 'short' })
            const weekday   = dateObj.toLocaleString('fr-FR', { weekday: 'short' })
            const location  = event.destination_address?.split(',')[0] || ''
            const fallbackBg = TYPE_COLORS[event.event_type] || TYPE_COLORS.other

            return (
              <div key={event.id} style={{ display: 'flex', gap: 0, marginBottom: 12 }}>

                {/* ── Date column ── */}
                <div style={{ width: 54, flexShrink: 0 }}>
                  <div style={{ paddingTop: 18, textAlign: 'left' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: isPast ? 'var(--color-text-3)' : 'var(--color-text)', lineHeight: 1 }}>
                      {day} {month}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2, textTransform: 'capitalize' }}>
                      {weekday}.
                    </div>
                  </div>
                </div>

                {/* ── Timeline dot + line ── */}
                <div style={{
                  width: 20, flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  paddingTop: 22,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isPast ? 'var(--color-border)' : 'var(--color-text-3)',
                    border: '2px solid var(--color-bg)',
                    zIndex: 1,
                  }} />
                  {!isLast && (
                    <div style={{
                      flex: 1, width: 1,
                      background: 'var(--color-border)',
                      marginTop: 4, minHeight: 20,
                    }} />
                  )}
                </div>

                {/* ── Event card ── */}
                <div
                  onClick={() => navigate(`/event/${event.short_id}`)}
                  style={{
                    flex: 1, marginLeft: 10,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 18, overflow: 'hidden',
                    cursor: 'pointer',
                    opacity: isPast ? 0.6 : 1,
                    transition: 'box-shadow 0.15s, opacity 0.15s',
                    boxShadow: '0 1px 3px rgba(26,26,24,0.04)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(26,26,24,0.10)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(26,26,24,0.04)' }}
                >
                  <div style={{ display: 'flex', gap: 12, padding: '14px 14px' }}>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 16, fontWeight: 400,
                        fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
                        color: 'var(--color-text)', lineHeight: 1.25,
                        marginBottom: 5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {event.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 3, fontWeight: 500 }}>
                        {formatDateRange(event.date_start, event.date_end)}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--color-text-3)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginBottom: 8,
                      }}>
                        📍 {location}
                      </div>
                      <div style={{
                        display: 'inline-flex',
                        fontSize: 10, fontWeight: 700,
                        color: isOrg ? 'var(--color-violet)' : 'var(--color-text-3)',
                        background: isOrg ? 'var(--color-violet-light)' : 'var(--color-surface-2)',
                        borderRadius: 6, padding: '2px 8px',
                      }}>
                        {isOrg ? 'Organisateur' : 'Invité'}
                      </div>
                    </div>

                    {/* Cover */}
                    <div style={{
                      width: 80, height: 80, borderRadius: 12, flexShrink: 0,
                      overflow: 'hidden',
                      background: event.cover_image ? undefined : fallbackBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28,
                    }}>
                      {event.cover_image
                        ? <img src={event.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : event.emoji
                      }
                    </div>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
