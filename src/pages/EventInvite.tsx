import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateRange } from '../lib/utils'

type Event = {
  id: string
  short_id: string
  short_code: string
  name: string
  date_start: string
  date_end: string | null
  destination_address: string
  cover_image: string | null
  time_start: string | null
}

const CHANNELS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    getUrl: (msg: string) => `https://wa.me/?text=${encodeURIComponent(msg)}`,
  },
  {
    id: 'sms',
    label: 'SMS',
    color: '#34C759',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    getUrl: (msg: string) => `sms:?body=${encodeURIComponent(msg)}`,
  },
  {
    id: 'messenger',
    label: 'Messenger',
    color: '#0084FF',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.438 5.504 3.686 7.205V22l3.374-1.853A10.606 10.606 0 0012 20.485c5.523 0 10-4.144 10-9.242S17.523 2 12 2zm1.043 12.447l-2.558-2.72-4.99 2.72 5.49-5.836 2.621 2.72 4.927-2.72-5.49 5.836z"/>
      </svg>
    ),
    getUrl: () => 'https://www.messenger.com',
    copyFirst: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    getUrl: () => 'https://www.instagram.com',
    copyFirst: true,
  },
  {
    id: 'email',
    label: 'Email',
    color: '#6B6B63',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
    ),
    getUrl: (eventName: string, msg: string) =>
      `mailto:?subject=${encodeURIComponent(`Tu es invité(e) — ${eventName}`)}&body=${encodeURIComponent(msg)}`,
  },
]

