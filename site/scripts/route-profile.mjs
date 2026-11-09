/**
 * The pure geometry behind scripts/build-trail-routes.mjs, kept apart so tests can run it without
 * the network. Points are [lon, lat]; distances are kilometres.
 */

const EARTH_KM = 6371.0088
const rad = (d) => (d * Math.PI) / 180

/** Great-circle distance between two [lon, lat] points. */
export function haversineKm([lon1, lat1], [lon2, lat2]) {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** The distance along a line at each of its points, starting at 0. */
export function cumulativeKm(line) {
  const out = [0]
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + haversineKm(line[i - 1], line[i]))
  return out
}

/**
 * The line of a disha-guides corridor: a FeatureCollection of LineStrings, one per stage, in
 * order, each starting where the last ended. The stages are joined into one line.
 */
export function corridorLine(geojson) {
  const features = geojson.type === 'FeatureCollection' ? geojson.features : [{ geometry: geojson }]
  const line = []
  for (const { geometry } of features) {
    if (geometry?.type !== 'LineString') {
      throw new Error(`expected LineStrings, got ${geometry?.type ?? 'nothing'}`)
    }
    for (const [lon, lat] of geometry.coordinates) {
      const last = line[line.length - 1]
      if (!last || last[0] !== lon || last[1] !== lat) line.push([lon, lat])
    }
  }
  if (line.length < 2) throw new Error('the corridor has no line')
  return line
}

/**
 * Points every `stepKm` along a line, plus its last point, as { km, lon, lat }, interpolated
 * between the line's own points.
 */
export function resample(line, stepKm) {
  const along = cumulativeKm(line)
  const total = along[along.length - 1]
  const out = []
  let i = 1
  for (let km = 0; km < total; km += stepKm) {
    while (i < along.length - 1 && along[i] < km) i++
    const span = along[i] - along[i - 1]
    const t = span === 0 ? 0 : (km - along[i - 1]) / span
    const [lon0, lat0] = line[i - 1]
    const [lon1, lat1] = line[i]
    out.push({ km, lon: lon0 + (lon1 - lon0) * t, lat: lat0 + (lat1 - lat0) * t })
  }
  const [lon, lat] = line[line.length - 1]
  out.push({ km: total, lon, lat })
  return out
}

/** Douglas–Peucker on a local flat projection: drops points within `toleranceM` of the line. */
export function simplify(line, toleranceM) {
  if (line.length < 3) return line
  const lat0 = rad(line[0][1])
  const xy = line.map(([lon, lat]) => [
    rad(lon) * Math.cos(lat0) * EARTH_KM * 1000,
    rad(lat) * EARTH_KM * 1000,
  ])
  const keep = new Uint8Array(line.length)
  keep[0] = keep[line.length - 1] = 1
  const stack = [[0, line.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = xy[a]
    const [bx, by] = xy[b]
    const len = Math.hypot(bx - ax, by - ay)
    let worst = -1
    let far = 0
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i]
      const d =
        len === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len
      if (d > far) {
        far = d
        worst = i
      }
    }
    if (worst > 0 && far > toleranceM) {
      keep[worst] = 1
      stack.push([a, worst], [worst, b])
    }
  }
  return line.filter((_, i) => keep[i])
}

/** Metres from a Terrarium-encoded pixel. */
export const terrarium = (r, g, b) => r * 256 + g + b / 256 - 32768

/** A point's tile and its fractional pixel inside it, at zoom `z` with `size`-pixel tiles. */
export function tilePixel(lon, lat, z, size) {
  const n = 2 ** z
  const x = ((lon + 180) / 360) * n
  const s = Math.sin(rad(lat))
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n
  const tx = Math.min(n - 1, Math.floor(x))
  const ty = Math.min(n - 1, Math.floor(y))
  return { tx, ty, px: (x - tx) * size, py: (y - ty) * size }
}

/**
 * Fills short runs of missing heights (null) by straight lines between their neighbours. Returns
 * null when more than `maxShare` of the heights are missing, or a run touches either end.
 */
export function fillGaps(heights, maxShare) {
  const missing = heights.filter((h) => h == null).length
  if (missing > heights.length * maxShare) return null
  if (heights[0] == null || heights[heights.length - 1] == null) return missing ? null : heights
  const out = [...heights]
  for (let i = 1; i < out.length; i++) {
    if (out[i] != null) continue
    let j = i
    while (out[j] == null) j++
    const a = out[i - 1]
    const b = out[j]
    for (let k = i; k < j; k++) out[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1)
    i = j
  }
  return out
}
