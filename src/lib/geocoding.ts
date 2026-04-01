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
