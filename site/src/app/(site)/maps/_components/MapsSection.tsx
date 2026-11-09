'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CoverageMap, type MapSelection } from '@/components/coverage/CoverageMap'
import { CoverageStatus } from '@/components/coverage/CoverageStatus'
import {
  CatalogTable,
  type CatalogRow,
  type StatusOption,
} from '@/components/coverage/CatalogTable'
import { StatusBadge } from '@/components/coverage/StatusBadge'
import { StatusLink } from '@/components/coverage/StatusLink'
import { TrailAction } from '@/components/coverage/TrailAction'
import { useCoverageData } from '@/components/coverage/useCoverageData'
import { useTrailRoute } from '@/components/coverage/useTrailRoute'
import { cellsBounds } from '@/lib/coverage-geo'
import {
  type City,
  type CoverageData,
  cellProgress,
  countriesOf,
  coverageStats,
  guideBadge,
  guideStage,
  mapBadge,
  mapHref,
  type MapStatus,
  mapStage,
  type Trail,
  trailHref,
} from '@/lib/coverage'

const number = new Intl.NumberFormat('en-US')

/** The map statuses as filter values: planned and candidate both read as shortlisted. */
function mapKey(status: MapStatus): string {
  return status === 'planned' || status === 'candidate' ? 'shortlisted' : status
}

const STATUSES: StatusOption[] = (['live', 'partial', 'candidate', 'wishlist'] as const).map(
  (status) => ({ value: mapKey(status), badge: mapBadge(status) }),
)

function trailRow(trail: Trail, data: CoverageData): CatalogRow {
  const available = mapStage(trail.status) === 'available'
  return {
    key: `trail-${trail.id}`,
    name: trail.name,
    href: trailHref(trail.id),
    mapHref: mapHref('trail', trail.id),
    countries: countriesOf(trail).join(', '),
    kind: 'trail',
    status: mapKey(trail.status),
    badge: mapBadge(trail.status),
    // The guide's tag only where there is one, so the map list shows which places have both.
    extraBadge: guideStage(trail.guide) ? guideBadge(trail.guide) : undefined,
    cells: cellProgress(trail, data),
    action: available ? undefined : (
      <TrailAction
        trail={trail}
        data={data}
        shortlisted={mapStage(trail.status) === 'shortlisted'}
      />
    ),
  }
}

function cityRow(city: City, data: CoverageData): CatalogRow {
  const cells = cellProgress(city, data)
  return {
    key: `city-${city.id}`,
    name: city.name,
    // A city has no page of its own, so its name selects it on the map too.
    href: mapHref('city', city.id),
    mapHref: mapHref('city', city.id),
    countries: countriesOf(city).join(', '),
    kind: 'city',
    status: mapKey(city.status),
    badge: mapBadge(city.status),
    cells,
  }
}

/**
 * The stats, the map and the table under it. `?trail=<id>` or `?city=<id>` selects that trail or
 * city: the bar above the map names it, and the map zooms to it and draws its route file when it
 * has one (`routes`). A row's map button sets the selection and scrolls up to the map; a trail's
 * name opens its page. Choosing a city dot on the map sets `?city=`.
 */
export function MapsSection({ routes }: { routes: string[] }) {
  const state = useCoverageData()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const trailId = params.get('trail')
  const cityId = params.get('city')

  const selectedTrail =
    state.status === 'ready' && trailId
      ? state.data.trails.find((t) => t.id === trailId)
      : undefined
  const selected = useMemo<MapSelection | null>(() => {
    if (state.status !== 'ready') return null
    if (selectedTrail) return { ...selectedTrail, osmRelation: selectedTrail.osmRelation }
    const city = cityId ? state.data.cities.find((c) => c.id === cityId) : undefined
    // Zoom to the city's cells, the area its outline shows, not its raw 40 km box.
    return city
      ? {
          id: city.id,
          name: city.name,
          cellIds: city.cellIds,
          bbox: cellsBounds(city.cellIds) ?? city.bbox,
        }
      : null
  }, [state, selectedTrail, cityId])

  const route = useTrailRoute(trailId && routes.includes(trailId) ? trailId : null)

  if (state.status !== 'ready') return <CoverageStatus state={state} />
  const { data } = state
  const selectedCity = cityId ? data.cities.find((c) => c.id === cityId) : undefined
  const selection = selectedTrail
    ? {
        name: selectedTrail.name,
        badge: mapBadge(selectedTrail.status),
        cells: cellProgress(selectedTrail, data),
        href: trailHref(selectedTrail.id),
      }
    : selectedCity
      ? {
          name: selectedCity.name,
          badge: mapBadge(selectedCity.status),
          cells: cellProgress(selectedCity, data),
          href: null,
        }
      : null

  const stats = coverageStats(data)
  const items = [
    { label: 'Trails with offline maps', value: stats.trailsWithMaps },
    { label: 'Countries on those trails', value: stats.countries },
    { label: 'Cities with offline maps', value: stats.cities },
  ]

  return (
    <>
      <dl className="grid grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <dd className="order-first font-sans text-4xl font-extrabold tracking-[-0.04em] text-ink tabular-nums sm:text-6xl">
              {number.format(item.value)}
            </dd>
            <dt className="mt-1 text-xs uppercase tracking-[0.08em] text-faint">{item.label}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-10">
        {selection && (
          <div className="mb-2 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 border border-line px-3 py-1">
            <span className="text-xs uppercase tracking-[0.08em] text-faint">showing</span>
            <span className="font-sans text-base font-semibold text-ink">{selection.name}</span>
            <StatusBadge badge={selection.badge} long />
            <span className="text-[13px] text-muted tabular-nums">
              {selection.cells.built} / {selection.cells.total} cells built
            </span>
            <span className="ml-auto flex items-center gap-x-4">
              {selection.href && (
                <Link
                  href={selection.href}
                  className="inline-flex min-h-11 items-center text-[13px] text-ink underline hover:text-ink-soft"
                >
                  trail page →
                </Link>
              )}
              <button
                type="button"
                onClick={() => router.replace(pathname, { scroll: false })}
                aria-label="Clear the selection"
                className="flex min-h-11 items-center px-1 text-[13px] text-muted underline hover:text-ink"
              >
                clear
              </button>
            </span>
          </div>
        )}
        <CoverageMap
          data={data}
          selected={selected}
          route={route}
          label="Map of offline map coverage"
          className="h-[70vh] min-h-[26rem]"
          onSelectCity={(id) =>
            router.push(`${pathname}?city=${encodeURIComponent(id)}`, { scroll: false })
          }
          credit={`Updated ${data.generated}.`}
        />
      </div>

      <section aria-labelledby="places" className="mt-16">
        <h2
          id="places"
          className="text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink"
        >
          Trails and cities
        </h2>
        <StatusLink href="/docs/offline-maps/coverage/#map-status" className="mt-2" />
        <div className="mt-6">
          <CatalogTable
            rows={[
              ...data.trails.map((t) => trailRow(t, data)),
              ...data.cities.map((c) => cityRow(c, data)),
            ]}
            statuses={STATUSES}
            initialStatuses={['live', 'partial']}
            columns={['map', 'cells', 'action']}
            sorts={['status', 'name', 'country', 'cells']}
            selectedKey={
              selectedTrail
                ? `trail-${selectedTrail.id}`
                : selectedCity
                  ? `city-${selectedCity.id}`
                  : null
            }
            kinds
            label="places"
          />
        </div>
      </section>
    </>
  )
}
