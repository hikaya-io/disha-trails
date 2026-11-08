/**
 * The three base map layers the site's maps offer, the same three as andrewpham.dev's trail maps:
 *
 * - Terrain: the Disha app's own map, every tile from tiles.hikaya.app (the world map to z8, the
 *   published cells from z9). Blank outside the published cells, as in the app.
 * - OpenFreeMap: andrewpham.dev's trail style on OpenFreeMap's data, with the cells' hillshade and
 *   contours on top. It fills the ground outside the cells.
 * - OSM Classic: OpenStreetMap's own raster tiles.
 *
 * Terrain and OpenFreeMap each have a light and a dark style, picked by the site's theme; their
 * JSON is in public/map/, written by scripts/build-map-assets.mjs. OSM Classic has one look.
 */
import type { StyleSpecification } from 'maplibre-gl'

export type MapLayerId = 'terrain' | 'openfreemap' | 'osm'
export type Theme = 'light' | 'dark'

export const MAP_LAYERS: ReadonlyArray<{ id: MapLayerId; label: string }> = [
  { id: 'terrain', label: 'Terrain' },
  { id: 'openfreemap', label: 'OpenFreeMap' },
  { id: 'osm', label: 'OSM Classic' },
]

/** The style JSON for a layer in a theme, or null for OSM Classic, which is built in code. */
export function styleUrl(layer: MapLayerId, theme: Theme): string | null {
  if (layer === 'terrain') return `/map/style-${theme}.json`
  if (layer === 'openfreemap') return `/map/ofm-${theme}.json`
  return null
}

/** OSM Classic: OpenStreetMap's raster tiles, with the site's glyphs for the overlay labels. */
export function osmClassicStyle(origin: string): StyleSpecification {
  return {
    version: 8,
    glyphs: `${origin}/map/fonts/{fontstack}/{range}.pbf`,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  }
}

/**
 * The style with its relative glyph and sprite urls made absolute, since MapLibre wants full
 * urls. OpenFreeMap's style has no sprite.
 */
export function absolutize(style: StyleSpecification, origin: string): StyleSpecification {
  const full = (url: string | undefined) => (url?.startsWith('/') ? `${origin}${url}` : url)
  const next = { ...style, glyphs: full(style.glyphs) }
  if (typeof style.sprite === 'string') next.sprite = full(style.sprite)
  return next
}

const styles = new Map<string, Promise<StyleSpecification>>()

/**
 * Loads a layer's style for a theme, fetched once per page. Each call gets its own copy: MapLibre
 * may change the style object it's given, and the same style is set again on every switch back.
 */
export async function loadStyle(layer: MapLayerId, theme: Theme): Promise<StyleSpecification> {
  return structuredClone(await fetchStyle(layer, theme))
}

function fetchStyle(layer: MapLayerId, theme: Theme): Promise<StyleSpecification> {
  const url = styleUrl(layer, theme)
  if (!url) return Promise.resolve(osmClassicStyle(location.origin))
  let request = styles.get(url)
  if (!request) {
    request = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${url} returned ${res.status}`)
        return res.json() as Promise<StyleSpecification>
      })
      .then((style) => absolutize(style, location.origin))
    request.catch(() => styles.delete(url))
    styles.set(url, request)
  }
  return request
}
