/**
 * MatchDemo — Visual sandbox for the intelligent matching algorithm.
 * Addresses are NEVER shown — only meeting points visible to both sides.
 */
import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { RoleChip } from '../components/RoleChip'
import { MiniMap } from '../components/MiniMap'
import { rankPassengers, calcDetourAndMeeting, type MatchResult, type MeetingPoint } from '../lib/matching'

// ── Scenarios ─────────────────────────────────────────────────────────────────

const DESTINATION = { lat: 48.4069, lng: 2.7007, address: 'Forêt de Fontainebleau' }

const SCENARIOS = {
  paris: {
    label: 'Paris → Fontainebleau',
    driver: {
      id: 'driver-1', guest_name: 'Théo M.',
      departure_lat: 48.8694, departure_lng: 2.3317,  // Rue de la Paix, Paris 2e
      seats_available: 3, preferred_arrival: '18h00',
      constraints_this_event: ['non-fumeur', 'coffre:grand'],
    },
    passengers: [
      { id: 'p1', guest_name: 'Sophie L.', departure_lat: 48.8640, departure_lng: 2.3769, preferred_arrival: '18h30', constraints_this_event: [], requested_at: new Date(Date.now() - 4 * 60000) },
      { id: 'p2', guest_name: 'Antoine V.', departure_lat: 48.8521, departure_lng: 2.3710, preferred_arrival: 'flexible', constraints_this_event: ['végé ok'], requested_at: new Date(Date.now() - 11 * 60000) },
    ],
    mePassenger: { lat: 48.8640, lng: 2.3769 },
    driverList: [
      { id: 'd1', guest_name: 'Théo M.', departure_lat: 48.8694, departure_lng: 2.3317, seats_available: 3, preferred_arrival: '18h00', constraints_this_event: ['non-fumeur', 'coffre:grand'] },
      { id: 'd2', guest_name: 'Camille R.', departure_lat: 48.8454, departure_lng: 2.3728, seats_available: 2, preferred_arrival: 'flexible', constraints_this_event: ['gratuit', 'animaux ok'] },
      { id: 'd3', guest_name: 'Julien B.', departure_lat: 48.8602, departure_lng: 2.3736, seats_available: 1, preferred_arrival: '17h30', constraints_this_event: ['non-fumeur', 'frais partagés'] },
    ],
  },
  gentilly: {
    label: 'Gentilly → Fontainebleau',
    driver: {
      id: 'driver-2', guest_name: 'Marc D.',
      departure_lat: 48.8115, departure_lng: 2.3440,  // Gentilly — south of Paris
      seats_available: 2, preferred_arrival: '17h30',
      constraints_this_event: ['non-fumeur'],
    },
    passengers: [
      // Near driver's route (Kremlin-Bicêtre area) → walk
      { id: 'p3', guest_name: 'Léa K.', departure_lat: 48.8120, departure_lng: 2.3600, preferred_arrival: 'flexible', constraints_this_event: [], requested_at: new Date(Date.now() - 2 * 60000) },
      // Gare de Lyon — needs metro south → transit
      { id: 'p4', guest_name: 'Julien F.', departure_lat: 48.8448, departure_lng: 2.3735, preferred_arrival: '18h00', constraints_this_event: [], requested_at: new Date(Date.now() - 20 * 60000) },
    ],
    mePassenger: { lat: 48.8448, lng: 2.3735 }, // Gare de Lyon
    driverList: [
      { id: 'd4', guest_name: 'Marc D.', departure_lat: 48.8115, departure_lng: 2.3440, seats_available: 2, preferred_arrival: '17h30', constraints_this_event: ['non-fumeur'] },
    ],
  },
} as const

type ScenarioKey = keyof typeof SCENARIOS

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diff < 1) return 'à l\'instant'
  if (diff < 60) return `il y a ${diff} min`
  return `il y a ${Math.floor(diff / 60)}h`
}

function mapsUrl(a: string, b: string) {
  return `https://www.google.com/maps/dir/${encodeURIComponent(a)}/${encodeURIComponent(b)}`
}

