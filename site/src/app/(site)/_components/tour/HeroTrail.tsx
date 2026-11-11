import clsx from 'clsx'
import { preload } from 'react-dom'

import { publicPath } from '@/lib/site'
import { formatDuration, pathPoints, pointAtShare, segmentStats } from '@/lib/trail-geometry'
import { colMap as map } from './disha-col-map'
import styles from './DishaTour.module.css'
import { HeroControls } from './HeroControls'
import {
  Card,
  Confirmations,
  GlassSurface,
  GRAY,
  INK,
  Letter,
  Marker,
  MUTED,
  OnRoute,
  places,
  profile,
  Route,
  Scene,
  Stats,
  STAT_COLS,
  Tent,
  timing,
  VIOLET,
  hiker,
  GREEN,
  fmt,
} from './scene-parts'

/*
 * The hero animation on the home page: one hiker on the same Tour du Mont Blanc stage as the
 * tour below. They walk to a spring and its card opens, walk on to a campsite with room for
 * three tents, then the app measures the way between the two: distance, climb, descent and
 * time. It is all server-rendered SVG moved by CSS animations, so the only JavaScript is the
 * small pause and replay button (HeroControls). With reduced motion, or before the CSS
 * runs, every element sits in its final state, which is the plan between the two stops.
 *
 * Times are seconds from the page load. The water report and the tent space are sample data, as
 * the caption says; the distance, climb and time come from the map's own route and elevation
 * profile.
 */

const ID = 'hero-trail'

const T = {
  route: { d: 0.2, dur: 1.2 },
  markers: 0.9,
  leg1: { d: 1.3, dur: 1.8 }, // start to the spring, arriving at 3.1
  springCard: 3.3,
  leg2: { d: 6.3, dur: 2.3 }, // spring to the campsite, arriving at 8.6
  campCard: 8.8,
  zoom: { d: 11.9, dur: 1.0 }, // the map moves up to make room for the sheet
  sheet: 12.3,
  move: { d: 13.3, dur: 1.4 }, // A and B slide from the ends to the two stops
}
const SPRING_OUT = T.leg2.d
const CAMP_OUT = T.zoom.d - 0.3
const END = T.move.d + T.move.dur + 0.2

const spring = places.spring
const campShare = 0.8
const camp = { t: campShare, ...pointAtShare(pathPoints(map.route), campShare) }

const leg = segmentStats(profile, map.stats.km, spring.t, camp.t)
const legRange = { km: leg.km, up: leg.up, down: leg.down, eta: formatDuration(leg.minutes) }

