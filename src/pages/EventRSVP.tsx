import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDateRange } from '../lib/utils'

type Event = {
  id: string
  short_id: string
  name: string
  emoji: string
  date_start: string
  date_end: string | null
  destination_address: string
  cover_image: string | null
  plus_one_allowed: boolean
}

export default function EventRSVP() {
  const { shortId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [bringsPlusOne, setBringsPlusOne] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadyRsvp, setAlreadyRsvp] = useState(false)

  useEffect(() => {
    if (!shortId) return
    const load = async () => {
      const { data: ev } = await supabase
        .from('events')
        .select('id, short_id, name, emoji, date_start, date_end, destination_address, cover_image, plus_one_allowed')
        .eq('short_id', shortId)
        .single()
      if (!ev) { setLoading(false); return }
      setEvent(ev)

      // Check if already RSVP'd (authenticated user)
      if (user) {
        const { data: existing } = await supabase
          .from('event_guests')
          .select('id')
          .eq('event_id', ev.id)
          .eq('profile_id', user.id)
          .maybeSingle()
        if (existing) { navigate(`/event/${shortId}`); return }
      }

      // Check anonymous token in localStorage
      const token = localStorage.getItem(`bivio_rsvp_${shortId}`)
      if (token) { setAlreadyRsvp(true) }

      setLoading(false)
    }
    load()
  }, [shortId, user])

  const handleRSVP = async (status: 'coming' | 'not_coming') => {
    if (!event || !name.trim()) return
    setSaving(true)

    const token = crypto.randomUUID()

    if (user) {
      // Authenticated: link to profile
      await supabase.from('event_guests').insert({
        event_id: event.id,
        profile_id: user.id,
        guest_name: name.trim(),
        guest_token: token,
        rsvp_status: status,
        brings_plus_one: bringsPlusOne,
      })
    } else {
      // Anonymous
      await supabase.from('event_guests').insert({
        event_id: event.id,
        guest_name: name.trim(),
        guest_token: token,
        rsvp_status: status,
        brings_plus_one: bringsPlusOne,
      })
      localStorage.setItem(`bivio_rsvp_${shortId}`, token)
    }

    setSaving(false)
    if (status === 'coming') {
      setDone(true)
    } else {
      navigate(`/event/${shortId}`)
    }
  }

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

  // Already RSVP'd (anonymous)
  if (alreadyRsvp) return (
    <div className="animate-fade-up" style={{ paddingTop: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{event.emoji}</div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', marginBottom: 8 }}>
        Tu es déjà inscrit(e) !
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 32 }}>
        {event.name}
      </p>
      <button
        onClick={() => navigate(`/event/${shortId}`)}
        style={{
          background: 'var(--color-violet)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px 28px',
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Voir l'événement →
      </button>
    </div>
  )

  // Success state
  if (done) return (
    <div className="animate-fade-up" style={{ paddingTop: 32, textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--color-green-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, margin: '0 auto 20px',
      }}>
        ✓
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text)', marginBottom: 8 }}>
        Tu es inscrit(e) !
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 32, lineHeight: 1.6 }}>
        L'organisateur sait que tu viens à <strong>{event.name}</strong>.
      </p>

      {/* Covoit upsell */}
      <div style={{
        background: 'var(--color-violet-light)',
        border: '1px solid var(--color-violet)',
        borderRadius: 16, padding: '20px',
        marginBottom: 16, textAlign: 'left',
      }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>🚗</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>
          Rejoins le carpool de l'événement
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16, lineHeight: 1.5 }}>
          Indique ton point de départ pour trouver (ou proposer) une place en voiture.
        </p>
        <button
          onClick={() => navigate(`/event/${shortId}/join`)}
          style={{
            background: 'var(--color-violet)', color: '#fff',
            border: 'none', borderRadius: 12, padding: '12px 20px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            width: '100%',
          }}
        >
          Rejoindre le carpool de l'événement →
        </button>
      </div>

      <button
        onClick={() => navigate(`/event/${shortId}`)}
        style={{
          background: 'none', color: 'var(--color-text-2)',
          border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 20px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          width: '100%',
        }}
      >
        Voir l'événement
      </button>
    </div>
  )

  return (
    <div className="animate-fade-up" style={{ paddingTop: 16 }}>

      {/* Event card */}
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--color-border)',
        marginBottom: 32,
        boxShadow: '0 2px 12px rgba(26,26,24,0.06)',
      }}>
        {event.cover_image && (
          <div style={{ height: 120, overflow: 'hidden' }}>
            <img
              src={event.cover_image}
              alt={event.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}
        <div style={{ padding: '16px 20px', background: 'var(--color-surface)' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{event.emoji}</div>
          <div style={{
            fontSize: 20, fontWeight: 900, color: 'var(--color-text)',
            marginBottom: 6, letterSpacing: '-0.3px',
          }}>
            {event.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', display: 'flex', flexWrap: 'wrap', gap: 12, fontWeight: 600 }}>
            <span>📅 {formatDateRange(event.date_start, event.date_end)}</span>
            <span>📍 {event.destination_address.split(',').slice(0, 2).join(',')}</span>
          </div>
        </div>
      </div>

      {/* RSVP form */}
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.3px' }}>
        Tu es invité(e) !
      </h2>
      <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 24 }}>
        Entre ton prénom pour répondre.
      </p>

      <div style={{ marginBottom: 24 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 700,
          color: 'var(--color-text-2)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 8,
        }}>
          Ton prénom
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ex. Marie"
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '13px 16px', fontSize: 16,
            border: '1.5px solid var(--color-border)',
            borderRadius: 12, outline: 'none',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--color-violet)')}
          onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {event.plus_one_allowed && (
        <div
          onClick={() => setBringsPlusOne(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, marginBottom: 24, cursor: 'pointer',
            background: bringsPlusOne ? 'var(--color-violet-light)' : 'var(--color-surface)',
            border: `1.5px solid ${bringsPlusOne ? 'var(--color-violet)' : 'var(--color-border)'}`,
            borderRadius: 12, padding: '14px 16px',
            transition: 'all 0.15s',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Je viens avec un +1</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>Ton accompagnant(e) sera compté(e)</div>
          </div>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: bringsPlusOne ? 'var(--color-violet)' : 'var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s',
          }}>
            {bringsPlusOne && <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => handleRSVP('coming')}
          disabled={!name.trim() || saving}
          style={{
            padding: '15px', borderRadius: 14, fontSize: 16, fontWeight: 800,
            background: !name.trim() || saving ? 'var(--color-border)' : 'var(--color-violet)',
            color: !name.trim() || saving ? 'var(--color-text-3)' : '#fff',
            border: 'none', cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          {saving ? 'Inscription...' : '✓ Je viens !'}
        </button>
        <button
          onClick={() => handleRSVP('not_coming')}
          disabled={!name.trim() || saving}
          style={{
            padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 600,
            background: 'none',
            color: !name.trim() ? 'var(--color-text-3)' : 'var(--color-text-2)',
            border: '1.5px solid var(--color-border)',
            cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          Je ne pourrai pas venir
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', marginTop: 16 }}>
        Pas besoin de créer un compte pour répondre.
      </p>
    </div>
  )
}
