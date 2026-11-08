'use client'
import 'maplibre-gl/dist/maplibre-gl.css'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import clsx from 'clsx'
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MapLibreMap,
} from 'maplibre-gl'
import type { Bounds, CoverageData } from '@/lib/coverage'
import {
  cellsFC,
  cityBoxesFC,
  cityPointsFC,
  EMPTY,
  selectionFC,
  squaresFC,
  toLngLatBounds,
} from '@/lib/coverage-geo'
import { loadStyle, type MapLayerId } from '@/lib/map/layers'
import { nearestSample, pointAtKm, type TrailRoute, type Units } from '@/lib/trail-route'
import { FullscreenButton, LayerPicker, UnitsButton, ZoomButtons } from './MapControls'

export type MapSelection = {
  id: string
  name: string
  cellIds: string[]
  bbox: Bounds | null
  /** The trail's OpenStreetMap route relation, drawn from the cells' route tiles at z10+. */
  osmRelation?: number | null
}

type Variant = 'world' | 'trail'
type Theme = 'light' | 'dark'

/** The whole inhabited world, Antarctica cut off. */
const WORLD: Bounds = [-170, -58, 180, 78]

/** Below this zoom the coverage draws as squares of 4 × 4 cells (z8 tiles); from it, as the z10 cells. */
const SQUARES_UNTIL = 6

// The overlay colors per theme: the violet is the same one the offline maps use in the app. Cities
// are pink, violet's warm neighbour: it reads on the violet cells and doesn't clash with the base
// map's orange roads or blue-green water and forest. Keep in step with --city in globals.css.
const COLORS = {
  light: { accent: '#7c3aed', ink: '#18181b', bg: '#fafafa', city: '#db2777' },
  dark: { accent: '#8b5cf6', ink: '#fafafa', bg: '#18181b', city: '#f472b6' },
}

// Strong from afar, a light tint once the map detail shows.
const CELLS_OPACITY: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  6,
  0.4,
  9,
  0.14,
  12,
  0.06,
]

const COVERAGE_LAYERS = ['squares-fill', 'squares-line', 'cells-fill', 'cells-line']
const CITY_LAYERS = ['city-boxes', 'cities-dot', 'cities-label']

/**
 * Room around a selection when the map fits to it. From the sm breakpoint a chart covers the
 * bottom of the map, so the selection fits above it.
 */
function fitPadding(hasBbox: boolean, hasOverlay: boolean) {
  if (!hasBbox) return 0
  const bottom = hasOverlay && matchMedia('(min-width: 640px)').matches ? 230 : 40
  return { top: 40, right: 40, left: 40, bottom }
}

/** How close, in pixels, the pointer must come to the route to scrub along it. */
const SCRUB_PIXELS = 24

let protocolAdded = false

/**
 * The offline map coverage on the app's own map, all from tiles.hikaya.app: the OSM world map the
 * app bundles (base, relief and national routes) to z8, then the published cells from z9, with hillshade from z10
 * and contours from z11, in the app's light and dark styles. Violet squares
 * are the offline map cells: z8 tiles of 4 × 4 cells at world zoom, the z10 cells themselves
 * from z6, so the two grids line up. Cities are
 * dots with names from z5 and outlines from z7. A selected trail or city fills its built cells,
 * dashes the ones still to build, draws the trail's route where the cells have it, and fits the
 * map to them.
 *
 * `world` is the /maps/ map: layer switches, city dots you can click. `trail` is the map on a
 * trail's page: no cities, and a two-finger gesture on touch screens so it doesn't catch the page
 * scroll. With a `route` (public/routes/<id>.json), a trail map draws that line instead of the
 * cells' route tiles, and marks `scrubKm` on it; pointing at the line reports a distance through
 * `onScrub`, so the elevation chart in `overlay` can follow.
 *
 * The base map is one of the three layers in lib/map/layers.ts, each in the site's theme.
 */
