export type Poi = { km: number; name: string }

export type NextStop = { poi: Poi; distanceKm: number }

/**
 * The first point of interest ahead of a position on the trail, and how far away it is.
 * A stop at exactly the current position counts as reached, so the next one is returned.
 * Returns null past the last stop.
 */
export function nextStop(pois: readonly Poi[], positionKm: number): NextStop | null {
  let best: Poi | null = null
  for (const poi of pois) {
    if (poi.km > positionKm && (best === null || poi.km < best.km)) best = poi
  }
  return best ? { poi: best, distanceKm: best.km - positionKm } : null
}

/** "2.4 km" below 10 km, "12 km" above. */
export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}
