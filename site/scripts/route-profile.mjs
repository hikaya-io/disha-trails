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
 * A Google encoded polyline at precision 6, as disha-guides writes a package's `centreline.line`,
 * decoded to [lon, lat] points.
 */
export function decodePolyline6(text) {
  const line = []
  let index = 0
  let lat = 0
  let lon = 0
  const next = () => {
    let result = 0
    let shift = 0
    let byte
    do {
      byte = text.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }
  while (index < text.length) {
    lat += next()
    lon += next()
    line.push([lon / 1e6, lat / 1e6])
  }
  return line
}

/**
 * Points every `stepKm` along a line, plus its last point, as { km, lon, lat }, interpolated
 * between the line's own points. With `heights` (one per point of the line), each also gets `ele`.
 *
 * @param {[number, number][]} line
 * @param {number} stepKm
 * @param {number[] | null} [heights]
 * @returns {{ km: number, lon: number, lat: number, ele?: number }[]}
 */
export function resample(line, stepKm, heights = null) {
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
    const point = { km, lon: lon0 + (lon1 - lon0) * t, lat: lat0 + (lat1 - lat0) * t }
    if (heights) point.ele = heights[i - 1] + (heights[i] - heights[i - 1]) * t
    out.push(point)
  }
  const [lon, lat] = line[line.length - 1]
  out.push({ km: total, lon, lat, ...(heights && { ele: heights[heights.length - 1] }) })
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
