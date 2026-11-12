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
import { type Bounds, type CoverageData, cellProgress, formatDay, mapBadge } from '@/lib/coverage'
import {
  cellsFC,
  cityBoxesFC,
  coverageBounds,
  EMPTY,
  placePointsFC,
  selectionFC,
  squaresFC,
  toLngLatBounds,
} from '@/lib/coverage-geo'
import { loadStyle, type MapLayerId } from '@/lib/map/layers'
import { nearestSample, pointAtKm, type TrailRoute, type Units } from '@/lib/trail-route'
import {
  FullscreenButton,
  LayerPicker,
  MapButtonGroup,
  UnitsButton,
  ZoomButtons,
} from './MapControls'
import { StatusBadge } from './StatusBadge'

export type MapSelection = {
  id: string
  name: string
  cellIds: string[]
  bbox: Bounds | null
  /** The trail's OpenStreetMap route relation, drawn from the cells' route tiles at z10+. */
  osmRelation?: number | null
  /** Changes when the view should be fitted again for the same selection, such as a route arriving. */
  frameKey?: string
}

type Variant = 'world' | 'trail'
type Theme = 'light' | 'dark'

/** The Terrain style's world map sources, whose layers stop at z9. */
const WORLD_SOURCES = new Set(['world', 'relief', 'world-routes'])

/**
 * How far in a fit may zoom: z13 normally, z6 for a trail with no published cell, where the world
 * map (z7 tiles, drawn to z9) is all there is and gets coarse beyond that.
 */
function fitZoom(selected: MapSelection | null, published: Record<string, unknown>): number {
  return selected && !selected.cellIds.some((id) => id in published) ? 6 : 13
}

/** The whole inhabited world, Antarctica cut off: the view when there are no maps yet. */
const WORLD: Bounds = [-170, -58, 180, 78]

/** Below this zoom the coverage draws as squares of 4 × 4 cells (z8 tiles); from it, as the z10 cells. */
const SQUARES_UNTIL = 6

