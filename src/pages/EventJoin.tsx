import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { Pill } from '../components/Pill'
import { AddressSearch } from '../components/AddressSearch'
import { Card, SectionLabel } from '../components/Card'
import type { GeoResult } from '../lib/geocoding'

export default function EventJoin() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  const { user, profile } = useAuth()
  const [eventId, setEventId]     = useState<string | null>(null)
  const [eventName, setEventName] = useState('')
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(true)

  const [departureAddress, setDepartureAddress] = useState('')
  const [departureGeo, setDepartureGeo]         = useState<GeoResult | null>(null)
  const [mobility, setMobility]                 = useState('home')
  const [drivesThisEvent, setDrivesThisEvent]   = useState(false)
  const [seatsAvailable, setSeatsAvailable]     = useState(4)
  const [constraints, setConstraints]           = useState<string[]>([])
  const [preferredArrival, setPreferredArrival] = useState('flexible')

  useEffect(() => {
    if (!shortId) return
    supabase.from('events').select('id, name').eq('short_id', shortId).single().then(({ data }) => {
      if (data) { setEventId(data.id); setEventName(data.name) }
      setLoading(false)
    })
  }, [shortId])

  useEffect(() => {
    if (profile) {
      setDrivesThisEvent(profile.drives_regularly)
      setConstraints(profile.default_constraints || [])
      if (profile.city) setDepartureAddress(profile.city)
    }
  }, [profile])

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const handleSubmit = async () => {
    if (!user || !eventId || !departureAddress) return
    setSaving(true)
    const { error } = await supabase.from('event_guests').insert({
      event_id: eventId, profile_id: user.id,
      departure_address: departureAddress,
      departure_lat: departureGeo?.lat || null,
      departure_lng: departureGeo?.lng || null,
      mobility_flexibility: [mobility],
      drives_this_event: drivesThisEvent,
      seats_available: drivesThisEvent ? seatsAvailable : 0,
      constraints_this_event: constraints,
      preferred_arrival: preferredArrival,
    })
    setSaving(false)
    if (!error) navigate(`/event/${shortId}/matches`)
  }

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Chargement...</div>

  return (
    <div className="animate-fade-up" style={{ paddingTop: 8 }}>
      <div style={{ paddingBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.5px' }}>Ton trajet</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
          Pour <strong style={{ color: 'var(--color-text)' }}>{eventName}</strong> — la destination est renseignée
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        <Card>
          <AddressSearch
            value={departureAddress}
            onChange={(val, geo) => { setDepartureAddress(val); if (geo) setDepartureGeo(geo) }}
            label="Point de départ"
            placeholder="Adresse, quartier, gare..."
          />
        </Card>

        <Card>
          <SectionLabel>Flexibilité de déplacement</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'home',  label: 'Je pars de chez moi' },
              { id: 'metro', label: 'Mobile en RER / métro' },
              { id: 'ter',   label: 'Mobile en TER' },
            ].map(opt => (
              <Pill key={opt.id} selected={mobility === opt.id} onClick={() => setMobility(opt.id)}>{opt.label}</Pill>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Je conduis pour cet event</SectionLabel>
          <div style={{ display: 'flex', gap: 8, marginBottom: drivesThisEvent ? 12 : 0 }}>
            <Pill selected={drivesThisEvent} onClick={() => setDrivesThisEvent(true)}>Je peux conduire</Pill>
            <Pill selected={!drivesThisEvent} onClick={() => setDrivesThisEvent(false)}>Passager</Pill>
          </div>
          {drivesThisEvent && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8, fontWeight: 600 }}>Nombre de places disponibles</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[2, 3, 4, 5].map(n => (
                  <Pill key={n} selected={seatsAvailable === n} onClick={() => setSeatsAvailable(n)}>{n}</Pill>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>Contraintes pour cet event</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Gros bagage', 'Vélo', 'Animal', 'PMR', 'Enfant'].map(c => (
              <Pill key={c} selected={constraints.includes(c)} onClick={() => toggle(constraints, setConstraints, c)} color="peach">{c}</Pill>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Arrivée souhaitée</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'avant-18h', label: 'Avant 18h' },
              { id: 'avant-20h', label: 'Avant 20h' },
              { id: 'flexible',  label: 'Flexible' },
            ].map(opt => (
              <Pill key={opt.id} selected={preferredArrival === opt.id} onClick={() => setPreferredArrival(opt.id)}>{opt.label}</Pill>
            ))}
          </div>
        </Card>

        {profile && (profile.default_constraints.length > 0 || !profile.has_license) && (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: 'var(--color-amber-light)', borderRadius: 14, padding: '10px 14px',
          }}>
            <span style={{ color: 'var(--color-amber)', flexShrink: 0 }}>ℹ</span>
            <p style={{ fontSize: 12, color: 'var(--color-amber)', lineHeight: 1.5 }}>
              <strong>Pré-rempli depuis ton profil</strong>
              {!profile.has_license && ' · pas de permis'}
              {profile.default_constraints.length > 0 && ` · ${profile.default_constraints.join(', ').toLowerCase()}`}
            </p>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!departureAddress || saving} size="lg" fullWidth>
          {saving ? 'Inscription...' : "Voir les options de covoit' →"}
        </Button>
      </div>
    </div>
  )
}
