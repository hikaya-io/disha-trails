import clsx from 'clsx'

import { colMap as map } from './disha-col-map'
import styles from './DishaTour.module.css'
import { DishaTourPlayer } from './DishaTourPlayer'
import {
  STEP,
  VIOLET,
  INK,
  MUTED,
  GREEN,
  AMBER,
  AMBER_DRY,
  GRAY,
  Timing,
  timing,
  text,
  places,
  profile,
  tiles,
  ranges,
  fmt,
  Range,
  STAT_COLS,
  Scene,
  Route,
  Marker,
  Letter,
  Ends,
  OnRoute,
  hiker,
  Stats,
  GlassSurface,
  GlassPill,
  Chip,
  check,
  Confirmations,
  Card,
} from './scene-parts'

/*
 * The Disha tour on the home page: three slides that follow one hiker's journey on a real
 * map, the TMB stage from Notre-Dame de la Gorge over the Col du Bonhomme to Les
 * Chapieux. Each slide starts where the last one left off: the stage downloads, the
 * hiker walks it with the guide, then plans the climb. This file is a server
 * component, so the map ships as markup and only the small player is JavaScript. Map
 * data comes from scripts/build-disha-col-map.py. The map's shared SVG defs (MapDefs) are
 * rendered once by the home page, which the hero animation uses too. The water report, the confirmations
 * and the seasons are made up for the illustration.
 *
 * Each slide runs four steps of STEP seconds; times below are seconds from the start
 * of the slide. The map stays light in both themes, like the app's basemap.
 */

/* 1. Offline-first maps: download the stage, then walk it in airplane mode */

function OfflineScene() {
  return (
    <Scene title="A map of the Col du Bonhomme stage whose tiles along the trail download, then a hiker walks it offline with the stage's distance, climb, and time">
      <use href="#disha-col" />
      <path d={tiles.outside} fill="url(#disha-hatch)" fillRule="evenodd" />
      {tiles.route.map((t, i) => (
        <rect
          key={`${t.x}-${t.y}`}
          x={t.x}
          y={t.y}
          width={t.w}
          height={t.h}
          fill="url(#disha-hatch)"
          className={styles.clear}
          style={timing({ d: 1.2 + (i * 1.8) / tiles.route.length })}
        />
      ))}
      <path
        d={[
          ...tiles.xs.map((x) => `M${x} 0V${map.height}`),
          ...tiles.ys.map((y) => `M0 ${y}H${map.width}`),
        ].join('')}
        stroke="#ffffff"
        strokeOpacity="0.7"
        strokeWidth="0.7"
      />
      <Route draw={{ d: 3, dur: 1 }} />
      <g className={styles.show} style={timing({ d: 3.6 })}>
        <Marker at={places.spring} kind="water" />
        <Marker at={places.hut} kind="hut" />
      </g>
      <Ends show={{ d: 3.8 }} />

      {/* Download card, bottom left; fades once the bar fills */}
      <g transform="translate(14 424)">
        <g className={styles.flash} style={timing({ d: 0.6, o: 3.8 })}>
          <GlassSurface w={150} h={62} r={12} fill={0.82} />
          <text x="13" y="22" style={text.label}>
            Download this stage
          </text>
          <text x="13" y="37" style={text.small}>{`${tiles.route.length} tiles · 31 MB`}</text>
          <rect x="13" y="46" width="124" height="8" rx="4" fill={VIOLET} fillOpacity="0.15" />
          <rect
            x="13"
            y="46"
            width="124"
            height="8"
            rx="4"
            fill={VIOLET}
            className={styles.grow}
            style={timing({ d: 1, dur: 1.8 })}
          />
        </g>
      </g>

      {/* Saved chip: drops down into the download card's spot as that card fades, and
          stays for the rest of the slide, since this USP is about offline maps. */}
      <Chip
        x={14}
        y={450}
        width={150}
        label="Saved for offline"
        color={GREEN}
        icon={check}
        className={styles.dropIn}
        style={timing({ d: 3.5 })}
      />

      {/* Walking it: the app's route pill at the top left, then the hiker */}
      <GlassPill
        range={ranges.stage}
        x={12}
        y={14}
        className={styles.show}
        style={timing({ d: STEP + 0.4 })}
      />
      <OnRoute from={0} to={0.5} d={STEP + 0.7} dur={3}>
        {hiker}
      </OnRoute>
    </Scene>
  )
}