// The overlay colors per theme: the violet is the same one the offline maps use in the app.
// Cities are pink, violet's warm neighbour; trails teal, across the wheel from the pink and clear
// of the violet cells, the base map's orange roads and the green status tags. A place whose map is
// complete is a solid dot; a shortlisted one, with nothing built, a gray ring (`none`, the faint
// gray of its tag); a partial one a ring of its color around a light fill (pink-200,
// teal-200), or a deep one in dark mode (pink-900, teal-900), where a light fill would glow and
// read as a brighter dot instead of a ring. Keep in step with --city, --trail and their -fill
// tokens in globals.css.
const COLORS = {
  light: {
    accent: '#7c3aed',
    ink: '#18181b',
    bg: '#fafafa',
    city: '#db2777',
    cityFill: '#fbcfe8',
    trail: '#0d9488',
    trailFill: '#99f6e4',
    none: '#71717a',
  },
  dark: {
    accent: '#8b5cf6',
    ink: '#fafafa',
    bg: '#18181b',
    city: '#f472b6',
    cityFill: '#831843',
    trail: '#2dd4bf',
    trailFill: '#134e4a',
    none: '#a1a1aa',
  },
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

const PLACE_LAYERS = ['city-boxes', 'places-dot', 'places-label']

/**
 * Room around a selection, or around all the maps, when the map fits to it: clear of the buttons
 * and legend on the map's edges. From the sm breakpoint a chart covers the bottom of the map, so
 * the selection fits above it.
 */
function fitPadding(hasBbox: boolean, hasOverlay: boolean, inset = { left: 0, top: 0 }) {
  if (!hasBbox) return { top: inset.top, right: 0, bottom: 0, left: inset.left }
  const bottom = hasOverlay && matchMedia('(min-width: 640px)').matches ? 230 : 48
  return { top: 64 + inset.top, right: 56, left: 56 + inset.left, bottom }
}

/**
 * Pixels between the map's edges (or what covers them, `insetLeft` and `insetTop`) and the
 * buttons and legend on it: the same 12px the maps page's panel keeps from the window.
 */
export const MAP_EDGE = 12
const EDGE = MAP_EDGE

/** How close, in pixels, the pointer must come to the route to scrub along it. */
const SCRUB_PIXELS = 24

let protocolAdded = false

/**
 * The offline map coverage on the app's own map, all from tiles.hikaya.app: the OSM world map the
 * app bundles (base, relief and national routes) to z8, then the published cells from z9, with hillshade from z10
 * and contours from z11, in the app's light and dark styles. Violet squares
 * are the offline map cells: z8 tiles of 4 × 4 cells at world zoom, the z10 cells themselves
 * from z6, so the two grids line up. Trails and cities are the same
 * dots, with names from z5; cities have outlines from z7. A selected trail or city fills its built cells,
 * dashes the ones still to build, draws the trail's route where the cells have it, and fits the
 * map to them.
 *
 * `world` is the /maps/ map: the coverage always on, and the dots of the trails and cities in
 * `places` (every one when it's null), which you can click. `trail` is the map on a trail's
 * page: no dots, and a two-finger gesture on touch screens so it doesn't catch the page
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
  places = null,
  onSelectPlace,
  label,
  className,
  route = null,
  scrubKm = null,
  onScrub,
  units,
  onUnitsChange,
  overlay,
  panel = false,
  insetLeft = 0,
  insetTop = 0,
  credit,
}: {
  data: CoverageData
  selected: MapSelection | null
  variant?: Variant
  /** Keys ("trail-<id>", "city-<id>") of the dots to show on a world map; null shows them all. */
  places?: string[] | null
  onSelectPlace?: (kind: 'trail' | 'city', id: string) => void
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
   * Fills its parent at every width (a trail page's map: the whole screen on a phone, a column
   * beside the text from lg), and pads its caption, since such a map runs to the edges of the window.
   */
  panel?: boolean
  /**
   * Pixels of the map's left side covered by something floating over it, such as the maps page's
   * panel: the buttons and legend move right of it, and fitted views leave it clear.
   */
  insetLeft?: number
  /** Pixels of the map's top covered by something over it, such as the site header. */
  insetTop?: number
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
  const [failed, setFailed] = useState(false)
  // The dot under the pointer, for its card: where it is on the map and which place it is.
  const [hover, setHover] = useState<PlaceHover | null>(null)

  const base = useMemo(
    () => ({
      squares: squaresFC(Object.keys(data.cells)),
      cells: cellsFC(data),
      places: placePointsFC(data.trails, data.cities),
      cityBoxes: cityBoxesFC(data.cities),
      home: coverageBounds(data),
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
    places,
    theme,
    layer,
    variant,
    onSelectPlace,
    route,
    scrubKm,
    onScrub,
    hasOverlay,
    insetLeft,
    insetTop,
  })
  useEffect(() => {
    latest.current = {
      base,
      selection,
      selected,
      places,
      theme,
      layer,
      variant,
      onSelectPlace,
      route,
      scrubKm,
      onScrub,
      hasOverlay,
      insetLeft,
      insetTop,
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
          bounds: toLngLatBounds(first?.bbox ?? latest.current.base.home ?? WORLD),
          fitBoundsOptions: {
            padding: fitPadding(
              Boolean(first?.bbox ?? latest.current.base.home),
              latest.current.hasOverlay,
              { left: latest.current.insetLeft, top: latest.current.insetTop },
            ),
            maxZoom: fitZoom(first, data.cells),
          },
          minZoom: 0,
          maxZoom: 15,
          // The world map wraps sideways like a globe, so it pans freely past the date line and
          // every region can be brought out from under the panel. A trail map stays one world.
          renderWorldCopies: kind === 'world',
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
          add('places', b.places)
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
          // A trail with no published cell has nothing from z9 on, where the style hands over to
          // the cells. Keep the world map (enlarged past its z7 tiles) under its empty cells.
          const sel = latest.current.selected
          if (kind === 'trail' && sel && !sel.cellIds.some((id) => id in data.cells)) {
            for (const layer of layers) {
              if ('source' in layer && WORLD_SOURCES.has(layer.source as string)) {
                m.setLayerZoomRange(layer.id, layer.minzoom ?? 0, 24)
              }
            }
          }
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

          // Trail and city dots and names sit above the base map's labels.
          if (!m.getLayer('places-dot')) {
            m.addLayer({
              id: 'places-dot',
              type: 'circle',
              source: 'places',
              paint: {
                'circle-color': [
                  'match',
                  ['get', 'built'],
                  'full',
                  ['match', ['get', 'kind'], 'city', colors.city, colors.trail],
                  'partial',
                  ['match', ['get', 'kind'], 'city', colors.cityFill, colors.trailFill],
                  colors.bg,
                ],
                // A partial map's ring takes 2px, so its fill is that much smaller to match a
                // solid dot. Zoom has to lead the expression, so the shape is matched at each stop.
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  1,
                  ['match', ['get', 'built'], 'full', 3, 2.5],
                  6,
                  ['match', ['get', 'built'], 'full', 5, 4],
                  10,
                  ['match', ['get', 'built'], 'full', 6, 5],
                ],
                // Shortlisted (nothing built) rings are gray, as their gray tag.
                'circle-stroke-color': [
                  'match',
                  ['get', 'built'],
                  'none',
                  colors.none,
                  ['match', ['get', 'kind'], 'city', colors.city, colors.trail],
                ],
                'circle-stroke-width': ['match', ['get', 'built'], 'full', 0, 2],
              },
            })
            m.addLayer({
              id: 'places-label',
              type: 'symbol',
              source: 'places',
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
          if (!m.getSource('sel-built') || !m.getLayer('places-dot')) return
          const {
            selection: sel,
            selected: pick,
            places: keys,
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
          const filter: ExpressionSpecification | null = keys
            ? ['in', ['get', 'key'], ['literal', keys]]
            : null
          for (const id of PLACE_LAYERS) {
            m.setLayoutProperty(id, 'visibility', visible(current === 'world'))
            m.setFilter(id, filter)
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
          m.on('click', 'places-dot', (event) => {
            const { kind: placeKind, id } = event.features?.[0]?.properties ?? {}
            if (id) latest.current.onSelectPlace?.(placeKind, id)
          })
          m.on('mouseenter', 'places-dot', () => (m.getCanvas().style.cursor = 'pointer'))
          m.on('mouseleave', 'places-dot', () => {
            m.getCanvas().style.cursor = ''
            setHover(null)
          })
          // A card names the dot under the pointer; it goes when the pointer or the map moves.
          m.on('mousemove', 'places-dot', (event) => {
            const { kind: placeKind, id } = event.features?.[0]?.properties ?? {}
            if (!id) return
            // Flip the card to the dot's left when it would run off the map's right edge.
            const flip = event.point.x > m.getCanvas().clientWidth - 260
            setHover({ x: event.point.x, y: event.point.y, flip, kind: placeKind, id })
          })
          m.on('movestart', () => setHover(null))
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

  // Fit to the selection, or back to all the maps: at once by default, over `duration` ms, or as
  // a flight (`fly`) that pulls out, travels and comes back in, so a new place reads as a move
  // from the last one. Moves are skipped for visitors who ask for less motion.
  const fitKey = `${selected?.id ?? ''}${selected?.frameKey ?? ''}`
  const fitted = useRef(fitKey)
  const fit = ({ duration = 0, fly = false }: { duration?: number; fly?: boolean } = {}) => {
    const map = mapRef.current
    if (!map) return
    const bbox = latest.current.selected?.bbox ?? latest.current.base.home
    const bounds = toLngLatBounds(bbox ?? WORLD)
    const options = {
      padding: fitPadding(Boolean(bbox), latest.current.hasOverlay, {
        left: latest.current.insetLeft,
        top: latest.current.insetTop,
      }),
      maxZoom: fitZoom(latest.current.selected, data.cells),
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const camera = fly && !reduced ? map.cameraForBounds(bounds, options) : undefined
    if (camera) map.flyTo({ ...camera, speed: 1.6, curve: 1.42, maxDuration: 1500 })
    else map.fitBounds(bounds, { ...options, duration: reduced ? 0 : duration })
  }
  // The effects below run on their own triggers only (a new selection, the chart, the panel), so
  // they call the latest `fit` through a ref instead of re-running whenever it changes. Set first:
  // effects run in order.
  const fitRef = useRef(fit)
  useEffect(() => {
    fitRef.current = fit
  })
  useEffect(() => {
    if (!mapRef.current || fitted.current === fitKey) return
    fitted.current = fitKey
    fitRef.current({ fly: true })
  }, [fitKey])
  // When the chart arrives after the map's first fit, fit again above it. (When it arrives
  // first, the map's first fit already leaves room.)
  useEffect(() => {
    if (hasOverlay) fitRef.current()
  }, [hasOverlay])
  // When the panel over the map opens or closes, fit again in the space left, gliding with the
  // panel's 300ms slide.
  const insetFitted = useRef(insetLeft)
  useEffect(() => {
    if (insetFitted.current === insetLeft) return
    insetFitted.current = insetLeft
    fitRef.current({ duration: 300 })
  }, [insetLeft])

  return (
    // The world map's legend sits on the map, at the bottom right where maps keep their credits,
    // so the map can run to every edge of its space; a trail map's runs under it.
    // A world map and a `panel` map fill their parent at every width (the maps page and a trail
    // page are all map on a phone).
    <figure className={clsx('relative', (variant === 'world' || panel) && 'flex h-full flex-col')}>
      <div
        ref={frameRef}
        className={clsx(
          'relative',
          (variant === 'world' || panel) && 'min-h-0 flex-1',
          // A trail map's chart sits under the map on a phone, so the map takes what's left.
          variant !== 'world' && panel && 'flex flex-col',
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
          {/* The buttons at the top right, as most web maps (and MapLibre's own controls) put
              them: zoom and fit, then the layer and fullscreen buttons, 12px apart and 12px from
              the edges. Above whatever a page lays over the map (z-30), so the layer menu opens
              on top. */}
          <div
            className="absolute z-30 flex flex-col items-end gap-3"
            style={{ right: EDGE, top: (fullscreen ? 0 : insetTop) + EDGE }}
          >
            <ZoomButtons
              onZoomIn={() => mapRef.current?.zoomIn({ duration: 0 })}
              onZoomOut={() => mapRef.current?.zoomOut({ duration: 0 })}
              onFit={() => fit()}
              fitLabel={selected ? 'Fit to the selection' : 'Show all the maps'}
            />
            <MapButtonGroup>
              <LayerPicker layer={layer} onSelect={setLayer} />
              {canFullscreen && <FullscreenButton on={fullscreen} onToggle={toggleFullscreen} />}
              {units && onUnitsChange && (
                <UnitsButton
                  units={units}
                  onToggle={() => onUnitsChange(units === 'metric' ? 'imperial' : 'metric')}
                />
              )}
            </MapButtonGroup>
          </div>
          {hover && <PlaceCard data={data} hover={hover} />}
        </div>
        {overlay && (
          <div className="sm:pointer-events-none sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-3">
            {overlay}
          </div>
        )}
      </div>

      <figcaption
        className={
          variant === 'world'
            ? 'glass group absolute z-10 rounded-full py-1 pr-2 pl-4'
            : clsx('mt-3', panel && 'px-4 sm:px-6 lg:mt-2 lg:px-4 lg:pb-2')
        }
        // Clear of the panel on the left, if it reaches that far on a narrow window.
        style={
          variant === 'world'
            ? { right: EDGE, bottom: EDGE, maxWidth: `calc(100% - ${insetLeft + 2 * EDGE}px)` }
            : undefined
        }
      >
        <div
          className={clsx(
            'flex flex-wrap items-center gap-y-1 text-[13px] text-muted',
            variant === 'world' ? 'gap-x-4' : 'gap-x-6',
          )}
        >
          {variant === 'world' ? (
            // The key aspects only; the full key (what solid, rings and gray mean, and when the
            // data was updated) opens on hover, or on focus of the info button for keyboards and
            // touch screens.
            <>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 bg-accent" />
                offline maps
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-trail" />
                trails
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-city" />
                cities
              </span>
              <button
                type="button"
                aria-describedby="map-key"
                aria-label="What the marks mean"
                className="flex size-6 cursor-help items-center justify-center rounded-full text-faint hover:text-ink"
              >
                <span aria-hidden="true">ⓘ</span>
              </button>
              <MapKey credit={credit} />
            </>
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
          {/* The OpenStreetMap and Copernicus credits close the page's panel (MapCredits) or are
            in the site footer; only OpenFreeMap's, for that one layer, goes here. */}
          {/* The world map's update note is in its key; OpenFreeMap's credit stays in view. */}
          {((credit && variant !== 'world') || layer === 'openfreemap') && (
            <span className={clsx('text-xs text-faint', variant !== 'world' && 'ml-auto')}>
              {layer === 'openfreemap' && 'Map: OpenFreeMap, © OpenMapTiles. '}
              {variant !== 'world' && credit}
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  )
}

/**
 * The card on a trail or city dot under the pointer: its name, map status, cells built and when
 * its map was last built. Beside the dot, flipped to its left near the map's right edge.
 */
type PlaceHover = { x: number; y: number; flip: boolean; kind: 'trail' | 'city'; id: string }

function PlaceCard({ data, hover }: { data: CoverageData; hover: PlaceHover }) {
  const place =
    hover.kind === 'trail'
      ? data.trails.find((t) => t.id === hover.id)
      : data.cities.find((c) => c.id === hover.id)
  if (!place) return null
  const cells = cellProgress(place, data)
  const day = formatDay(place.updated)
  return (
    <div
      role="tooltip"
      className="glass pointer-events-none absolute z-20 w-56 rounded-xl px-3 py-2 text-[12px] text-muted"
      style={{
        left: hover.x,
        top: hover.y,
        transform: `translate(${hover.flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      <p className="font-sans text-[14px] leading-5 font-semibold text-ink">{place.name}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusBadge badge={mapBadge(place.status, hover.kind)} long />
        <span className="tabular-nums">
          {hover.kind} · {cells.built} / {cells.total} cells
        </span>
      </p>
      {day && <p className="mt-1 text-faint">updated {day}</p>}
    </div>
  )
}

/** One line of the map key: a mark and what it means. */
function KeyRow({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden="true" className="flex w-8 shrink-0 justify-center gap-1">
        {mark}
      </span>
      <span>{children}</span>
    </li>
  )
}

/**
 * The world map's full key, over its legend: shown while the legend is hovered or its info button
 * focused (`group` on the legend). What the squares, the solid dots and the rings mean, and when
 * the data was last updated.
 */
function MapKey({ credit }: { credit?: string }) {
  const dot = 'size-2.5 rounded-full'
  return (
    <div
      id="map-key"
      role="tooltip"
      className="glass pointer-events-none absolute right-0 bottom-full mb-3 hidden w-72 rounded-xl p-3 text-[12px] text-muted group-focus-within:block group-hover:block"
      // The legend's own glass can't blur through to this, so it gets the page color.
      style={{ background: 'var(--bg)' }}
    >
      <ul className="grid gap-2">
        <KeyRow mark={<span className="size-2.5 bg-accent" />}>cells you can download</KeyRow>
        <KeyRow mark={<span className="size-2.5 border border-dashed border-accent" />}>
          cells not built yet
        </KeyRow>
        <KeyRow
          mark={
            <>
              <span className={clsx(dot, 'bg-trail')} />
              <span className={clsx(dot, 'bg-city')} />
            </>
          }
        >
          available: every cell built
        </KeyRow>
        <KeyRow
          mark={
            <>
              <span className={clsx(dot, 'border-2 border-trail bg-trail-fill')} />
              <span className={clsx(dot, 'border-2 border-city bg-city-fill')} />
            </>
          }
        >
          partial: some cells built
        </KeyRow>
        <KeyRow mark={<span className={clsx(dot, 'border-2 border-faint bg-bg')} />}>
          shortlisted: next batch
        </KeyRow>
      </ul>
      {credit && <p className="mt-3 text-faint">{credit}</p>}
    </div>
  )
}