/** Moves the map up and slightly closer, so both stops sit in the part the sheet leaves free. */
const FIT = (() => {
  const frame = { w: map.width, h: 330 }
  const pad = 28
  const minX = Math.min(spring.x, camp.x)
  const maxX = Math.max(spring.x, camp.x)
  const minY = Math.min(spring.y, camp.y)
  const maxY = Math.max(spring.y, camp.y)
  const scale = Math.min(frame.w / (maxX - minX + pad * 2), frame.h / (maxY - minY + pad * 2), 1.6)
  // A little right of center, so the Col du Bonhomme label on the left stays in view
  const tx = frame.w / 2 + 24 - ((minX + maxX) / 2) * scale
  const ty = frame.h / 2 - ((minY + maxY) / 2) * scale
  return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`
})()

const CHART = { x: 38, y: 392, w: profile.width, h: profile.height }
const springX = spring.t * CHART.w
const campX = camp.t * CHART.w
const KM_TICKS = [0, 5, 10, 15]

const title = { fontSize: 11.5, fontWeight: 600, fill: INK }
const body = { fontSize: 9.5, fill: MUTED }

export function HeroTrail() {
  // The base map is most of what the hero shows. Start fetching it with the HTML.
  preload(publicPath(map.base), { as: 'image', fetchPriority: 'high' })

  return (
    <div className="mx-auto w-full max-w-sm lg:mx-0">
      <div id={ID} className={clsx(styles.root, styles.run)}>
        <Scene
          title={`Animated example on the Tour du Mont Blanc. A hiker reaches a spring with flowing water, then a campsite with space for 3 tents. The app then shows the way between the two: ${legRange.km} kilometers, ${fmt(legRange.up)} meters up, ${fmt(legRange.down)} meters down, ${legRange.eta.slice(1)}.`}
        >
          <clipPath id="hero-clip">
            <rect x="0.5" y="0.5" width={map.width - 1} height={map.height - 1} rx="8" />
          </clipPath>
          <g clipPath="url(#hero-clip)">
            {/* The map. It moves up near the end to make room for the sheet. */}
            <g className={styles.zoom} style={timing(T.zoom, { '--zoom': FIT })}>
              <use href="#disha-col" />

              {/* At rest: the route in gray with the section between the stops in violet */}
              <g className={styles.show} style={timing({ d: T.move.d - 0.6 })}>
                <path
                  d={map.route}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.85"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={map.route}
                  fill="none"
                  stroke={GRAY}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={map.route}
                  fill="none"
                  stroke={VIOLET}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  className={styles.selectBoth}
                  style={timing(T.move, {
                    '--a-b': `${camp.t - spring.t}`,
                    '--off-a': `${-spring.t}`,
                  })}
                />
              </g>

              {/* While the hiker walks: the whole route in violet, drawn in */}
              <g className={styles.flash} style={timing({ d: T.route.d, o: T.move.d - 0.2 })}>
                <Route draw={T.route} />
              </g>

              <g className={styles.flash} style={timing({ d: T.markers, o: T.move.d })}>
                <Marker at={spring} kind="water" />
                <Marker at={camp} kind="camp" />
              </g>

              {/* The plan: A and B slide in from the ends of the stage to the two stops */}
              <OnRoute from={0} to={spring.t} d={T.move.d} dur={T.move.dur}>
                <Letter letter="A" />
              </OnRoute>
              <OnRoute from={1} to={camp.t} d={T.move.d} dur={T.move.dur}>
                <Letter letter="B" />
              </OnRoute>
            </g>

            {/* The hiker, in two legs: start to the spring, then on to the campsite */}
            <OnRoute from={0} to={spring.t} d={T.leg1.d} dur={T.leg1.dur} o={SPRING_OUT}>
              {hiker}
            </OnRoute>
            <OnRoute from={spring.t} to={camp.t} d={T.leg2.d} dur={T.leg2.dur} o={CAMP_OUT}>
              {hiker}
            </OnRoute>

            {/* The spring: what hikers last reported */}
            <Card
              x={10}
              y={spring.y - 24}
              width={142}
              height={82}
              pointer="right"
              className={styles.flash}
              style={timing({ d: T.springCard, o: SPRING_OUT })}
            >
              <text x="10" y="19" style={title}>
                Spring
              </text>
              <text x="10" y="34" style={{ fontSize: 10, fontWeight: 600, fill: GREEN }}>
                Water flowing
              </text>
              <text x="10" y="47" style={body}>
                Last report 2 days ago
              </text>
              <Confirmations x={15} y={65} d={T.springCard + 0.5} count={3} label="3 confirmed" />
            </Card>

            {/* The campsite: room for three tents */}
            <Card
              x={camp.x + 18}
              y={camp.y - 24}
              width={142}
              height={90}
              pointer="left"
              className={styles.flash}
              style={timing({ d: T.campCard, o: CAMP_OUT })}
            >
              <text x="10" y="19" style={title}>
                Campsite
              </text>
              {[0, 1, 2].map((k) => (
                <g key={k} transform={`translate(${10 + k * 28} 27)`}>
                  <g className={styles.pop} style={timing({ d: T.campCard + 0.5 + k * 0.3 })}>
                    <Tent />
                  </g>
                </g>
              ))}
              <text x="10" y="64" style={{ fontSize: 10, fontWeight: 600, fill: INK }}>
                Space for 3 tents
              </text>
              <text x="10" y="78" style={body}>
                Last report yesterday
              </text>
            </Card>

            {/* The sheet: distance, climb, descent and time between the two stops */}
            <g className={styles.rise} style={timing({ d: T.sheet })}>
              <g transform="translate(0 336)">
                <GlassSurface w={map.width} h={174} r={16} fill={0.95} />
              </g>
              <rect x="185" y="343" width="30" height="3.5" rx="1.75" fill="#d4d4d8" />
              <text x="18" y="364" style={title}>
                Spring to campsite
              </text>
              <Stats range={legRange} x={18} y={381} size={11} cols={STAT_COLS} />

              <g transform={`translate(${CHART.x} ${CHART.y})`}>
                <line x1="0" y1={CHART.h} x2={CHART.w} y2={CHART.h} stroke="#e4e4e7" />
                <line x1="0" y1={CHART.h / 2} x2={CHART.w} y2={CHART.h / 2} stroke="#f4f4f5" />
                {KM_TICKS.map((k) => (
                  <text
                    key={k}
                    x={(k / map.stats.km) * CHART.w}
                    y={CHART.h + 17}
                    textAnchor="middle"
                    style={{ fontSize: 8, fill: MUTED }}
                  >
                    {k === 0 ? '0' : `${k} km`}
                  </text>
                ))}
                <text x={CHART.w + 4} y="8" style={{ fontSize: 8, fill: MUTED }}>
                  {`${fmt(profile.high)} m`}
                </text>
                <text x={CHART.w + 4} y={CHART.h} style={{ fontSize: 8, fill: MUTED }}>
                  {`${fmt(profile.low)} m`}
                </text>

                <path
                  d={`${profile.d}L${CHART.w} ${CHART.h}L0 ${CHART.h}z`}
                  fill={VIOLET}
                  fillOpacity="0.14"
                />
                <path
                  d={profile.d}
                  fill="none"
                  stroke={VIOLET}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Outside the two stops fades as the handles move in */}
                <rect
                  x="0"
                  y="0"
                  width={springX}
                  height={CHART.h}
                  fill="#ffffff"
                  fillOpacity="0.72"
                  className={styles.grow}
                  style={timing(T.move)}
                />
                <rect
                  x={campX}
                  y="0"
                  width={CHART.w - campX}
                  height={CHART.h}
                  fill="#ffffff"
                  fillOpacity="0.72"
                  className={styles.growRight}
                  style={timing(T.move)}
                />

                {(
                  [
                    ['A', 0, springX, CHART.h],
                    ['B', CHART.w, campX, 0],
                  ] as const
                ).map(([letter, from, to, y]) => (
                  <g
                    key={letter}
                    className={styles.slideX}
                    style={timing(T.move, {
                      '--fx': `${from}px`,
                      '--dx': `${to}px`,
                      transform: `translateX(${to}px)`,
                    })}
                  >
                    <line x1="0" y1="0" x2="0" y2={CHART.h} stroke={VIOLET} strokeWidth="1.5" />
                    <g transform={`translate(0 ${y})`}>
                      <Letter letter={letter} />
                    </g>
                  </g>
                ))}
              </g>
            </g>
          </g>
        </Scene>
        {/* An invisible element that finishes with the animation, so the button can tell */}
        <span
          aria-hidden="true"
          data-hero-end=""
          className={clsx('sr-only', styles.endMark)}
          style={timing({ d: END })}
        />
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <p className="text-xs text-faint">Tour du Mont Blanc · spring to campsite</p>
        <HeroControls target={ID} />
      </div>
    </div>
  )
}
