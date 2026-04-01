type NominatimResult = {
  display_name: string
  lat: string
  lon: string
  address: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    country?: string
  }
}

export type GeoResult = {
  label: string
  lat: number
  lng: number
}

let debounceTimer: ReturnType<typeof setTimeout>

export async function searchAddress(query: string): Promise<GeoResult[]> {
  if (query.length < 3) return []

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'fr',
  })

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'Bivio/1.0' },
  })

  if (!res.ok) return []

  const data: NominatimResult[] = await res.json()
  return data.map((r) => ({
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }))
}

export function searchAddressDebounced(
  query: string,
  callback: (results: GeoResult[]) => void,
  delay = 500
) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const results = await searchAddress(query)
    callback(results)
  }, delay)
}

export type NearbyStation = {
  name: string
  type: 'train' | 'bus'
  lat: number
  lng: number
  distanceKm: number
}

export async function findNearbyStations(lat: number, lng: number): Promise<NearbyStation[]> {
  const query = `[out:json][timeout:15];(node["railway"~"station|halt"]["name"](around:50000,${lat},${lng});node["amenity"="bus_station"]["name"](around:50000,${lat},${lng}););out body;`
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.elements as any[])
      .filter(el => el.tags?.name)
      .map(el => ({
        name: el.tags.name as string,
        type: (el.tags.amenity === 'bus_station' ? 'bus' : 'train') as 'train' | 'bus',
        lat: el.lat as number,
        lng: el.lon as number,
        distanceKm: Math.round(haversineDistance(lat, lng, el.lat, el.lon)),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i)
      .slice(0, 5)
  } catch {
    return []
  }
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
