import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { RoleChip } from '../components/RoleChip'
import { Spinner } from '../components/Spinner'
import { haversineDistance, searchAddress } from '../lib/geocoding'
import { rankPassengers, geocodeAddress, calcDetourAndMeeting, type MatchResult, type MeetingPoint } from '../lib/matching'
import { MiniMap } from '../components/MiniMap'

const MATCH_KM = 50   // max distance to be considered a match (passenger view fallback)

// ── Toast alert ──────────────────────────────────────────────────────────────
function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div style={{
      position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--color-text)', color: '#fff', borderRadius: 16,
      padding: '12px 16px 12px 20px', fontSize: 14, fontWeight: 700, zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      display: 'flex', alignItems: 'center', gap: 12,
      maxWidth: 'calc(100vw - 48px)',
    }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{
        background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
        color: '#fff', cursor: 'pointer',
        minWidth: 44, minHeight: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
        flexShrink: 0,
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
          fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)',
        }}>{t}</span>
      ))}
    </div>
  )
}

// ── Neutral distance badge ────────────────────────────────────────────────────
function DistanceBadge({ km }: { km: number }) {
  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '3px 8px',
      fontSize: 12, fontWeight: 700,
      color: 'var(--color-text-2)',
      whiteSpace: 'nowrap',
    }}>
      {km} km
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
  const [requests, setRequests]     = useState<any[]>([])    // pending requests (raw)
  const [accepted, setAccepted]     = useState<any[]>([])    // accepted passengers
  const [rankedMatches, setRankedMatches] = useState<MatchResult[]>([])
  const [rankingLoading, setRankingLoading] = useState(false)
  const [rankingStep, setRankingStep] = useState(0)           // AI loading step
  const [matchIdx, setMatchIdx]     = useState(0)
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null)

  // ── Driver: car info for day-of ─────────────────────────────────────────────
  const [carDescription, setCarDescription] = useState('')
  const [carPhotoUrl, setCarPhotoUrl]       = useState<string | null>(null)
  const [uploadingCarPhoto, setUploadingCarPhoto] = useState(false)
  const [savingCarInfo, setSavingCarInfo]   = useState(false)
  const [carInfoSaved, setCarInfoSaved]     = useState(false)
  const carPhotoInputRef = useRef<HTMLInputElement>(null)

  // ── Passenger meeting points (computed async) ────────────────────────────────
  const [passengerMeetings, setPassengerMeetings] = useState<Record<string, { loading: boolean; point: MeetingPoint | null }>>({})
  const [passengerLoadingStep, setPassengerLoadingStep] = useState(0)

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

        // ── Phase 1-3: geocode destination + rank pending passengers ──
        if (pending.length > 0 && reg.departure_lat && reg.departure_lng) {
          setRankingLoading(true)
          const dest = await geocodeAddress(event.destination_address)
          if (dest) {
            setDestCoords(dest)
            const ranked = await rankPassengers(
              { lat: reg.departure_lat, lng: reg.departure_lng },
              pending,
              dest,
            )
            setRankedMatches(ranked)
          }
          setRankingLoading(false)
        }
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

        // Compute meeting points for each driver asynchronously
        if (reg.departure_lat && reg.departure_lng && matched.length > 0) {
          const dest = await geocodeAddress(event.destination_address)
          if (dest) {
            const init: Record<string, { loading: boolean; point: MeetingPoint | null }> = {}
            matched.forEach((d: any) => { init[d.id] = { loading: true, point: null } })
            setPassengerMeetings(init)
            matched.forEach(async (driver: any) => {
              if (!driver.departure_lat || !driver.departure_lng) {
                setPassengerMeetings(prev => ({ ...prev, [driver.id]: { loading: false, point: null } }))
                return
              }
              const result = await calcDetourAndMeeting(
                { lat: driver.departure_lat, lng: driver.departure_lng },
                { lat: reg.departure_lat, lng: reg.departure_lng },
                dest,
              )
              setPassengerMeetings(prev => ({ ...prev, [driver.id]: { loading: false, point: result?.meetingPoint ?? null } }))
            })
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [shortId, user]) // eslint-disable-line

  // ── Re-rank when requests change ────────────────────────────────────────────
  useEffect(() => {
    if (!myReg?.drives_this_event || !destCoords || requests.length === 0) return
    const rerank = async () => {
      setRankingLoading(true)
      const ranked = await rankPassengers(
        { lat: myReg.departure_lat, lng: myReg.departure_lng },
        requests,
        destCoords,
      )
      setRankedMatches(ranked)
      setMatchIdx(0)
      setRankingLoading(false)
    }
    rerank()
  }, [requests.length]) // eslint-disable-line

  // ── AI loading steps cycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (!rankingLoading) { setRankingStep(0); return }
    const steps = [0, 1, 2]
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length
      setRankingStep(idx)
    }, 1400)
    return () => clearInterval(interval)
  }, [rankingLoading])

  // ── Passenger AI loading steps cycle ────────────────────────────────────────
  const allMeetingsLoading = matches.length > 0
    && Object.keys(passengerMeetings).length > 0
    && Object.values(passengerMeetings).every(m => m.loading)

  useEffect(() => {
    if (!allMeetingsLoading) { setPassengerLoadingStep(0); return }
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % 3
      setPassengerLoadingStep(idx)
    }, 1400)
    return () => clearInterval(interval)
  }, [allMeetingsLoading])

  // ── Load car info for driver ─────────────────────────────────────────────────
  useEffect(() => {
    if (!myReg?.drives_this_event) return
    setCarDescription(myReg.car_description || '')
    setCarPhotoUrl(myReg.car_photo_url || null)
  }, [myReg?.id]) // eslint-disable-line

  // ── Handlers: car info ───────────────────────────────────────────────────────
  const handleCarPhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const guestId = localStorage.getItem(`bivio_guest_id_${shortId}`)
    if (!file || !guestId || !user) return
    setUploadingCarPhoto(true)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${guestId}.${ext}`
    const { error } = await supabase.storage.from('car-photos').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('car-photos').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      setCarPhotoUrl(url)
      await supabase.from('event_guests').update({ car_photo_url: url }).eq('id', guestId)
    }
    setUploadingCarPhoto(false)
  }, [shortId, user])

  const handleSaveCarDescription = useCallback(async () => {
    const guestId = localStorage.getItem(`bivio_guest_id_${shortId}`)
    if (!guestId) return
    setSavingCarInfo(true)
    await supabase.from('event_guests').update({ car_description: carDescription }).eq('id', guestId)
    setSavingCarInfo(false)
    setCarInfoSaved(true)
    setTimeout(() => setCarInfoSaved(false), 3000)
  }, [shortId, carDescription])

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

  // ── Realtime: passenger gets notified when accepted or approved ──────────────
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
          setToast('😔 Le conducteur n\'a pas pu t\'accepter. Choisis un autre trajet.')
          setRequestedId(null)
          setMyMatchStatus('none')
        }
        if (payload.new.id === myReg.id && payload.new.approval_status === 'approved') {
          showToast('✅ L\'organisateur a approuvé ta participation !')
          // Reload pour charger les données de matching
          setTimeout(() => window.location.reload(), 1500)
        }
        if (payload.new.id === myReg.id && payload.new.approval_status === 'rejected') {
          setToast('❌ Ta demande de participation a été refusée par l\'organisateur.')
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
  if (loading) return <Spinner />

  // ── Pending organizer approval ───────────────────────────────────────────────
  if (myReg && myReg.approval_status === 'pending') {
    return (
      <div className="animate-fade-up" style={{ paddingTop: 48, paddingBottom: 80, textAlign: 'center' }}>
        <div style={{
          width: 68, height: 68, borderRadius: 22,
          background: 'var(--color-amber-light)', color: 'var(--color-amber)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 20px',
        }}>⏳</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', marginBottom: 10, letterSpacing: '-0.5px' }}>
          Demande envoyée !
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 8 }}>
          L'organisateur doit valider ta participation
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.5, marginBottom: 32 }}>
          Tu recevras accès aux covoiturages dès que ton inscription est approuvée.
        </p>
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 16, padding: '16px 20px', textAlign: 'left', marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Événement
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
            {eventData?.name}
          </div>
          {eventData?.destination_address && (
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>
              📍 {eventData.destination_address}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/events')}
          style={{
            background: 'none', border: 'none', fontSize: 13, fontWeight: 600,
            color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ← Retour à mes événements
        </button>
      </div>
    )
  }

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
      <div className="animate-fade-up" style={{ paddingTop: 32, paddingBottom: 80 }}>
        {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

        {/* ── Role chip ── */}
        <div style={{ marginBottom: 16 }}>
          <RoleChip role="driver" />
        </div>

        {/* ── Page header ── */}
        <div style={{ paddingBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
            Ton trajet
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 2, marginTop: 8 }}>
            Pour
          </p>
          <p style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 400,
            color: 'var(--color-text)',
            margin: 0,
            lineHeight: 1.2,
          }}>
            {eventData?.name}
          </p>
        </div>

        {/* ── Trip summary ── */}
        <div style={{
          background: 'var(--color-surface)', border: '2px solid var(--color-violet)',
          borderRadius: 18, padding: 18, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>🚗</span><span>Trajet enregistré</span>
            </div>
            <div style={{
              background: seatsLeft > 0 ? 'var(--color-green-light)' : 'var(--color-red-light)',
              border: `1px solid ${seatsLeft > 0 ? 'var(--color-green)' : 'var(--color-red)'}`,
              borderRadius: 10, padding: '4px 10px',
              fontSize: 12, fontWeight: 700,
              color: seatsLeft > 0 ? 'var(--color-green)' : 'var(--color-red)',
            }}>
              {seatsLeft > 0
                ? `${seatsLeft} place${seatsLeft !== 1 ? 's' : ''} disponible${seatsLeft !== 1 ? 's' : ''}`
                : 'Complet'
              }
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div>
              📍 <strong>
                {myReg.departure_address
                  ? myReg.departure_address
                  : <em style={{ color: 'var(--color-text-3)', fontStyle: 'normal' }}>Adresse non renseignée</em>
                }
              </strong>
            </div>
            <div style={{ color: 'var(--color-text-2)' }}>
              🕐 Départ :{' '}
              <strong style={{ color: 'var(--color-text)' }}>
                {myReg.preferred_arrival && myReg.preferred_arrival !== 'flexible'
                  ? myReg.preferred_arrival
                  : 'Horaire flexible'
                }
              </strong>
            </div>
            {trunkTag && (
              <div style={{ color: 'var(--color-text-2)' }}>
                🧳 Coffre : <strong style={{ color: 'var(--color-text)' }}>{trunkTag}</strong>
              </div>
            )}
          </div>
          <Tags items={carRules} color="var(--color-violet-light)" />
        </div>

        {/* ── Accepted passengers ── */}
        {accepted.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Passagers confirmés · {accepted.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {accepted.map((p: any) => (
                <div key={p.id} style={{
                  background: 'var(--color-green-light)', border: '1.5px solid var(--color-green)',
                  borderRadius: 14, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Avatar name={p.guest_name} size={36} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{p.guest_name || 'Passager'}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--color-green)' }}>✓ Confirmé</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Aide tes passagers à te trouver (jour J) ── */}
        {accepted.length > 0 && (
          <div style={{
            background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
            borderRadius: 16, padding: 18, marginBottom: 24,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              📸 Aide tes passagers à te reconnaître
            </div>

            {/* Photo voiture */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                Photo de ta voiture
              </div>
              {carPhotoUrl ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={carPhotoUrl}
                    alt="Ta voiture"
                    style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, display: 'block' }}
                  />
                  <button
                    onClick={() => carPhotoInputRef.current?.click()}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 8,
                      color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      padding: '6px 10px', fontFamily: 'inherit',
                    }}
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => carPhotoInputRef.current?.click()}
                  disabled={uploadingCarPhoto}
                  style={{
                    width: '100%', padding: '20px', borderRadius: 12,
                    border: '2px dashed var(--color-border)',
                    background: 'var(--color-bg)', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {uploadingCarPhoto ? '📤 Upload…' : '📷 Ajouter une photo de ta voiture'}
                </button>
              )}
              <input
                ref={carPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleCarPhotoUpload}
              />
            </div>

            {/* Description */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                Description courte
              </div>
              <textarea
                value={carDescription}
                onChange={e => setCarDescription(e.target.value)}
                placeholder="Ex : Renault Clio grise, plaque finit en 42, je serai garé côté boulangerie…"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '11px 14px',
                  fontSize: 14, border: '1.5px solid var(--color-border)',
                  borderRadius: 10, background: 'var(--color-bg)', color: 'var(--color-text)',
                  fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.5,
                }}
              />
              <button
                onClick={handleSaveCarDescription}
                disabled={savingCarInfo || !carDescription.trim()}
                style={{
                  marginTop: 8, padding: '10px 20px', borderRadius: 10,
                  background: carInfoSaved ? 'var(--color-green)' : 'var(--color-violet)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: savingCarInfo || !carDescription.trim() ? 'not-allowed' : 'pointer',
                  opacity: savingCarInfo || !carDescription.trim() ? 0.6 : 1,
                  fontFamily: 'inherit', transition: 'background 0.2s',
                }}
              >
                {carInfoSaved ? '✓ Enregistré' : savingCarInfo ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* ── Phase 3: Smart match suggestion ── */}
        {(() => {
          const total    = rankedMatches.length
          const safeIdx  = Math.min(matchIdx, Math.max(0, total - 1))
          const current  = total > 0 ? rankedMatches[safeIdx] : null

          const handlePrev = () => setMatchIdx(i => Math.max(0, i - 1))
          const handleNext = () => setMatchIdx(i => Math.min(total - 1, i + 1))

          return (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                💡 Match suggéré
                {!rankingLoading && total > 0 && (
                  <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: 'var(--color-text-3)' }}>
                    · {total} demande{total > 1 ? 's' : ''} analysée{total > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {rankingLoading ? (
                <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-violet)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 3px var(--color-violet-light)' }}>
                  {/* Skeleton header bar */}
                  <div style={{ background: 'var(--color-violet-light)', padding: '14px 18px', borderBottom: '1px solid var(--color-violet)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-violet)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      Analyse en cours…
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {[
                        '🗺️ Calcul des trajets',
                        '📍 Recherche des points de pickup',
                        '🏆 Classement des matchs',
                      ].map((step, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          opacity: rankingStep === i ? 1 : 0.35,
                          transition: 'opacity 0.4s',
                        }}>
                          {i > 0 && <span style={{ color: 'var(--color-violet)', opacity: 0.4, fontSize: 10 }}>→</span>}
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-violet)', whiteSpace: 'nowrap' }}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Skeleton body */}
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ height: 16, width: '55%', borderRadius: 8, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <div style={{ height: 12, width: '35%', borderRadius: 8, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.2s' }} />
                      </div>
                    </div>
                    <div style={{ background: 'var(--color-surface-2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                      <div style={{ height: 10, width: '40%', borderRadius: 6, background: 'var(--color-border)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ height: 14, width: '70%', borderRadius: 6, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.1s' }} />
                    </div>
                    <div style={{ height: 80, borderRadius: 12, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.3s', marginBottom: 14 }} />
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>
                      Analyse de {requests.length} demande{requests.length > 1 ? 's' : ''} sur ta route…
                    </div>
                  </div>
                </div>
              ) : !current ? (
                <div style={{ background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)', borderRadius: 18, padding: '28px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>🔔</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                    {accepted.length > 0 ? 'Toutes les demandes traitées !' : 'En attente de passagers'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                    {accepted.length > 0
                      ? `${accepted.length} passager${accepted.length > 1 ? 's' : ''} confirmé${accepted.length > 1 ? 's' : ''} dans ton trajet.`
                      : 'Tu seras alerté dès qu\'un passager demande à rejoindre ton trajet.'
                    }
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-violet)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 3px var(--color-violet-light)' }}>

                    {/* Detour highlight bar */}
                    <div style={{ background: 'var(--color-violet-light)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-violet)' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-violet)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                          Meilleur match
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            fontSize: 20, fontWeight: 900,
                            color: current.detourMinutes <= 5 ? 'var(--color-green)' : current.detourMinutes <= 15 ? 'var(--color-violet)' : '#f97316',
                          }}>
                            +{current.detourMinutes} min
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-2)', marginLeft: 4 }}>sur ton trajet</span>
                        </div>
                      </div>
                      {current.requestedAt && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'right' }}>
                          🕐 {Math.floor((Date.now() - current.requestedAt.getTime()) / 60000)} min<br />
                          <span style={{ fontSize: 10 }}>{current.requestedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 18 }}>
                      {/* Identity — name only, no address */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <Avatar name={current.passenger.guest_name} size={48} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text)' }}>{current.passenger.guest_name || 'Passager'}</div>
                          {current.passenger.preferred_arrival && current.passenger.preferred_arrival !== 'flexible' && (
                            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>🕐 Arrivée souhaitée : {current.passenger.preferred_arrival}</div>
                          )}
                        </div>
                      </div>

                      {/* Meeting point */}
                      <div style={{ background: 'var(--color-surface-2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Point de rendez-vous</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>📍 {current.meetingPoint.address}</div>
                        {current.meetingPoint.accessMode === 'transit' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#fff8e1', border: '1px solid #ffc107',
                            borderRadius: 8, padding: '3px 9px',
                            fontSize: 12, fontWeight: 700, color: '#7a5100',
                          }}>
                            🚇 ~{current.meetingPoint.transitEstimateMinutes ?? current.meetingPoint.walkMinutes} min en transports
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: 8, padding: '3px 9px',
                            fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)',
                          }}>
                            🚶 {current.meetingPoint.walkMinutes} min à pied
                          </span>
                        )}
                      </div>

                      {/* Constraints */}
                      {(() => {
                        const needs = (current.passenger.constraints_this_event || []).filter((c: string) => !c.startsWith('coffre:') && !c.includes('relayer'))
                        if (!needs.length) return null
                        return (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {needs.map((t: string) => (
                              <span key={t} style={{ background: 'var(--color-surface-2)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>{t}</span>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Map: meeting point → event destination */}
                      {current.meetingPoint.address && current.meetingPoint.address !== 'Point de rendez-vous' && eventData?.destination_address && (
                        <MiniMap
                          origin={current.meetingPoint.address}
                          destination={eventData.destination_address}
                          originLabel="Pickup"
                          destLabel="Destination"
                        />
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <div style={{ flex: 1 }}>
                          <Button variant="secondary" size="sm" fullWidth onClick={() => handleDecline(current.passenger)}>
                            Refuser
                          </Button>
                        </div>
                        <div style={{ flex: 2 }}>
                          <Button variant="primary" size="sm" fullWidth disabled={seatsLeft <= 0} onClick={() => handleAccept(current.passenger)}>
                            ✓ Accepter
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Carousel navigation — outside the card ── */}
                  {total > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 }}>
                      <button
                        onClick={handlePrev}
                        disabled={safeIdx === 0}
                        style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: safeIdx === 0 ? 'var(--color-surface-2)' : 'var(--color-surface)',
                          border: '1.5px solid var(--color-border)',
                          color: safeIdx === 0 ? 'var(--color-text-3)' : 'var(--color-text)',
                          cursor: safeIdx === 0 ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 700,
                        }}
                        aria-label="Précédent"
                      >←</button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', minWidth: 40, textAlign: 'center' }}>
                        {safeIdx + 1} / {total}
                      </span>
                      <button
                        onClick={handleNext}
                        disabled={safeIdx === total - 1}
                        style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: safeIdx === total - 1 ? 'var(--color-surface-2)' : 'var(--color-surface)',
                          border: '1.5px solid var(--color-border)',
                          color: safeIdx === total - 1 ? 'var(--color-text-3)' : 'var(--color-text)',
                          cursor: safeIdx === total - 1 ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 700,
                        }}
                        aria-label="Suivant"
                      >→</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* ── Modify trip ── */}
        <div style={{ marginTop: 24 }}>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => navigate(`/event/${shortId}/join`)}
          >
            ✏️ Modifier mon trajet
          </Button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PASSENGER VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-up" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      {/* ── Role chip ── */}
      <div style={{ marginBottom: 16 }}>
        <RoleChip role="passenger" />
      </div>

      {/* ── Page header ── */}
      <div style={{ paddingBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          {myMatchStatus === 'pending' ? 'Demande envoyée' : 'Conducteurs disponibles'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginTop: 4 }}>
          {matches.length > 0
            ? `${matches.length} conducteur${matches.length > 1 ? 's' : ''} sur ta route`
            : 'Aucun conducteur dans ta zone pour l\'instant'
          }
        </p>
      </div>

      {/* ── Pending state banner ── */}
      {myMatchStatus === 'pending' && (
        <div style={{
          background: 'var(--color-amber-light)', border: '1.5px solid var(--color-amber)',
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
              background: 'none', border: '1px solid var(--color-amber)', borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: 'var(--color-amber)',
              cursor: 'pointer', padding: '10px 16px', fontFamily: 'inherit',
              minHeight: 44,
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
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>
            Pas de conducteur sur ta route
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 16 }}>
            Aucun conducteur dans un rayon de {MATCH_KM} km de ton point de départ.
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/event/${shortId}/join`)}
          >
            ✏️ Modifier mon point de départ
          </Button>
        </div>
      ) : allMeetingsLoading ? (
        /* ── Skeleton passager : en attente du calcul des pickups ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Carte skeleton principale — imite la vraie carte conducteur */}
          {[0, 1].map(n => (
            <div key={n} style={{
              background: 'var(--color-surface)',
              border: `2px solid ${n === 0 ? 'var(--color-violet)' : 'var(--color-border)'}`,
              borderRadius: 20, overflow: 'hidden',
              boxShadow: n === 0 ? '0 0 0 3px var(--color-violet-light)' : 'none',
              opacity: n === 0 ? 1 : 0.5,
            }}>
              {/* Barre d'état IA — uniquement sur la 1re carte */}
              {n === 0 && (
                <div style={{
                  background: 'var(--color-violet-light)', padding: '12px 16px',
                  borderBottom: '1px solid var(--color-violet)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-violet)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Calcul en cours…
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {[
                      '🗺️ Analyse des trajets',
                      '📍 Calcul des points de pickup',
                      '⭐ Tri par pertinence',
                    ].map((step, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        opacity: passengerLoadingStep === i ? 1 : 0.3,
                        transition: 'opacity 0.4s',
                      }}>
                        {i > 0 && <span style={{ color: 'var(--color-violet)', opacity: 0.4, fontSize: 10 }}>→</span>}
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-violet)', whiteSpace: 'nowrap' }}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Corps skeleton */}
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ height: 15, width: '50%', borderRadius: 8, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ height: 12, width: '75%', borderRadius: 8, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.15s' }} />
                  </div>
                  <div style={{ width: 44, height: 22, borderRadius: 8, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.1s', flexShrink: 0 }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  {[40, 60, 50].map((w, i) => (
                    <div key={i} style={{ height: 12, width: `${w}px`, borderRadius: 6, background: 'var(--color-border)', animation: `pulse 1.5s ease-in-out infinite ${i * 0.1}s` }} />
                  ))}
                </div>
                <div style={{ height: 52, borderRadius: 10, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.2s', marginBottom: 14 }} />
                <div style={{ height: 44, borderRadius: 10, background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.3s' }} />
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
            Recherche des meilleurs points de rendez-vous sur ta route…
          </div>
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
            const isClosest = i === 0 && matches.length > 1

            return (
              <div key={driver.id} style={{
                background: 'var(--color-surface)',
                border: `2px solid ${isRequested ? 'var(--color-violet)' : 'var(--color-border)'}`,
                borderRadius: 20, padding: 18,
                boxShadow: isRequested ? '0 0 0 3px var(--color-violet-light)' : 'none',
                opacity: myMatchStatus === 'pending' && !isRequested ? 0.35 : 1,
                pointerEvents: myMatchStatus === 'pending' && !isRequested ? 'none' : 'auto',
                transition: 'all 0.2s',
              }}>
                {/* Closest driver label */}
                {isClosest && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-violet)', marginBottom: 10 }}>
                    ⭐ Le plus proche
                  </div>
                )}

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar name={driver.guest_name || driver.profiles?.name} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>
                      {driver.guest_name || driver.profiles?.name || 'Conducteur'}
                    </div>
                    {/* Meeting point — shown when computed, no raw address */}
                    {(() => {
                      const m = passengerMeetings[driver.id]
                      if (!m) return null
                      if (m.loading) return (
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 10, height: 10, border: '1.5px solid var(--color-border)', borderTopColor: 'var(--color-violet)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                          Calcul du point de pickup…
                        </div>
                      )
                      if (!m.point) return null
                      return (
                        <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 3 }}>
                          📍 {m.point.address}
                        </div>
                      )
                    })()}
                  </div>
                  <DistanceBadge km={driver._dist} />
                </div>

                {/* Details */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>💺 {driver.seats_available} place{driver.seats_available !== 1 ? 's' : ''}</span>
                  {driver.preferred_arrival && driver.preferred_arrival !== 'flexible' && (
                    <span>🕐 Départ {driver.preferred_arrival}</span>
                  )}
                  {trunkTag && <span>🧳 Coffre {trunkTag}</span>}
                  {isFree && (
                    <span style={{ fontWeight: 700, color: 'var(--color-green)' }}>Gratuit</span>
                  )}
                </div>
                <Tags items={carRules} color="var(--color-surface-2)" />

                {/* Meeting point travel badge */}
                {(() => {
                  const m = passengerMeetings[driver.id]
                  if (!m || m.loading || !m.point) return null
                  return (
                    <div style={{ marginTop: 10 }}>
                      {m.point.accessMode === 'transit' ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#fff8e1', border: '1px solid #ffc107',
                          borderRadius: 8, padding: '4px 10px',
                          fontSize: 12, fontWeight: 700, color: '#7a5100',
                        }}>
                          🚇 ~{m.point.transitEstimateMinutes ?? m.point.walkMinutes} min en transports jusqu'au pickup
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                          borderRadius: 8, padding: '4px 10px',
                          fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)',
                        }}>
                          🚶 {m.point.walkMinutes} min à pied jusqu'au pickup
                        </span>
                      )}
                    </div>
                  )
                })()}

                {/* Action */}
                <div style={{ marginTop: 16 }}>
                  {isRequested ? (
                    <div style={{
                      background: 'var(--color-violet-light)', border: '1.5px solid var(--color-violet)',
                      borderRadius: 12, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)' }}>
                        ⏳ Demande envoyée
                      </span>
                      <button onClick={handleCancelRequest} style={{
                        background: 'none', border: 'none', fontSize: 12,
                        color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit',
                        padding: '4px 8px',
                      }}>Annuler</button>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      disabled={myMatchStatus === 'pending'}
                      onClick={() => handleRequest(driver.id)}
                    >
                      Demander à rejoindre →
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modify trip ── */}
      <div style={{ marginTop: 24 }}>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => navigate(`/event/${shortId}/join`)}
        >
          ✏️ Modifier mon trajet
        </Button>
      </div>
    </div>
  )
}
