/**
 * A trail's route and elevation profile, from public/routes/<id>.json. scripts/build-trail-routes.mjs
 * writes one per published guide at deploy time, from the guide package's own line and elevations,
 * so the site shows the same distance and climb as the app and the GPX download.
 */

export type TrailRoute = {
  id: string
  /** The guide and package version the line came from, such as "disha-guides gr5 d6f6ab35b5b2". */
  source: string
  lengthKm: number
  /** The line the map draws, simplified, as [lon, lat]. */
  line: [number, number][]
  /** Evenly spaced samples for the chart and the scrub: [km along, metres, lon, lat]. */
  profile: [number, number, number, number][]
}

/** The box around a line, as [west, south, east, north]. */
export function boundsOf(line: [number, number][]): [number, number, number, number] | null {
  if (!line.length) return null
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [lon, lat] of line) {
    west = Math.min(west, lon)
    east = Math.max(east, lon)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  return [west, south, east, north]
}

export type Units = 'metric' | 'imperial'

export const kmToMiles = (km: number) => km * 0.621371
export const metresToFeet = (m: number) => m * 3.28084

/** A distance in the chosen units, such as "12.3 km" or "7.6 mi". */
export function formatDistance(km: number, units: Units): string {
  return units === 'imperial' ? `${kmToMiles(km).toFixed(1)} mi` : `${km.toFixed(1)} km`
}

/** A height in the chosen units, rounded, such as "2,104 m" or "6,903 ft". */
export function formatHeight(m: number, units: Units): string {
  const value = Math.round(units === 'imperial' ? metresToFeet(m) : m)
  return `${value.toLocaleString('en-US')} ${units === 'imperial' ? 'ft' : 'm'}`
}

/** Where on the route a distance falls, between the two samples around it, as [lon, lat]. */
export function pointAtKm(profile: TrailRoute['profile'], km: number): [number, number] | null {
  if (!profile.length) return null
  if (km <= profile[0][0]) return [profile[0][2], profile[0][3]]
  for (let i = 1; i < profile.length; i++) {
    const [k1, , lon1, lat1] = profile[i]
    if (km <= k1) {
      const [k0, , lon0, lat0] = profile[i - 1]
      const t = k1 === k0 ? 0 : (km - k0) / (k1 - k0)
      return [lon0 + (lon1 - lon0) * t, lat0 + (lat1 - lat0) * t]
    }
  }
  const last = profile[profile.length - 1]
  return [last[2], last[3]]
}

/**
 * The sample nearest a screen point, with its distance in pixels, given a way to project
 * [lon, lat] to the screen. Null for an empty profile.
 */
export function nearestSample(
  profile: TrailRoute['profile'],
  point: { x: number; y: number },
  project: (lonLat: [number, number]) => { x: number; y: number },
): { km: number; pixels: number } | null {
  let best: { km: number; pixels: number } | null = null
  for (const [km, , lon, lat] of profile) {
    const p = project([lon, lat])
    const pixels = Math.hypot(p.x - point.x, p.y - point.y)
    if (!best || pixels < best.pixels) best = { km, pixels }
  }
  return best
}
