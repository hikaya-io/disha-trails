'use client'
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CoverageMap, MAP_EDGE, type MapSelection } from '@/components/coverage/CoverageMap'
import { CoverageStatus } from '@/components/coverage/CoverageStatus'
import {
  DRAWER_WIDTH,
  DrawerScrim,
  DrawerTab,
  HEADER,
  MapCredits,
  useSwipeToClose,
  useWide,
} from '@/components/coverage/drawer'
import {
  CatalogTable,
  type CatalogRow,
  type StatusOption,
} from '@/components/coverage/CatalogTable'
import { StatusBadge } from '@/components/coverage/StatusBadge'
import { StatusLink } from '@/components/coverage/StatusLink'
import { useCoverageData } from '@/components/coverage/useCoverageData'
import { useTrailRoute } from '@/components/coverage/useTrailRoute'
import { cellsBounds, placeKey } from '@/lib/coverage-geo'
import {
  type City,
  type CoverageData,
  cellProgress,
  countriesOf,
  coverageStats,
  formatDay,
  mapBadge,
  mapHref,
  type MapStatus,
  type Trail,
  trailHref,
} from '@/lib/coverage'

const number = new Intl.NumberFormat('en-US')

/** The map statuses as filter values: planned, the next batch, reads as shortlisted. */
function mapKey(status: MapStatus): string {
  return status === 'planned' ? 'shortlisted' : status
}

// What the maps page lists: places with a map, or one on the way. "No map yet" is a trail page
// matter, where a trail is voted on.
const STATUSES: StatusOption[] = (['live', 'partial', 'planned'] as const).map((status) => ({
  value: mapKey(status),
  badge: mapBadge(status),
}))
const listed = (place: { status: MapStatus }) =>
  place.status !== 'wishlist' && place.status !== 'candidate'

/**
 * One trail or city as a list row: its name, where it is, its cells and its map status. The trail
 * pages carry the rest (guide, votes, length), so a row's name shows the place on the map.
 */
function placeRow(kind: 'trail' | 'city', place: Trail | City, data: CoverageData): CatalogRow {
  return {
    key: placeKey(kind, place.id),
    name: place.name,
    href: mapHref(kind, place.id),
    countries: countriesOf(place).join(', '),
    kind,
    status: mapKey(place.status),
    badge: mapBadge(place.status, kind),
    cells: cellProgress(place, data),
  }
}

/** The padding around the panel's text: the site's gutters, tighter from lg to give the list room. */
const PANEL_PAD = 'px-6 sm:px-8 lg:px-4'

/** The panel's right edge from lg, in pixels: its 12px gap from the window and its 26rem. */
const PANEL_EDGE = 12 + 26 * 16

/**
 * The maps page: a map that runs to the edges of the window, with a panel of the title and the
 * list of trails and cities. From lg the map fills the screen under the site header and the
 * panel floats over its left side in glass, as the app's sheets do, the list scrolling inside it;
 * a tab on its edge hides it for the whole map. Phones work the same way as a drawer: the map
 * fills the screen under the header, a "list" button opens the panel over it, and the tab, a tap
 * on the map beside it, a swipe to the left or choosing a place closes it again.
 *
 * The panel is the map's legend: the dots on the map are the trails and cities its search and
 * filters match, while the coverage cells always show. `?trail=<id>` or `?city=<id>` selects one:
 * the bar in the panel names it (with a link to a trail's page), and the map zooms to it and draws
 * its route file when it has one (`routes`). A row's name and a dot on the map both select.
 */
