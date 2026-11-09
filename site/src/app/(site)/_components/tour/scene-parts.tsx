import clsx from 'clsx'

import { publicPath } from '@/lib/site'
import { colMap as map } from './disha-col-map'
import styles from './DishaTour.module.css'

/*
 * The pieces the home page scenes are built from: the shared map and its markers, the
 * liquid-glass cards and pills, and the timing helper that sets each element's CSS delay.
 * The tour (DishaTour.tsx) and the hero (HeroTrail.tsx) both draw with these, so the two read
 * as one product. All server components; the animation lives in DishaTour.module.css.
 */

export const STEP = 3.8
export const VIOLET = '#7f22fe'
export const INK = '#18181b'
export const MUTED = '#52525b'
export const LABEL = '#7a6a4f'
export const GREEN = '#047857'
export const GREEN_BG = '#d1fae5'
export const AMBER = '#b45309'
export const AMBER_DRY = '#f59e0b'
export const GRAY = '#52525b' // zinc-600, the app's color for route outside the selection

export type Timing = { d?: number; o?: number; dur?: number }

export function timing({ d, o, dur }: Timing, extra?: Record<string, string>) {
  return {
    ...(d !== undefined && { '--d': `${d}s` }),
    ...(o !== undefined && { '--o': `${o}s` }),
    ...(dur !== undefined && { '--dur': `${dur}s` }),
    ...extra,
  } as React.CSSProperties
}

export const text = {
  label: { fontSize: 10.5, fontWeight: 600, fill: INK },
  small: { fontSize: 9.5, fill: MUTED },
  place: { fontSize: 9.5, fontWeight: 500, fill: LABEL },
}

export const { places, profile, tiles, ranges } = map
export const fmt = (n: number) => n.toLocaleString('en-US')
export const pct = (t: number) => `${(t * 100).toFixed(2)}%`
export type Range = { km: number; up: number; down: number; eta: string }

// Even columns for the stats row (km, up, down, eta). STAT_ROW_W is the row's full
// width, so a pill can pad equally on both sides.
export const STAT_COLS: [number, number, number, number] = [0, 62, 124, 186]
export const STAT_ROW_W = 222

/* Shared map, drawn once and reused by every slide */

export function MapDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <pattern
          id="disha-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="#ffffff" fillOpacity="0.6" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#d4d4d8" strokeWidth="2" />
        </pattern>
        {/* Soft drop shadow for the liquid-glass pill */}
        <filter id="disha-glass-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2e1065" floodOpacity="0.28" />
        </filter>
        {/* A group rather than a symbol, so the wider edges show when the map pulls back */}
        <g id="disha-col">
          <rect x={map.baseX} width={map.baseWidth} height={map.height} fill="#e6ecdd" />
          {/* Terrain, woods, contours, water and paths: one cached file for all slides */}
          <image
            href={publicPath(map.base)}
            x={map.baseX}
            width={map.baseWidth}
            height={map.height}
          />
          <g style={text.place}>
            <text x={places.start.x + 12} y={places.start.y + 4}>
              Notre-Dame de la Gorge
            </text>
            {/* Peak glyph before the col's name and elevation */}
            <path d={`M${places.col.x - 11} ${places.col.y + 2.5}l3-5.5 3 5.5z`} fill={LABEL} />
            <text x={places.col.x - 15} y={places.col.y + 3} textAnchor="end">
              Col du Bonhomme 2,329 m
            </text>
            <text x={places.end.x - 12} y={places.end.y + 15} textAnchor="end">
              Les Chapieux
            </text>
            {map.lakeLabel && (
              <text x={map.lakeLabel.x + 8} y={map.lakeLabel.y + 3}>
                Lac Jovet
              </text>
            )}
          </g>
        </g>
      </defs>
    </svg>
  )
}

