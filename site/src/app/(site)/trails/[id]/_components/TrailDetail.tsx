'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { CoverageMap, type MapSelection } from '@/components/coverage/CoverageMap'
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
import type { Units } from '@/lib/trail-route'

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
}: {
  initial: Trail
  /** The page's breadcrumbs and title, drawn at the top of the text column. */
  header: React.ReactNode
  hasRoute?: boolean
  repo: Pick<CoverageData, 'repo' | 'requestLabel'>
}) {
  const state = useCoverageData()
  const route = useTrailRoute(hasRoute ? initial.id : null)
  const [units, setUnits] = useState<Units>('metric')
  const [scrubKm, setScrubKm] = useState<number | null>(null)

  const data = state.status === 'ready' ? state.data : null
  const trail = data?.trails.find((t) => t.id === initial.id) ?? initial

  const selected = useMemo<MapSelection>(
    () => ({
      id: trail.id,
      name: trail.name,
      cellIds: trail.cellIds,
      bbox: trail.bbox,
      osmRelation: trail.osmRelation,
    }),
    [trail],
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
        <StatusBadge badge={mapBadge(trail.status)} />
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
      <StatusLink href="/docs/guides/trails/#guide-status" className="mt-2" />

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
    </>
  )

  // A trail with no map area has nothing to show on a map: one column, as wide as the header.
  if (!trail.bbox) {
    return (
      <Container className="pt-8 sm:pt-10">
        {header}
        <div className="mt-8">{details}</div>
      </Container>
    )
  }

  // From lg, as on andrewpham.dev's trail stories: the text in the left half, lined up with the
  // header, and the map in the right half, flush to the window and the height of the screen under
  // the header, staying put while the text scrolls. On phones the map runs edge to edge under the
  // text.
  return (
    <div className="lg:flex">
      <div className="mx-auto w-full max-w-5xl px-6 pt-8 sm:px-8 sm:pt-10 lg:mx-0 lg:w-1/2 lg:max-w-none lg:pb-16 lg:pl-[max(2rem,calc((100vw-64rem)/2+2rem))] lg:pr-12">
        {header}
        <div className="mt-8">{details}</div>
      </div>
      <div className="mt-10 lg:mt-0 lg:w-1/2 lg:shrink-0">
        <div className={`lg:sticky ${UNDER_HEADER}`}>
          {data ? (
            <CoverageMap
              data={data}
              selected={selected}
              variant="trail"
              label={`Map of ${trail.name}`}
              className="h-[60vh] min-h-[22rem] lg:h-full lg:min-h-0"
              panel
              route={route}
              scrubKm={scrubKm}
              onScrub={setScrubKm}
              units={route ? units : undefined}
              onUnitsChange={setUnits}
              overlay={
                route && (
                  <ElevationChart
                    route={route}
                    units={units}
                    scrubKm={scrubKm}
                    onScrub={setScrubKm}
                  />
                )
              }
            />
          ) : (
            <div
              role="status"
              className="flex h-[60vh] min-h-[22rem] items-center justify-center bg-surface text-muted lg:h-full"
            >
              {state.status === 'error'
                ? "The map didn't load. Refresh to try again."
                : 'Loading the map…'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
