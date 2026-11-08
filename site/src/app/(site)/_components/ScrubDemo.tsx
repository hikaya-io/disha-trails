'use client'
import { useId, useState } from 'react'
import { formatKm, nextStop, type Poi } from '@/lib/scrub'

// An invented 24 km day. The numbers are made up on purpose: the demo shows the interaction,
// and the caption says so. Do not replace them with real route data unless the stops are real.
const ELEVATION: ReadonlyArray<readonly [number, number]> = [
  [0, 1200],
  [2, 1450],
  [4, 1750],
  [6, 1900],
  [8, 1650],
  [10, 1500],
  [12, 2100],
  [14, 2000],
  [16, 1700],
  [18, 1500],
  [20, 1800],
  [22, 1650],
  [24, 1400],
]
const POIS: readonly Poi[] = [
  { km: 3.2, name: 'Spring' },
  { km: 7.9, name: 'Hut' },
  { km: 12.4, name: 'Pass' },
  { km: 16.8, name: 'Spring' },
  { km: 21.5, name: 'Hut' },
]
const LENGTH_KM = 24
const W = 600
const H = 180
const PAD = 20
const MIN_ELE = 1100
const MAX_ELE = 2200

const x = (km: number) => PAD + (km / LENGTH_KM) * (W - PAD * 2)
const y = (ele: number) => H - PAD - ((ele - MIN_ELE) / (MAX_ELE - MIN_ELE)) * (H - PAD * 2)

function elevationAt(km: number) {
  for (let i = 1; i < ELEVATION.length; i++) {
    const [k1, e1] = ELEVATION[i]
    const [k0, e0] = ELEVATION[i - 1]
    if (km <= k1) return e0 + ((km - k0) / (k1 - k0)) * (e1 - e0)
  }
  return ELEVATION[ELEVATION.length - 1][1]
}

const linePath = ELEVATION.map(([km, ele], i) => `${i === 0 ? 'M' : 'L'}${x(km)} ${y(ele)}`).join(
  ' ',
)
const areaPath = `${linePath} L${x(LENGTH_KM)} ${H - PAD} L${x(0)} ${H - PAD} Z`

export function ScrubDemo() {
  const id = useId()
  const [position, setPosition] = useState(5)
  const next = nextStop(POIS, position)
  const summary = next
    ? `${next.poi.name} in ${formatKm(next.distanceKm)}`
    : 'No more stops on this day'

  return (
    <div className="border border-line bg-surface p-5 sm:p-8">
      <p className="text-sm text-faint">Example day on the trail. Distances are made up.</p>
      <p className="mt-4 text-sm text-muted">Next stop</p>
      <output htmlFor={`${id}-range`} className="block text-3xl sm:text-4xl">
        {summary}
      </output>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-6 h-auto w-full"
        role="img"
        aria-label={`Elevation profile of a 24 kilometer example day with five stops. The marker is at kilometer ${position.toFixed(1)}.`}
      >
        <path d={areaPath} className="fill-line" opacity="0.5" />
        <path d={linePath} fill="none" className="stroke-faint" strokeWidth="2" />
        {POIS.map((poi) => {
          const isNext = next?.poi === poi
          return (
            <circle
              key={poi.km}
              cx={x(poi.km)}
              cy={y(elevationAt(poi.km))}
              r={isNext ? 8 : 5}
              className={isNext ? 'fill-accent stroke-bg' : 'fill-bg stroke-faint'}
              strokeWidth="2"
            />
          )
        })}
        <line
          x1={x(position)}
          x2={x(position)}
          y1={PAD / 2}
          y2={H - PAD}
          className="stroke-ink"
          strokeWidth="2"
        />
        <circle cx={x(position)} cy={y(elevationAt(position))} r="6" className="fill-ink" />
      </svg>
      <label htmlFor={`${id}-range`} className="mt-4 block text-sm">
        Drag to move along the trail
      </label>
      <input
        id={`${id}-range`}
        type="range"
        min={0}
        max={LENGTH_KM}
        step={0.1}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-valuetext={`Kilometer ${position.toFixed(1)}. ${summary}`}
        className="mt-2 block h-11 w-full accent-accent"
      />
      <p className="mt-2 text-sm text-muted">
        Stops in this example: {POIS.map((p) => `${p.name} at ${p.km} km`).join(', ')}.
      </p>
    </div>
  )
}