/* 2. Open guides: walk the stage and see what hikers reported at each stop */

const YEARS = ['2024', '2025', '2026']
const DRY = [7, 8] // August and September

function GuidesScene() {
  const s = places.spring
  const h = places.hut
  return (
    <Scene title="The same route with A and B markers. A hiker walks past a spring that hikers report dry every August and September, then reaches the Refuge de la Croix du Bonhomme, where hikers confirm tent sites and hot meals">
      <use href="#disha-col" />
      <Route />
      <Marker at={s} kind="water" />
      <Marker at={h} kind="hut" />
      <Ends />

      {/* The hiker reaches the spring, then the refuge */}
      <OnRoute from={0} to={s.t} d={0.4} dur={1.8} o={STEP + 0.1}>
        {hiker}
      </OnRoute>
      <OnRoute from={s.t} to={h.t} d={STEP + 0.1} dur={2}>
        {hiker}
      </OnRoute>

      {/* The spring: what hikers reported, and how it changes with the seasons */}
      <Card
        x={10}
        y={s.y - 24}
        width={142}
        height={92}
        pointer="right"
        className={styles.show}
        style={timing({ d: 2.2 })}
      >
        <text x="10" y="18" style={text.label}>
          Spring · water source
        </text>
        <text x="10" y="31" style={{ fontSize: 9.5, fontWeight: 600, fill: AMBER }}>
          Dry Aug–Sep, 3 of 3 years
        </text>
        {YEARS.map((year, row) => (
          <g key={year}>
            <text x="10" y={50 + row * 12} style={{ fontSize: 8, fill: MUTED }}>
              {year}
            </text>
            {Array.from({ length: 12 }, (_, month) => (
              <rect
                key={month}
                x={32 + month * 8.6}
                y={43 + row * 12}
                width="7"
                height="8.5"
                rx="1.8"
                fill={DRY.includes(month) ? AMBER_DRY : '#e0f2fe'}
                className={styles.show}
                style={timing({ d: 2.5 + row * 0.3 })}
              />
            ))}
          </g>
        ))}
        <text x="10" y="84" style={{ fontSize: 8.5, fill: MUTED }}>
          Last report 2 days ago
        </text>
      </Card>

      {/* The refuge: what's there tonight, confirmed by hikers */}
      <Card
        x={h.x + 18}
        y={h.y - 24}
        width={172}
        height={84}
        pointer="left"
        className={styles.show}
        style={timing({ d: STEP + 2.2 })}
      >
        <text x="10" y="18" style={text.label}>
          Refuge Croix du Bonhomme
        </text>
        {/* Tent and bowl icons */}
        <path
          d="M9.5 37.5h11L15 28.5z"
          fill="none"
          stroke="#a16207"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M15 37.5l-2-4h4z" fill="#a16207" />
        <path
          d="M10 46.5h10a5 4 0 0 1-10 0zM13 44c0-1.2 1-1.4 1-2.6M16.5 44c0-1.2 1-1.4 1-2.6"
          fill="none"
          stroke="#a16207"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="26" y="37" style={{ ...text.small, fill: INK }}>
          Tent sites
        </text>
        <text x="26" y="52" style={{ ...text.small, fill: INK }}>
          Hot meals and resupply
        </text>
        <Confirmations x={14} y={68} d={STEP + 2.5} />
      </Card>
    </Scene>
  )
}

/* 3. Plan ahead: the elevation sheet, then move A and B to plan the climb */

const CHART = { x: 38, y: 388, w: profile.width, h: profile.height }
const chartX = (t: number) => t * CHART.w