export default function EventInvite() {
  const { shortId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedMsg, setCopiedMsg] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!shortId) return
    supabase
      .from('events')
      .select('id, short_id, short_code, name, date_start, date_end, destination_address, cover_image, time_start')
      .eq('short_id', shortId)
      .single()
      .then(({ data }) => { if (data) setEvent(data) })
  }, [shortId])

  const eventUrl = `${window.location.origin}/event/${shortId}`

  // Initialise editable message once event loads
  useEffect(() => {
    if (event && !message) {
      setMessage(
        `Tu es invité(e) à ${event.name} 🎉\n\n📅 ${formatDateRange(event.date_start, event.date_end)}\n📍 ${event.destination_address.split(',').slice(0, 2).join(',')}\n\nRSVP ici → ${eventUrl}`
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  const copyLink = async () => {
    await navigator.clipboard.writeText(eventUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const copyCode = async () => {
    if (!event?.short_code) return
    await navigator.clipboard.writeText(event.short_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message)
    setCopiedMsg(true)
    setTimeout(() => setCopiedMsg(false), 2000)
  }

  const handleChannel = (channel: typeof CHANNELS[number]) => {
    if (channel.id === 'email') {
      window.location.href = (channel as any).getUrl(event?.name || '', message)
    } else if ((channel as any).copyFirst) {
      // Copy message to clipboard first, then open the app
      navigator.clipboard.writeText(message).then(() => {
        window.open((channel as any).getUrl(), '_blank')
      })
    } else {
      window.open(channel.getUrl(message), '_blank')
    }
  }

  return (
    <div style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: '48px 24px 80px',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Success indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#d1f5e3', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          ✓
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>
          Événement créé !
        </span>
      </div>

      <h1 style={{
        fontFamily: "'Instrument Serif', serif",
        fontStyle: 'italic',
        fontSize: 36,
        color: '#1a1a18',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        marginBottom: 8,
      }}>
        Invite tes amis
      </h1>
      <p style={{ fontSize: 14, color: '#6b6b63', marginBottom: 36 }}>
        Partage via l'appli de ton choix — tes invités n'ont pas besoin de créer un compte pour répondre.
      </p>

      {/* Event recap card */}
      {event && (
        <div style={{
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #ddd8cf',
          marginBottom: 32,
        }}>
          {event.cover_image && (
            <div style={{ height: 140, overflow: 'hidden' }}>
              <img
                src={event.cover_image}
                alt={event.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}
          <div style={{ padding: '16px 20px', background: '#faf9f6' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: 'italic',
                fontSize: 22,
                color: '#1a1a18',
              }}>
                {event.name}
              </div>
              <button
                onClick={() => navigate(`/event/${shortId}/edit`)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: '#f0ede6', border: '1px solid #ddd8cf',
                  borderRadius: 8, padding: '5px 10px',
                  fontSize: 12, fontWeight: 600, color: '#3d3d38',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Modifier
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#6b6b63' }}>
              <span>📅 {formatDateRange(event.date_start, event.date_end)}</span>
              {event.destination_address && (
                <span>📍 {event.destination_address.split(',').slice(0, 2).join(',')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sharing channels ── */}
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#6b6b63', marginBottom: 14,
      }}>
        Partager via
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 28 }}>
        {CHANNELS.map(channel => (
          <button
            key={channel.id}
            onClick={() => handleChannel(channel)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '12px 4px',
              background: '#faf9f6', border: '1px solid #ddd8cf',
              borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0ede6' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#faf9f6' }}
          >
            <div style={{ color: channel.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {channel.icon}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#3d3d38' }}>{channel.label}</span>
          </button>
        ))}
      </div>

      {/* ── Editable message ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#6b6b63',
          }}>
            Message d'invitation
          </span>
          <span style={{ fontSize: 11, color: '#9b9b93' }}>Modifiable</span>
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px', paddingBottom: 44,
              fontSize: 13, lineHeight: 1.6,
              background: '#f5f3ee', border: '1px solid #ddd8cf',
              borderRadius: 10, resize: 'vertical', color: '#3d3d38',
              fontFamily: 'inherit', outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.target.style.borderColor = '#c8c5be')}
            onBlur={e => (e.target.style.borderColor = '#ddd8cf')}
          />
          <button
            onClick={copyMessage}
            style={{
              position: 'absolute', bottom: 10, right: 10,
              background: copiedMsg ? '#d1f5e3' : '#edeae3',
              border: '1px solid #ddd8cf', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, fontWeight: 700,
              color: copiedMsg ? '#1a7f4a' : '#3d3d38',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {copiedMsg ? '✓ Copié' : 'Copier'}
          </button>
        </div>
      </div>

      {/* ── Copy link ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#6b6b63', marginBottom: 10,
        }}>
          Lien de l'événement
        </div>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: '#f5f3ee', border: '1px solid #ddd8cf',
          borderRadius: 10, overflow: 'hidden',
        }}>
          <span style={{
            flex: 1, padding: '11px 14px', fontSize: 13, color: '#3d3d38',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {eventUrl.replace('http://', '').replace('https://', '')}
          </span>
          <button
            onClick={copyLink}
            style={{
              flexShrink: 0,
              padding: '11px 16px',
              background: copiedLink ? '#d1f5e3' : '#edeae3',
              border: 'none', borderLeft: '1px solid #ddd8cf',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: copiedLink ? '#1a7f4a' : '#3d3d38',
              fontFamily: 'inherit', transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {copiedLink ? '✓ Copié' : 'Copier'}
          </button>
        </div>
      </div>

      {/* ── Short code ── */}
      {event?.short_code && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#6b6b63', marginBottom: 10,
          }}>
            Code court
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              background: '#f0ede6', border: '1px solid #ddd8cf',
              borderRadius: 10, padding: '10px 20px', gap: 6,
            }}>
              {event.short_code.split('').map((char, i) => (
                <span key={i} style={{
                  fontFamily: "'DM Mono', 'Courier New', monospace",
                  fontSize: 24, fontWeight: 700, color: '#1a1a18',
                  letterSpacing: '0.08em',
                }}>
                  {char}
                </span>
              ))}
            </div>
            <button
              onClick={copyCode}
              style={{
                background: 'none', border: '1px solid #ddd8cf',
                borderRadius: 8, padding: '8px 14px',
                fontSize: 13, fontWeight: 600,
                color: copiedCode ? '#1a7f4a' : '#3d3d38',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {copiedCode ? '✓ Copié' : 'Copier'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#6b6b63', marginTop: 8 }}>
            Les invités peuvent saisir ce code pour rejoindre l'événement directement.
          </p>
        </div>
      )}

      {/* Dashboard CTA */}
      <button
        onClick={() => navigate(`/event/${shortId}/dashboard`)}
        style={{
          width: '100%',
          background: '#1a1a18', color: '#f5f3ee',
          border: 'none', borderRadius: 12, padding: '15px',
          fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Aller à mon dashboard →
      </button>
    </div>
  )
}
