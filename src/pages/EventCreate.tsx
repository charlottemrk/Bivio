import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { AddressSearch } from '../components/AddressSearch'
import { generateShortId, generateShortCode } from '../lib/utils'
import { findNearbyStations } from '../lib/geocoding'
import { DEV_BYPASS_AUTH } from '../config'
import type { GeoResult, NearbyStation } from '../lib/geocoding'

const COVER_PHOTOS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&q=75',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&auto=format&q=75',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&auto=format&q=75',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&q=75',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&auto=format&q=75',
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1200&auto=format&q=75',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&q=75',
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&q=75',
]

const CHANNELS = ['SMS', 'WhatsApp', 'Instagram', 'Signal', 'Messenger', 'Mail']

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '40px 24px 80px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  } as React.CSSProperties,
  title: {
    fontFamily: "'Instrument Serif', serif",
    fontStyle: 'italic',
    fontSize: 40,
    color: '#1a1a18',
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    marginBottom: 6,
  } as React.CSSProperties,
  subtitle: {
    fontSize: 14,
    color: '#6b6b63',
    marginBottom: 32,
  } as React.CSSProperties,
  label: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#6b6b63',
    marginBottom: 8,
    display: 'block',
  } as React.CSSProperties,
  field: {
    marginBottom: 28,
  } as React.CSSProperties,
}

