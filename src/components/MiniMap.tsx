import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default icon URLs broken by Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type LatLng = [number, number]

async function geocode(address: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'fr' } }
    )
    const data = await res.json()
    if (!data.length) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {
    return null
  }
}

async function getRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    )
    const data = await res.json()
    if (data.code !== 'Ok') return null
    // GeoJSON coords are [lng, lat], flip to [lat, lng] for Leaflet
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as LatLng)
  } catch {
    return null
  }
}

type Props = {
  origin: string
  destination: string
  originLabel?: string
  destLabel?: string
}

export function MiniMap({ origin, destination, originLabel = 'Passager', destLabel = 'Conducteur' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setStatus('loading')
      const [fromCoords, toCoords] = await Promise.all([
        geocode(origin),
        geocode(destination),
      ])

      if (cancelled) return
      if (!fromCoords || !toCoords) { setStatus('error'); return }

      if (!containerRef.current) return

      // Destroy previous map instance if any
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map)

      // Custom colored markers
      const makeIcon = (color: string, label: string) => L.divIcon({
        className: '',
        html: `
          <div style="
            position:relative;
            display:flex;
            flex-direction:column;
            align-items:center;
          ">
            <div style="
              background:${color};
              color:#fff;
              font-size:10px;
              font-weight:800;
              font-family:DM Sans,sans-serif;
              padding:3px 7px;
              border-radius:6px;
              white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.22);
              margin-bottom:3px;
            ">${label}</div>
            <div style="
              width:12px;height:12px;
              border-radius:50%;
              background:${color};
              border:2px solid #fff;
              box-shadow:0 2px 5px rgba(0,0,0,0.3);
            "></div>
          </div>
        `,
        iconAnchor: [28, 32],
        iconSize: [56, 32],
      })

      const markerFrom = L.marker(fromCoords, { icon: makeIcon('#f97316', originLabel) }).addTo(map)
      const markerTo   = L.marker(toCoords,   { icon: makeIcon('#7cc400', destLabel)   }).addTo(map)

      // Fit initial bounds
      const bounds = L.latLngBounds([fromCoords, toCoords])
      map.fitBounds(bounds, { padding: [32, 32] })

      // Fetch and draw route
      const route = await getRoute(fromCoords, toCoords)
      if (!cancelled && route) {
        L.polyline(route, {
          color: '#7cc400',
          weight: 4,
          opacity: 0.85,
        }).addTo(map)
        // Refit with full route
        map.fitBounds(L.latLngBounds(route), { padding: [32, 32] })
      }

      // Keep markers on top
      markerFrom.bringToFront()
      markerTo.bringToFront()

      if (!cancelled) setStatus('ok')
    }

    init()
    return () => { cancelled = true }
  }, [origin, destination]) // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {/* Map container — always rendered so Leaflet can attach */}
      <div
        ref={containerRef}
        style={{ height: 220, width: '100%', background: '#f0ede8' }}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'rgba(245,243,238,0.85)', backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            width: 20, height: 20,
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-violet)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>
            Calcul de l'itinéraire…
          </span>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#f0ede8',
        }}>
          <span style={{ fontSize: 22 }}>🗺️</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>
            Carte indisponible
          </span>
        </div>
      )}
    </div>
  )
}