export function CoverageMap({
  data,
  selected,
  variant = 'world',
  onSelectCity,
  label,
  className,
  route = null,
  scrubKm = null,
  onScrub,
  units,
  onUnitsChange,
  overlay,
  panel = false,
  credit,
}: {
  data: CoverageData
  selected: MapSelection | null
  variant?: Variant
  onSelectCity?: (id: string) => void
  label: string
  className?: string
  route?: TrailRoute | null
  scrubKm?: number | null
  onScrub?: (km: number | null) => void
  units?: Units
  onUnitsChange?: (units: Units) => void
  /** Drawn over the bottom of the map from the sm breakpoint, under it on phones. */
  overlay?: ReactNode
  /**
   * Fills its parent from the lg breakpoint (a full-height column beside the page, as on a trail
   * page), and pads its caption, since such a map runs to the edges of the window.
   */
  panel?: boolean
  /** A note after the map credits, such as when the data was updated. */
  credit?: string
}) {
  const { resolvedTheme } = useTheme()
  const theme: Theme = resolvedTheme === 'dark' ? 'dark' : 'light'
  const hasOverlay = Boolean(overlay)
  const [layer, setLayer] = useState<MapLayerId>('terrain')
  const [fullscreen, setFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const syncRef = useRef<() => void>(() => {})
  const applied = useRef<ReturnType<typeof selectionFC> | null | undefined>(undefined)
  const [show, setShow] = useState({ coverage: true, cities: true })
  const [failed, setFailed] = useState(false)

  const base = useMemo(
    () => ({
      squares: squaresFC(Object.keys(data.cells)),
      cells: cellsFC(data),
      cities: cityPointsFC(data.cities),
      cityBoxes: cityBoxesFC(data.cities),
    }),
    [data],
  )
  const selection = useMemo(
    () => (selected ? selectionFC(selected.cellIds, data) : null),
    [selected, data],
  )

  // The latest props for the map's event handlers, which are set up once.
  const latest = useRef({
    base,
    selection,
    selected,
    show,
    theme,
    layer,
    variant,
    onSelectCity,
    route,
    scrubKm,
    onScrub,
    hasOverlay,
  })
  useEffect(() => {
    latest.current = {
      base,
      selection,
      selected,
      show,
      theme,
      layer,
      variant,
      onSelectCity,
      route,
      scrubKm,
      onScrub,
      hasOverlay,
    }
    syncRef.current()
  })
  const appliedRoute = useRef<TrailRoute | null | undefined>(undefined)

  // Tiles are only fetched for published cells.
  useEffect(() => {
    import('@/lib/map/disha-protocol').then(({ setPublishedCells }) =>
      setPublishedCells(Object.keys(data.cells)),
    )
  }, [data])

  // Create the map once. MapLibre loads here, so pages without a map don't download it.
  useEffect(() => {
    let cancelled = false
    let map: MapLibreMap | undefined
    let observer: ResizeObserver | undefined
    const container = containerRef.current

    Promise.all([
      import('maplibre-gl'),
      import('@/lib/map/disha-protocol'),
      loadStyle(latest.current.layer, latest.current.theme),
    ])
      .then(([{ default: maplibregl }, { dishaProtocol, setPublishedCells }, style]) => {
        if (cancelled || !container) return
        if (!protocolAdded) {
          maplibregl.addProtocol('disha', dishaProtocol)
          protocolAdded = true
        }
        setPublishedCells(Object.keys(data.cells))
        const { selected: first, variant: kind } = latest.current
        map = new maplibregl.Map({
          container,
          style,
          bounds: toLngLatBounds(first?.bbox ?? WORLD),
          fitBoundsOptions: {
            padding: fitPadding(Boolean(first?.bbox), latest.current.hasOverlay),
            maxZoom: 13,
          },
          minZoom: 0,
          maxZoom: 15,
          renderWorldCopies: false,
          // The map credit is one line under the map, not a control on it.
          attributionControl: false,
          cooperativeGestures: kind === 'trail',
          dragRotate: false,
          touchPitch: false,
          fadeDuration: 0,
        })
        map.touchZoomRotate.disableRotation()
        mapRef.current = map
        const m = map

        // Keep the canvas the container's size when the layout settles late.
        observer = new ResizeObserver(() => m.resize())
        observer.observe(container)

        const install = () => {
          applied.current = undefined
          appliedRoute.current = undefined
          const { base: b } = latest.current
          const colors = COLORS[latest.current.theme]
          const add = (id: string, geojson: GeoJSON.GeoJSON) =>
            m.getSource(id) || m.addSource(id, { type: 'geojson', data: geojson })
          add('squares', b.squares)
          add('cells', b.cells)
          add('sel-built', EMPTY)
          add('sel-todo', EMPTY)
          add('cities', b.cities)
          add('city-boxes', b.cityBoxes)
          add('trail-route', EMPTY)
          add('scrub-point', EMPTY)
          // The cells' route tiles, which only the Terrain style carries itself.
          if (!m.getSource('routes')) {
            m.addSource('routes', {
              type: 'vector',
              tiles: ['disha://routes/{z}/{x}/{y}'],
              minzoom: 9,
              maxzoom: 14,
            })
          }

          const layers = m.getStyle().layers
          // Overlays sit over every fill and line of the base map and under the labels drawn after
          // them. Not under the first label: the Terrain style draws world labels before the
          // published cells' own base map (from z9), which then covered the route and selection.
          const lastShape = layers.findLastIndex((l) => l.type !== 'symbol')
          const firstLabel = layers.slice(lastShape + 1).find((l) => l.type === 'symbol')?.id
          // Inside a published cell the land is the land color, as the app draws it: the world
          // overview's coastline is coarse at cell zoom.
          const land = layers.find((l) => l.id === 'ne-land-fill') as
            | { paint?: { 'fill-color'?: string } }
            | undefined
          if (land && !m.getLayer('cell-land')) {
            m.addLayer(
              {
                id: 'cell-land',
                type: 'fill',
                source: 'cells',
                minzoom: 9,
                paint: { 'fill-color': land?.paint?.['fill-color'] ?? colors.bg },
              },
              // Low in the stack, under the cells' own base map. Without the anchor layer it goes
              // first, never on top, where it would hide everything inside the cells.
              layers.find((l) => l.id === 'ne-country-fill') ? 'ne-country-fill' : layers[1]?.id,
            )
          }

          const overlays: LayerSpecification[] = [
            {
              id: 'squares-fill',
              type: 'fill',
              source: 'squares',
              maxzoom: SQUARES_UNTIL,
              paint: { 'fill-color': colors.accent, 'fill-opacity': 0.45 },
            },
            {
              id: 'squares-line',
              type: 'line',
              source: 'squares',
              maxzoom: SQUARES_UNTIL,
              paint: { 'line-color': colors.accent, 'line-width': 0.75 },
            },
            {
              id: 'cells-fill',
              type: 'fill',
              source: 'cells',
              minzoom: SQUARES_UNTIL,
              paint: {
                'fill-color': colors.accent,
                'fill-opacity': CELLS_OPACITY,
              },
            },
            {
              id: 'cells-line',
              type: 'line',
              source: 'cells',
              minzoom: SQUARES_UNTIL,
              paint: { 'line-color': colors.accent, 'line-width': 0.75 },
            },
            {
              id: 'sel-built-fill',
              type: 'fill',
              source: 'sel-built',
              paint: {
                'fill-color': colors.accent,
                'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 9, 0.14, 12, 0.06],
              },
            },
            {
              id: 'sel-built-line',
              type: 'line',
              source: 'sel-built',
              paint: { 'line-color': colors.accent, 'line-width': 1.5 },
            },
            {
              id: 'sel-todo-line',
              type: 'line',
              source: 'sel-todo',
              paint: { 'line-color': colors.accent, 'line-width': 1.5, 'line-dasharray': [2, 2] },
            },
            {
              id: 'sel-route-casing',
              type: 'line',
              source: 'routes',
              'source-layer': 'hiking_routes',
              filter: ['==', ['get', 'osm_id'], ''],
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': colors.bg, 'line-width': 7 },
            },
            {
              id: 'sel-route',
              type: 'line',
              source: 'routes',
              'source-layer': 'hiking_routes',
              filter: ['==', ['get', 'osm_id'], ''],
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': colors.ink, 'line-width': 3.5 },
            },
            {
              id: 'trail-route-casing',
              type: 'line',
              source: 'trail-route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': colors.bg, 'line-width': 7 },
            },
            {
              id: 'trail-route',
              type: 'line',
              source: 'trail-route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': colors.accent, 'line-width': 3.5 },
            },
            {
              id: 'city-boxes',
              type: 'line',
              source: 'city-boxes',
              minzoom: 7,
              paint: { 'line-color': colors.city, 'line-width': 1.25, 'line-dasharray': [3, 2] },
            },
          ]
          for (const layer of overlays) if (!m.getLayer(layer.id)) m.addLayer(layer, firstLabel)

          // City dots and names sit above the base map's labels.
          if (!m.getLayer('cities-dot')) {
            m.addLayer({
              id: 'cities-dot',
              type: 'circle',
              source: 'cities',
              paint: {
                'circle-color': colors.city,
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3, 6, 5, 10, 6],
              },
            })
            m.addLayer({
              id: 'cities-label',
              type: 'symbol',
              source: 'cities',
              minzoom: 5,
              maxzoom: 10,
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 12,
                'text-offset': [0, 1.1],
                'text-anchor': 'top',
              },
              paint: {
                'text-color': colors.ink,
                'text-halo-color': colors.bg,
                'text-halo-width': 1.5,
              },
            })
          }
          if (!m.getLayer('scrub-point')) {
            m.addLayer({
              id: 'scrub-point',
              type: 'circle',
              source: 'scrub-point',
              paint: {
                'circle-color': colors.accent,
                'circle-radius': 6,
                'circle-stroke-color': colors.bg,
                'circle-stroke-width': 2,
              },
            })
          }
          syncRef.current()
        }

        syncRef.current = () => {
          if (!m.getSource('sel-built') || !m.getLayer('cities-dot')) return
          const {
            selection: sel,
            selected: pick,
            show: on,
            variant: current,
            route: line,
            scrubKm: km,
          } = latest.current
          // Only send the selection and route to the map when they changed, not on every render.
          if (applied.current !== sel) {
            applied.current = sel
            ;(m.getSource('sel-built') as GeoJSONSource).setData(sel?.built ?? EMPTY)
            ;(m.getSource('sel-todo') as GeoJSONSource).setData(sel?.todo ?? EMPTY)
          }
          if (appliedRoute.current !== line) {
            appliedRoute.current = line
            ;(m.getSource('trail-route') as GeoJSONSource).setData(
              line ? { type: 'LineString', coordinates: line.line } : EMPTY,
            )
          }
          const at = line && km != null ? pointAtKm(line.profile, km) : null
          ;(m.getSource('scrub-point') as GeoJSONSource).setData(
            at ? { type: 'Point', coordinates: at } : EMPTY,
          )
          // With its own line, a trail doesn't also draw the cells' route tiles.
          const relation = pick?.osmRelation && !line ? String(pick.osmRelation) : ''
          for (const id of ['sel-route', 'sel-route-casing']) {
            m.setFilter(id, ['==', ['get', 'osm_id'], relation])
          }
          const visible = (yes: boolean) => (yes ? 'visible' : 'none')
          for (const id of COVERAGE_LAYERS) {
            m.setLayoutProperty(id, 'visibility', visible(on.coverage))
          }
          for (const id of CITY_LAYERS) {
            m.setLayoutProperty(id, 'visibility', visible(current === 'world' && on.cities))
          }
          // The rest of the coverage steps back once something is selected.
          m.setPaintProperty('squares-fill', 'fill-opacity', sel ? 0.2 : 0.45)
          m.setPaintProperty('cells-fill', 'fill-opacity', sel ? 0.04 : CELLS_OPACITY)
        }

        // `style.load`, not `load`: `load` waits for the first tiles, which may never finish.
        m.on('style.load', install)
        if (m.isStyleLoaded()) install()
        // A source described by a TileJSON url (OpenFreeMap's) learns its tiles after the style
        // has loaded. Redraw then, so its tiles load without waiting for the camera to move.
        m.on('sourcedata', (event) => {
          if (event.sourceDataType === 'metadata') m.triggerRepaint()
        })

        if (kind === 'world') {
          m.on('click', 'cities-dot', (event) => {
            const id = event.features?.[0]?.properties?.id
            if (id) latest.current.onSelectCity?.(id)
          })
          m.on('mouseenter', 'cities-dot', () => (m.getCanvas().style.cursor = 'pointer'))
          m.on('mouseleave', 'cities-dot', () => (m.getCanvas().style.cursor = ''))
        }
        // Pointing near the route scrubs along it; anywhere else clears the mark.
        m.on('mousemove', (event) => {
          const { route: line, onScrub: report } = latest.current
          if (!line || !report) return
          const near = nearestSample(line.profile, event.point, (lonLat) => m.project(lonLat))
          report(near && near.pixels <= SCRUB_PIXELS ? near.km : null)
        })
        m.on('mouseout', () => latest.current.onScrub?.(null))
        // A missing tile or glyph isn't worth a crash; the rest of the map still draws.
        m.on('error', (event) => console.warn('Map warning:', event.error?.message))
      })
      .catch((error: Error) => {
        // Usually no WebGL. The page around the map still reads fine.
        console.warn("The map didn't start:", error.message)
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      syncRef.current = () => {}
      observer?.disconnect()
      map?.remove()
      mapRef.current = null
    }
    // The map is made once; later data and props reach it through `latest` and syncRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A new layer or theme swaps the style. The camera stays, and `style.load` puts the overlays
  // back. The first run is the style the map was made with.
  const shown = useRef({ layer, theme })
  useEffect(() => {
    if (shown.current.layer === layer && shown.current.theme === theme) return
    shown.current = { layer, theme }
    let live = true
    loadStyle(layer, theme)
      .then((style) => live && mapRef.current?.setStyle(style, { diff: false }))
      .catch((error: Error) => console.warn("The map style didn't load:", error.message))
    return () => {
      live = false
    }
  }, [layer, theme])

  // Fullscreen takes the map and its chart. Phones that can't (iPhone Safari) get no button.
  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled))
    const update = () => setFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else frameRef.current?.requestFullscreen().catch(() => {})
  }

  // Fit to the selection, or back to the world. Instant, because nothing on this site moves.
  const fitKey = selected?.id ?? ''
  const fitted = useRef(fitKey)
  const fit = () => {
    const bbox = latest.current.selected?.bbox
    mapRef.current?.fitBounds(toLngLatBounds(bbox ?? WORLD), {
      padding: fitPadding(Boolean(bbox), latest.current.hasOverlay),
      maxZoom: 13,
      duration: 0,
    })
  }
  useEffect(() => {
    if (!mapRef.current || fitted.current === fitKey) return
    fitted.current = fitKey
    fit()
  }, [fitKey])
  // When the chart arrives after the map's first fit, fit again above it. (When it arrives
  // first, the map's first fit already leaves room.)
  useEffect(() => {
    if (hasOverlay) fit()
  }, [hasOverlay])

  return (
    <figure className={clsx(panel && 'lg:flex lg:h-full lg:flex-col')}>
      <div
        ref={frameRef}
        className={clsx(
          'relative',
          panel && 'lg:min-h-0 lg:flex-1',
          fullscreen && 'flex h-full flex-col bg-bg',
        )}
      >
        <div className={clsx('relative bg-surface', fullscreen ? 'min-h-0 flex-1' : className)}>
          {/* Sized by its parent with h-full, not absolute inset-0: maplibre-gl.css sets
            .maplibregl-map to position: relative, which beat the absolute positioning and
            left the map 0px tall. */}
          <div ref={containerRef} role="region" aria-label={label} className="h-full w-full" />
          {failed && (
            <p role="status" className="absolute inset-0 p-6 text-muted">
              The map needs WebGL, which this browser doesn&apos;t have or has turned off.
            </p>
          )}
          <div className="absolute left-2 top-2 flex flex-col gap-px">
            <LayerPicker layer={layer} onSelect={setLayer} />
            {canFullscreen && <FullscreenButton on={fullscreen} onToggle={toggleFullscreen} />}
            {units && onUnitsChange && (
              <UnitsButton
                units={units}
                onToggle={() => onUnitsChange(units === 'metric' ? 'imperial' : 'metric')}
              />
            )}
          </div>
          <div className="absolute right-2 top-2">
            <ZoomButtons
              onZoomIn={() => mapRef.current?.zoomIn({ duration: 0 })}
              onZoomOut={() => mapRef.current?.zoomOut({ duration: 0 })}
              onFit={fit}
              fitLabel={selected ? 'Fit to the selection' : 'Show the whole world'}
            />
          </div>
        </div>
        {overlay && (
          <div className="sm:pointer-events-none sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-3">
            {overlay}
          </div>
        )}
      </div>

      <figcaption className={clsx('mt-3', panel && 'px-6 sm:px-8 lg:mt-2 lg:px-4 lg:pb-2')}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-muted">
          {variant === 'world' ? (
            // The layer switches are the legend too: each carries its swatch.
            <span className="flex flex-wrap items-center gap-x-4">
              <Switch
                on={show.coverage}
                onClick={() => setShow((s) => ({ ...s, coverage: !s.coverage }))}
              >
                <span aria-hidden="true" className="size-2.5 bg-accent" />
                offline maps
              </Switch>
              <Switch
                on={show.cities}
                onClick={() => setShow((s) => ({ ...s, cities: !s.cities }))}
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-city" />
                cities
              </Switch>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 bg-accent" />
              Offline maps
            </span>
          )}
          {route ? (
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-[3px] w-4 bg-accent" />
              Route
            </span>
          ) : (
            selected?.osmRelation && (
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-[3px] w-4 bg-ink" />
                Route, from zoom 9
              </span>
            )
          )}
          {/* The OpenStreetMap and Copernicus credits are in the site footer on every page;
            only OpenFreeMap's, for that one layer, goes here. */}
          {(credit || layer === 'openfreemap') && (
            <span className="ml-auto text-xs text-faint">
              {layer === 'openfreemap' && 'Map: OpenFreeMap, © OpenMapTiles. '}
              {credit}
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  )
}

function Switch({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        'flex min-h-11 items-center gap-2 hover:text-ink',
        on ? 'text-ink' : 'text-faint line-through opacity-60',
      )}
    >
      {children}
    </button>
  )
}
