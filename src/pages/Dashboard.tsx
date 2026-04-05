import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { formatDateRange } from '../lib/utils'
import { DEV_BYPASS_AUTH } from '../config'

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const event = new Date(dateStr); event.setHours(0, 0, 0, 0)
  return Math.ceil((event.getTime() - today.getTime()) / 86400000)
}

function CountdownBadge({ days }: { days: number }) {
  const color = days < 0 ? '#9b9b93' : days <= 7 ? '#e74c3c' : days <= 14 ? '#e67e22' : '#27ae60'
  const label = days < 0 ? 'Passé' : days === 0 ? "Aujourd'hui !" : `J-${days}`
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      background: color, borderRadius: 14, padding: '10px 18px', minWidth: 80,
    }}>
      <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{label}</span>
      {days > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2 }}>
        {days === 1 ? 'demain' : `${days} jours`}
      </span>}
    </div>
  )
}

function StatCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 16, padding: '14px 10px', textAlign: 'center',
      border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(26,26,24,0.04)',
    }}>
      <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, opacity: 0.7, fontWeight: 700, marginTop: 1 }}>{sub}</div>}
      <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700, marginTop: 4, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function ProgressBar({ value, total, color = 'var(--color-violet)' }: { value: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div style={{ height: 8, borderRadius: 99, background: 'var(--color-border)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
    </div>
  )
}

export default function Dashboard() {
  const { shortId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState<any>(null)
  const [guests, setGuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!shortId) return
    if (!user && !DEV_BYPASS_AUTH) return
    const load = async () => {
      const { data: ev } = await supabase.from('events').select('*').eq('short_id', shortId).single()
      if (!ev || (user && ev.organizer_id !== user.id && !DEV_BYPASS_AUTH)) { setLoading(false); return }
      setEvent(ev)
      const { data: g } = await supabase
        .from('event_guests')
        .select('*, profiles(name, phone, city, transport_modes, avatar_url)')
        .eq('event_id', ev.id)
        .order('created_at', { ascending: false })
      setGuests(g || [])
      setLoading(false)
    }
    load()
  }, [shortId, user])

  const handleApproveGuest = async (guestId: string) => {
    await supabase.from('event_guests').update({ approval_status: 'approved' }).eq('id', guestId)
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, approval_status: 'approved' } : g))
  }

  const handleRejectGuest = async (guestId: string) => {
    await supabase.from('event_guests').update({ approval_status: 'rejected' }).eq('id', guestId)
    setGuests(prev => prev.filter(g => g.id !== guestId))
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('event_guests').delete().eq('event_id', event.id)
    await supabase.from('events').delete().eq('id', event.id)
    navigate('/events')
  }

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
  if (!event) return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Accès non autorisé</div>

  // ── Computed values ──────────────────────────────────────────────────────────
  const days = daysUntil(event.date_start)

  const rsvpComing    = guests.filter(g => g.rsvp_status === 'coming')
  const rsvpNotComing = guests.filter(g => g.rsvp_status === 'not_coming')
  const plusOneCount  = guests.filter(g => g.brings_plus_one).length
  const totalAttendees = rsvpComing.length + plusOneCount

  const pendingApproval = guests.filter(g => g.approval_status === 'pending')
  const rsvpOnly   = rsvpComing.filter(g => !g.departure_address && g.approval_status !== 'pending')
  const inCovoit   = rsvpComing.filter(g => g.departure_address && g.approval_status !== 'pending')
  const confirmed  = guests.filter(g => g.status === 'confirmed')
  const matched    = guests.filter(g => g.status === 'matched')
  const drivers    = guests.filter(g => g.drives_this_event && g.approval_status !== 'pending')
  const passengers = inCovoit.filter(g => !g.drives_this_event)
  const pending    = passengers.filter(g => g.status === 'registered')

  const totalSeats  = drivers.reduce((sum: number, d: any) => sum + (d.seats_available || 0), 0)
  const seatBalance = totalSeats - passengers.length
  const covoitProgress = passengers.length > 0 ? ((confirmed.length + matched.length) / passengers.length) * 100 : 0

  const TRANSPORT_ICON: Record<string, string> = { car: '🚗', train: '🚂', bus: '🚌' }
  const TRANSPORT_LABEL: Record<string, string> = { car: 'Voiture', train: 'Train', bus: 'Bus' }

  const formatGuestName = (g: any) => {
    const full = (g.profiles?.name || g.guest_name || 'Invité').trim()
    const parts = full.split(/\s+/)
    if (parts.length <= 1) return full
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
  }

  const formatCity = (address: string | null | undefined) => {
    if (!address) return null
    return address.split(',')[0].trim()
  }

  const primaryTransport = (g: any): string | null => {
    if (g.drives_this_event) return 'car'
    const modes: string[] = g.profiles?.transport_modes || []
    if (modes.includes('train')) return 'train'
    if (modes.includes('bus')) return 'bus'
    return null
  }

  // Alerts
  const alerts: { type: 'danger' | 'warn' | 'info'; msg: string }[] = []
  if (days > 0 && days <= 3 && guests.length === 0)
    alerts.push({ type: 'danger', msg: "Personne n'a encore répondu — pense à relancer !" })
  if (seatBalance < 0 && inCovoit.length > 0)
    alerts.push({ type: 'danger', msg: `Manque ${Math.abs(seatBalance)} place${Math.abs(seatBalance) > 1 ? 's' : ''} — besoin de plus de conducteurs` })
  if (pending.length > 0 && days <= 7)
    alerts.push({ type: 'warn', msg: `${pending.length} invité${pending.length > 1 ? 's' : ''} sans covoit' attribué` })
  if (rsvpOnly.length > 0)
    alerts.push({ type: 'info', msg: `${rsvpOnly.length} invité${rsvpOnly.length > 1 ? 's' : ''} n'ont pas encore rempli leur trajet` })

  // Programme des arrivées — tous les invités coming, triés par heure estimée
  const withArrival    = rsvpComing.filter(g => g.estimated_arrival_time && g.approval_status !== 'pending')
  const withoutArrival = rsvpComing.filter(g => !g.estimated_arrival_time && g.approval_status !== 'pending')
  return (
    <div className="animate-fade-up" style={{ paddingTop: 8, paddingBottom: 40 }}>

      {/* ── Back ── */}
      <button
        onClick={() => navigate(`/event/${shortId}`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', padding: '4px 0 16px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← L'événement
      </button>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 26, marginBottom: 2 }}>{event.emoji}</div>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 26, fontWeight: 400, color: 'var(--color-text)', lineHeight: 1.2, letterSpacing: '-0.3px', marginBottom: 4 }}>
            {event.name}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 600 }}>
            {formatDateRange(event.date_start, event.date_end)}
            {event.destination_address && (
              <span style={{ color: 'var(--color-text-3)' }}> · {event.destination_address.split(',')[0]}</span>
            )}
          </div>
        </div>
        <CountdownBadge days={days} />
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: a.type === 'danger' ? '#fef2f2' : a.type === 'warn' ? 'var(--color-amber-light)' : 'var(--color-violet-light)',
              border: `1px solid ${a.type === 'danger' ? '#fca5a5' : a.type === 'warn' ? 'var(--color-amber)' : 'var(--color-violet)'}`,
              borderRadius: 12, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>
                {a.type === 'danger' ? '🚨' : a.type === 'warn' ? '⚠️' : 'ℹ️'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: a.type === 'danger' ? '#b91c1c' : a.type === 'warn' ? 'var(--color-amber)' : 'var(--color-violet)' }}>
                {a.msg}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Approbations en attente ── */}
      {pendingApproval.length > 0 && (
        <div style={{
          background: 'var(--color-amber-light)', border: '1.5px solid var(--color-amber)',
          borderRadius: 16, padding: '16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-amber)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            ⏳ {pendingApproval.length} demande{pendingApproval.length > 1 ? 's' : ''} en attente d'approbation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingApproval.map(g => {
              const name = g.profiles?.name || g.guest_name || 'Invité'
              return (
                <div key={g.id} style={{
                  background: 'var(--color-surface)', borderRadius: 12,
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
                      {g.drives_this_event ? '🚗 Conducteur' : '🙋 Passager'}
                      {g.departure_address ? ` · ${g.departure_address.split(',')[0]}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRejectGuest(g.id)}
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)',
                      background: 'none', fontSize: 12, fontWeight: 700,
                      color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit',
                      minHeight: 36,
                    }}
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => handleApproveGuest(g.id)}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: 'var(--color-green)', fontSize: 12, fontWeight: 700,
                      color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                      minHeight: 36,
                    }}
                  >
                    ✓ Approuver
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Stats grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <StatCard label="RSVP" value={rsvpComing.length} color="var(--color-text)"
          sub={plusOneCount > 0 ? `+${plusOneCount} +1` : undefined} />
        <StatCard label="Covoit'" value={passengers.length} color="var(--color-violet)" />
        <StatCard label="Confirmés" value={confirmed.length} color="var(--color-green)" />
        <StatCard label="Conducteurs" value={drivers.length} color="var(--color-peach)" />
      </div>

      {/* ── RSVP section ── */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '16px', marginBottom: 12 }}>
        <SectionTitle>Réponses à l'invitation</SectionTitle>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { label: '✓ Viennent', count: rsvpComing.length, color: 'var(--color-green)' },
            { label: '✗ Ne viennent pas', count: rsvpNotComing.length, color: 'var(--color-text-3)' },
          ].map(item => (
            <div key={item.label} style={{
              flex: 1, background: 'var(--color-bg)', borderRadius: 10,
              padding: '10px 12px', border: '1px solid var(--color-border)',
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.count}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {event.plus_one_allowed && plusOneCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--color-primary-light)', borderRadius: 10, padding: '8px 12px',
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)',
          }}>
            <span>👥</span>
            <span>{plusOneCount} invité{plusOneCount > 1 ? 's' : ''} vien{plusOneCount > 1 ? 'nent' : 't'} avec un +1 — {totalAttendees} personnes au total</span>
          </div>
        )}
      </div>

      {/* ── Covoit tracking ── */}
      {inCovoit.length > 0 && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '16px', marginBottom: 12 }}>
          <SectionTitle>Suivi des covoits</SectionTitle>

          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Progression</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-violet)' }}>
              {confirmed.length + matched.length}/{passengers.length} passagers matchés
            </span>
          </div>
          <ProgressBar value={confirmed.length + matched.length} total={passengers.length} />
          {covoitProgress === 100 && (
            <p style={{ fontSize: 12, color: 'var(--color-green)', marginTop: 8, fontWeight: 700 }}>✓ Tout le monde est matché !</p>
          )}

          {/* Seat balance */}
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Places offertes', value: totalSeats, color: 'var(--color-green)' },
              { label: 'Passagers', value: passengers.length, color: 'var(--color-text)' },
              {
                label: seatBalance >= 0 ? 'Surplus' : 'Manque',
                value: Math.abs(seatBalance),
                color: seatBalance >= 0 ? 'var(--color-green)' : '#e74c3c',
              },
            ].map(item => (
              <div key={item.label} style={{
                background: 'var(--color-bg)', borderRadius: 10, padding: '10px 8px',
                border: '1px solid var(--color-border)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Statuses breakdown */}
          <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: 'Confirmés', count: confirmed.length, variant: 'success' as const },
              { label: 'Matchés', count: matched.length, variant: 'violet' as const },
              { label: 'En attente', count: pending.length, variant: 'warning' as const },
            ].map(s => s.count > 0 && (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Badge variant={s.variant}>{s.label}</Badge>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-2)' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Info rapide ── */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '16px', marginBottom: 12 }}>
        <SectionTitle>Infos de l'événement</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{formatDateRange(event.date_start, event.date_end)}</div>
              {event.time_start && <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>à {event.time_start.slice(0, 5)}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{event.destination_address}</div>
          </div>
          {event.plus_one_allowed && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>👥</span>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Les +1 sont acceptés</div>
            </div>
          )}
          {event.description && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📝</span>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{event.description}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Liste des invités ── */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <SectionTitle>Invités ({rsvpComing.length})</SectionTitle>
          {plusOneCount > 0 && (
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>
              {totalAttendees} au total · {plusOneCount} +1
            </span>
          )}
        </div>

        {rsvpComing.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 12 }}>Aucun invité pour le moment</p>
            <Button onClick={handleShare} variant="secondary" size="sm">Partager le lien</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rsvpComing.map((g: any, i: number) => {
              const name      = formatGuestName(g)
              const city      = formatCity(g.departure_address) || formatCity(g.profiles?.city)
              const transport = primaryTransport(g)
              const isDriver  = !!g.drives_this_event
              const isLast    = i === rsvpComing.length - 1

              return (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                }}>
                  <Avatar name={name} size={34} src={g.profiles?.avatar_url || null} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{name}</span>
                      {transport && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: isDriver ? 'var(--color-peach)' : 'var(--color-text-3)',
                          background: isDriver ? 'var(--color-peach-light)' : 'var(--color-surface-2)',
                          borderRadius: 5, padding: '2px 6px',
                          letterSpacing: '0.02em',
                        }}>
                          {TRANSPORT_ICON[transport]} {isDriver ? 'Conducteur' : TRANSPORT_LABEL[transport]}
                        </span>
                      )}
                      {g.brings_plus_one && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: 'var(--color-text-3)', background: 'var(--color-surface-2)',
                          borderRadius: 5, padding: '2px 6px',
                        }}>+1</span>
                      )}
                    </div>
                    {city && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{city}</div>
                    )}
                  </div>
                  {/* Covoit status — only for passengers in covoit */}
                  {!isDriver && g.departure_address && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      color: g.status === 'confirmed' ? 'var(--color-green)'
                           : g.status === 'matched' ? 'var(--color-violet)'
                           : 'var(--color-text-3)',
                    }}>
                      {g.status === 'confirmed' ? '✓ Confirmé'
                       : g.status === 'matched' ? '~ Matché'
                       : '· · ·'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Groupes d'arrivée ── */}
      {(withArrival.length > 0 || withoutArrival.length > 0) && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionTitle>Groupes d'arrivée</SectionTitle>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>
              {withArrival.length}/{rsvpComing.length} heure renseignée
            </span>
          </div>

          {/* Groups by time slot */}
          {Object.entries(
            withArrival.reduce((acc: Record<string, any[]>, g: any) => {
              const time = (g.estimated_arrival_time || '').slice(0, 5)
              if (!acc[time]) acc[time] = []
              acc[time].push(g)
              return acc
            }, {})
          ).sort(([a], [b]) => a.localeCompare(b)).map(([time, group]) => (
            <div key={time} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  fontSize: 13, fontWeight: 800, color: 'var(--color-violet)',
                  background: 'var(--color-violet-light)', borderRadius: 8,
                  padding: '3px 10px', whiteSpace: 'nowrap',
                }}>
                  🕐 {time}
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(group as any[]).map((g: any) => {
                  const name = formatGuestName(g)
                  const transport = primaryTransport(g)
                  return (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--color-bg)', borderRadius: 10,
                      padding: '6px 10px', border: '1px solid var(--color-border)',
                    }}>
                      <Avatar name={name} size={22} src={g.profiles?.avatar_url || null} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{name}</span>
                      {transport && <span style={{ fontSize: 11 }}>{TRANSPORT_ICON[transport]}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Without arrival time */}
          {withoutArrival.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
                  background: 'var(--color-surface-2)', borderRadius: 8,
                  padding: '3px 10px', whiteSpace: 'nowrap',
                }}>
                  Heure non renseignée
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {withoutArrival.map((g: any) => {
                  const name = formatGuestName(g)
                  return (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--color-bg)', borderRadius: 10,
                      padding: '6px 10px', border: '1px solid var(--color-border)',
                    }}>
                      <Avatar name={name} size={22} src={g.profiles?.avatar_url || null} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>{name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button onClick={handleShare} size="lg" fullWidth>
          {copied ? '✓ Lien copié !' : '📤 Partager l\'invitation'}
        </Button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Button onClick={() => navigate(`/event/${shortId}/edit`)} variant="secondary" size="lg" fullWidth>
            ✏️ Modifier
          </Button>
          <Button onClick={() => navigate(`/event/${shortId}`)} variant="secondary" size="lg" fullWidth>
            👁 Page publique
          </Button>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            width: '100%', padding: '12px', background: 'none',
            border: '1.5px solid var(--color-border)', borderRadius: 12,
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)',
            cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
          }}
        >
          🗑 Supprimer l'événement
        </button>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 100, padding: '0 0 0',
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: '24px 24px 0 0',
            padding: '28px 24px 40px', width: '100%', maxWidth: 560,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑</div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', textAlign: 'center', marginBottom: 8 }}>
              Supprimer « {event.name} » ?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
              Toutes les données seront effacées : invités, covoits et réponses. Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  background: deleting ? 'var(--color-border)' : '#ef4444',
                  border: 'none', fontSize: 15, fontWeight: 800,
                  color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {deleting ? 'Suppression...' : 'Oui, supprimer définitivement'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  width: '100%', padding: '13px', background: 'none',
                  border: '1.5px solid var(--color-border)', borderRadius: 12,
                  fontSize: 14, fontWeight: 700, color: 'var(--color-text-2)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
