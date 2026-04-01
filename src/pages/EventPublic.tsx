import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Avatar, AvatarStack } from '../components/Avatar'
import { Button } from '../components/Button'
import { formatDateRange } from '../lib/utils'

type Event = {
  id: string; short_id: string; organizer_id: string; name: string; emoji: string
  event_type: string; date_start: string; date_end: string | null; time_start: string | null
  destination_address: string; description: string | null; contribution_policy: string
  cover_image: string | null; plus_one_allowed: boolean
  packing_list: string[] | null
  nearby_stations: Array<{ name: string; type: string; distanceKm: number }> | null
  location_photos: string[] | null
  location_instructions: string | null
}
type Guest = {
  id: string; profile_id: string | null; status: string; departure_address: string | null
  rsvp_status: string; guest_name: string | null; brings_plus_one: boolean
  drives_this_event: boolean | null; match_status: string | null
  profiles: { name: string | null } | null
}

const GUEST_FIELDS = 'id, profile_id, status, departure_address, rsvp_status, guest_name, brings_plus_one, drives_this_event, match_status, profiles(name)'

export default function EventPublic() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()

  const [event, setEvent]         = useState<Event | null>(null)
  const [guests, setGuests]       = useState<Guest[]>([])
  const [organizer, setOrganizer] = useState<{ name: string | null } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [myReg, setMyReg]         = useState<Guest | null>(null)
  const [copied, setCopied]       = useState(false)

  // Inline RSVP state
  const [showRsvpForm, setShowRsvpForm] = useState(false)
  const [rsvpName, setRsvpName]         = useState('')
  const [rsvpPlusOne, setRsvpPlusOne]   = useState(false)
  const [rsvpSaving, setRsvpSaving]     = useState(false)
  const [rsvpAnswer, setRsvpAnswer]     = useState<'coming' | 'not_coming' | 'maybe' | null>(null)

  useEffect(() => {
    if (!shortId) return
    const load = async () => {
      const { data: ev } = await supabase.from('events').select('*').eq('short_id', shortId).single()
      if (!ev) { setLoading(false); return }
      setEvent(ev)
      const [guestsRes, orgRes] = await Promise.all([
        supabase.from('event_guests')
          .select(GUEST_FIELDS)
          .eq('event_id', ev.id)
          .eq('rsvp_status', 'coming'),
        supabase.from('profiles').select('name').eq('id', ev.organizer_id).single(),
      ])
      setGuests((guestsRes.data as any) || [])
      setOrganizer(orgRes.data)
      // Load current user's registration
      if (user) {
        const { data: myRecord } = await supabase.from('event_guests')
          .select(GUEST_FIELDS).eq('event_id', ev.id).eq('profile_id', user.id).maybeSingle()
        if (myRecord) {
          setMyReg(myRecord as any)
          setRsvpAnswer((myRecord as any).rsvp_status || null)
          setRsvpName((myRecord as any).guest_name || '')
        }
      } else {
        const existingToken = localStorage.getItem(`bivio_rsvp_${shortId}`)
        if (existingToken) {
          const { data: anonRecord } = await supabase.from('event_guests')
            .select(GUEST_FIELDS).eq('event_id', ev.id).eq('guest_token', existingToken).maybeSingle()
          if (anonRecord) {
            setMyReg(anonRecord as any)
            setRsvpAnswer((anonRecord as any).rsvp_status || null)
            setRsvpName((anonRecord as any).guest_name || '')
          }
        }
        // Also check by guestId in localStorage
        const guestId = localStorage.getItem(`bivio_guest_id_${shortId}`)
        if (guestId && !localStorage.getItem(`bivio_rsvp_${shortId}`)) {
          const { data: guestRecord } = await supabase.from('event_guests')
            .select(GUEST_FIELDS).eq('id', guestId).maybeSingle()
          if (guestRecord) {
            setMyReg(guestRecord as any)
            setRsvpAnswer((guestRecord as any).rsvp_status || null)
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [shortId, user])

  const handleInlineRSVP = async (status: 'coming' | 'not_coming' | 'maybe') => {
    if (!event) return
    // Use existing name if changing an answer, or require one for new registrations
    const nameToUse = rsvpName.trim() || myReg?.guest_name || ''
    if (!nameToUse && !myReg) return
    setRsvpSaving(true)
    const existingToken = localStorage.getItem(`bivio_rsvp_${shortId}`)
    if (user) {
      if (myReg) {
        await supabase.from('event_guests').update({
          rsvp_status: status, guest_name: nameToUse, brings_plus_one: rsvpPlusOne,
        }).eq('id', myReg.id)
        setMyReg({ ...myReg, rsvp_status: status } as Guest)
      } else {
        const token = crypto.randomUUID()
        const { data } = await supabase.from('event_guests').insert({
          event_id: event.id, profile_id: user.id, guest_name: nameToUse,
          guest_token: token, rsvp_status: status, brings_plus_one: rsvpPlusOne,
        }).select(GUEST_FIELDS).single()
        if (data) setMyReg({ ...data, profiles: null } as Guest)
      }
    } else if (existingToken) {
      const { data: existing } = await supabase.from('event_guests').select('id')
        .eq('event_id', event.id).eq('guest_token', existingToken).maybeSingle()
      if (existing) {
        await supabase.from('event_guests').update({
          rsvp_status: status, guest_name: nameToUse, brings_plus_one: rsvpPlusOne,
        }).eq('id', existing.id)
      }
    } else {
      const token = crypto.randomUUID()
      const { data } = await supabase.from('event_guests').insert({
        event_id: event.id, guest_name: nameToUse,
        guest_token: token, rsvp_status: status, brings_plus_one: rsvpPlusOne,
      }).select('id').single()
      if (data) {
        localStorage.setItem(`bivio_rsvp_${shortId}`, token)
        localStorage.setItem(`bivio_guest_id_${shortId}`, (data as any).id)
      }
    }
    // Refresh public guests list
    const { data: guestsData } = await supabase.from('event_guests')
      .select(GUEST_FIELDS).eq('event_id', event.id).eq('rsvp_status', 'coming')
    setGuests((guestsData as any) || [])
    setRsvpAnswer(status)
    setShowRsvpForm(false)
    setRsvpSaving(false)
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) await navigator.share({ title: event?.name, url })
    else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const guestDisplayName = (g: Guest) => (g.profiles as any)?.name || g.guest_name || 'Invité'

  if (loading) return (
    <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>
      Chargement...
    </div>
  )
  if (!event) return (
    <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>
      Événement introuvable
    </div>
  )

  const isOrganizer     = user?.id === event.organizer_id
  const comingCount     = guests.length
  const plusOneTotal    = guests.filter(g => g.brings_plus_one).length
  const totalPeople     = comingCount + plusOneTotal
  const timeLabel       = event.time_start ? event.time_start.slice(0, 5) : null
  const covoitMatches   = guests.filter(g => g.match_status === 'confirmed' || g.match_status === 'accepted').length

  // Carpool state for this user
  const hasCarpool = !!(myReg?.drives_this_event || myReg?.departure_address)
  const carpoolConfirmed = myReg?.match_status === 'accepted'

  // ── Carpool CTA block ─────────────────────────────────────────────────────
  const CarpoolBlock = () => {
    if (isOrganizer) return null
    return (
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 18, padding: '20px', marginBottom: 12,
        boxShadow: '0 2px 12px rgba(26,26,24,0.06)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          🚗 Covoit' de l'événement
        </div>
        {hasCarpool ? (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              background: carpoolConfirmed ? 'var(--color-green-light)' : 'var(--color-violet-light)',
              border: `1px solid ${carpoolConfirmed ? 'var(--color-green)' : 'var(--color-violet)'}`,
              borderRadius: 12, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 18 }}>{carpoolConfirmed ? '✅' : myReg?.drives_this_event ? '🚗' : '🙋'}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                  {carpoolConfirmed
                    ? 'Trajet confirmé !'
                    : myReg?.drives_this_event
                    ? 'Tu proposes un trajet'
                    : 'Tu cherches un trajet'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 1 }}>
                  {carpoolConfirmed
                    ? 'Voir les détails de ton trajet'
                    : myReg?.drives_this_event
                    ? 'Voir les demandes de passagers'
                    : 'Voir les conducteurs disponibles'}
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate(carpoolConfirmed ? `/event/${shortId}/confirmed` : `/event/${shortId}/matches`)}
              size="lg" fullWidth
            >
              {carpoolConfirmed ? 'Voir ma confirmation →' : myReg?.drives_this_event ? 'Gérer mon trajet →' : 'Voir les conducteurs →'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => navigate(`/event/${shortId}/join`)} size="lg" fullWidth>
              Rejoindre le carpool de l'événement →
            </Button>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
              Trouve un conducteur ou propose des places
            </p>
          </>
        )}
      </div>
    )
  }

  // ── RSVP block ────────────────────────────────────────────────────────────
  const RsvpBlock = () => (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 18, padding: '20px', marginBottom: 12,
      boxShadow: '0 2px 12px rgba(26,26,24,0.06)',
    }}>
      {isOrganizer ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 14 }}>
            Tu organises cet événement
          </div>
          <Button onClick={() => navigate(`/event/${shortId}/dashboard`)} size="lg" fullWidth>
            Mon dashboard →
          </Button>
          <button
            onClick={handleShare}
            style={{
              width: '100%', marginTop: 10, background: 'none',
              border: '1.5px solid var(--color-border)', borderRadius: 12, padding: '12px',
              fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {copied ? '✓ Lien copié !' : '📤 Partager l\'invitation'}
          </button>
        </>
      ) : rsvpAnswer ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: rsvpAnswer === 'coming'
                ? 'var(--color-green-light)'
                : rsvpAnswer === 'maybe'
                ? '#FFF8E7'
                : 'var(--color-surface-2)',
              border: `1.5px solid ${rsvpAnswer === 'coming' ? 'var(--color-green)' : rsvpAnswer === 'maybe' ? '#F5A623' : 'var(--color-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              {rsvpAnswer === 'coming' ? '✓' : rsvpAnswer === 'maybe' ? '🤔' : '😔'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>Réponse enregistrée</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 1 }}>
                {rsvpAnswer === 'coming' ? '✓ Je viens !'
                  : rsvpAnswer === 'maybe' ? 'Je ne sais pas encore'
                  : 'Je ne pourrai pas venir'}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setRsvpAnswer(null); setShowRsvpForm(true) }}
            style={{
              width: '100%', padding: '10px', background: 'none',
              border: '1.5px solid var(--color-border)', borderRadius: 12,
              fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Changer ma réponse
          </button>
        </>
      ) : showRsvpForm ? (
        <>
          {/* Cancel row — only shown when changing an existing answer */}
          {myReg && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                onClick={() => { setShowRsvpForm(false); setRsvpAnswer(myReg.rsvp_status as any) }}
                style={{
                  background: 'none', border: 'none', fontSize: 13,
                  color: 'var(--color-text-3)', cursor: 'pointer',
                  padding: '2px 4px', fontFamily: 'inherit',
                }}
              >
                ✕ Annuler
              </button>
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 700,
              color: 'var(--color-text-2)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 6,
            }}>
              Ton prénom
            </label>
            <input
              type="text"
              value={rsvpName}
              onChange={e => setRsvpName(e.target.value)}
              placeholder="ex. Marie"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', fontSize: 15,
                border: '1.5px solid var(--color-border)',
                borderRadius: 10, outline: 'none',
                background: 'var(--color-bg)',
                color: 'var(--color-text)', fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-violet)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>
          {event.plus_one_allowed && (
            <div
              onClick={() => setRsvpPlusOne(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, marginBottom: 14, cursor: 'pointer',
                background: rsvpPlusOne ? 'var(--color-violet-light)' : 'var(--color-bg)',
                border: `1.5px solid ${rsvpPlusOne ? 'var(--color-violet)' : 'var(--color-border)'}`,
                borderRadius: 10, padding: '10px 12px', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Je viens avec un +1</div>
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                background: rsvpPlusOne ? 'var(--color-violet)' : 'var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {rsvpPlusOne && <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </div>
          )}
          {/* Row 1: Je ne pourrai pas venir + Je viens */}
          {(() => {
            // Allow changing answer without re-entering name if myReg exists
            const canSubmit = !rsvpSaving && (!!rsvpName.trim() || !!myReg)
            return (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => handleInlineRSVP('not_coming')}
                    disabled={!canSubmit}
                    style={{
                      flex: 1, padding: '13px 8px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                      background: 'none', color: canSubmit ? 'var(--color-text-2)' : 'var(--color-text-3)',
                      border: '1.5px solid var(--color-border)',
                      cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    }}
                  >
                    Je ne pourrai pas venir
                  </button>
                  <button
                    onClick={() => handleInlineRSVP('coming')}
                    disabled={!canSubmit}
                    style={{
                      flex: 1, padding: '13px 8px', borderRadius: 12, fontSize: 15, fontWeight: 800,
                      background: canSubmit ? 'var(--color-violet)' : 'var(--color-border)',
                      color: canSubmit ? '#fff' : 'var(--color-text-3)',
                      border: 'none',
                      cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    }}
                  >
                    {rsvpSaving ? '...' : '✓ Je viens !'}
                  </button>
                </div>
                {/* Row 2: Je ne sais pas encore — tertiary */}
                <button
                  onClick={() => handleInlineRSVP('maybe')}
                  disabled={!canSubmit}
                  style={{
                    width: '100%', padding: '10px', background: 'none',
                    border: '1.5px solid var(--color-border)', borderRadius: 12,
                    fontSize: 13, fontWeight: 500, color: 'var(--color-text-3)',
                    cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  }}
                >
                  Je ne sais pas encore
                </button>
              </>
            )
          })()}
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 14 }}>
            Tu es invité(e) à cet événement
          </div>
          <Button onClick={() => setShowRsvpForm(true)} size="lg" fullWidth>
            Répondre à l'invitation
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className="animate-fade-up" style={{ paddingBottom: 40 }}>

      {/* ── Cover image — full bleed, back button overlaid ── */}
      {event.cover_image ? (
        <div style={{
          margin: '-20px -24px 24px',
          height: 240,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <img
            src={event.cover_image}
            alt={event.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 40%), linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)',
          }} />
          <button
            onClick={() => navigate('/events')}
            style={{
              position: 'absolute', top: 16, left: 20,
              background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
              border: 'none', cursor: 'pointer', borderRadius: 20,
              fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
              padding: '6px 14px', fontFamily: 'inherit',
            }}
          >
            ← Mes événements
          </button>
        </div>
      ) : (
        <div style={{ paddingTop: 12, paddingBottom: 4 }}>
          <button
            onClick={() => navigate('/events')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)',
              padding: '4px 0', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ← Mes événements
          </button>
        </div>
      )}

      {/* ── Title + meta — full width above grid ── */}
      <div style={{ marginBottom: 24, paddingTop: event.cover_image ? 0 : 8 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: 36, fontWeight: 400, color: 'var(--color-text)',
          lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: 20,
        }}>
          {event.name}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--color-violet)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {new Date(event.date_start).toLocaleString('fr-FR', { month: 'short' })}
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
                {new Date(event.date_start).getDate()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                {formatDateRange(event.date_start, event.date_end)}
              </div>
              {timeLabel && (
                <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 1 }}>à {timeLabel}</div>
              )}
            </div>
          </div>

          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="var(--color-violet)" strokeWidth="1.5"/>
                <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5C12.5 3.515 10.485 1.5 8 1.5Z" stroke="var(--color-violet)" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                {event.destination_address.split(',')[0]}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 1 }}>
                {event.destination_address.split(',').slice(1, 3).join(',').trim()}
              </div>
            </div>
          </div>

          {/* Organizer */}
          {organizer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Avatar name={organizer.name} size={28} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Organisé par</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{organizer.name || 'Organisateur'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Invitee KPIs ── */}
      {!isOrganizer && comingCount > 0 && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
        }}>
          <div style={{
            flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, padding: '12px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
              {totalPeople}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 3 }}>
              {totalPeople > 1 ? 'viennent' : 'vient'}
            </div>
          </div>
          <div style={{
            flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, padding: '12px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: covoitMatches > 0 ? 'var(--color-violet)' : 'var(--color-text)', lineHeight: 1 }}>
              {covoitMatches}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 3 }}>
              covoit' matchés
            </div>
          </div>
          <div style={{
            flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, padding: '12px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
              {guests.filter(g => g.drives_this_event).length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginTop: 3 }}>
              conducteurs
            </div>
          </div>
        </div>
      )}

      {/* ── Two-column grid ── */}
      <div className="event-content-grid">

        {/* ════ LEFT column ════ */}
        <div className="event-col-left">

          {/* Description */}
          {event.description && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 18, padding: '20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                À propos
              </div>
              <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                {event.description}
              </p>
            </div>
          )}

          {/* Packing list */}
          {event.packing_list && event.packing_list.length > 0 && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 18, padding: '20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                À apporter
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {event.packing_list.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--color-text)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-violet)', flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby stations */}
          {event.nearby_stations && event.nearby_stations.length > 0 && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 18, padding: '20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Gares & arrêts proches
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {event.nearby_stations.map((st, i) => (
                  <div key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                    borderRadius: 10, padding: '7px 12px',
                    fontSize: 13, color: 'var(--color-text)', fontWeight: 500,
                  }}>
                    <span>{st.type === 'bus' ? '🚌' : '🚉'}</span>
                    <span>{st.name}</span>
                    <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>· {st.distanceKm} km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location access */}
          {(event.location_instructions || (event.location_photos && event.location_photos.length > 0)) && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 18, padding: '20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Accès & stationnement
              </div>
              {event.location_instructions && (
                <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.6, margin: '0 0 14px' }}>
                  {event.location_instructions}
                </p>
              )}
              {event.location_photos && event.location_photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {event.location_photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
                      width: 100, height: 100, borderRadius: 10, overflow: 'hidden',
                      display: 'block', flexShrink: 0, border: '1px solid var(--color-border)',
                    }}>
                      <img src={url} alt={`Accès ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Who's coming */}
          {guests.length > 0 && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 18, padding: '20px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                    Qui vient
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    {totalPeople} personne{totalPeople > 1 ? 's' : ''}
                    {plusOneTotal > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}> (dont {plusOneTotal} +1)</span>
                    )}
                  </div>
                </div>
                <AvatarStack items={guests.map(g => ({ name: guestDisplayName(g) }))} max={5} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {guests.slice(0, 6).map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={guestDisplayName(g)} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                        {guestDisplayName(g)}
                        {g.brings_plus_one && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>+1</span>
                        )}
                      </div>
                    </div>
                    {isOrganizer && g.departure_address && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                        {g.status === 'confirmed' ? '🚗 Confirmé' : g.status === 'matched' ? '🚗 Matché' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {guests.length > 6 && (
                <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 12, fontWeight: 600 }}>
                  +{guests.length - 6} autres invités
                </div>
              )}
            </div>
          )}

          {/* Organizer edit shortcut */}
          {isOrganizer && (
            <button
              onClick={() => navigate(`/event/${shortId}/edit`)}
              style={{
                width: '100%', background: 'none',
                border: '1.5px solid var(--color-border)', borderRadius: 12, padding: '12px',
                fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)',
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12,
              }}
            >
              ✏️ Modifier l'événement
            </button>
          )}
        </div>

        {/* ════ RIGHT column (sticky on desktop) ════ */}
        <div className="event-col-right">
          <RsvpBlock />
          <CarpoolBlock />
        </div>

      </div>
    </div>
  )
}