export function Scene({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${map.width} ${map.height}`}
      role="img"
      aria-label={title}
      className="block h-auto w-full border border-line font-sans"
    >
      {children}
    </svg>
  )
}

export function Route({ draw }: { draw?: Timing }) {
  return (
    <g className={clsx(draw && styles.draw)} style={draw && timing(draw)}>
      <path
        d={map.route}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
      />
      <path
        d={map.route}
        fill="none"
        stroke={VIOLET}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
      />
    </g>
  )
}

export function Marker({
  at,
  kind,
}: {
  at: { x: number; y: number }
  kind: 'water' | 'hut' | 'camp'
}) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <circle r="8.5" fill="#ffffff" stroke="#d4d4d8" />
      {kind === 'water' ? (
        <path d="M0-5c2.6 3.4 4 5.6 4 7.2a4 4 0 0 1-8 0c0-1.6 1.4-3.8 4-7.2z" fill="#0284c7" />
      ) : kind === 'camp' ? (
        <g transform="translate(-6 -5.5) scale(0.6)">
          <Tent />
        </g>
      ) : (
        <path d="M-5 0 0-4.5 5 0v4.5h-10z" fill="#a16207" />
      )}
    </g>
  )
}

/** A tent, 20 by 16 units, in the same brown as the hut. */
export function Tent() {
  return (
    <>
      <path
        d="M1.5 15h17L10 2z"
        fill="#a16207"
        stroke="#a16207"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 15l-3-6h6z" fill="#ffffff" />
    </>
  )
}

export function Letter({ letter, scale = 1 }: { letter: 'A' | 'B'; scale?: number }) {
  return (
    <g transform={scale === 1 ? undefined : `scale(${scale})`}>
      <circle r="8" fill="#ffffff" stroke={VIOLET} strokeWidth="2" />
      <text y="3.5" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: VIOLET }}>
        {letter}
      </text>
    </g>
  )
}

/** The start and end markers, fixed at the ends of the stage */
export function Ends({ show }: { show?: Timing }) {
  return (
    <g className={clsx(show && styles.show)} style={show && timing(show)}>
      <g transform={`translate(${places.start.x} ${places.start.y})`}>
        <Letter letter="A" />
      </g>
      <g transform={`translate(${places.end.x} ${places.end.y})`}>
        <Letter letter="B" />
      </g>
    </g>
  )
}

/** Something that moves along the route between two shares of its length */
export function OnRoute({
  from,
  to,
  d,
  dur,
  o,
  always = false,
  children,
}: {
  from: number
  to: number
  d: number
  dur: number
  o?: number
  /** Shown from the start instead of fading in when it starts to move */
  always?: boolean
  children: React.ReactNode
}) {
  return (
    <g
      className={always ? undefined : o === undefined ? styles.show : styles.flash}
      style={timing({ d, o })}
    >
      <g
        className={styles.walk}
        style={timing(
          { d, dur },
          { offsetPath: `path('${map.route}')`, '--from': pct(from), '--to': pct(to) },
        )}
      >
        {children}
      </g>
    </g>
  )
}

export const hiker = (
  <>
    <circle r="10" fill={VIOLET} fillOpacity="0.2" />
    <circle r="5.5" fill={VIOLET} stroke="#ffffff" strokeWidth="2" />
  </>
)

/** Distance, climb, descent and time in evenly spaced columns, as the app's route
    pill and sheet show them. `cols` are the left x of each column; the last is the
    right edge the caller sizes to. */
export function Stats({
  range,
  x,
  y,
  size = 10.5,
  cols,
}: {
  range: Range
  x: number
  y: number
  size?: number
  cols: [number, number, number, number]
}) {
  return (
    <g transform={`translate(${x} ${y})`} style={{ fontSize: size, fontWeight: 600, fill: INK }}>
      <text x={cols[0]}>{`${range.km} km`}</text>
      <text x={cols[1]}>{`↑ ${fmt(range.up)} m`}</text>
      <text x={cols[2]}>{`↓ ${fmt(range.down)} m`}</text>
      <text x={cols[3]} style={{ fontWeight: 500, fill: MUTED }}>
        {range.eta}
      </text>
    </g>
  )
}

/** The shared liquid-glass surface: a frosted rect with a soft shadow, a
    hairline edge and a top shine. `fill` trades legibility (higher) for glassiness
    (lower); 0.8 for text-heavy cards, 0.72 for the thin pill. An optional `pointer`
    adds the small tail on the water and hut cards. */
export function GlassSurface({
  w,
  h,
  r = 12,
  fill = 0.8,
  pointer,
  extra,
}: {
  w: number
  h: number
  r?: number
  fill?: number
  pointer?: 'left' | 'right'
  extra?: React.ReactNode
}) {
  return (
    <g filter="url(#disha-glass-shadow)">
      <rect width={w} height={h} rx={r} fill="#ffffff" fillOpacity={fill} />
      {pointer && (
        <path
          d={pointer === 'right' ? `M${w} 18l8 6-8 6z` : 'M0 18l-8 6 8 6z'}
          fill="#ffffff"
          fillOpacity={fill}
        />
      )}
      {/* hairline edge and a top shine */}
      <rect
        x="0.75"
        y="0.75"
        width={w - 1.5}
        height={h - 1.5}
        rx={Math.max(0, r - 0.75)}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="1.5"
      />
      <rect
        x="4"
        y="3"
        width={w - 8}
        height={Math.min(16, (h - 6) / 2)}
        rx="7"
        fill="#ffffff"
        fillOpacity="0.38"
      />
      {extra}
    </g>
  )
}

/** The app's route pill: white liquid glass, a violet dot and the stats in one row,
    with equal padding. Used on both Offline maps and Plan ahead. */
export function GlassPill({
  range,
  x,
  y,
  className,
  style,
}: {
  range: Range
  x: number
  y: number
  className?: string
  style?: React.CSSProperties
}) {
  const pad = 16
  const dot = 8 // dot plus its gap before the stats
  const w = pad + dot + STAT_ROW_W + pad
  const h = 32
  return (
    <g transform={`translate(${x} ${y})`} className={className} style={style}>
      <GlassSurface w={w} h={h} r={h / 2} fill={0.72} />
      <circle cx={pad + 2} cy={h / 2} r="4" fill={VIOLET} />
      <Stats range={range} x={pad + dot + 4} y={h / 2 + 3.5} size={10} cols={STAT_COLS} />
    </g>
  )
}

export function Chip({
  x,
  y,
  width,
  label,
  color = INK,
  icon,
  className,
  style,
}: {
  x: number
  y: number
  width: number
  label: string
  color?: string
  icon?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className} style={style}>
        <GlassSurface w={width} h={26} r={13} fill={0.82} />
        {icon}
        <text x={icon ? 27 : 13} y="17" style={{ ...text.label, fill: color }}>
          {label}
        </text>
      </g>
    </g>
  )
}

export const check = (
  <>
    <circle cx="14" cy="12" r="6.5" fill={GREEN_BG} />
    <path
      d="M11.2 12.2l2 2 3.6-3.8"
      fill="none"
      stroke={GREEN}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
)

/** Hiker avatars that pop in one by one, then a confirmed label */
export function Confirmations({
  x,
  y,
  d,
  count = 4,
  label = `Confirmed by ${count} hikers`,
}: {
  x: number
  y: number
  d: number
  count?: number
  label?: string
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }, (_, k) => (
        <circle
          key={k}
          cx={k * 10}
          cy="0"
          r="5.5"
          fill={['#c4b5fd', '#a7f3d0', '#fde68a', '#bae6fd'][k % 4]}
          stroke="#ffffff"
          strokeWidth="1.5"
          className={styles.show}
          style={timing({ d: d + k * 0.3 })}
        />
      ))}
      <text
        x={count * 10 + 4}
        y="3.5"
        className={styles.show}
        style={{
          ...timing({ d: d + count * 0.3 + 0.2 }),
          fontSize: 9,
          fontWeight: 600,
          fill: GREEN,
        }}
      >
        {label}
      </text>
    </g>
  )
}

/** A white card on the map with a small pointer toward its stop */
export function Card({
  x,
  y,
  width,
  height,
  pointer,
  className,
  style,
  children,
}: {
  x: number
  y: number
  width: number
  height: number
  pointer: 'left' | 'right'
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className} style={style}>
        <GlassSurface w={width} h={height} r={10} fill={0.82} pointer={pointer} />
        {children}
      </g>
    </g>
  )
}
