/**
 * GeoJSON for the coverage map, built from coverage.json. Pure functions, so the map component
 * only hands the results to MapLibre. Bounds are [west, south, east, north] in degrees.
 */
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'
import type { Bounds, City, CoverageData, Trail } from '@/lib/coverage'

type Boxes = FeatureCollection<Polygon, Record<string, string>>
type Points = FeatureCollection<Point, Record<string, string>>

export const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

function box([w, s, e, n]: Bounds, properties: Record<string, string> = {}): Feature<Polygon> {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    },
  }
}

export function boxesFC(boxes: Iterable<Bounds>): Boxes {
  return {
    type: 'FeatureCollection',
    features: [...boxes].map((b) => box(b) as Feature<Polygon, Record<string, string>>),
  }
}

/**
 * The bounds of web map tile z/x/y. Map cells are z10 tiles, so every grid on the map is a level
 * of the same quadtree and the levels nest exactly: one z8 tile is 4 × 4 cells.
 */
export function tileBounds(z: number, x: number, y: number): Bounds {
  const n = 2 ** z
  const lon = (i: number) => (i / n) * 360 - 180
  const lat = (j: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * j) / n))) * 180) / Math.PI
  return [lon(x), lat(y + 1), lon(x + 1), lat(y)]
}

/** The zoom of the squares drawn at world zoom: 4 × 4 map cells each, about 1.4° across. */
export const SQUARE_ZOOM = 8

/** [zoom, x, y] of a cell id such as c-10-568-367, or null for anything else. */
export function parseCellId(id: string): [number, number, number] | null {
  const match = /^c-(\d+)-(\d+)-(\d+)$/.exec(id)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

/** The squares that hold at least one published map cell: the cells' parent tiles at `zoom`. */
export function squaresFC(cellIds: Iterable<string>, zoom = SQUARE_ZOOM): Boxes {
  const parents = new Map<string, Bounds>()
  for (const id of cellIds) {
    const cell = parseCellId(id)
    if (!cell) continue
    const [z, x, y] = cell
    const shift = z - zoom
    if (shift < 0) continue
    const px = x >> shift
    const py = y >> shift
    const key = `${px}/${py}`
    if (!parents.has(key)) parents.set(key, tileBounds(zoom, px, py))
  }
  return boxesFC(parents.values())
}

/**
 * The outer edges of a set of cells: from the west edge of the westmost cell to the east edge of
 * the eastmost, and so on. Every outline on the map comes from cells, never from a place's own
 * box, so its lines fall on the world grid the cells are built and published on.
 */
export function cellsBounds(cellIds: Iterable<string>): Bounds | null {
  let zoom: number | null = null
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const id of cellIds) {
    const cell = parseCellId(id)
    if (!cell || (zoom !== null && cell[0] !== zoom)) continue
    const [z, x, y] = cell
    zoom = z
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  if (zoom === null) return null
  const [west, , , north] = tileBounds(zoom, minX, minY)
  const [, south, east] = tileBounds(zoom, maxX, maxY)
  return [west, south, east, north]
}

/** Every published z10 cell. */
export function cellsFC(data: Pick<CoverageData, 'cells'>): Boxes {
  return boxesFC(Object.values(data.cells))
}

/** A trail's or city's cells, split into built (published) and still to build. */
export function selectionFC(
  cellIds: string[],
  data: Pick<CoverageData, 'cells' | 'routeCells'>,
): { built: Boxes; todo: Boxes } {
  const built = cellIds.filter((id) => id in data.cells).map((id) => data.cells[id])
  const todo = cellIds
    .filter((id) => !(id in data.cells) && id in data.routeCells)
    .map((id) => data.routeCells[id])
  return { built: boxesFC(built), todo: boxesFC(todo) }
}

/**
 * The box around every published cell and every city: where the maps are, which the world map
 * opens on and returns to. Null when there are none.
 */
export function coverageBounds(data: Pick<CoverageData, 'cells' | 'cities'>): Bounds | null {
  const boxes = [...Object.values(data.cells), ...data.cities.map((c) => c.bbox)]
  if (boxes.length === 0) return null
  return [
    Math.min(...boxes.map((b) => b[0])),
    Math.min(...boxes.map((b) => b[1])),
    Math.max(...boxes.map((b) => b[2])),
    Math.max(...boxes.map((b) => b[3])),
  ]
}

/** Center of a bounding box. */
export function centerOf([w, s, e, n]: Bounds): [number, number] {
  return [(w + e) / 2, (s + n) / 2]
}

/** The key a trail or city goes by in lists and on the map: "trail-<id>" or "city-<id>". */
export function placeKey(kind: 'trail' | 'city', id: string): string {
  return `${kind}-${id}`
}

/**
 * One point per trail and city, at the center of its box, with its kind and whether its map is
 * complete, which set its color and shape. A trail with no map area yet has no box and no point.
 */
export function placePointsFC(trails: Trail[], cities: City[]): Points {
  const places = [
    ...trails.flatMap((t) => (t.bbox ? [{ kind: 'trail' as const, ...t, bbox: t.bbox }] : [])),
    ...cities.map((c) => ({ kind: 'city' as const, ...c })),
  ]
  return {
    type: 'FeatureCollection',
    features: places.map((p) => ({
      type: 'Feature',
      properties: {
        key: placeKey(p.kind, p.id),
        kind: p.kind,
        id: p.id,
        name: p.name,
        // How much of its map is built, which sets the dot: "full" solid, "partial" a ring in its
        // color, "none" (shortlisted, nothing built yet) a gray ring, as its gray tag.
        built: p.status === 'live' ? 'full' : p.status === 'partial' ? 'partial' : 'none',
      },
      geometry: { type: 'Point', coordinates: centerOf(p.bbox) },
    })),
  }
}

/** One outline per city, around its cells (see cellsBounds). A city with no cells has none. */
export function cityBoxesFC(cities: City[]): Boxes {
  return {
    type: 'FeatureCollection',
    features: cities.flatMap((c) => {
      const bounds = cellsBounds(c.cellIds)
      return bounds
        ? [
            box(bounds, { key: placeKey('city', c.id), id: c.id, name: c.name }) as Feature<
              Polygon,
              Record<string, string>
            >,
          ]
        : []
    }),
  }
}

/** MapLibre wants corners, not four numbers. */
export function toLngLatBounds([w, s, e, n]: Bounds): [[number, number], [number, number]] {
  return [
    [w, s],
    [e, n],
  ]
}
