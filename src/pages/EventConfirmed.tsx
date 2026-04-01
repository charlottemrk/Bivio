import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { formatDateRange } from '../lib/utils'

export default function EventConfirmed() {
  const { shortId } = useParams()
  const navigate    = useNavigate()
  useAuth()
  const [event, setEvent]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shortId) return
    supabase.from('events').select('*').eq('short_id', shortId).single().then(({ data }) => {
      setEvent(data)
      setLoading(false)
    })
  }, [shortId])

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--color-text-3)', paddingTop: 64, fontSize: 14 }}>Chargement...</div>

  return (
    <div className="animate-fade-up" style={{ paddingTop: 8 }}>
      {/* Success */}
      <div style={{ textAlign: 'center', paddingTop: 32, paddingBottom: 32 }}>
        <div style={{
          width: 68, height: 68, borderRadius: 22,
          background: 'var(--color-green-light)', color: 'var(--color-green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, margin: '0 auto 16px', fontWeight: 900,
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.5px' }}>Covoit' confirmé !</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{event?.name}</p>
      </div>

      {/* Recap */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['Event', event?.name],
            ['Date', event ? formatDateRange(event.date_start, event.date_end) : '—'],
            ['Destination', event?.destination_address],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-2)', flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', textAlign: 'right' }}>{v || '—'}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Next steps */}
      <Card style={{ marginBottom: 28, background: 'var(--color-surface-2)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>La suite</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['📬', "Rappel 48h avant l'event"],
            ['📍', 'Point de RDV confirmé J-1'],
            ['💬', 'Coordonnées du conducteur partagées J-1'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-text-2)' }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button onClick={() => navigate(`/event/${shortId}`)} size="lg" fullWidth>
          Voir la page de l'event
        </Button>
        <Button onClick={() => navigate('/events')} variant="secondary" size="lg" fullWidth>
          Mes events
        </Button>
      </div>
    </div>
  )
}