// ── Shared components ──────────────────────────────────────────────────────────

function Tags({ items }: { items: string[] }) {
  const display = items.filter(c => !c.startsWith('coffre:') && !c.startsWith('gratuit') && !c.startsWith('frais'))
  if (!display.length) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {display.map(t => <span key={t} style={{ background: 'var(--color-surface-2)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>{t}</span>)}
    </div>
  )
}

/** Meeting point pill — walk or transit */
function MeetingBadge({ mp }: { mp: MeetingPoint }) {
  const isTransit = mp.accessMode === 'transit'
  return (
    <div style={{
      background: isTransit ? '#fff8e1' : 'var(--color-surface-2)',
      border: `1px solid ${isTransit ? '#f9a825' : 'var(--color-border)'}`,
      borderRadius: 10, padding: '3px 10px',
      fontSize: 12, fontWeight: 700,
      color: isTransit ? '#e65100' : 'var(--color-text-2)',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {isTransit
        ? `🚇 ~${mp.transitEstimateMinutes} min`
        : `🚶 ${mp.walkMinutes} min`}
    </div>
  )
}

/** Meeting point info card (shown to both sides — NO raw addresses) */
function MeetingCard({ mp, passengerName }: { mp: MeetingPoint; passengerName?: string }) {
  return (
    <div style={{ background: 'var(--color-surface-2)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Point de rendez-vous
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
        📍 {mp.address}
      </div>
      {mp.accessMode === 'transit' ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
          🚇 {passengerName ? `${passengerName} arrive en` : 'Arrivée en'} <strong>~{mp.transitEstimateMinutes} min</strong> en transport
          <span style={{ color: 'var(--color-text-3)', marginLeft: 4 }}>({mp.distKm} km)</span>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
          🚶 {passengerName ? `${passengerName} marche` : 'Marche de'} <strong>{mp.walkMinutes} min</strong> depuis son départ
        </div>
      )}
    </div>
  )
}

/** Collapsible map toggle */
function MapToggle({ mpAddress, driverAddress, passengerLabel, driverLabel }: {
  mpAddress: string; driverAddress: string; passengerLabel: string; driverLabel: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: open ? 'var(--color-surface-2)' : 'none',
        border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '8px 14px',
        fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)',
        cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'space-between',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>🗺️</span><span>Voir l'itinéraire</span></span>
        <span style={{ fontSize: 10, color: 'var(--color-text-3)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, position: 'relative' }}>
          <MiniMap origin={mpAddress} destination={driverAddress} originLabel={passengerLabel} destLabel={driverLabel} />
          <a href={mapsUrl(mpAddress, driverAddress)} target="_blank" rel="noopener noreferrer" style={{
            position: 'absolute', bottom: 10, right: 10, zIndex: 1000,
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700,
            color: 'var(--color-text-2)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}>↗ Ouvrir Maps</a>
        </div>
      )}
    </div>
  )
}

/** Detour badge — color-coded */
function DetourBadge({ minutes }: { minutes: number }) {
  const color = minutes <= 2 ? 'var(--color-green)' : minutes <= 8 ? 'var(--color-violet)' : '#f97316'
  const bg    = minutes <= 2 ? 'var(--color-green-light)' : minutes <= 8 ? 'var(--color-violet-light)' : '#fff3e0'
  const border= minutes <= 2 ? 'var(--color-green)' : minutes <= 8 ? 'var(--color-violet)' : '#f97316'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: '4px 12px', fontSize: 22, fontWeight: 900, color }}>
      +{minutes}<span style={{ fontSize: 12, fontWeight: 600 }}>min</span>
    </span>
  )
}

/** Carousel nav (← 1/N →) */
function CarouselNav({ idx, total, onChange }: { idx: number; total: number; onChange: (i: number) => void }) {
  if (total <= 1) return null
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--color-border)',
    background: disabled ? 'var(--color-surface-2)' : 'var(--color-surface)',
    color: disabled ? 'var(--color-text-3)' : 'var(--color-text)',
    fontSize: 18, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 }}>
      <button style={btnStyle(idx === 0)} disabled={idx === 0} onClick={() => onChange(idx - 1)}>←</button>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', minWidth: 40, textAlign: 'center' }}>
        {idx + 1} / {total}
      </span>
      <button style={btnStyle(idx === total - 1)} disabled={idx === total - 1} onClick={() => onChange(idx + 1)}>→</button>
    </div>
  )
}

