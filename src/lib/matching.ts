/**
 * matching.ts — Intelligent carpool matching engine
 *
 * Core principle: the PASSENGER adapts to the driver's route — not the other way around.
 *
 * Phase 1: Real detour in minutes via OSRM routing
 * Phase 2: Meeting point = closest point ON the driver's natural route (zero driver detour)
 * Phase 3: Ranked single-match suggestion — driver sees best candidate first
 */

import { haversineDistance } from './geocoding'

const OSRM      = 'https://router.project-osrm.org'
const NOMINATIM = 'https://nominatim.openstreetmap.org'

export type Coords = { lat: number; lng: number }

export type MeetingPoint = {
  lat: number
  lng: number
  address: string         // human-readable, for display
  walkMinutes: number     // walking time from passenger home to this point
  distKm: number          // straight-line km (for deciding walk vs transit)
  accessMode: 'walk' | 'transit'
  transitEstimateMinutes?: number  // rough transit estimate when > 1.5 km
}

export type MatchResult = {
  passenger: any
  detourMinutes: number   // extra minutes added to driver's trip (should be ~0 with new algo)
  meetingPoint: MeetingPoint
  score: number           // lower = better
  requestedAt?: Date
}

// ── Geocoding ─────────────────────────────────────────────────────────────────

export async function geocodeAddress(address: string): Promise<Coords | null> {
  try {
    const params = new URLSearchParams({ q: address, format: 'json', limit: '1', countrycodes: 'fr' })
    const res  = await fetch(`${NOMINATIM}/search?${params}`, { headers: { 'User-Agent': 'Bivio/1.0' } })
    const data = await res.json()
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { return null }
}

async function reverseGeocode(coords: Coords): Promise<string> {
  try {
    const params = new URLSearchParams({ lat: String(coords.lat), lon: String(coords.lng), format: 'json' })
    const res  = await fetch(`${NOMINATIM}/reverse?${params}`, { headers: { 'Accept-Language': 'fr', 'User-Agent': 'Bivio/1.0' } })
    const data = await res.json()
    if (!data.address) return 'Point de rendez-vous'
    const { road, suburb, quarter, city_district, neighbourhood, village, town, city } = data.address
    const street = road || ''
    const area   = neighbourhood || suburb || quarter || city_district || village || town || city || ''
    return [street, area].filter(Boolean).join(', ') || 'Point de rendez-vous'
  } catch { return 'Point de rendez-vous' }
}

// ── Walking / transit ─────────────────────────────────────────────────────────

/** 4.8 kph = 80m/min walking speed */
export function walkingMinutes(from: Coords, to: Coords): number {
  const km = haversineDistance(from.lat, from.lng, to.lat, to.lng)
  return Math.max(1, Math.round(km / 4.8 * 60))
}

/** Rough transit estimate: 20 kph average including waiting, plus a minimum of 10 min */
function transitEstimateMinutes(distKm: number): number {
  return Math.max(10, Math.round(distKm / 20 * 60))
}

// ── Polyline geometry ─────────────────────────────────────────────────────────

/** Project point P onto segment A→B. Returns the closest point on the segment. */
function projectPointOnSegment(a: Coords, b: Coords, p: Coords): Coords {
  const abLng = b.lng - a.lng, abLat = b.lat - a.lat
  const apLng = p.lng - a.lng, apLat = p.lat - a.lat
  const ab2 = abLng * abLng + abLat * abLat
  if (ab2 === 0) return a
  const t = Math.max(0, Math.min(1, (apLng * abLng + apLat * abLat) / ab2))
  return { lat: a.lat + t * abLat, lng: a.lng + t * abLng }
}

/**
 * Find the point on the polyline (array of [lng, lat]) that is geometrically
 * closest to `passenger`. This is the natural meeting point on the driver's route.
 */
function closestPointOnPolyline(poly: [number, number][], passenger: Coords): Coords {
  let best: Coords = { lat: poly[0][1], lng: poly[0][0] }
  let bestDist = Infinity
  for (let i = 0; i < poly.length - 1; i++) {
    const a: Coords = { lat: poly[i][1],     lng: poly[i][0] }
    const b: Coords = { lat: poly[i + 1][1], lng: poly[i + 1][0] }
    const pt = projectPointOnSegment(a, b, passenger)
    const d  = haversineDistance(passenger.lat, passenger.lng, pt.lat, pt.lng)
    if (d < bestDist) { bestDist = d; best = pt }
  }
  return best
}

// ── Core algorithm ────────────────────────────────────────────────────────────

/**
 * Phase 2: Calculate the optimal meeting point for a driver-passenger pair.
 *
 * Key insight: the meeting point IS on the driver's natural route polyline.
 * The passenger walks or takes transit to reach it — the driver barely deviates.
 *
 * Steps:
 *  1. Get driver's full route polyline (driver → destination)
 *  2. Find the point on that polyline closest to the passenger (zero detour)
 *  3. Calculate driver detour to officially "stop" there (small, due to road network)
 *  4. Calculate passenger travel time (walk if < 1.5 km, transit estimate otherwise)
 *  5. Reverse-geocode the meeting point address
 */
export async function calcDetourAndMeeting(
  driver: Coords,
  passenger: Coords,
  destination: Coords,
): Promise<{ detourMinutes: number; meetingPoint: MeetingPoint } | null> {
  try {
    const coord = (c: Coords) => `${c.lng},${c.lat}`

    // Step 1: Get driver's natural route with full polyline
    const routeRes  = await fetch(
      `${OSRM}/route/v1/driving/${coord(driver)};${coord(destination)}` +
      `?overview=full&geometries=geojson`
    )
    const routeData = await routeRes.json()
    if (routeData.code !== 'Ok') return null

    const baselineDuration: number        = routeData.routes[0].duration
    const polyline: [number, number][]    = routeData.routes[0].geometry.coordinates

    // Step 2: Find the closest point on the driver's route to the passenger
    const meetingCoords = closestPointOnPolyline(polyline, passenger)

    // Step 3: Calculate actual driver detour to stop at the meeting point
    // (Should be near-zero since meeting point is on the route, but road snapping adds a bit)
    const stopRes  = await fetch(
      `${OSRM}/route/v1/driving/${coord(driver)};${coord(meetingCoords)};${coord(destination)}` +
      `?overview=false`
    )
    const stopData = await stopRes.json()
    const stopDuration = stopData.code === 'Ok' ? stopData.routes[0].duration : baselineDuration
    const detourMinutes = Math.round(Math.max(0, stopDuration - baselineDuration) / 60)

    // Step 4: Passenger travel to meeting point
    const distKm      = haversineDistance(passenger.lat, passenger.lng, meetingCoords.lat, meetingCoords.lng)
    const walkMins    = walkingMinutes(passenger, meetingCoords)
    const accessMode: 'walk' | 'transit' = distKm > 1.5 ? 'transit' : 'walk'
    const transitMins = accessMode === 'transit' ? transitEstimateMinutes(distKm) : undefined

    // Step 5: Reverse-geocode meeting point
    const address = await reverseGeocode(meetingCoords)

    return {
      detourMinutes,
      meetingPoint: {
        ...meetingCoords,
        address,
        walkMinutes: walkMins,
        distKm: Math.round(distKm * 10) / 10,
        accessMode,
        transitEstimateMinutes: transitMins,
      },
    }
  } catch { return null }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Driver detour is penalised 5×; passenger travel 1×.
 * This means a passenger 15 min by transit (score 15) beats
 * a passenger requiring a 5-min driver detour (score 25).
 */
export function scoreMatch(detourMinutes: number, passengerTravelMinutes: number): number {
  return detourMinutes * 5 + passengerTravelMinutes * 1
}

// ── Phase 3: rank all candidates ──────────────────────────────────────────────

export async function rankPassengers(
  driver: Coords,
  passengers: any[],
  destination: Coords,
): Promise<MatchResult[]> {
  const results = await Promise.all(
    passengers.map(async (p): Promise<MatchResult> => {
      const hasCoords = p.departure_lat && p.departure_lng
      if (!hasCoords) {
        return {
          passenger: p,
          detourMinutes: 999,
          meetingPoint: { lat: 0, lng: 0, address: 'Adresse inconnue', walkMinutes: 0, distKm: 0, accessMode: 'walk' },
          score: 9999,
          requestedAt: p.requested_at ? new Date(p.requested_at) : undefined,
        }
      }
      const passCoords: Coords = { lat: p.departure_lat, lng: p.departure_lng }
      const result = await calcDetourAndMeeting(driver, passCoords, destination)
      if (!result) {
        const roughDist = haversineDistance(driver.lat, driver.lng, passCoords.lat, passCoords.lng)
        return {
          passenger: p,
          detourMinutes: Math.round(roughDist * 2),
          meetingPoint: { lat: passCoords.lat, lng: passCoords.lng, address: 'Point de rendez-vous', walkMinutes: 0, distKm: roughDist, accessMode: 'walk' },
          score: roughDist * 10,
          requestedAt: p.requested_at ? new Date(p.requested_at) : undefined,
        }
      }
      const travelMins = result.meetingPoint.accessMode === 'transit'
        ? (result.meetingPoint.transitEstimateMinutes ?? result.meetingPoint.walkMinutes)
        : result.meetingPoint.walkMinutes
      return {
        passenger: p,
        ...result,
        score: scoreMatch(result.detourMinutes, travelMins),
        requestedAt: p.requested_at ? new Date(p.requested_at) : undefined,
      }
    })
  )
  return results.sort((a, b) => a.score - b.score)
}
