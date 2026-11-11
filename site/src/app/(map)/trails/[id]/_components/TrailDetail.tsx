'use client'
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { CoverageMap, type MapSelection } from '@/components/coverage/CoverageMap'
import {
  DRAWER_WIDTH,
  DrawerScrim,
  DrawerTab,
  MapCredits,
  useSwipeToClose,
  useWide,
} from '@/components/coverage/drawer'
import dynamic from 'next/dynamic'
import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/coverage/StatusBadge'
import { StatusLink } from '@/components/coverage/StatusLink'
import { NewTabHint, newTab } from '@/components/coverage/TrailAction'
import { useCoverageData } from '@/components/coverage/useCoverageData'
import { useTrailRoute } from '@/components/coverage/useTrailRoute'
import {
  cellProgress,
  type CoverageData,
  countriesOf,
  formatLength,
  formatSize,
  guideAvailability,
  editsUrl,
  editUrl,
  guideStage,
  mapStage,
  requestHref,
  guideBadge,
  mapBadge,
  mapHref,
  osmUrl,
  takesEdits,
  trailAction,
  type Trail,
  waymarkedUrl,
} from '@/lib/coverage'
import { boundsOf, type Units } from '@/lib/trail-route'

const link = 'text-ink underline hover:text-ink-soft'
const inlineLink = 'text-muted underline hover:text-ink'

/**
 * The map panel's place from lg: right under the sticky site header (60px: its py-2 and 44px
 * links, components/layout/SiteHeader.tsx) and the rest of the screen tall.
 */
const UNDER_HEADER = 'lg:top-[60px] lg:h-[calc(100dvh-60px)]'

// Chart.js is loaded only on a trail that has a route to chart.
const ElevationChart = dynamic(
  () => import('@/components/coverage/ElevationChart').then((m) => m.ElevationChart),
  { ssr: false },
)

/**
 * A trail's page: the title, facts and sources beside a map of the route's cells.
 * The page is built with the trail as it was at build time (`initial`); once coverage.json loads,
 * the live row takes over, so status, votes and the map are current. A trail with a route file
 * (`hasRoute`, public/routes/<id>.json) draws its line on the map with an elevation chart, the
 * two linked: pointing at either marks the same spot on both.
 */