/** Step indicator */
const STEPS = [
  { id: 0, label: 'Aucune demande', emoji: '🔔' },
  { id: 1, label: 'Demande envoyée', emoji: '⏳' },
  { id: 2, label: 'Confirmé !', emoji: '🎉' },
]
function StepIndicator({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '6px 8px', marginBottom: 24 }}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 9, whiteSpace: 'nowrap', background: step === s.id ? 'var(--color-text)' : 'transparent', transition: 'all 0.2s' }}>
            <span style={{ fontSize: 14 }}>{s.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: step === s.id ? 'var(--color-bg)' : 'var(--color-text-3)' }}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--color-border)', margin: '0 2px', minWidth: 8 }} />}
        </div>
      ))}
    </div>
  )
}

// ── PASSENGER VIEW ─────────────────────────────────────────────────────────────

type DriverMatchInfo = {
  driver: typeof SCENARIOS.paris.driverList[0]
  meetingPoint: MeetingPoint | null
  loading: boolean
}

function PassengerView({ scenario, step, requestedId, onRequest, onCancel }: {
  scenario: ScenarioKey; step: number; requestedId: string | null
  onRequest: (id: string) => void; onCancel: () => void
}) {
  const s = SCENARIOS[scenario]
  const isPending   = step === 1
  const isConfirmed = step === 2

  const [driverInfos, setDriverInfos] = useState<Record<string, DriverMatchInfo>>(() =>
    Object.fromEntries(s.driverList.map(d => [d.id, { driver: d, meetingPoint: null, loading: true }]))
  )

  useEffect(() => {
    setDriverInfos(Object.fromEntries(s.driverList.map(d => [d.id, { driver: d, meetingPoint: null, loading: true }])))
    s.driverList.forEach(async (driver) => {
      const result = await calcDetourAndMeeting(
        s.mePassenger,
        { lat: driver.departure_lat, lng: driver.departure_lng },
        DESTINATION,
      )
      setDriverInfos(prev => ({
        ...prev,
        [driver.id]: { driver, meetingPoint: result?.meetingPoint ?? null, loading: false },
      }))
    })
  }, [scenario]) // eslint-disable-line

  return (
    <div style={{ paddingTop: 8, paddingBottom: 24 }}>
      <StepIndicator step={step} />
      <div style={{ marginBottom: 16 }}><RoleChip role="passenger" /></div>

      <div style={{ paddingBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          {isPending ? 'Demande envoyée' : isConfirmed ? 'Trajet confirmé !' : 'Conducteurs disponibles'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>
          {s.driverList.length} conducteur{s.driverList.length > 1 ? 's' : ''} disponible{s.driverList.length > 1 ? 's' : ''}
        </p>
      </div>

      {isPending && (
        <div style={{ background: 'var(--color-amber-light)', border: '1.5px solid var(--color-amber)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>Demande envoyée !</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>En attente de confirmation du conducteur…</div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: '1px solid var(--color-amber)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-amber)', cursor: 'pointer', padding: '10px 16px', fontFamily: 'inherit', minHeight: 44 }}>Annuler</button>
        </div>
      )}

      {isConfirmed && (
        <div style={{ background: 'var(--color-green-light)', border: '1.5px solid var(--color-green)', borderRadius: 14, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🎉</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>Trajet confirmé !</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
              {s.driverList.find(d => d.id === requestedId)?.guest_name} t'a accepté(e).
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {s.driverList.map((driver) => {
          const info        = driverInfos[driver.id]
          const isRequested = requestedId === driver.id
          const constraints = driver.constraints_this_event as string[]
          const trunkTag    = constraints.find(c => c.startsWith('coffre:'))?.replace('coffre:', '')
          const isFree      = constraints.some(c => c.startsWith('gratuit'))

          return (
            <div key={driver.id} style={{
              background: 'var(--color-surface)',
              border: `2px solid ${isRequested ? 'var(--color-violet)' : 'var(--color-border)'}`,
              borderRadius: 20, padding: 18,
              boxShadow: isRequested ? '0 0 0 3px var(--color-violet-light)' : 'none',
              opacity: isPending && !isRequested ? 0.35 : 1,
              pointerEvents: isPending && !isRequested ? 'none' : 'auto',
              transition: 'all 0.25s',
            }}>
              {/* Identity — NO address shown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar name={driver.guest_name} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{driver.guest_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
                    {driver.preferred_arrival !== 'flexible' ? `🕐 Départ ${driver.preferred_arrival}` : '🕐 Horaire flexible'}
                  </div>
                </div>
                {/* Walk/transit badge (loading spinner while computing) */}
                {info.loading ? (
                  <div style={{ width: 16, height: 16, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-violet)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                ) : info.meetingPoint ? (
                  <MeetingBadge mp={info.meetingPoint} />
                ) : null}
              </div>

              {/* Meeting point (no raw address) */}
              {!info.loading && info.meetingPoint && (
                <MeetingCard mp={info.meetingPoint} />
              )}

              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                <span>💺 {driver.seats_available} place{driver.seats_available !== 1 ? 's' : ''}</span>
                {trunkTag && <span>🧳 Coffre {trunkTag}</span>}
                {isFree && <span style={{ fontWeight: 700, color: 'var(--color-green)' }}>Gratuit</span>}
              </div>
              <Tags items={constraints} />

              {/* Map: passenger home → meeting point (not driver's home) */}
              {!info.loading && info.meetingPoint && (
                <MapToggle
                  mpAddress={info.meetingPoint.address}
                  driverAddress={DESTINATION.address}
                  passengerLabel="RDV"
                  driverLabel="Destination"
                />
              )}

              <div style={{ marginTop: 12 }}>
                {isRequested && !isConfirmed ? (
                  <div style={{ background: 'var(--color-violet-light)', border: '1.5px solid var(--color-violet)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)' }}>⏳ Demande envoyée</span>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}>Annuler</button>
                  </div>
                ) : isConfirmed && isRequested ? (
                  <div style={{ background: 'var(--color-green-light)', border: '1.5px solid var(--color-green)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-green)' }}>✓ Trajet confirmé</span>
                  </div>
                ) : (
                  <Button variant="primary" size="md" fullWidth disabled={isPending} onClick={() => onRequest(driver.id)}>
                    Demander à rejoindre →
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── DRIVER VIEW — Phase 3 ──────────────────────────────────────────────────────

function DriverView({ scenario, accepted, onAccept, onDecline }: {
  scenario: ScenarioKey
  accepted: string[]
  onAccept: (p: any) => void
  onDecline: (p: any) => void
}) {
  const s        = SCENARIOS[scenario]
  const driver   = s.driver
  const seatsLeft = driver.seats_available - accepted.length
  const carRules = (driver.constraints_this_event as string[]).filter(c => !c.startsWith('coffre:'))
  const trunkTag = (driver.constraints_this_event as string[]).find(c => c.startsWith('coffre:'))?.replace('coffre:', '')

  const [ranked, setRanked]   = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx]         = useState(0)

  useEffect(() => {
    setLoading(true)
    setIdx(0)
    const remaining = s.passengers.filter(p => !accepted.includes(p.id))
    if (!remaining.length) { setLoading(false); setRanked([]); return }
    rankPassengers(
      { lat: driver.departure_lat, lng: driver.departure_lng },
      remaining,
      DESTINATION,
    ).then(r => { setRanked(r); setIdx(0); setLoading(false) })
  }, [scenario, accepted.length]) // eslint-disable-line

  const current = ranked[idx] ?? null

  const handleAccept = () => { if (current) onAccept(current.passenger) }
  const handleDecline = () => {
    if (current) {
      onDecline(current.passenger)
      setRanked(prev => prev.filter(r => r.passenger.id !== current.passenger.id))
      setIdx(i => Math.min(i, ranked.length - 2))
    }
  }

  const acceptedPassengers = s.passengers.filter(p => accepted.includes(p.id))

  return (
    <div style={{ paddingTop: 8, paddingBottom: 24 }}>
      <div style={{ marginBottom: 16 }}><RoleChip role="driver" /></div>

      <div style={{ paddingBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>Ton trajet</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>Pour</p>
        <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18, color: 'var(--color-text)', margin: 0 }}>
          Weekend au Domaine de la Forêt
        </p>
      </div>

      {/* Trip summary — NO departure address shown */}
      <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-violet)', borderRadius: 18, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-violet)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>🚗</span><span>Trajet enregistré</span>
          </div>
          <div style={{ background: seatsLeft > 0 ? 'var(--color-green-light)' : 'var(--color-surface-2)', border: `1px solid ${seatsLeft > 0 ? 'var(--color-green)' : 'var(--color-border)'}`, borderRadius: 10, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: seatsLeft > 0 ? 'var(--color-green)' : 'var(--color-text-3)' }}>
            {seatsLeft > 0 ? `${seatsLeft} place${seatsLeft !== 1 ? 's' : ''}` : 'Complet'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ color: 'var(--color-text-2)' }}>🕐 Départ : <strong style={{ color: 'var(--color-text)' }}>{driver.preferred_arrival}</strong></div>
          {trunkTag && <div style={{ color: 'var(--color-text-2)' }}>🧳 Coffre : <strong style={{ color: 'var(--color-text)' }}>{trunkTag}</strong></div>}
        </div>
        <Tags items={carRules} />
      </div>

      {/* Accepted passengers — NO address */}
      {acceptedPassengers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Passagers confirmés · {acceptedPassengers.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {acceptedPassengers.map(p => {
              const matchInfo = ranked.concat(
                s.passengers.filter(sp => accepted.includes(sp.id)).map(sp => ({ passenger: sp, meetingPoint: { address: '…', walkMinutes: 0, distKm: 0, accessMode: 'walk' as const, lat: 0, lng: 0 }, detourMinutes: 0, score: 0 }))
              ).find(r => r.passenger.id === p.id)
              return (
                <div key={p.id} style={{ background: 'var(--color-green-light)', border: '1.5px solid var(--color-green)', borderRadius: 14, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={p.guest_name} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{p.guest_name}</div>
                      {matchInfo?.meetingPoint?.address && matchInfo.meetingPoint.address !== '…' && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>📍 RDV : {matchInfo.meetingPoint.address}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green)' }}>✓ Confirmé</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Smart match section */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        💡 Match suggéré
        {!loading && ranked.length > 0 && (
          <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
            · {ranked.length} demande{ranked.length > 1 ? 's' : ''} analysée{ranked.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 18, padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, border: '2.5px solid var(--color-border)', borderTopColor: 'var(--color-violet)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Calcul des itinéraires…</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>L'IA analyse {s.passengers.filter(p => !accepted.includes(p.id)).length} demande(s) sur ta route</div>
        </div>
      ) : !current ? (
        <div style={{ background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)', borderRadius: 18, padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
            {acceptedPassengers.length > 0 ? 'Toutes les demandes traitées !' : 'Aucune demande pour l\'instant'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
            {acceptedPassengers.length > 0 ? `${acceptedPassengers.length} passager(s) confirmé(s).` : 'Tu seras alerté dès qu\'un passager demande à rejoindre.'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-violet)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 3px var(--color-violet-light)' }}>

            {/* Detour bar */}
            <div style={{ background: 'var(--color-violet-light)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-violet)' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-violet)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Meilleur match</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DetourBadge minutes={current.detourMinutes} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>sur ta route</span>
                </div>
              </div>
              {current.requestedAt && (
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'right' }}>
                  🕐 {relativeTime(current.requestedAt)}<br />
                  <span style={{ fontSize: 10 }}>{current.requestedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>

            <div style={{ padding: 18 }}>
              {/* Passenger identity — NO home address */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Avatar name={current.passenger.guest_name} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text)' }}>{current.passenger.guest_name}</div>
                  {current.passenger.preferred_arrival && current.passenger.preferred_arrival !== 'flexible' && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>🕐 Arrivée souhaitée : {current.passenger.preferred_arrival}</div>
                  )}
                </div>
              </div>

              {/* Meeting point — the only location info shown */}
              <MeetingCard mp={current.meetingPoint} passengerName={current.passenger.guest_name.split(' ')[0]} />

              <Tags items={current.passenger.constraints_this_event || []} />

              {/* Map: meeting point only — NOT passenger's home */}
              <MapToggle
                mpAddress={current.meetingPoint.address}
                driverAddress={DESTINATION.address}
                passengerLabel={current.passenger.guest_name.split(' ')[0]}
                driverLabel="Destination"
              />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <Button variant="secondary" size="sm" fullWidth onClick={handleDecline}>Refuser</Button>
                </div>
                <div style={{ flex: 2 }}>
                  <Button variant="primary" size="sm" fullWidth disabled={seatsLeft <= 0} onClick={handleAccept}>✓ Accepter</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel nav — OUTSIDE the card */}
          <CarouselNav idx={idx} total={ranked.length} onChange={setIdx} />
        </>
      )}
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────

export default function MatchDemo() {
  const [view, setView]         = useState<'driver' | 'passenger'>('driver')
  const [scenario, setScenario] = useState<ScenarioKey>('paris')

  const [pStep, setPStep]             = useState(0)
  const [requestedId, setRequestedId] = useState<string | null>(null)
  const [dAccepted, setDAccepted]     = useState<string[]>([])

  const reset = () => { setPStep(0); setRequestedId(null); setDAccepted([]) }
  // Reset state when switching scenario
  const switchScenario = (s: ScenarioKey) => { setScenario(s); reset() }

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '14px 18px', marginBottom: 16, marginTop: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-violet)', marginBottom: 3 }}>
            🧪 Matching intelligent
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            OSRM calcule les détours réels.<br />
            Les adresses sont cachées — seul le point de RDV est visible.
          </div>
        </div>
        <button onClick={reset} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>↺ Reset</button>
      </div>

      {/* Scenario selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(Object.keys(SCENARIOS) as ScenarioKey[]).map(k => (
          <button key={k} onClick={() => switchScenario(k)} style={{
            flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${scenario === k ? 'var(--color-violet)' : 'var(--color-border)'}`,
            background: scenario === k ? 'var(--color-violet-light)' : 'var(--color-surface)',
            color: scenario === k ? 'var(--color-violet)' : 'var(--color-text-2)',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}>
            {SCENARIOS[k].label}
          </button>
        ))}
      </div>

      {/* Scenario hint for Gentilly */}
      {scenario === 'gentilly' && (
        <div style={{ background: '#fff8e1', border: '1px solid #f9a825', borderRadius: 12, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#e65100', lineHeight: 1.5 }}>
          🧪 <strong>Test scénario :</strong> conducteur part de Gentilly (banlieue sud). Julien est à Gare de Lyon — l'algo trouve le point de connexion sur la route et suggère un trajet en transport.
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 4, gap: 4, marginBottom: 4 }}>
        {(['driver', 'passenger'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
            background: view === v ? 'var(--color-text)' : 'transparent',
            color: view === v ? 'var(--color-bg)' : 'var(--color-text-3)',
          }}>
            {v === 'driver' ? '🚗 Vue conducteur' : '🙋 Vue passager'}
          </button>
        ))}
      </div>

      {view === 'driver' ? (
        <DriverView
          scenario={scenario}
          accepted={dAccepted}
          onAccept={p => setDAccepted(prev => [...prev, p.id])}
          onDecline={() => {}}
        />
      ) : (
        <PassengerView
          scenario={scenario}
          step={pStep}
          requestedId={requestedId}
          onRequest={id => { setRequestedId(id); setPStep(1) }}
          onCancel={() => { setRequestedId(null); setPStep(0) }}
        />
      )}
    </div>
  )
}