export default function EventCreate() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const fileRef        = useRef<HTMLInputElement>(null)
  const locPhotoRef    = useRef<HTMLInputElement>(null)

  // Cover
  const [coverIdx, setCoverIdx]         = useState(() => Math.floor(Math.random() * COVER_PHOTOS.length))
  const [coverCustom, setCoverCustom]   = useState<string | null>(null)

  // Form
  const [name, setName]                 = useState('')
  const [dateStart, setDateStart]       = useState('')
  const [timeStart, setTimeStart]       = useState('')
  const [dateEnd, setDateEnd]           = useState('')
  const [timeEnd, setTimeEnd]           = useState('')
  const [destination, setDestination]   = useState('')
  const [destGeo, setDestGeo]           = useState<GeoResult | null>(null)
  const [stations, setStations]         = useState<NearbyStation[]>([])
  const [loadingStations, setLoadingStations] = useState(false)
  const [description, setDescription]   = useState('')
  const [locationInstructions, setLocationInstructions] = useState('')
  const [locationPhotos, setLocationPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [plusOneAllowed, setPlusOneAllowed] = useState(false)

  // Options (collapsed)
  const [optionsOpen, setOptionsOpen]   = useState(false)
  const [packingList, setPackingList]   = useState<string[]>([])
  const [newItem, setNewItem]           = useState('')
  const [orgNotes, setOrgNotes]         = useState('')

  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [description])

  // Fetch nearby stations when destination changes
  useEffect(() => {
    if (!destGeo) { setStations([]); return }
    setLoadingStations(true)
    findNearbyStations(destGeo.lat, destGeo.lng).then(results => {
      setStations(results)
      setLoadingStations(false)
    })
  }, [destGeo])

  const coverUrl = coverCustom ?? COVER_PHOTOS[coverIdx]

  const handleShuffle = () => {
    setCoverCustom(null)
    setCoverIdx(i => (i + 1) % COVER_PHOTOS.length)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCoverCustom(url)
  }

  const handleLocationPhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingPhoto(true)
    const urls: string[] = []
    for (const file of files) {
      const path = `location/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { data, error } = await supabase.storage.from('event-media').upload(path, file, { upsert: true })
      if (!error && data) {
        const { data: pub } = supabase.storage.from('event-media').getPublicUrl(data.path)
        urls.push(pub.publicUrl)
      }
    }
    setLocationPhotos(prev => [...prev, ...urls])
    setUploadingPhoto(false)
    e.target.value = ''
  }

  const addPackingItem = () => {
    if (!newItem.trim()) return
    setPackingList(l => [...l, newItem.trim()])
    setNewItem('')
  }

  const canSubmit = name.trim() && dateStart && destination

  const handleCreate = async () => {
    if (!canSubmit) return
    setSaving(true)
    setSaveError(null)
    const shortId   = generateShortId()
    const shortCode = generateShortCode()
    const userId    = user?.id ?? (DEV_BYPASS_AUTH ? null : 'dev-user')

    const { error } = await supabase.from('events').insert({
      organizer_id:        userId,
      short_id:            shortId,
      short_code:          shortCode,
      name:                name.trim(),
      emoji:               '🎉',
      event_type:          'other',
      date_start:          dateStart,
      time_start:          timeStart || null,
      date_end:            dateEnd || null,
      time_end:            timeEnd || null,
      destination_address: destination,
      destination_lat:     destGeo?.lat ?? null,
      destination_lng:     destGeo?.lng ?? null,
      description:         description || null,
      cover_image:         coverCustom ? null : COVER_PHOTOS[coverIdx],
      visibility:          'private',
      packing_list:        packingList,
      organizer_notes:     orgNotes || null,
      nearby_stations:        stations,
      plus_one_allowed:       plusOneAllowed,
      contribution_policy:    'no_preference',
      location_instructions:  locationInstructions || null,
      location_photos:        locationPhotos,
    })

    setSaving(false)
    if (error) {
      console.error('Error creating event:', error)
      setSaveError(error.message)
    } else {
      navigate(`/event/${shortId}/invite`)
    }
  }

  return (
    <div style={s.page}>
      {/* ── Back ── */}
      <button
        onClick={() => navigate('/events')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6b6b63', padding: '0 0 16px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← Mes événements
      </button>

      {/* Private badge */}
      <div style={{ marginBottom: 16 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#f0ede6', border: '1px solid #ddd8cf',
          borderRadius: 8, padding: '5px 12px',
          fontSize: 12, color: '#6b6b63', fontWeight: 600,
        }}>
          🔒 Événement privé
        </span>
      </div>

      {/* Event name */}
      <div style={{ marginBottom: 24 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Weekend au château…"
          style={{
            width: '100%',
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 28,
            color: '#1a1a18',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #ddd8cf',
            outline: 'none',
            padding: '4px 0 10px',
            letterSpacing: '-0.01em',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Cover image */}
      <div style={{ position: 'relative', marginBottom: 32, borderRadius: 12, overflow: 'hidden', height: 220 }}>
        <img
          src={coverUrl}
          alt="Cover"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)' }} />

        {/* Shuffle + Upload */}
        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={handleShuffle}
            title="Changer la photo"
            style={{
              background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: 8,
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16, backdropFilter: 'blur(4px)',
            }}
          >↺</button>
          <button
            onClick={() => fileRef.current?.click()}
            title="Uploader une photo"
            style={{
              background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: 8,
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v8M5 5l3-3 3 3" stroke="#1a1a18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </div>

      {/* Dates */}
      <div style={s.field}>
        <label style={s.label}>Dates</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Début */}
          <div>
            <div style={{ fontSize: 12, color: '#6b6b63', marginBottom: 6, fontWeight: 500 }}>Début</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                type="date"
                value={dateStart}
                onChange={e => setDateStart(e.target.value)}
                style={inputStyle}
              />
              <input
                type="time"
                value={timeStart}
                onChange={e => setTimeStart(e.target.value)}
                placeholder="14:00"
                style={inputStyle}
              />
            </div>
          </div>
          {/* Fin */}
          <div>
            <div style={{ fontSize: 12, color: '#6b6b63', marginBottom: 6, fontWeight: 500 }}>Fin (optionnel)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                type="date"
                value={dateEnd}
                onChange={e => setDateEnd(e.target.value)}
                style={inputStyle}
              />
              <input
                type="time"
                value={timeEnd}
                onChange={e => setTimeEnd(e.target.value)}
                placeholder="18:00"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div style={s.field}>
        <label style={s.label}>Lieu de l'événement</label>
        <AddressSearch
          value={destination}
          onChange={(val, geo) => {
            setDestination(val)
            if (geo) setDestGeo(geo)
            else setDestGeo(null)
          }}
          placeholder="Domaine des Pins, Fontainebleau…"
        />

        {/* Location instructions */}
        <div style={{ marginTop: 12 }}>
          <input
            value={locationInstructions}
            onChange={e => setLocationInstructions(e.target.value)}
            placeholder="Appartement 5, prendre l'ascenseur, code portail : 1234…"
            style={{ ...inputStyle, fontSize: 13 }}
          />
        </div>

        {/* Location photos */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: locationPhotos.length ? 8 : 0 }}>
            {locationPhotos.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd8cf' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => setLocationPhotos(p => p.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute', top: 3, right: 3,
                    background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 12, lineHeight: 1,
                  }}
                >×</button>
              </div>
            ))}
            <button
              onClick={() => locPhotoRef.current?.click()}
              disabled={uploadingPhoto}
              style={{
                width: locationPhotos.length ? 80 : undefined,
                height: locationPhotos.length ? 80 : undefined,
                padding: locationPhotos.length ? 0 : '7px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: '#f5f3ee', border: '1px dashed #c8c5be',
                borderRadius: 8, cursor: uploadingPhoto ? 'wait' : 'pointer',
                fontSize: 12, color: '#6b6b63', fontWeight: 600, fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              {uploadingPhoto ? '…' : locationPhotos.length ? (
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="#6b6b63" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v8M5 5l3-3 3 3" stroke="#6b6b63" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Photos d'accès
                </>
              )}
            </button>
          </div>
          <input ref={locPhotoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleLocationPhotoAdd} />
          {locationPhotos.length === 0 && (
            <div style={{ fontSize: 11, color: '#9b9b93', marginTop: 4 }}>
              Parking, entrée, plan d'accès…
            </div>
          )}
        </div>

        {/* Nearby stations */}
        {(loadingStations || stations.length > 0) && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6b63', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Gares les plus proches
            </div>
            {loadingStations ? (
              <div style={{ fontSize: 13, color: '#6b6b63' }}>Recherche des gares…</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stations.map((st, i) => (
                  <div key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#f0ede6', border: '1px solid #ddd8cf',
                    borderRadius: 8, padding: '5px 10px',
                    fontSize: 13, color: '#1a1a18', fontWeight: 500,
                  }}>
                    <span>{st.type === 'bus' ? '🚌' : '🚉'}</span>
                    <span>{st.name}</span>
                    <span style={{ color: '#6b6b63', fontSize: 12 }}>· {st.distanceKm} km</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>


      {/* Description */}
      <div style={s.field}>
        <label style={s.label}>Description</label>
        <textarea
          ref={textareaRef}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Infos pratiques, ambiance, ce qu'il faut savoir…"
          rows={3}
          style={{
            ...inputStyle,
            resize: 'none',
            minHeight: 80,
            lineHeight: 1.6,
            overflow: 'hidden',
          }}
        />
      </div>

      {/* +1 toggle */}
      <div style={{ ...s.field, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18', marginBottom: 2 }}>Les +1 sont les bienvenus</div>
          <div style={{ fontSize: 12, color: '#6b6b63' }}>Les invités pourront indiquer qu'ils viennent avec quelqu'un</div>
        </div>
        <button
          type="button"
          onClick={() => setPlusOneAllowed(v => !v)}
          style={{
            flexShrink: 0,
            width: 48, height: 28, borderRadius: 99,
            background: plusOneAllowed ? '#1a1a18' : '#ddd8cf',
            border: 'none', cursor: 'pointer',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3,
            left: plusOneAllowed ? 23 : 3,
            width: 22, height: 22, borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            display: 'block',
          }} />
        </button>
      </div>

      {/* Options (collapsible) */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => setOptionsOpen(o => !o)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: '#3d3d38',
            fontFamily: 'inherit', padding: '8px 0',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 16, transition: 'transform 0.2s', transform: optionsOpen ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>+</span>
          Ajouter des options
        </button>

        {optionsOpen && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Packing list */}
            <div>
              <label style={s.label}>Liste de choses à apporter</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {packingList.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#1a1a18', flex: 1, background: '#f5f3ee', borderRadius: 8, padding: '7px 12px', border: '1px solid #ddd8cf' }}>
                      {item}
                    </span>
                    <button
                      onClick={() => setPackingList(l => l.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6b63', fontSize: 16, lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPackingItem()}
                  placeholder="Serviette, crème solaire…"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={addPackingItem}
                  style={{
                    background: '#1a1a18', color: '#f5f3ee', border: 'none',
                    borderRadius: 10, padding: '0 16px', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Ajouter
                </button>
              </div>
            </div>

            {/* Budget (disabled) */}
            <div style={{ opacity: 0.45 }}>
              <label style={s.label}>
                Budget
                <span style={{
                  marginLeft: 8, background: '#edeae3', color: '#6b6b63',
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>Bientôt disponible</span>
              </label>
              <input disabled placeholder="Budget estimé par personne…" style={{ ...inputStyle, cursor: 'not-allowed' }} />
            </div>

            {/* Organizer notes */}
            <div>
              <label style={s.label}>Note privée (visible uniquement par toi)</label>
              <textarea
                value={orgNotes}
                onChange={e => setOrgNotes(e.target.value)}
                placeholder="Rappels, infos logistiques, contacts…"
                rows={2}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit error */}
      {saveError && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#b91c1c' }}>
          Erreur : {saveError}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={!canSubmit || saving}
        style={{
          width: '100%',
          background: canSubmit && !saving ? '#1a1a18' : '#c8c5be',
          color: '#f5f3ee',
          border: 'none',
          borderRadius: 12,
          padding: '16px',
          fontSize: 16,
          fontWeight: 700,
          cursor: canSubmit && !saving ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
      >
        {saving ? 'Création en cours…' : "Créer l'événement →"}
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f5f3ee',
  border: '1px solid #ddd8cf',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  color: '#1a1a18',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
}