export function TrailDetail({
  initial,
  header,
  hasRoute = false,
  repo,
  nearby,
}: {
  initial: Trail
  /** The page's breadcrumbs and title, drawn at the top of the text column. */
  header: React.ReactNode
  /** Links to the nearest trails, drawn at the foot of the text column. */
  nearby?: React.ReactNode
  hasRoute?: boolean
  repo: Pick<CoverageData, 'repo' | 'requestLabel'>
}) {
  const state = useCoverageData()
  const route = useTrailRoute(hasRoute ? initial.id : null)
  const [units, setUnits] = useState<Units>('metric')
  const [scrubKm, setScrubKm] = useState<number | null>(null)
  const wide = useWide()
  // On a phone the map comes first, so the drawer starts closed; from lg the text is always shown.
  const [choice, setChoice] = useState<boolean | null>(null)
  const panelOpen = wide || (choice ?? false)
  const close = () => setChoice(false)
  const swipe = useSwipeToClose(close, !wide && panelOpen)

  const data = state.status === 'ready' ? state.data : null
  const trail = data?.trails.find((t) => t.id === initial.id) ?? initial

  // The map's view: the route's cells; for a trail with no map yet, its route once that loads,
  // and its countries until then.
  const routeBox = useMemo(() => (route ? boundsOf(route.line) : null), [route])
  const frame = trail.bbox ?? routeBox ?? trail.countryBox ?? null
  const framedOnRoute = !trail.bbox && routeBox !== null
  const selected = useMemo<MapSelection>(
    () => ({
      id: trail.id,
      name: trail.name,
      cellIds: trail.cellIds,
      bbox: frame,
      // The map fits again when the frame changes from the countries to the route.
      frameKey: framedOnRoute ? 'route' : undefined,
      osmRelation: trail.osmRelation,
    }),
    [trail, frame, framedOnRoute],
  )

  const guide = guideAvailability(trail.guide)
  const progress = data ? cellProgress(trail, data) : null
  const action = trailAction(trail, repo, guide === 'soon')
  const osm = osmUrl(trail)
  const waymarked = waymarkedUrl(trail)
  const needsMap = mapStage(trail.status) !== 'available'
  const needsGuide = guideStage(trail.guide) !== 'available' && guide !== 'soon'
  const ask = (label: string) => (
    <a href={requestHref(repo, trail)} {...newTab} className={inlineLink}>
      {label} ↗
      <NewTabHint />
    </a>
  )
  const facts: Array<[string, React.ReactNode]> = [
    ['Where', [countriesOf(trail).join(', '), trail.continent].filter(Boolean).join(' · ') || '–'],
    ['Length', formatLength(trail.lengthKm)],
    ['Download', formatSize(trail.bytes)],
    [
      'Offline map',
      <span key="map" className="flex flex-wrap items-center gap-x-3">
        <StatusBadge badge={mapBadge(trail.status, 'trail')} />
        {needsMap && ask('request')}
      </span>,
    ],
    [
      'Guide',
      <span key="guide" className="flex flex-wrap items-center gap-x-3">
        <StatusBadge badge={guideBadge(trail.guide)} />
        {needsGuide && ask('request')}
      </span>,
    ],
    [
      'Route',
      <span key="route" className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {osm ? (
          <a href={osm} {...newTab} className={inlineLink}>
            OpenStreetMap ↗
            <NewTabHint />
          </a>
        ) : (
          <span className="text-muted">not linked yet</span>
        )}
        {waymarked && (
          <a href={waymarked} {...newTab} className={inlineLink}>
            Waymarked Trails ↗
            <NewTabHint />
          </a>
        )}
        {takesEdits(trail) && (
          <a href={editUrl(repo, trail, 'route')} {...newTab} className={inlineLink}>
            suggest a change ↗
            <NewTabHint />
          </a>
        )}
      </span>,
    ],
  ]
  if (progress && progress.total > 0) {
    facts.push(['Map cells', `${progress.built} of ${progress.total} built`])
  }

  const details = (
    <>
      {(action || takesEdits(trail)) && (
        <div className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-3">
          {action && (
            <Button href={action.href} {...newTab}>
              {action.label} ↗
              <NewTabHint />
            </Button>
          )}
          {takesEdits(trail) && (
            <Button
              href={editsUrl(repo, trail)}
              {...newTab}
              variant="secondary"
              // Flush left when it wraps under the main button on phones.
              className="max-sm:px-0"
            >
              Open edits ↗
              <NewTabHint />
            </Button>
          )}
        </div>
      )}
      <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-[13px]">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-faint">{label}</dt>
            <dd className="min-h-6 text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <StatusLink kind="guide" className="mt-2" />

      <div className="mt-6 flex flex-col text-[13px]">
        {trail.bbox && (
          <Link
            href={mapHref('trail', trail.id)}
            className={`inline-flex min-h-11 items-center ${link}`}
          >
            see it on the maps page →
          </Link>
        )}
      </div>
      {nearby}
    </>
  )

  // A trail with no map area has nothing to show on a map: one column, as wide as the header.
  if (!frame) {
    return (
      <>
        <Container className="pt-8 sm:pt-10">
          {header}
          <div className="mt-8">{details}</div>
        </Container>
        <SiteFooter />
      </>
    )
  }

  // From lg, as on andrewpham.dev's trail stories: the text in the left half, lined up with the
  // header, and the map in the right half, flush to the window and the height of the screen under
  // the header, staying put while the text scrolls. On a phone the map is the page, as on /maps/:
  // it fills the screen under the header, and the text is a drawer over it, opened by the button
  // with the trail's name and closed by its tab, a tap on the map beside it or a swipe to the left.
  const map = data ? (
    <CoverageMap
      data={data}
      selected={selected}
      variant="trail"
      label={`Map of ${trail.name}`}
      className="min-h-0 flex-1"
      panel
      route={route}
      scrubKm={scrubKm}
      onScrub={setScrubKm}
      units={route ? units : undefined}
      onUnitsChange={setUnits}
      overlay={
        route && (
          <ElevationChart route={route} units={units} scrubKm={scrubKm} onScrub={setScrubKm} />
        )
      }
    />
  ) : (
    <div role="status" className="flex h-full items-center justify-center bg-surface text-muted">
      {state.status === 'error' ? "The map didn't load. Refresh to try again." : 'Loading the map…'}
    </div>
  )

  return (
    <>
      <div className="relative h-[calc(100dvh-60px)] overflow-hidden lg:flex lg:h-auto lg:overflow-visible">
        <div className="absolute inset-0 lg:static lg:order-2 lg:w-1/2 lg:shrink-0">
          <div className={`h-full lg:sticky ${UNDER_HEADER}`}>{map}</div>
          {/* A phone's way into the text: the trail's name, top left, clear of the map's buttons. */}
          {!panelOpen && (
            <button
              type="button"
              onClick={() => setChoice(true)}
              aria-expanded={false}
              aria-controls="trail-panel"
              className="glass absolute top-3 right-[4.75rem] left-3 z-10 flex min-h-11 w-fit max-w-[calc(100%-5.5rem)] cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-[13px] text-ink hover:text-ink-soft lg:hidden"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" strokeLinecap="round" />
              </svg>
              <span className="truncate font-sans font-semibold">{trail.name}</span>
              <span className="shrink-0 text-muted">details</span>
            </button>
          )}
        </div>

        {panelOpen && !wide && <DrawerScrim onClose={close} what="details" top={0} />}

        <aside
          id="trail-panel"
          aria-label={`${trail.name}: details`}
          inert={!panelOpen && !wide}
          {...swipe.handlers}
          className={clsx(
            // A phone's drawer, rounded on its open side, its text scrolling inside it.
            'absolute top-0 bottom-0 left-0 z-20 w-[min(26rem,calc(100%-3.5rem))] touch-pan-y overflow-y-auto rounded-r-2xl border-l-0 px-6 pt-4 pb-8 duration-300 ease-out motion-reduce:transition-none max-lg:glass sm:px-8',
            swipe.dragX === null && 'transition-transform',
            !panelOpen && 'max-lg:-translate-x-[calc(100%+1rem)]',
            // From lg, the left half of the page, scrolling with it.
            'lg:static lg:order-1 lg:w-1/2 lg:overflow-visible lg:rounded-none lg:pt-10 lg:pr-12 lg:pb-16 lg:pl-[max(2rem,calc((100vw-64rem)/2+2rem))]',
          )}
          style={swipe.dragX !== null ? { transform: `translateX(${swipe.dragX}px)` } : undefined}
        >
          {header}
          <div className="mt-8">{details}</div>
          {/* The page has no site footer: the credits the map data needs close the text. */}
          <MapCredits className="mt-10 lg:hidden" />
        </aside>

        {/* Mounted while closed too, tucked off the edge, so it slides out with the drawer. */}
        <DrawerTab
          tucked={!panelOpen}
          open={panelOpen}
          onToggle={close}
          controls="trail-panel"
          what="details"
          dragging={swipe.dragX !== null}
          left={`calc(${DRAWER_WIDTH} + ${swipe.dragX ?? 0}px)`}
          top="50%"
          className="lg:hidden"
        />
      </div>
      {/* The map is the whole screen on a phone, so the footer is for wider windows. */}
      <div className="max-lg:hidden">
        <SiteFooter />
      </div>
    </>
  )
}
