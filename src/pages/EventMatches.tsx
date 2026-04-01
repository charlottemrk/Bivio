import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { haversineDistance } from '../lib/geocoding'

const MATCH_KM = 50   // max distance to be considered a match
const COLORS   = ['#7cc400', '#f4a261', '#5dcaa5', '#9b8afb']

// ── Toast alert ──────────────────────────────────────────────────────────────
function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div style={{
      position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--color-text)', color: '#fff', borderRadius: 16,
      padding: '12px 20px', fontSize: 14, fontWeight: 700, zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      display: 'flex', alignItems: 'center', gap: 12,
      maxWidth: 'calc(100vw - 48px)',
    }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{
        background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
        color: '#fff', cursor: 'pointer', padding: '2px 8px',
        fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
      }}>×</button>
    </div>
  )
}

// ── Constraint pills ─────────────────────────────────────────────────────────
function Tags({ items, color = 'var(--color-surface-2)' }: { items: string[]; color?: string }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {items.map(t => (
        <span key={t} style={{
          background: color, borderRadius: 20, padding: '3px 10px',
          fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)',
        }}>{t}</span>
      ))}
    </div>
  )
}

export default function EventMatches() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()

  const [loading, setLoading]   = useState(true)
  const [myReg, setMyReg]       = useState<any>(null)
  const [eventData, setEventData] = useState<any>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const toastTimer              = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Driver state ────────────────────────────────────────────────────────────
  const [requests, setRequests]   = useState<any[]>([])   // pending requests
  const [accepted, setAccepted]   = useState<any[]>([])   // accepted passengers

  // ── Passenger state ─────────────────────────────────────────────────────────
  const [matches, setMatches]           = useState<any[]>([])   // matched drivers
  const [requestedId, setRequestedId]   = useState<string | null>(null)
  const [myMatchStatus, setMyMatchStatus] = useState<string>('none')

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 6000)
  }

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shortId) return
    const load = async () => {
      const { data: event } = await supabase.from('events').select('*').eq('short_id', shortId).single()
      if (!event) { setLoading(false); return }
      setEventData(event)

      // Find my registration
      const guestId = localStorage.getItem(`bivio_guest_id_${shortId}`)
      let reg: any = null
      if (guestId) {
        const { data } = await supabase.from('event_guests').select('*').eq('id', guestId).maybeSingle()
        reg = data
      }
      if (!reg && user) {
        const { data } = await supabase.from('event_guests').select('*').eq('event_id', event.id).eq('profile_id', user.id).maybeSingle()
        reg = data
        if (reg) localStorage.setItem(`bivio_guest_id_${shortId}`, reg.id)
      }
      if (!reg) { setLoading(false); return }
      setMyReg(reg)

      if (reg.drives_this_event) {
        // ── DRIVER: load incoming requests ──
        const { data: reqs } = await supabase.from('event_guests')
          .select('*').eq('event_id', event.id)
          .eq('requested_driver_id', reg.id)
        const pending  = (reqs || []).filter((r: any) => r.match_status === 'pending')
        const accepted = (reqs || []).filter((r: any) => r.match_status === 'accepted')
        setRequests(pending)
        setAccepted(accepted)
      } else {
        // ── PASSENGER: find matched drivers by proximity ──
        const { data: drivers } = await supabase.from('event_guests')
          .select('*').eq('event_id', event.id).eq('drives_this_event', true)
        const matched = (drivers || [])
          .map((d: any) => {
            const dist = (reg.departure_lat && d.departure_lat)
              ? haversineDistance(reg.departure_lat, reg.departure_lng, d.departure_lat, d.departure_lng)
              : 9999
            return { ...d, _dist: Math.round(dist) }
          })
          .filter((d: any) => d._dist <= MATCH_KM)
          .sort((a: any, b: any) => a._dist - b._dist)
        setMatches(matched)
        setRequestedId(reg.requested_driver_id || null)
        setMyMatchStatus(reg.match_status || 'none')

        // If already accepted → go straight to confirmed
        if (reg.match_status === 'accepted') {
          navigate(`/event/${shortId}/confirmed`)
          return
        }
      }
      setLoading(false)
    }
    load()
  }, [shortId, user]) // eslint-disable-line

  // ── Realtime: driver receives new requests ───────────────────────────────────
  useEffect(() => {
    if (!myReg?.drives_this_event || !eventData) return
    const channel = supabase.channel(`match-requests-${myReg.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'event_guests',
      }, (payload: any) => {
        if (
          payload.new.requested_driver_id === myReg.id &&
          payload.new.match_status === 'pending'
        ) {
          const name = payload.new.guest_name || 'Quelqu\'un'
          showToast(`🙋 ${name} veut rejoindre ton trajet !`)
          setRequests(prev => {
            if (prev.find(r => r.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myReg?.drives_this_event, myReg?.id, eventData])

  // ── Realtime: passenger gets notified when accepted ──────────────────────────
  useEffect(() => {
    if (!myReg || myReg.drives_this_event) return
    const channel = supabase.channel(`my-match-${myReg.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'event_guests',
      }, (payload: any) => {
        if (payload.new.id === myReg.id && payload.new.match_status === 'accepted') {
          showToast('🎉 Ton trajet est confirmé !')
          setTimeout(() => navigate(`/event/${shortId}/confirmed`), 2000)
        }
        if (payload.new.id === myReg.id && payload.new.match_status === 'declined') {
          showToast('😔 Le conducteur n\'a pas pu t\'accepter. Choisis un autre trajet.')
          setRequestedId(null)
          setMyMatchStatus('none')
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myReg?.id, myReg?.drives_this_event]) // eslint-disable-line

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleRequest = async (driverId: string) => {
    const guestId = localStorage.getItem(`bivio_guest_id_${shortId}`)
    if (!guestId) return
    await supabase.from('event_guests').update({
      requested_driver_id: driverId,
      match_status: 'pending',
    }).eq('id', guestId)
    setRequestedId(driverId)
    setMyMatchStatus('pending')
  }

  const handleCancelRequest = async () => {
    const guestId = localStorage.getItem(`bivio_guest_id_${shortId}`)
    if (!guestId) return
    await supabase.from('event_guests').update({
      requested_driver_id: null,
      match_status: 'none',
    }).eq('id', guestId)
    setRequestedId(null)
    setMyMatchStatus('none')
  }

  const handleAccept = async (passenger: any) => {
    await supabase.from('event_guests').update({
      match_status: 'accepted',
      status: 'confirmed',
    }).eq('id', passenger.id)
    setRequests(prev => prev.filter(r => r.id !== passenger.id))
    setAccepted(prev => [...prev, { ...passenger, match_status: 'accepted' }])
    showToast(`✓ ${passenger.guest_name || 'Passager'} ajouté à ton trajet !`)
  }

  const handleDecline = async (passenger: any) => {
    await supabase.from('event_guests').update({ match_status: 'declined' }).eq('id', passenger.id)
    setRequests(prev => prev.filter(r => r.id !== passenger.id))
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>
      Chargement...
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // DRIVER VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (myReg?.drives_this_event) {
    const constraints: string[] = myReg.constraints_this_event || []
    const carRules = constraints.filter((c: string) =>
      !c.startsWith('coffre:') && !c.startsWith('gratuit') && !c.startsWith('frais') && c !== 'peut-relayer')
    const trunkTag = constraints.find((c: string) => c.startsWith('coffre:'))?.replace('coffre:', '')
    const seatsLeft = myReg.seats_available - accepted.length

    return (
      <div className="animate-fade-up" style={{ paddingTop: 8 }}>
        {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

        <div style={{ paddingBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
            Ton trajet conducteur
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
            Pour <strong style={{ color: 'var(--color-text)' }}>{eventData?.name}</strong>
          </p>
        </div>

        {/* Trip summary */}
        <div style={{
          background: 'var(--color-surface)', border: '2px solid var(--color-violet)',
          borderRadius: 18, padding: 18, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>🚗</span><span>Trajet enregistré</span>
            </div>
            <div style={{
              background: seatsLeft > 0 ? 'var(--color-green-light)' : '#fee2e2',
              border: `1px solid ${seatsLeft > 0 ? 'var(--color-green)' : '#ef4444'}`,
              borderRadius: 10, padding: '4px 10px',
              fontSize: 12, fontWeight: 700,
              color: seatsLeft > 0 ? 'var(--color-green)' : '#ef4444',
            }}>
              {seatsLeft} place{seatsLeft !== 1 ? 's' : ''} restante{seatsLeft !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            {myReg.departure_address && <div>📍 <strong>{myReg.departure_address}</strong></div>}
            {myReg.preferred_arrival && myReg.preferred_arrival !== 'flexible' && (
              <div style={{ color: 'var(--color-text-2)' }}>🕐 Départ : <strong style={{ color: 'var(--color-text)' }}>{myReg.preferred_arrival}</strong></div>
            )}
            {trunkTag && <div style={{ color: 'var(--color-text-2)' }}>🧳 Coffre : <strong style={{ color: 'var(--color-text)' }}>{trunkTag}</strong></div>}
          </div>
          <Tags items={carRules} color="var(--color-violet-light)" />
        </div>

        {/* Accepted passengers */}
        {accepted.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              ✓ Passagers confirmés · {accepted.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {accepted.map((p: any, i: number) => (
                <div key={p.id} style={{
                  background: 'var(--color-green-light)', border: '1.5px solid var(--color-green)',
                  borderRadius: 14, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Avatar name={p.guest_name} size={36} color={COLORS[i % COLORS.length]} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{p.guest_name || 'Passager'}</div>
                    {p.departure_address && <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>📍 {p.departure_address}</div>}
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--color-green)' }}>✓ Confirmé</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending requests */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Demandes en attente · {requests.length}
          </div>

          {requests.length === 0 ? (
            <div style={{
              background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)',
              borderRadius: 18, padding: '28px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                En attente de passagers
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                Tu seras alerté dès qu'un passager demande à rejoindre ton trajet.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map((p: any, i: number) => {
                const dist = (myReg.departure_lat && p.departure_lat)
                  ? Math.round(haversineDistance(myReg.departure_lat, myReg.departure_lng, p.departure_lat, p.departure_lng))
                  : null
                const needs = (p.constraints_this_event || []).filter((c: string) =>
                  !c.startsWith('coffre:') && !c.includes('relayer'))
                return (
                  <div key={p.id} style={{
                    background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                    borderRadius: 18, padding: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <Avatar name={p.guest_name} size={40} color={COLORS[i % COLORS.length]} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>
                          {p.guest_name || 'Passager'}
                        </div>
                        {p.departure_address && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
                            📍 {p.departure_address}
                          </div>
                        )}
                      </div>
                      {dist !== null && (
                        <div style={{
                          background: dist < 10 ? 'var(--color-green-light)' : 'var(--color-surface-2)',
                          border: `1px solid ${dist < 10 ? 'var(--color-green)' : 'var(--color-border)'}`,
                          borderRadius: 10, padding: '4px 10px',
                          fontSize: 12, fontWeight: 700,
                          color: dist < 10 ? 'var(--color-green)' : 'var(--color-text-2)',
                        }}>{dist} km</div>
                      )}
                    </div>
                    {p.preferred_arrival && p.preferred_arrival !== 'flexible' && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: needs.length ? 6 : 10 }}>
                        🕐 Arrivée souhaitée : {p.preferred_arrival}
                      </div>
                    )}
                    <Tags items={needs} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button
                        onClick={() => handleDecline(p)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'inherit',
                          background: 'none', border: '1.5px solid var(--color-border)',
                          fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', cursor: 'pointer',
                        }}
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => handleAccept(p)}
                        disabled={seatsLeft <= 0}
                        style={{
                          flex: 2, padding: '10px', borderRadius: 10, fontFamily: 'inherit',
                          background: seatsLeft > 0 ? 'var(--color-violet)' : 'var(--color-border)',
                          border: 'none', fontSize: 14, fontWeight: 800,
                          color: seatsLeft > 0 ? '#fff' : 'var(--color-text-3)',
                          cursor: seatsLeft > 0 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        ✓ Accepter
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => navigate(`/event/${shortId}/join`)} style={{
            width: '100%', padding: '12px', background: 'none',
            border: '1.5px solid var(--color-border)', borderRadius: 12,
            fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ✏️ Modifier mon trajet
          </button>
          <button onClick={() => navigate(`/event/${shortId}`)} style={{
            width: '100%', padding: '12px', background: 'none',
            border: '1.5px solid var(--color-border)', borderRadius: 12,
            fontSize: 14, fontWeight: 600, color: 'var(--color-text-3)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ← Retour à l'événement
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PASSENGER VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-up" style={{ paddingTop: 8 }}>
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      <div style={{ paddingBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          {myMatchStatus === 'pending' ? 'Demande envoyée' : 'Conducteurs disponibles'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
          {matches.length > 0
            ? `${matches.length} conducteur${matches.length > 1 ? 's' : ''} sur ta route`
            : 'Pas de conducteur dans ta zone pour l\'instant'}
        </p>
      </div>

      {/* Pending state banner */}
      {myMatchStatus === 'pending' && (
        <div style={{
          background: '#FFF8E7', border: '1.5px solid #F5A623',
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>
              Demande envoyée !
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
              En attente de confirmation du conducteur…
            </div>
          </div>
          <button
            onClick={handleCancelRequest}
            style={{
              background: 'none', border: '1px solid #F5A623', borderRadius: 8,
              fontSize: 12, fontWeight: 600, color: '#F5A623',
              cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit',
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {matches.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)',
          borderRadius: 18, padding: '32px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🗺️</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>
            Pas de conducteur sur ta route
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 16 }}>
            Aucun conducteur dans un rayon de {MATCH_KM} km de ton point de départ.
          </div>
          <button onClick={() => navigate(`/event/${shortId}/join`)} style={{
            background: 'none', border: '1.5px solid var(--color-border)', borderRadius: 12,
            padding: '10px 20px', fontSize: 13, fontWeight: 700,
            color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ✏️ Modifier mon point de départ
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {matches.map((driver: any, i: number) => {
            const isRequested = requestedId === driver.id
            const constraints: string[] = driver.constraints_this_event || []
            const carRules = constraints.filter((c: string) =>
              !c.startsWith('coffre:') && !c.startsWith('gratuit') && !c.startsWith('frais') && c !== 'peut-relayer')
            const trunkTag = constraints.find((c: string) => c.startsWith('coffre:'))?.replace('coffre:', '')
            const isFree   = constraints.some((c: string) => c.startsWith('gratuit'))
            const color    = COLORS[i % COLORS.length]

            return (
              <div key={driver.id} style={{
                background: 'var(--color-surface)',
                border: `2px solid ${isRequested ? color : 'var(--color-border)'}`,
                borderRadius: 20, padding: 18,
                boxShadow: isRequested ? `0 0 0 3px ${color}22` : 'none',
                transition: 'all 0.15s',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <Avatar name={driver.guest_name || driver.profiles?.name} size={44} color={color} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>
                      {driver.guest_name || driver.profiles?.name || 'Conducteur'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
                      📍 {driver.departure_address}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: isFree ? 'var(--color-green)' : 'var(--color-text)' }}>
                      {isFree ? 'Gratuit' : '~'}
                    </div>
                    <div style={{
                      background: color + '22', borderRadius: 8, padding: '2px 8px',
                      fontSize: 11, fontWeight: 700, color, marginTop: 2,
                    }}>
                      {driver._dist} km
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-2)', marginBottom: 10, flexWrap: 'wrap' }}>
                  <span>💺 {driver.seats_available} place{driver.seats_available !== 1 ? 's' : ''}</span>
                  {driver.preferred_arrival && driver.preferred_arrival !== 'flexible' && (
                    <span>🕐 Départ {driver.preferred_arrival}</span>
                  )}
                  {trunkTag && <span>🧳 Coffre {trunkTag}</span>}
                </div>
                <Tags items={carRules} color={color + '22'} />

                {/* Action */}
                <div style={{ marginTop: 14 }}>
                  {isRequested ? (
                    <div style={{
                      background: color + '15', border: `1.5px solid ${color}`,
                      borderRadius: 12, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>
                        ⏳ Demande envoyée
                      </span>
                      <button onClick={handleCancelRequest} style={{
                        background: 'none', border: 'none', fontSize: 12,
                        color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit',
                      }}>Annuler</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRequest(driver.id)}
                      disabled={myMatchStatus === 'pending'}
                      style={{
                        width: '100%', padding: '12px', borderRadius: 12,
                        background: myMatchStatus === 'pending' ? 'var(--color-border)' : color,
                        border: 'none', fontFamily: 'inherit',
                        fontSize: 14, fontWeight: 800,
                        color: myMatchStatus === 'pending' ? 'var(--color-text-3)' : '#fff',
                        cursor: myMatchStatus === 'pending' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Demander à rejoindre →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => navigate(`/event/${shortId}/join`)} style={{
          width: '100%', padding: '12px', background: 'none',
          border: '1.5px solid var(--color-border)', borderRadius: 12,
          fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ✏️ Modifier mon trajet
        </button>
        <button onClick={() => navigate(`/event/${shortId}`)} style={{
          width: '100%', padding: '12px', background: 'none',
          border: '1.5px solid var(--color-border)', borderRadius: 12,
          fontSize: 14, fontWeight: 600, color: 'var(--color-text-3)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ← Retour à l'événement
        </button>
      </div>
    </div>
  )
}
