/**
 * The `disha://` MapLibre protocol: the site's maps read the same tiles as the app.
 *
 * - `disha://world|relief|world-routes/{z}/{x}/{y}`, z0 to 7: the OSM world map the app bundles
 *   (world-base, the shaded relief and the national routes), read in place from tiles.hikaya.app.
 * - `disha://basemap|hiking|routes|terrain|contours/{z}/{x}/{y}`: the published z10 cell the tile sits
 *   in, read from tiles.hikaya.app. Each cell's manifest.json names its component files and
 *   versions; the component is then read in place with HTTP Range requests (PMTiles). A z9 tile
 *   spans four cells, and each cell's copy of it holds only that cell's quarter, so the tile is
 *   built from every published one of the four, as the app's RegionTileRouter does. Terrain and
 *   contours start at z10, so their tiles always come from one cell and pass through untouched.
 *
 * A tile outside every published cell, or one that fails, comes back empty, so MapLibre draws
 * nothing there and logs nothing. Which cells are published comes from setPublishedCells when a
 * page already has the list (coverage.json), otherwise from the tile service's own catalog
 * (/v1/index.json and its z5 shards).
 *
 * This file is shared: the same copy lives in disha-trails site/src/lib/map/ and in me
 * src/lib/map/. Change it in disha-trails first, then copy it over.
 */
import { VectorTile, type VectorTileLayer } from '@mapbox/vector-tile'
import Pbf from 'pbf'
import { PMTiles } from 'pmtiles'
import { fromVectorTileJs } from 'vt-pbf'

export const TILES_URL = (
  process.env.NEXT_PUBLIC_DISHA_TILES_URL || 'https://tiles.hikaya.app'
).replace(/\/+$/, '')

/**
 * The world map version the site draws. Published by disha-tiles (`publish.sh --world`) and
 * immutable like the cells: a new build gets a new folder. Keep it the same as disha_ios
 * scripts/fetch-world-maps.sh, so the site and the app draw the same map.
 */
export const WORLD_VERSION = '20261101'

/** The world map's folder. NEXT_PUBLIC_DISHA_WORLD_URL points a local preview at another copy. */
export const WORLD_URL = (
  process.env.NEXT_PUBLIC_DISHA_WORLD_URL || `${TILES_URL}/v1/world/${WORLD_VERSION}`
).replace(/\/+$/, '')

export type WorldComponent = 'world' | 'relief' | 'world-routes'

const WORLD_FILES: Record<WorldComponent, string> = {
  world: 'world-base.pmtiles',
  relief: 'world-relief.pmtiles',
  'world-routes': 'world-routes.pmtiles',
}

/** Cells are the z10 tile grid. */
export const CELL_ZOOM = 10

export type CellComponent = 'basemap' | 'hiking' | 'routes' | 'terrain' | 'contours'

const FILES: Record<CellComponent, string> = {
  basemap: 'map.pmtiles',
  hiking: 'hiking.pmtiles',
  routes: 'routes.pmtiles',
  terrain: 'terrain.pmtiles',
  contours: 'contours.pmtiles',
}

/** Raster tiles can't be merged without decoding pixels, so they come from one cell only. */
const RASTER = new Set<CellComponent>(['terrain'])

export type TileRequest = {
  kind: WorldComponent | CellComponent
  z: number
  x: number
  y: number
}

/** Parses `disha://{kind}/{z}/{x}/{y}`, or returns null for anything else. */
export function parseTileUrl(url: string): TileRequest | null {
  const match =
    /^disha:\/\/(world|relief|world-routes|basemap|hiking|routes|terrain|contours)\/(\d+)\/(\d+)\/(\d+)$/.exec(
      url,
    )
  if (!match) return null
  const [, kind, z, x, y] = match
  return { kind: kind as TileRequest['kind'], z: Number(z), x: Number(x), y: Number(y) }
}

/** The id of the z10 cell a tile at z10 or deeper sits in, as coverage.json writes it. */
export function cellIdFor(z: number, x: number, y: number): string | null {
  if (z < CELL_ZOOM) return null
  const shift = 2 ** (z - CELL_ZOOM)
  return `c-${CELL_ZOOM}-${Math.floor(x / shift)}-${Math.floor(y / shift)}`
}

/** The cells a tile reads from: its own cell from z10, the four under it at z9, none above. */
export function cellIdsFor(z: number, x: number, y: number): string[] {
  if (z >= CELL_ZOOM) return [cellIdFor(z, x, y)!]
  if (z !== CELL_ZOOM - 1) return []
  return [0, 1].flatMap((dx) => [0, 1].map((dy) => `c-10-${x * 2 + dx}-${y * 2 + dy}`))
}

/**
 * One vector tile from several of the same tile, layer by layer. Simply joining the bytes would
 * repeat layer names, and MapLibre keeps only the last layer of a name.
 */
export function mergeTiles(tiles: Uint8Array[]): Uint8Array {
  if (tiles.length === 1) return tiles[0]
  const byName = new Map<string, VectorTileLayer[]>()
  for (const bytes of tiles) {
    const tile = new VectorTile(new Pbf(bytes))
    for (const [name, layer] of Object.entries(tile.layers)) {
      byName.set(name, [...(byName.get(name) ?? []), layer])
    }
  }
  const layers = Object.fromEntries(
    [...byName].map(([name, parts]) => {
      const index = parts.flatMap((layer) =>
        Array.from({ length: layer.length }, (_, i) => [layer, i] as const),
      )
      return [
        name,
        {
          name,
          version: 2,
          extent: parts[0].extent,
          length: index.length,
          feature: (i: number) => index[i][0].feature(index[i][1]),
        },
      ]
    }),
  )
  return fromVectorTileJs({ layers })
}