export function MapsSection({ routes, header }: { routes: string[]; header: React.ReactNode }) {
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

  const wide = useWide()
  // Open or closed as the visitor last chose; until they choose, open on a wide window and closed
  // on a phone, where the panel would cover the map.
  const [choice, setChoice] = useState<boolean | null>(null)
  const panelOpen = choice ?? wide
  const swipe = useSwipeToClose(() => setChoice(false), !wide && panelOpen)
  // Bumped by "clear", which starts the list over: a new key remounts it with its defaults.
  const [listKey, setListKey] = useState(0)
  // The keys of the rows the panel's filters match, which are the dots on the map.
  const [places, setPlaces] = useState<string[] | null>(null)
  const rows = useMemo(
    () =>
      state.status === 'ready'
        ? [
            ...state.data.trails.filter(listed).map((t) => placeRow('trail', t, state.data)),
            ...state.data.cities.filter(listed).map((c) => placeRow('city', c, state.data)),
          ]
        : [],
    [state],
  )
  const route = useTrailRoute(trailId && routes.includes(trailId) ? trailId : null)

  if (state.status !== 'ready')
    return (
      <div className={clsx(PANEL_PAD, 'pt-8 sm:pt-10 lg:pt-4')}>
        {header}
        <div className="mt-6 pb-16">
          <CoverageStatus state={state} />
        </div>
      </div>
    )
  const { data } = state
  const selectedCity = cityId ? data.cities.find((c) => c.id === cityId) : undefined
  const selection = selectedTrail
    ? {
        name: selectedTrail.name,
        badge: mapBadge(selectedTrail.status, 'trail'),
        cells: cellProgress(selectedTrail, data),
        updated: formatDay(selectedTrail.updated),
        href: trailHref(selectedTrail.id),
      }
    : selectedCity
      ? {
          name: selectedCity.name,
          badge: mapBadge(selectedCity.status, 'city'),
          cells: cellProgress(selectedCity, data),
          updated: formatDay(selectedCity.updated),
          href: null,
        }
      : null

  const stats = coverageStats(data)
  const items = [
    { label: 'trails mapped', value: stats.trailsWithMaps },
    { label: 'countries', value: stats.countries },
    { label: 'cities mapped', value: stats.cities },
  ]

  // The panel slides in and out from the left over 300ms (at once with reduced motion). Out of
  // view it is inert, so keyboard focus and screen readers skip it. From lg it floats 12px in from
  // the window and the map keeps its buttons and fitted views clear of it; on a phone it is a
  // drawer over the map, most of the screen wide.
  const insetLeft = wide && panelOpen ? PANEL_EDGE : 0
  const close = () => setChoice(false)
  const toggle = () => setChoice(!panelOpen)

  return (
    // The window's height, pulled up under the site header's glass: the map fills it all.
    <div className="relative -mt-[60px] h-dvh overflow-hidden">
      <div className="absolute inset-0">
        <CoverageMap
          data={data}
          selected={selected}
          route={route}
          label="Map of offline map coverage"
          className="h-full"
          panel
          insetLeft={insetLeft}
          insetTop={HEADER}
          places={places}
          onSelectPlace={(kind, id) => {
            router.push(`${pathname}?${kind}=${encodeURIComponent(id)}`, { scroll: false })
            if (!wide) close()
          }}
          credit={`Updated ${formatDay(data.generated) ?? data.generated}`}
        />
        {/* Top left, 12px from the panel or the window: on a phone with the panel closed, the
            button that opens it, then the coverage in numbers; clear of the map's buttons on
            the right. */}
        <div
          className="pointer-events-none absolute right-[4.75rem] z-10 flex items-start gap-3 transition-[left] duration-300 ease-out motion-reduce:transition-none"
          style={{ left: insetLeft + MAP_EDGE, top: HEADER + MAP_EDGE }}
        >
          {!panelOpen && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={false}
              aria-controls="maps-panel"
              className="glass pointer-events-auto flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 text-[13px] text-ink hover:text-ink-soft"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" strokeLinecap="round" />
              </svg>
              list
            </button>
          )}
          <dl
            aria-label="Offline map coverage"
            className="glass pointer-events-auto hidden divide-x divide-line rounded-xl sm:flex"
          >
            {items.map((item) => (
              <div key={item.label} className="flex flex-col px-3 py-1">
                <dd className="order-first font-sans text-lg leading-6 font-extrabold tracking-[-0.03em] text-ink tabular-nums">
                  {number.format(item.value)}
                </dd>
                <dt className="text-[10px] leading-3 uppercase tracking-[0.08em] whitespace-nowrap text-faint">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* On a phone, the map beside the open drawer closes it when tapped, as drawers do. */}
      {panelOpen && !wide && <DrawerScrim onClose={close} what="list" />}

      <aside
        id="maps-panel"
        aria-label="Trails and cities"
        inert={!panelOpen}
        {...swipe.handlers}
        className={clsx(
          // Rounded on its open side on a phone, where it meets the screen's edge; all round from lg.
          'glass absolute z-20 flex touch-pan-y flex-col rounded-r-2xl duration-300 ease-out motion-reduce:transition-none lg:rounded-2xl',
          // While a finger drags it, the drawer follows without easing.
          swipe.dragX === null && 'transition-transform',
          // A phone's drawer: under the header to the bottom, leaving a strip of map to tap.
          'bottom-0 left-0 w-[min(26rem,calc(100%-3.5rem))] border-l-0',
          'lg:bottom-3 lg:left-3 lg:w-[26rem] lg:border-l',
          !panelOpen && '-translate-x-[calc(100%+1rem)]',
        )}
        style={{
          top: HEADER + (wide ? MAP_EDGE : 0),
          ...(swipe.dragX !== null && { transform: `translateX(${swipe.dragX}px)` }),
        }}
      >
        <div className={clsx(PANEL_PAD, 'shrink-0 pt-4 lg:pt-3')}>
          {header}
          {/* The scorecard sits on the map from sm; on a phone the numbers are a line here. */}
          <p className="mt-1 text-[12px] text-faint sm:hidden">
            {items.map((item) => `${number.format(item.value)} ${item.label}`).join(' · ')}
          </p>
          {selection && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line px-3 py-1">
              <span className="text-xs uppercase tracking-[0.08em] text-faint">showing</span>
              <span className="font-sans text-base font-semibold text-ink">{selection.name}</span>
              <StatusBadge badge={selection.badge} long />
              <span className="text-[13px] text-muted tabular-nums">
                {selection.cells.built} / {selection.cells.total} cells built
                {selection.updated && ` · updated ${selection.updated}`}
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
                  onClick={() => {
                    // Everything back to how the page opened: no selection, the list's search,
                    // filters and sort reset, and the map back out to all the maps.
                    router.replace(pathname, { scroll: false })
                    setListKey((key) => key + 1)
                  }}
                  aria-label="Clear the selection, the search and the filters"
                  className="flex min-h-11 items-center px-1 text-[13px] text-muted underline hover:text-ink"
                >
                  clear
                </button>
              </span>
            </div>
          )}
        </div>

        <section
          aria-labelledby="places"
          // touch-pan-y: the list scrolls up and down, and a sideways move is the drawer's swipe.
          className={clsx(
            PANEL_PAD,
            'mt-3 min-h-0 flex-1 touch-pan-y overflow-y-auto pb-6 lg:pb-3',
          )}
          // On a phone, choosing a place closes the drawer, so the map's flight to it shows.
          onClick={(event) => {
            const link = (event.target as HTMLElement).closest('a')
            if (!wide && link?.getAttribute('href')?.startsWith('/maps/?')) close()
          }}
        >
          {/* The controls and list say what they are; the heading is for screen readers. */}
          <h2 id="places" className="sr-only">
            Trails and cities on the map
          </h2>
          <CatalogTable
            key={listKey}
            rows={rows}
            statuses={STATUSES}
            initialStatuses={['live', 'partial']}
            columns={['cells']}
            sorts={['name', 'status']}
            selectedKey={
              selectedTrail
                ? placeKey('trail', selectedTrail.id)
                : selectedCity
                  ? placeKey('city', selectedCity.id)
                  : null
            }
            kinds
            narrow
            label="places"
            onMatchesChange={setPlaces}
            statusHelp={<StatusLink kind="map" className="min-h-8 text-[12px]" />}
          />
          {/* The page has no site footer: the credits the map data needs close the list. */}
          <MapCredits className="mt-6" />
        </section>
      </aside>

      {/* A tab on the panel's edge, halfway down, that closes it, and from lg stays on the
          window's edge to bring it back (on a phone the "list" button does that). Outside the
          panel, which is inert while closed. On a phone it stays mounted while closed, tucked off
          the edge, so it slides out with the drawer. */}
      <DrawerTab
        tucked={!panelOpen && !wide}
        open={panelOpen}
        onToggle={toggle}
        controls="maps-panel"
        what="list"
        dragging={swipe.dragX !== null}
        left={!panelOpen ? 0 : wide ? PANEL_EDGE : `calc(${DRAWER_WIDTH} + ${swipe.dragX ?? 0}px)`}
      />
    </div>
  )
}
