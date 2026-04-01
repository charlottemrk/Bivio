import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { SeatBar } from '../components/SeatBar'
import { Avatar } from '../components/Avatar'
import { haversineDistance } from '../lib/geocoding'

type MatchOption = {
  id: string; label: string; driverName: string | null; from: string
  distance: number; seats: number; taken: number; isFree: boolean
  contribution: number; giftPreference: string | null; color: string
}

const COLORS = ['#7cc400', '#f4a261', '#5dcaa5']

export default function EventMatches() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const [options, setOptions]     = useState<MatchOption[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!shortId || !user) return
    const load = async () => {
      const { data: event } = await supabase.from('events').select('*').eq('short_id', shortId).single()
      if (!event) { setLoading(false); return }
      const { data: myReg } = await supabase.from('event_guests').select('*').eq('event_id', event.id).eq('profile_id', user.id).single()
      if (!myReg) { setLoading(false); return }
      const { data: drivers } = await supabase.from('event_guests').select('*, profiles(name)').eq('event_id', event.id).eq('drives_this_event', true).neq('profile_id', user.id)
      const { data: groups }  = await supabase.from('transport_groups').select('*, group_members(count)').eq('event_id', event.id)

      const opts: MatchOption[] = (drivers || []).map((driver: any, i: number) => {
        const dist = (myReg.departure_lat && driver.departure_lat)
          ? haversineDistance(myReg.departure_lat, myReg.departure_lng, driver.departure_lat, driver.departure_lng)
          : 999
        const eg = (groups || []).find((g: any) => g.driver_id === driver.profile_id)
        const taken = eg ? (eg.group_members?.[0]?.count || 0) : 0
        const isFree = event.contribution_policy === 'free_gift'
        return {
          id: driver.id, label: dist < 5 ? 'Trajet direct' : "Covoit'",
          driverName: driver.profiles?.name || 'Conducteur',
          from: driver.departure_address,
          distance: Math.round(dist),
          seats: driver.seats_available || 4, taken, isFree,
          contribution: isFree ? 0 : Math.round(dist * 0.08),
          giftPreference: eg?.gift_preference || null,
          color: COLORS[i % COLORS.length],
        }
      }).sort((a: MatchOption, b: MatchOption) => a.distance - b.distance)

      setOptions(opts)
      if (opts.length > 0) setSelected(opts[0].id)
      setLoading(false)
    }
    load()
  }, [shortId, user])

  const handleConfirm = async () => {
    if (!selected || !user || !shortId) return
    setConfirming(true)
    const { data: event } = await supabase.from('events').select('id').eq('short_id', shortId).single()
    if (event) {
      await supabase.from('event_guests').update({ status: 'confirmed' }).eq('event_id', event.id).eq('profile_id', user.id)
    }
    setConfirming(false)
    navigate(`/event/${shortId}/confirmed`)
  }

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Calcul des options...</div>

  if (options.length === 0) return (
    <div className="animate-fade-up" style={{ textAlign: 'center', paddingTop: 64 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--color-violet-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>🔍</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>Pas encore de conducteurs</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-2)', maxWidth: 260, margin: '0 auto 24px', lineHeight: 1.6 }}>
        Les options apparaîtront quand des conducteurs s'inscriront.
      </p>
      <Button onClick={() => navigate(`/event/${shortId}`)} variant="secondary" size="md">
        Retour à l'event
      </Button>
    </div>
  )

  return (
    <div className="animate-fade-up" style={{ paddingTop: 8 }}>
      <div style={{ paddingBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4, letterSpacing: '-0.5px' }}>Options disponibles</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>Classées par proximité avec toi</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {options.map(opt => {
          const isSel = selected === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              style={{
                width: '100%', textAlign: 'left', background: 'var(--color-surface)',
                borderRadius: 20, padding: 16, cursor: 'pointer', fontFamily: 'inherit',
                border: `2px solid ${isSel ? opt.color : 'var(--color-border)'}`,
                boxShadow: isSel
                  ? `0 0 0 3px ${opt.color}22, 0 4px 16px rgba(26,26,24,0.08)`
                  : '0 1px 3px rgba(26,26,24,0.05)',
                transition: 'all 0.15s',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={opt.driverName} size={40} color={opt.color} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 3 }}>{opt.driverName}</div>
                    <Badge color={opt.color}>{opt.label}</Badge>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {opt.isFree
                    ? <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--color-green)' }}>Gratuit</div>
                    : <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--color-text)' }}>{opt.contribution}€</div>
                  }
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>contribution</div>
                </div>
              </div>

              {/* Info */}
              <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3, fontWeight: 600 }}>
                <div>📍 Départ : {opt.from}</div>
                <div>📏 {opt.distance} km de ton point de départ</div>
              </div>

              <SeatBar total={opt.seats} taken={opt.taken} color={opt.color} />

              {/* Gift hint */}
              {isSel && opt.isFree && opt.giftPreference && (
                <div style={{
                  marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--color-amber-light)', borderRadius: 12, padding: '8px 12px',
                  fontSize: 13, color: 'var(--color-amber)',
                }}>
                  <span>🎁</span>
                  <span>{opt.driverName?.split(' ')[0]} aime : <strong>{opt.giftPreference}</strong></span>
                </div>
              )}

              {/* Payment hint */}
              {isSel && !opt.isFree && (
                <div style={{
                  marginTop: 12, fontSize: 12, color: 'var(--color-text-2)',
                  background: 'var(--color-surface-2)', borderRadius: 12, padding: '8px 12px', fontWeight: 600,
                }}>
                  💸 {opt.contribution}€ à régler directement avec {opt.driverName?.split(' ')[0]}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <Button onClick={handleConfirm} disabled={!selected || confirming} size="lg" fullWidth>
        {confirming ? 'Confirmation...' : 'Confirmer cette option'}
      </Button>
    </div>
  )
}