/** The manifest of a published cell, from its id. */
export function manifestUrl(cellId: string, base = TILES_URL): string {
  const [, z, x, y] = cellId.split('-')
  return `${base}/v1/c/${z}/${x}/${y}/manifest.json`
}

type Manifest = { components: Array<{ filename: string; version: string }> }

/** A component's immutable url, from the cell's manifest, or null when the cell lacks it. */
export function componentUrl(
  cellId: string,
  manifest: Manifest,
  component: CellComponent,
  base = TILES_URL,
): string | null {
  const file = manifest.components.find((c) => c.filename === FILES[component])
  if (!file) return null
  const [, z, x, y] = cellId.split('-')
  return `${base}/v1/c/${z}/${x}/${y}/${file.version}/${file.filename}`
}

let published: Set<string> | null = null

/** Which cells are published, from coverage.json. Tiles elsewhere are answered empty. */
export function setPublishedCells(ids: Iterable<string>) {
  published = new Set(ids)
}

/** The catalog shard a cell is listed in: its z5 parent tile, as `5-{x}-{y}`. */
export function shardKeyFor(cellId: string): string {
  const [, , x, y] = cellId.split('-').map(Number)
  const shift = CELL_ZOOM - 5
  return `5-${x >> shift}-${y >> shift}`
}

type Catalog = { shards: Record<string, { url: string }> }

let catalog: Promise<Catalog | null> | null = null
const shards = new Map<string, Promise<Set<string>>>()

/** Reads the published cells from the tile service's catalog, one z5 shard at a time. */
function isPublished(cellId: string): Promise<boolean> | boolean {
  if (published) return published.has(cellId)
  catalog ??= fetch(`${TILES_URL}/v1/index.json`)
    .then((res) => (res.ok ? (res.json() as Promise<Catalog>) : null))
    .catch(() => null)
  const key = shardKeyFor(cellId)
  let shard = shards.get(key)
  if (!shard) {
    shard = catalog.then(async (index) => {
      const entry = index?.shards[key]
      if (!entry) return new Set<string>()
      const res = await fetch(`${TILES_URL}/v1/${entry.url}`)
      if (!res.ok) return new Set<string>()
      const { regions } = (await res.json()) as { regions: Array<{ id: string }> }
      return new Set(regions.map((r) => r.id))
    })
    shard.catch(() => shards.delete(key))
    shards.set(key, shard)
  }
  return shard.then((ids) => ids.has(cellId))
}

const manifests = new Map<string, Promise<Manifest | null>>()
const archives = new Map<string, PMTiles>()

function manifestFor(cellId: string): Promise<Manifest | null> {
  let request = manifests.get(cellId)
  if (!request) {
    request = fetch(manifestUrl(cellId))
      .then((res) => (res.ok ? (res.json() as Promise<Manifest>) : null))
      .catch(() => null)
    manifests.set(cellId, request)
  }
  return request
}

/**
 * An empty tile. A new one each time: MapLibre transfers the buffer to its worker, which detaches
 * it, so a shared one fails from the second use ("ArrayBuffer is detached").
 */
const empty = () => ({ data: new Uint8Array() })

const worldArchives = new Map<WorldComponent, PMTiles>()

function isWorld(kind: TileRequest['kind']): kind is WorldComponent {
  return kind in WORLD_FILES
}

async function worldTile(kind: WorldComponent, z: number, x: number, y: number) {
  let archive = worldArchives.get(kind)
  if (!archive) {
    archive = new PMTiles(`${WORLD_URL}/${WORLD_FILES[kind]}`)
    worldArchives.set(kind, archive)
  }
  // Open sea, and anywhere without a national route, has no tile.
  const tile = await archive.getZxy(z, x, y)
  return tile ? { data: new Uint8Array(tile.data) } : empty()
}

async function cellPart(cellId: string, kind: CellComponent, z: number, x: number, y: number) {
  const manifest = await manifestFor(cellId)
  const url = manifest && componentUrl(cellId, manifest, kind)
  if (!url) return null
  let archive = archives.get(url)
  if (!archive) {
    archive = new PMTiles(url)
    archives.set(url, archive)
  }
  const tile = await archive.getZxy(z, x, y)
  return tile ? new Uint8Array(tile.data) : null
}

async function cellTile(kind: CellComponent, z: number, x: number, y: number) {
  if (RASTER.has(kind) && z < CELL_ZOOM) return empty()
  const candidates = cellIdsFor(z, x, y)
  const flags = await Promise.all(candidates.map((id) => isPublished(id)))
  const ids = candidates.filter((_, i) => flags[i])
  if (!ids.length) return empty()
  const parts: Uint8Array[] = []
  for (const part of await Promise.all(ids.map((id) => cellPart(id, kind, z, x, y)))) {
    if (part?.length) parts.push(part)
  }
  return parts.length ? { data: mergeTiles(parts) } : empty()
}

/** The handler for maplibregl.addProtocol('disha', …). */
export async function dishaProtocol(
  params: { url: string },
  // MapLibre passes an AbortController; PMTiles reads aren't cancelled, and they're small.
  _abort?: AbortController,
): Promise<{ data: Uint8Array }> {
  const request = parseTileUrl(params.url)
  if (!request) return empty()
  try {
    const { kind, z, x, y } = request
    return isWorld(kind) ? await worldTile(kind, z, x, y) : await cellTile(kind, z, x, y)
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.warn(`Map tile ${params.url} didn't load:`, (error as Error).message)
    }
    return empty()
  }
}
