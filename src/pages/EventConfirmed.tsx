import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { Spinner } from '../components/Spinner'
import { formatDateRange } from '../lib/utils'

export default function EventConfirmed() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const [event, setEvent]   = useState<any>(null)
  const [driver, setDriver] = useState<any>(null)
  const [driverProfile, setDriverProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shortId) return
    const load = async () => {
      const { data: ev } = await supabase.from('events').select('*').eq('short_id', shortId).single()
      setEvent(ev)

      // Find my registration
      const guestId = localStorage.getItem(`bivio_guest_id_${shortId}`)
      let myReg: any = null
      if (guestId) {
        const { data } = await supabase.from('event_guests').select('*').eq('id', guestId).maybeSingle()
        myReg = data
      }
      if (!myReg && user) {
        const { data } = await supabase.from('event_guests').select('*').eq('event_id', ev?.id).eq('profile_id', user.id).maybeSingle()
        myReg = data
      }

      // Load the driver's details (including car info for day-of)
      if (myReg?.requested_driver_id) {
        const { data: driverGuest } = await supabase
          .from('event_guests')
          .select('*, profiles(name, phone, share_contact, avatar_url)')
          .eq('id', myReg.requested_driver_id)
          .maybeSingle()
        if (driverGuest) {
          setDriver(driverGuest)
          setDriverProfile(driverGuest.profiles)
        }
      }

      setLoading(false)
    }
    load()
  }, [shortId, user])

  if (loading) return <Spinner />

  const departureTime = driver?.preferred_arrival && driver.preferred_arrival !== 'flexible'
    ? driver.preferred_arrival
    : null

  const driverName      = driverProfile?.name || driver?.guest_name || 'Conducteur'
  const driverPhone     = driverProfile?.share_contact ? driverProfile?.phone : null
  const driverAvatarUrl = driverProfile?.avatar_url || null
  const driverCarPhoto  = driver?.car_photo_url || null
  const driverCarDesc   = driver?.car_description || null

  const labelStyle = {
    fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)',
    textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 2,
  }

  return (
    <div className="animate-fade-up" style={{ paddingTop: 32, paddingBottom: 80 }}>

      {/* ── Success hero ── */}
      <div style={{ textAlign: 'center', paddingTop: 24, paddingBottom: 32 }}>
        <div style={{
          width: 68, height: 68, borderRadius: 22,
          background: 'var(--color-green-light)', color: 'var(--color-green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, margin: '0 auto 16px', fontWeight: 900,
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-text)', marginBottom: 8, letterSpacing: '-0.5px' }}>
          Covoit' confirmé !
        </h1>
        <p style={{
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
          fontSize: 20,
          fontWeight: 400,
          color: 'var(--color-text)',
          marginTop: 4,
        }}>
          {event?.name}
        </p>
      </div>

      {/* ── Driver info ── */}
      {driver && (
        <div style={{
          background: 'var(--color-surface)',
          border: '2px solid var(--color-violet)',
          borderRadius: 18, padding: 20, marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-violet)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            🚗 Ton conducteur
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Avatar name={driverName} size={48} src={driverAvatarUrl} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)' }}>{driverName}</div>
              {driverPhone && (
                <a
                  href={`tel:${driverPhone}`}
                  style={{ fontSize: 14, color: 'var(--color-violet)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}
                >
                  📞 {driverPhone}
                </a>
              )}
              {!driverPhone && (
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                  Contact partagé J-1 avant l'événement
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            {driver.departure_address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
                <div>
                  <div style={labelStyle}>Point de départ</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{driver.departure_address}</div>
                </div>
              </div>
            )}
            {departureTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🕐</span>
                <div>
                  <div style={labelStyle}>Heure de départ</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{departureTime}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Photo + description voiture (jour J) ── */}
          {(driverCarPhoto || driverCarDesc) && (
            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: '1px solid var(--color-border)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Reconnaître la voiture
              </div>
              {driverCarPhoto && (
                <img
                  src={driverCarPhoto}
                  alt="Voiture du conducteur"
                  style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 180, marginBottom: driverCarDesc ? 10 : 0, display: 'block' }}
                />
              )}
              {driverCarDesc && (
                <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0 }}>
                  {driverCarDesc}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Event recap ── */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          L'événement
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['📅', 'Date', event ? formatDateRange(event.date_start, event.date_end) : '—'],
            ['📍', 'Destination', event?.destination_address],
          ].map(([icon, k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={labelStyle}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{v || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <Button onClick={() => navigate(`/event/${shortId}`)} size="lg" fullWidth>
          Voir la page de l'événement
        </Button>
        <Button onClick={() => navigate('/events')} variant="secondary" size="lg" fullWidth>
          Mes événements
        </Button>
      </div>
    </div>
  )
}