// The A-to-B climb, zoomed to fill the card after the handles settle. Scale and
// shift computed from the segment bounds, so the climb centers with a little padding.
const CLIMB_BOUNDS = (() => {
  const a = places.balme
  const b = places.hut
  const pad = 70
  const w = Math.abs(b.x - a.x) + pad * 2
  const h = Math.abs(b.y - a.y) + pad * 2
  const scale = Math.min(map.width / w, map.height / h, 3)
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  // Translate so the segment center lands at the card center, then scale about it
  const tx = map.width / 2 - cx * scale
  const ty = map.height / 2 - cy * scale
  return {
    transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale.toFixed(2)})`,
  }
})()

function PlanScene() {
  const hutX = chartX(places.hut.t)
  const balmeX = chartX(places.balme.t)
  const moveB = { d: 1.6, dur: 1.8 }
  const moveA = { d: STEP + 0.4, dur: 1.8 }
  const zoom = { d: moveA.d + moveA.dur + 0.4, dur: 1.3 }
  const kmTicks = [0, 5, 10, 15]
  const km = ranges.stage.km

  return (
    <Scene
      title={`The route with its elevation profile. B moves back to the Refuge de la Croix du Bonhomme and A up to the Refuge de la Balme, selecting the climb: ${ranges.climb.km} km and ${fmt(ranges.climb.up)} m up, then the map zooms into that segment`}
    >
      <clipPath id="disha-plan-clip">
        <rect x="0.5" y="0.5" width={map.width - 1} height={map.height - 1} rx="8" />
      </clipPath>
      {/* The map pulls back to fit the route above the sheet, then zooms into the climb */}
      <g clipPath="url(#disha-plan-clip)">
        <g
          className={styles.zoom}
          style={timing({ d: zoom.d, dur: zoom.dur }, { '--zoom': CLIMB_BOUNDS.transform })}
        >
          <use href="#disha-col" />
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
          {/* The selected A to B section stays violet; one animation covers both moves */}
          <path
            d={map.route}
            fill="none"
            stroke={VIOLET}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className={styles.selection}
            style={timing(
              { d: moveB.d, dur: moveA.d + moveA.dur - moveB.d },
              {
                '--to-b': `${places.hut.t}`,
                '--a-b': `${places.hut.t - places.balme.t}`,
                '--off-a': `${-places.balme.t}`,
              },
            )}
          />
          <OnRoute from={0} to={places.balme.t} d={moveA.d} dur={moveA.dur} always>
            <Letter letter="A" />
          </OnRoute>
          <OnRoute from={1} to={places.hut.t} d={moveB.d} dur={moveB.dur} always>
            <Letter letter="B" />
          </OnRoute>
        </g>

        {/* The elevation sheet. Outer group does the original slide-up entrance; inner
            group slides it back down as the map zooms, so the two never fight over transform. */}
        <g className={styles.rise} style={timing({ d: 0.7 })}>
          <g
            className={styles.sheetDown}
            style={timing({ d: zoom.d - 0.2, dur: zoom.dur + 0.2 }, { '--down': '150px' })}
          >
            <g transform="translate(0 336)">
              <GlassSurface w={map.width} h={174} r={16} fill={0.82} />
            </g>
            <rect x="185" y="343" width="30" height="3.5" rx="1.75" fill="#d4d4d8" />
            {(
              [
                [ranges.stage, { d: 0, o: moveB.d + 0.6 }],
                [ranges.toRefuge, { d: moveB.d + 0.8, o: moveA.d + 0.6 }],
                [ranges.climb, { d: moveA.d + 0.8 }],
              ] as Array<[Range, Timing]>
            ).map(([range, t], i) => (
              <g
                key={i}
                className={t.o === undefined ? styles.show : styles.flash}
                style={timing(t)}
              >
                <Stats range={range} x={18} y={368} size={11} cols={STAT_COLS} />
              </g>
            ))}

            <g transform={`translate(${CHART.x} ${CHART.y})`}>
              {/* Grid and labels */}
              <line x1="0" y1={CHART.h} x2={CHART.w} y2={CHART.h} stroke="#e4e4e7" />
              <line x1="0" y1={CHART.h / 2} x2={CHART.w} y2={CHART.h / 2} stroke="#f4f4f5" />
              {kmTicks.map((k) => (
                <text
                  key={k}
                  x={(k / km) * CHART.w}
                  y={CHART.h + 21}
                  textAnchor="middle"
                  style={{ fontSize: 8, fill: MUTED }}
                >
                  {k === 0 ? '0' : `${k} km`}
                </text>
              ))}
              <text
                x={CHART.w + 4}
                y="8"
                style={{ fontSize: 8, fill: MUTED }}
              >{`${fmt(profile.high)} m`}</text>
              <text
                x={CHART.w + 4}
                y={CHART.h}
                style={{ fontSize: 8, fill: MUTED }}
              >{`${fmt(profile.low)} m`}</text>

              {/* The real profile over the col */}
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

              {/* Outside the selection fades as the handles move in */}
              <rect
                x="0"
                y="0"
                width={balmeX}
                height={CHART.h}
                fill="#ffffff"
                fillOpacity="0.72"
                className={styles.grow}
                style={timing(moveA)}
              />
              <rect
                x={hutX}
                y="0"
                width={CHART.w - hutX}
                height={CHART.h}
                fill="#ffffff"
                fillOpacity="0.72"
                className={styles.growRight}
                style={timing(moveB)}
              />

              {/* A and B handles, moving with the markers on the map */}
              {(
                [
                  ['A', 0, balmeX, moveA, CHART.h],
                  ['B', CHART.w, hutX, moveB, 0],
                ] as const
              ).map(([letter, from, to, t, y]) => (
                <g
                  key={letter}
                  className={styles.slideX}
                  style={timing(t, {
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

        {/* Once zoomed, the route pill slides in from the top left with the climb
            stats. Sits above the map and sheet, riding neither animation. */}
        <GlassPill
          range={ranges.climb}
          x={12}
          y={14}
          className={styles.pillIn}
          style={timing({ d: zoom.d + zoom.dur - 0.6 })}
        />
      </g>
    </Scene>
  )
}

/* The slides */

const { stage, toRefuge, climb } = ranges

const slides = [
  {
    tab: 'Offline maps',
    title: 'Offline-first maps',
    point:
      'Maps download in small packages along each trail, so you store only what the trip needs.',
    steps: [
      'Once downloaded, the stage works like a paper map with the contours, paths, water, and huts you need to find your way.',
      `With no signal, the map shows where you are and what’s left: ${stage.km} km, ${fmt(stage.up)} m up, about ${stage.eta.slice(1)}.`,
      'Everything the stage needs is on your phone before you leave.',
    ],
    Scene: OfflineScene,
  },
  {
    tab: 'Open guides',
    title: 'Open guides',
    point:
      'The guides are built on open data and run by the community because trail information shouldn’t sit behind a paywall.',
    steps: [
      'At a spring, the guide shows what hikers last reported and the months it usually runs dry.',
      'At a refuge, hikers confirm what’s there, like tent sites and hot meals.',
      'Guides start from OpenStreetMap then hikers and moderators keep them current.',
    ],
    Scene: GuidesScene,
  },
  {
    tab: 'Plan ahead',
    title: 'Plan ahead, then navigate',
    point: 'Plan a route at home and follow it on the trail with no signal.',
    steps: [
      `Drag B to where you’ll stop. The distance, climb, and time update as you drag: ${toRefuge.km} km, about ${toRefuge.eta.slice(1)} to the refuge.`,
      `Drag A to the foot of the climb to see that section alone: ${climb.km} km and ${fmt(climb.up)} m up.`,
      'The plan saves with the map so it’s there when you go offline.',
    ],
    Scene: PlanScene,
  },
]

export function DishaTour() {
  return (
    <>
      <DishaTourPlayer labels={slides.map((s) => s.tab)}>
        {slides.map(({ title, point, steps, Scene }, index) => (
          <li
            key={title}
            id={`disha-slide-${index}`}
            data-slide=""
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}: ${title}`}
            className="grid w-full flex-none snap-start grid-cols-1 items-start gap-x-12 gap-y-8 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]"
          >
            <Scene />
            <div className="max-w-xl">
              <h3 className="text-base text-ink">{title}</h3>
              <p className="mt-2 text-base text-muted">{point}</p>
              <ol className="mt-6 space-y-1">
                {steps.map((step, k) => (
                  <li
                    key={step}
                    className={clsx(styles.stepItem, 'py-1.5 pl-4 text-base')}
                    style={timing({ d: k * STEP + (k === 0 ? 0.3 : 0), o: (k + 1) * STEP })}
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </li>
        ))}
      </DishaTourPlayer>
    </>
  )
}
