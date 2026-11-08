/**
 * Geometry for the home page animation: where a stop sits on the route, and how far and how
 * steep it is between two stops. Everything runs at build time on the map data in
 * disha-col-map.ts, so the numbers on the page come from the same route and elevation profile
 * the map draws.
 */

export type Point = { x: number; y: number }

/** Vertices of a path that uses only M, L, m and l (the map's route and profile do). */
export function pathPoints(d: string): Point[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? []
  const points: Point[] = []
  let command = ''
  let current: Point = { x: 0, y: 0 }
  for (let i = 0; i < tokens.length; ) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      command = tokens[i++]
      if (!'MmLl'.includes(command)) throw new Error(`Unsupported path command "${command}"`)
      continue
    }
    const a = Number(tokens[i++])
    const b = Number(tokens[i++])
    if (Number.isNaN(b)) throw new Error('Path ends in the middle of a coordinate pair')
    const relative = command === 'm' || command === 'l'
    current = relative ? { x: current.x + a, y: current.y + b } : { x: a, y: b }
    points.push(current)
    // More pairs after a move are line-tos, drawn in the same absolute or relative mode.
    if (command === 'M') command = 'L'
    if (command === 'm') command = 'l'
  }
  return points
}

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

/** The point `share` (0 to 1) of the way along a polyline, by length. */
export function pointAtShare(points: readonly Point[], share: number): Point {
  const lengths = points.slice(1).map((p, i) => dist(points[i], p))
  const total = lengths.reduce((sum, n) => sum + n, 0)
  let target = Math.min(1, Math.max(0, share)) * total
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, target / lengths[i]) : 0
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * f,
        y: points[i].y + (points[i + 1].y - points[i].y) * f,
      }
    }
    target -= lengths[i]
  }
  return points[0]
}

export type Profile = {
  /** The profile line as a path: x runs along the stage, y is drawn upside down. */
  d: string
  width: number
  height: number
  pad: number
  /** Elevations in meters at the bottom and top of the drawn range. */
  low: number
  high: number
}

/** Elevation in meters at `share` of the way along the stage. */
function elevationAt(points: readonly Point[], profile: Profile, share: number): number {
  const x = share * profile.width
  let y = points[points.length - 1].y
  if (x <= points[0].x) y = points[0].y
  for (let i = 1; i < points.length && x > points[0].x; i++) {
    if (x <= points[i].x) {
      const span = points[i].x - points[i - 1].x
      const f = span ? (x - points[i - 1].x) / span : 0
      y = points[i - 1].y + (points[i].y - points[i - 1].y) * f
      break
    }
  }
  const drawn = profile.height - 2 * profile.pad
  return profile.low + ((profile.height - profile.pad - y) / drawn) * (profile.high - profile.low)
}

export type Segment = {
  km: number
  /** Meters climbed and descended, to the nearest 10. */
  up: number
  down: number
  minutes: number
}

/**
 * Distance, climb, descent and walking time between two shares of the stage. Time is 5 km an
 * hour plus an hour for every 600 m climbed, rounded to 10 minutes. That rule reproduces the
 * three times the tour already shows.
 */
export function segmentStats(profile: Profile, stageKm: number, from: number, to: number): Segment {
  const points = pathPoints(profile.d)
  const shares = [
    from,
    ...points.map((p) => p.x / profile.width).filter((s) => s > from && s < to),
    to,
  ]
  let up = 0
  let down = 0
  let previous = elevationAt(points, profile, shares[0])
  for (const share of shares.slice(1)) {
    const ele = elevationAt(points, profile, share)
    if (ele > previous) up += ele - previous
    else down += previous - ele
    previous = ele
  }
  const km = (to - from) * stageKm
  const round10 = (n: number) => Math.round(n / 10) * 10
  return {
    km: Math.round(km * 10) / 10,
    up: round10(up),
    down: round10(down),
    minutes: round10((km / 5 + up / 600) * 60),
  }
}

/** "~3 h 20", "~3 h" on the hour or "~40 min", in the style of the app's route pill. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `~${m} min`
  return `~${h} h${m ? ` ${m}` : ''}`
}
