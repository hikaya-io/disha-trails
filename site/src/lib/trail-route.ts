/**
 * A trail's route and elevation profile, from public/routes/<id>.json. scripts/build-trail-routes.mjs
 * writes one per trail that has a line (a disha-guides corridor today), with the elevation read
 * from the published terrain cells, the same model the map's hillshade and contours come from.
 */

export type TrailRoute = {
  id: string
  /** Where the line came from, such as "disha-guides corridor". */
  source: string
  lengthKm: number
  /** The line the map draws, simplified, as [lon, lat]. */
  line: [number, number][]
  /** Evenly spaced samples for the chart and the scrub: [km along, metres, lon, lat]. */
  profile: [number, number, number, number][]
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
