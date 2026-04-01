import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { Pill } from '../components/Pill'
import { AddressSearch } from '../components/AddressSearch'
import { Card, SectionLabel } from '../components/Card'
import type { GeoResult } from '../lib/geocoding'

type Role = 'driver' | 'passenger' | null

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

function Toggle({ checked, onChange, label, sublabel, color = 'violet' }: {
  checked: boolean; onChange: () => void; label: string; sublabel?: string; color?: 'violet' | 'green'
}) {
  const c = color === 'green' ? 'var(--color-green)' : 'var(--color-violet)'
  const bg = color === 'green' ? 'var(--color-green-light)' : 'var(--color-violet-light)'
  return (
    <div
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', background: checked ? bg : 'none',
        border: `1.5px solid ${checked ? c : 'var(--color-border)'}`,
        borderRadius: 12, padding: '12px 14px', transition: 'all 0.15s',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>{sublabel}</div>}
      </div>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: checked ? c : 'var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
      }}>
        {checked && <CheckIcon />}
      </div>
    </div>
  )
}

export default function EventJoin() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  const { user, profile } = useAuth()
  const [eventId, setEventId]     = useState<string | null>(null)
  const [eventName, setEventName] = useState('')
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(true)

  // Step 1: role selection
  const [role, setRole] = useState<Role>(null)

  // ── Driver fields ──
  const [departureAddress, setDepartureAddress] = useState('')
  const [departureGeo, setDepartureGeo]         = useState<GeoResult | null>(null)
  const [seatsAvailable, setSeatsAvailable]     = useState(3)
  const [carRules, setCarRules]                 = useState<string[]>([])
  const [trunkSize, setTrunkSize]               = useState('moyen')
  const [feePolicy, setFeePolicy]               = useState<'free' | 'shared'>('free')
  const [freeUnderKm, setFreeUnderKm]           = useState<number | null>(50)
  const [departureTime, setDepartureTime]       = useState('')

  // ── Passenger fields ──
  const [pickupLocations, setPickupLocations] = useState<Array<{ address: string; geo: GeoResult | null }>>([{ address: '', geo: null }])
  const [availableFrom, setAvailableFrom]     = useState('')
  const [desiredArrival, setDesiredArrival]   = useState('')
  const [hasLicense, setHasLicense]           = useState(false)
  const [canRelay, setCanRelay]               = useState(false)
  const [specialNeeds, setSpecialNeeds]       = useState<string[]>([])

  useEffect(() => {
    if (!shortId) return
    supabase.from('events').select('id, name').eq('short_id', shortId).single().then(({ data }) => {
      if (data) { setEventId(data.id); setEventName(data.name) }
      setLoading(false)
    })
  }, [shortId])

  useEffect(() => {
    if (profile) {
      setHasLicense(profile.has_license ?? false)
      setSpecialNeeds(profile.default_constraints || [])
      if (profile.city) setDepartureAddress(profile.city)
    }
  }, [profile])

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const handleSubmit = async () => {
    if (!eventId) return
    const primaryAddress = role === 'driver'
      ? departureAddress
      : pickupLocations[0]?.address || ''
    if (!primaryAddress) return
    setSaving(true)

    const allConstraints: string[] = [
      ...specialNeeds,
      ...(role === 'driver' ? carRules : []),
      ...(role === 'driver' ? [`coffre:${trunkSize}`] : []),
      ...(role === 'driver' && feePolicy === 'shared' ? ['frais-partages'] : []),
      ...(role === 'driver' && feePolicy === 'free' && freeUnderKm ? [`gratuit-sous-${freeUnderKm}km`] : []),
      ...(role === 'passenger' && canRelay ? ['peut-relayer'] : []),
    ]

    const primaryGeo = role === 'driver' ? departureGeo : (pickupLocations[0]?.geo || null)

    const carpool = {
      departure_address: primaryAddress,
      departure_lat: primaryGeo?.lat || null,
      departure_lng: primaryGeo?.lng || null,
      drives_this_event: role === 'driver',
      seats_available: role === 'driver' ? seatsAvailable : 0,
      constraints_this_event: allConstraints,
      preferred_arrival: role === 'driver'
        ? (departureTime || 'flexible')
        : (desiredArrival || availableFrom || 'flexible'),
      status: 'registered',
    }

    const anonToken = localStorage.getItem(`bivio_rsvp_${shortId}`)

    if (user) {
      const { data: existing } = await supabase.from('event_guests').select('id').eq('event_id', eventId).eq('profile_id', user.id).maybeSingle()
      if (existing) {
        await supabase.from('event_guests').update(carpool).eq('id', existing.id)
        localStorage.setItem(`bivio_guest_id_${shortId}`, existing.id)
      } else {
        const { data } = await supabase.from('event_guests').insert({ event_id: eventId, profile_id: user.id, rsvp_status: 'coming', ...carpool }).select('id').single()
        if (data) localStorage.setItem(`bivio_guest_id_${shortId}`, data.id)
      }
    } else if (anonToken) {
      const { data: existing } = await supabase.from('event_guests').select('id').eq('event_id', eventId).eq('guest_token', anonToken).maybeSingle()
      if (existing) {
        await supabase.from('event_guests').update(carpool).eq('id', existing.id)
        localStorage.setItem(`bivio_guest_id_${shortId}`, existing.id)
      }
    } else {
      const token = crypto.randomUUID()
      const { data } = await supabase.from('event_guests').insert({ event_id: eventId, guest_token: token, rsvp_status: 'coming', ...carpool }).select('id').single()
      if (data) {
        localStorage.setItem(`bivio_rsvp_${shortId}`, token)
        localStorage.setItem(`bivio_guest_id_${shortId}`, data.id)
      }
    }

    setSaving(false)
    navigate(`/event/${shortId}/matches`)
  }

  const canSubmit = role === 'driver'
    ? !!departureAddress
    : !!(pickupLocations[0]?.address)

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Chargement...</div>

  return (
    <div className="animate-fade-up" style={{ paddingTop: 8 }}>
      <div style={{ paddingBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.5px' }}>
          Ton trajet
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
          Pour <strong style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, fontWeight: 400, color: 'var(--color-text)' }}>{eventName}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Role selection ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { id: 'driver' as Role, emoji: '🚗', title: 'Je propose un trajet', sub: 'Je conduis' },
            { id: 'passenger' as Role, emoji: '🙋', title: 'Je cherche un trajet', sub: 'Je suis passager(e)' },
          ].map(opt => (
            <button
              key={opt.id!}
              onClick={() => setRole(opt.id)}
              style={{
                padding: '18px 12px', borderRadius: 16, textAlign: 'center',
                background: role === opt.id ? 'var(--color-violet-light)' : 'var(--color-surface)',
                border: `2px solid ${role === opt.id ? 'var(--color-violet)' : 'var(--color-border)'}`,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 6 }}>{opt.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: role === opt.id ? 'var(--color-violet)' : 'var(--color-text)', lineHeight: 1.3 }}>
                {opt.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 3 }}>{opt.sub}</div>
            </button>
          ))}
        </div>

        {/* ── Driver fields ── */}
        {role === 'driver' && (
          <>
            <Card>
              <AddressSearch
                value={departureAddress}
                onChange={(val, geo) => { setDepartureAddress(val); if (geo) setDepartureGeo(geo) }}
                label="Point de départ"
                placeholder="Adresse, quartier, gare..."
              />
            </Card>

            <Card>
              <SectionLabel>Nombre de places disponibles</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <Pill key={n} selected={seatsAvailable === n} onClick={() => setSeatsAvailable(n)}>{n}</Pill>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Heure de départ prévue</SectionLabel>
              <input
                type="time"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '11px 14px',
                  fontSize: 16, border: '1.5px solid var(--color-border)',
                  borderRadius: 10, background: 'var(--color-surface)', color: 'var(--color-text)',
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
            </Card>

            <Card>
              <SectionLabel>Coffre disponible</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'grand', label: '🧳 Grand' },
                  { id: 'moyen', label: '👜 Moyen' },
                  { id: 'limite', label: '💼 Limité' },
                ].map(opt => (
                  <Pill key={opt.id} selected={trunkSize === opt.id} onClick={() => setTrunkSize(opt.id)}>{opt.label}</Pill>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Règles dans ta voiture</SectionLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {["Musique OK", "Silence SVP", "Fumée OK", "Pas d'animaux", "Animaux OK"].map(r => (
                  <Pill key={r} selected={carRules.includes(r)} onClick={() => toggle(carRules, setCarRules, r)} color="peach">{r}</Pill>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Participation aux frais</SectionLabel>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <Pill selected={feePolicy === 'free'} onClick={() => setFeePolicy('free')}>Gratuit</Pill>
                <Pill selected={feePolicy === 'shared'} onClick={() => setFeePolicy('shared')}>Partage des frais</Pill>
              </div>
              {feePolicy === 'free' && (
                <>
                  <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8, fontWeight: 600 }}>
                    Gratuit si trajet inférieur à :
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([30, 50, 100, null] as Array<number | null>).map(km => (
                      <Pill key={km ?? 'always'} selected={freeUnderKm === km} onClick={() => setFreeUnderKm(km)}>
                        {km ? `${km} km` : 'Toujours'}
                      </Pill>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </>
        )}

        {/* ── Passenger fields ── */}
        {role === 'passenger' && (
          <>
            <Card>
              <SectionLabel>Point(s) de ramassage</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pickupLocations.map((loc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <AddressSearch
                        value={loc.address}
                        onChange={(val, geo) => {
                          const updated = [...pickupLocations]
                          updated[i] = { address: val, geo: geo || null }
                          setPickupLocations(updated)
                        }}
                        label={i === 0 ? 'Adresse principale' : `Option ${i + 1}`}
                        placeholder="Adresse, arrêt, gare..."
                      />
                    </div>
                    {i > 0 && (
                      <button
                        onClick={() => setPickupLocations(locs => locs.filter((_, j) => j !== i))}
                        style={{
                          marginBottom: 2, padding: '10px 12px', background: 'none',
                          border: '1px solid var(--color-border)', borderRadius: 8,
                          cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 16, lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {pickupLocations.length < 3 && (
                  <button
                    onClick={() => setPickupLocations(locs => [...locs, { address: '', geo: null }])}
                    style={{
                      background: 'none', border: '1.5px dashed var(--color-border)',
                      borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600,
                      color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    + Ajouter un point de ramassage alternatif
                  </button>
                )}
              </div>
            </Card>

            <Card>
              <SectionLabel>Horaires</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 6, fontWeight: 600 }}>
                    Disponible à partir de
                  </p>
                  <input
                    type="time"
                    value={availableFrom}
                    onChange={e => setAvailableFrom(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '11px 14px',
                      fontSize: 16, border: '1.5px solid var(--color-border)',
                      borderRadius: 10, background: 'var(--color-surface)', color: 'var(--color-text)',
                      fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8, fontWeight: 600 }}>
                    Heure d'arrivée souhaitée
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Avant 15h', 'Avant 18h', 'Avant 20h', 'Flexible'].map(opt => (
                      <Pill key={opt} selected={desiredArrival === opt} onClick={() => setDesiredArrival(opt)}>{opt}</Pill>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <SectionLabel>Bagages & besoins spéciaux</SectionLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Gros bagage', 'Vélo', 'Animal', 'PMR', 'Enfant'].map(c => (
                  <Pill key={c} selected={specialNeeds.includes(c)} onClick={() => toggle(specialNeeds, setSpecialNeeds, c)} color="peach">{c}</Pill>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Permis de conduire</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Toggle
                  checked={hasLicense}
                  onChange={() => { setHasLicense(v => !v); if (hasLicense) setCanRelay(false) }}
                  label="J'ai le permis de conduire"
                  sublabel="Pour les longs trajets"
                />
                {hasLicense && (
                  <Toggle
                    checked={canRelay}
                    onChange={() => setCanRelay(v => !v)}
                    label="Je peux relayer le conducteur"
                    sublabel="Utile pour les trajets longue distance"
                    color="green"
                  />
                )}
              </div>
            </Card>
          </>
        )}

        {role && (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            size="lg"
            fullWidth
          >
            {saving ? 'Enregistrement...' : "Voir les options de covoit' →"}
          </Button>
        )}

        <button
          onClick={() => navigate(`/event/${shortId}`)}
          style={{
            width: '100%', padding: '12px', background: 'none',
            border: '1.5px solid var(--color-border)', borderRadius: 12,
            fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)',
            cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
          }}
        >
          ← Retour à l'événement
        </button>
      </div>
    </div>
  )
}
