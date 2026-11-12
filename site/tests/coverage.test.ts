import { describe, expect, it } from 'vitest'
import {
  type Bounds,
  type City,
  cellProgress,
  coverageStats,
  countriesOf,
  byVotes,
  editsUrl,
  formatDay,
  editUrl,
  guideAvailability,
  guideBadge,
  guideStage,
  mapBadge,
  mapAvailability,
  osmUrl,
  parseCoverage,
  requestUrl,
  mapHref,
  mapStage,
  matchesQuery,
  nearbyTrails,
  requestLabel,
  requestsUrl,
  takesEdits,
  type Trail,
  splitTrailName,
  TRAIL_DESCRIPTION_MAX,
  TRAIL_TITLE_MAX,
  trailDescription,
  trailHref,
  trailTitle,
  waymarkedUrl,
  trailAction,
  voteCounts,
} from '@/lib/coverage'
import {
  cellsBounds,
  cellsFC,
  cityBoxesFC,
  centerOf,
  coverageBounds,
  placePointsFC,
  selectionFC,
  squaresFC,
  tileBounds,
} from '@/lib/coverage-geo'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'
import { fromVectorTileJs } from 'vt-pbf'
import {
  cellIdFor,
  cellIdsFor,
  componentUrl,
  manifestUrl,
  mergeTiles,
  parseTileUrl,
  shardKeyFor,
} from '@/lib/map/disha-protocol'

// Made-up trails; only the fields the helpers read matter.
const trail = (overrides: Partial<Trail>): Trail => ({
  id: 'x',
  name: 'X',
  countries: [],
  continent: 'Europe',
  lengthKm: null,
  bytes: 0,
  status: 'candidate',
  bbox: null,
  cellIds: [],
  guide: '',
  request: null,
  ...overrides,
})

const gr20 = trail({
  id: 'gr20',
  name: 'GR20',
  countries: ['France'],
  status: 'live',
  guide: 'published',
  lengthKm: 180,
  bytes: 9e7,
})
const jmt = trail({
  id: 'jmt',
  name: 'John Muir Trail',
  countries: ['United States'],
  continent: 'North America',
  status: 'partial',
  guide: 'built',
  lengthKm: 340,
  request: { number: 1, url: 'u', votes: 3 },
})
const kepler = trail({
  id: 'kepler',
  name: 'Kepler Track',
  countryCodes: ['NZ'],
  continent: 'Oceania',
  status: 'wishlist',
  guide: 'pending',
  lengthKm: 60,
  request: { number: 2, url: 'u', votes: 7 },
})
const trails = [kepler, jmt, gr20]

describe('availability', () => {
  it('folds map statuses into available, partial and not yet', () => {
    expect(mapAvailability('live')).toBe('available')
    expect(mapAvailability('partial')).toBe('partial')
    for (const s of ['planned', 'candidate', 'wishlist'] as const) {
      expect(mapAvailability(s)).toBe('none')
    }
  })

  it('treats only published guides as available, and pending as still to do', () => {
    expect(guideAvailability('published')).toBe('available')
    expect(guideAvailability('built')).toBe('soon')
    expect(guideAvailability('pending')).toBe('planned')
    expect(guideAvailability('retired')).toBe('none')
    expect(guideAvailability('')).toBe('none')
  })
})

describe('countriesOf', () => {
  it('names countries from ISO codes when the row has no names', () => {
    expect(countriesOf(kepler)).toEqual(['New Zealand'])
    expect(countriesOf(gr20)).toEqual(['France'])
  })
})

describe('funnel stages', () => {
  it('puts maps in available, shortlisted or popular', () => {
    expect(mapStage('live')).toBe('available')
    expect(mapStage('partial')).toBe('available')
    expect(mapStage('planned')).toBe('shortlisted')
    // A candidate has a tile area but isn't in the next batch: not shortlisted.
    expect(mapStage('candidate')).toBe('popular')
    expect(mapStage('wishlist')).toBe('popular')
  })

  it('puts guides in a stage, and leaves trails with no guide out', () => {
    expect(guideStage('published')).toBe('available')
    expect(guideStage('built')).toBe('shortlisted')
    expect(guideStage('pending')).toBe('popular')
    expect(guideStage('retired')).toBeNull()
    expect(guideStage('')).toBeNull()
  })

  it('ranks by votes, then A to Z, and leaves the input alone', () => {
    expect(byVotes(trails).map((t) => t.id)).toEqual(['kepler', 'jmt', 'gr20'])
    expect(trails.map((t) => t.id)).toEqual(['kepler', 'jmt', 'gr20'])
  })

  it('searches names and countries, ignoring case and spaces at the ends', () => {
    expect(trails.filter((t) => matchesQuery(t, ' muir '))).toEqual([jmt])
    expect(trails.filter((t) => matchesQuery(t, 'zealand'))).toEqual([kepler])
  })
})

describe('status tags', () => {
  it('marks maps as available, partial or gray otherwise, drawn like their dot', () => {
    expect(mapBadge('live').tone).toBe('good')
    expect(mapBadge('partial').tone).toBe('warn')
    expect(mapBadge('planned')).toMatchObject({ tone: 'none', label: 'Shortlisted' })
    expect(mapBadge('candidate')).toMatchObject({ tone: 'none', short: 'No map yet' })
    expect(mapBadge('wishlist')).toMatchObject({ tone: 'none', short: 'No map yet' })
    // Available and partial are drawn like the place's dot; ink when they stand for both kinds.
    expect(mapBadge('partial', 'city').mark).toBe('city')
    expect(mapBadge('live').mark).toBe('any')
  })

  it('colors guides green, yellow when coming soon and gray otherwise', () => {
    expect(guideBadge('published').tone).toBe('good')
    expect(guideBadge('built')).toMatchObject({ tone: 'warn', label: 'Coming soon' })
    expect(guideBadge('pending').tone).toBe('none')
    expect(guideBadge('')).toMatchObject({ tone: 'none', short: 'No guide' })
  })
})

describe('suggested edits', () => {
  it('opens edits only on a published guide whose map is fully built', () => {
    expect(takesEdits(gr20)).toBe(true)
    expect(takesEdits({ ...gr20, status: 'partial' })).toBe(false)
    expect(takesEdits(jmt)).toBe(false)
  })

  it('titles an edit with the trail id and finds open edits on GitHub, most 👍 first', () => {
    const url = new URL(editUrl({ repo: 'o/r' }, gr20))
    expect(url.searchParams.get('template')).toBe('trail-edit.yml')
    expect(url.searchParams.get('labels')).toBe('trail-edit')
    expect(url.searchParams.get('title')).toBe('Trail edit: GR20 [gr20]')
    const q = new URL(editsUrl({ repo: 'o/r' }, gr20)).searchParams.get('q')
    expect(q).toBe('is:issue is:open label:trail-edit in:title "[gr20]" sort:reactions-+1-desc')
    const all = new URL(requestsUrl({ repo: 'o/r', requestLabel: 'trail-request' }))
    expect(all.pathname).toBe('/o/r/issues')
    expect(all.searchParams.get('q')).toContain('label:trail-request')
  })

  it('puts the topic of an edit in its title, where GitHub can always prefill it', () => {
    const url = new URL(editUrl({ repo: 'o/r' }, gr20, 'route'))
    expect(url.searchParams.get('title')).toBe('Trail edit (route): GR20 [gr20]')
  })

  it('names a request after what the trail is missing', () => {
    expect(requestLabel({ status: 'live', guide: 'pending' })).toBe('Request a guide')
    expect(requestLabel({ status: 'wishlist', guide: 'published' })).toBe('Request a map')
    expect(requestLabel({ status: 'wishlist', guide: '' })).toBe('Request this trail')
  })

  it('links a trail or city to its place on the maps page', () => {
    expect(mapHref('city', 'lyon')).toBe('/maps/?city=lyon')
  })
})

describe('coverageStats', () => {
  it('counts live trails, their countries, published guides and cities with maps', () => {
    const city = (status: City['status']): City => ({
      id: 'c',
      name: 'C',
      countryCodes: [],
      bbox: [0, 0, 1, 1],
      cellIds: [],
      status,
    })
    expect(
      coverageStats({ trails, cities: [city('live'), city('partial'), city('candidate')] }),
    ).toEqual({ trailsWithMaps: 1, countries: 1, guides: 1, cities: 2 })
  })
})

describe('formatDay', () => {
  it('reads a build date as day, short month and year', () => {
    expect(formatDay('2026-11-07')).toBe('7 Nov 2026')
  })
  it('has nothing to show for a missing or malformed date', () => {
    expect(formatDay(null)).toBeNull()
    expect(formatDay(undefined)).toBeNull()
    expect(formatDay('20261107')).toBeNull()
  })
})

describe('voteCounts', () => {
  it("reads up and down, and older files' votes as all up", () => {
    expect(voteCounts({ number: 1, url: 'u', votes: 4, up: 6, down: 2 })).toEqual({
      up: 6,
      down: 2,
    })
    expect(voteCounts({ number: 1, url: 'u', votes: 3 })).toEqual({ up: 3, down: 0 })
  })

  it('labels a request with both counts', () => {
    const trail = { ...kepler, request: { number: 1, url: 'u', votes: 4, up: 6, down: 2 } }
    expect(trailAction(trail, { repo: 'o/r', requestLabel: 'trail-request' })).toEqual({
      href: 'u',
      label: '6 up, 2 down · vote',
    })
  })
})

describe('requestUrl', () => {
  it('titles the issue with the trail id so votes can be matched back', () => {
    const url = new URL(requestUrl({ repo: 'o/r', requestLabel: 'trail-request' }, kepler))
    expect(url.pathname).toBe('/o/r/issues/new')
    expect(url.searchParams.get('title')).toBe('Trail request: Kepler Track [kepler]')
    expect(url.searchParams.get('labels')).toBe('trail-request')
  })
})

describe('parseCoverage', () => {
  it('names the fields a broken file is missing', () => {
    expect(() => parseCoverage({ land: [], covered: [] })).toThrow('trails, cities')
    expect(() => parseCoverage(null)).toThrow('coverage.json is missing')
  })
})

describe('coverage map geometry', () => {
  it('matches the published cells, which are z10 web map tiles', () => {
    // c-10-162-346 as coverage.json gives it, to 3 decimals.
    const [w, s, e, n] = tileBounds(10, 162, 346)
    expect([w, s, e, n].map((v) => Number(v.toFixed(3)))).toEqual([
      -123.047, 50.064, -122.695, 50.289,
    ])
  })
  it('draws each square as the z8 tile around its cells, so cell edges meet square edges', () => {
    // Two cells in one z8 tile (x 0–3, y 0–3) and one in the next tile east.
    const { features } = squaresFC(['c-10-0-0', 'c-10-3-3', 'c-10-4-0', 'not-a-cell'])
    expect(features).toHaveLength(2)
    const ring = features[0].geometry.coordinates[0]
    const [w, s, e, n] = tileBounds(8, 0, 0)
    expect(ring).toEqual([
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ])
    expect(e).toBe(tileBounds(10, 3, 3)[2])
    expect(s).toBe(tileBounds(10, 3, 3)[1])
  })
  it('outlines a place at the edges of its cells, on the world grid', () => {
    // Belgrade's 4 × 4 block, as coverage.json gives it.
    const ids = [568, 569, 570, 571].flatMap((x) =>
      [367, 368, 369, 370].map((y) => `c-10-${x}-${y}`),
    )
    const [w, s, e, n] = cellsBounds(ids)!
    expect([w, n]).toEqual([tileBounds(10, 568, 367)[0], tileBounds(10, 568, 367)[3]])
    expect([e, s]).toEqual([tileBounds(10, 571, 370)[2], tileBounds(10, 571, 370)[1]])
    expect(cellsBounds([])).toBeNull()
  })
  it('never outlines a city from its own box', () => {
    const city: City = {
      id: 'c',
      name: 'C',
      countryCodes: [],
      status: 'live',
      // A 40 km box that falls between cell edges.
      bbox: [19.9522, 44.4296, 20.9678, 45.1504],
      cellIds: ['c-10-568-367', 'c-10-571-370'],
    }
    const ring = cityBoxesFC([city]).features[0].geometry.coordinates[0]
    const lons = new Set(ring.map(([lon]) => lon))
    expect(lons).toEqual(new Set([tileBounds(10, 568, 367)[0], tileBounds(10, 571, 370)[2]]))
    expect(cityBoxesFC([{ ...city, cellIds: [] }]).features).toEqual([])
  })
  it('splits a selection into built cells and cells still to build', () => {
    const data = {
      cells: { a: [0, 0, 1, 1] as Bounds, b: [1, 0, 2, 1] as Bounds },
      routeCells: { c: [2, 0, 3, 1] as Bounds },
    }
    const { built, todo } = selectionFC(['a', 'c', 'zz'], data)
    expect(built.features).toHaveLength(1)
    expect(todo.features).toHaveLength(1)
    expect(cellsFC(data).features).toHaveLength(2)
  })
  it('bounds every published cell and city, for the opening view', () => {
    const city: City = {
      id: 'c',
      name: 'C',
      countryCodes: [],
      status: 'live',
      bbox: [20, 44, 21, 45],
      cellIds: [],
    }
    expect(coverageBounds({ cells: { a: [-120, 35, -119, 36] }, cities: [city] })).toEqual([
      -120, 35, 21, 45,
    ])
    expect(coverageBounds({ cells: {}, cities: [] })).toBeNull()
  })
  it('puts a city point at the center of its box', () => {
    expect(centerOf([4, 52, 6, 53])).toEqual([5, 52.5])
    const city: City = {
      id: 'city-x',
      name: 'X',
      countryCodes: [],
      status: 'live',
      bbox: [4, 52, 6, 53],
      cellIds: [],
    }
    const [point] = placePointsFC([], [city]).features
    expect(point.geometry.coordinates).toEqual([5, 52.5])
    expect(point.properties).toMatchObject({ key: 'city-city-x', kind: 'city', built: 'full' })
  })
  it('draws trails and cities as the same points, keyed by kind, and skips trails with no area', () => {
    const points = placePointsFC(
      [trail({ id: 'gr20', bbox: [8, 41, 10, 43] }), trail({ id: 'none', bbox: null })],
      [],
    ).features
    expect(points.map((p) => p.properties.key)).toEqual(['trail-gr20'])
    // A trail with nothing built yet is not partial: its dot is drawn as shortlisted.
    const planned = placePointsFC([trail({ id: 'p', status: 'candidate', bbox: [0, 0, 1, 1] })], [])
    expect(planned.features[0].properties.built).toBe('none')
    expect(points[0].geometry.coordinates).toEqual([9, 42])
  })
})

describe('trail links', () => {
  it('links a trail to OpenStreetMap and Waymarked Trails by its relation', () => {
    const t = trail({ osmRelation: 5987159 })
    expect(osmUrl(t)).toBe('https://www.openstreetmap.org/relation/5987159')
    expect(waymarkedUrl(t)).toBe('https://hiking.waymarkedtrails.org/#route?id=5987159')
    expect(osmUrl(trail({}))).toBeNull()
    expect(waymarkedUrl(trail({ osmRelation: null }))).toBeNull()
  })
  it('splits a trailing qualifier off a trail name for the heading', () => {
    expect(splitTrailName('GR20 (Corsica)')).toEqual({ title: 'GR20', qualifier: 'Corsica' })
    expect(splitTrailName('Via degli Dei (Bologna to Florence)')).toEqual({
      title: 'Via degli Dei',
      qualifier: 'Bologna to Florence',
    })
    expect(splitTrailName('Pacific Crest Trail: Washington')).toEqual({
      title: 'Pacific Crest Trail',
      qualifier: 'Washington',
    })
    expect(splitTrailName('Annapurna Base Camp / Poon Hill').qualifier).toBeNull()
    expect(splitTrailName('Haute Randonnée Pyrénéenne (HRP)').title).toBe(
      'Haute Randonnée Pyrénéenne',
    )
  })
  it('gives each trail its own page path', () => {
    expect(trailHref('abel-tasman')).toBe('/trails/abel-tasman/')
  })
  it('counts built cells along a route', () => {
    const t = trail({ cellIds: ['a', 'b', 'c'] })
    expect(cellProgress(t, { cells: { a: [0, 0, 1, 1] } })).toEqual({ built: 1, total: 3 })
  })
})

describe('disha:// tile routing', () => {
  it('parses tile urls and rejects anything else', () => {
    expect(parseTileUrl('disha://basemap/12/2170/1458')).toEqual({
      kind: 'basemap',
      z: 12,
      x: 2170,
      y: 1458,
    })
    expect(parseTileUrl('disha://world/0/0/0')?.kind).toBe('world')
    expect(parseTileUrl('disha://relief/5/1/1')?.kind).toBe('relief')
    expect(parseTileUrl('disha://world-routes/7/1/1')?.kind).toBe('world-routes')
    expect(parseTileUrl('disha://terrain/11/1/1')?.kind).toBe('terrain')
    expect(parseTileUrl('disha://overview/9/1/1')).toBeNull()
    expect(parseTileUrl('https://example.com/1/2/3')).toBeNull()
  })
  it('names the catalog shard a cell is listed in, its z5 parent', () => {
    expect(shardKeyFor('c-10-423-388')).toBe('5-13-12')
    expect(shardKeyFor('c-10-541-359')).toBe('5-16-11')
  })
  it('finds the z10 cell a deeper tile sits in, and none above z10', () => {
    expect(cellIdFor(10, 541, 359)).toBe('c-10-541-359')
    expect(cellIdFor(13, 541 * 8 + 7, 359 * 8)).toBe('c-10-541-359')
    expect(cellIdFor(9, 270, 179)).toBeNull()
  })
  it("builds a component's immutable url from the cell manifest", () => {
    const manifest = {
      components: [
        { filename: 'map.pmtiles', version: '20261101' },
        { filename: 'routes.pmtiles', version: '20261107' },
      ],
    }
    expect(manifestUrl('c-10-512-375', 'https://t')).toBe('https://t/v1/c/10/512/375/manifest.json')
    expect(componentUrl('c-10-512-375', manifest, 'routes', 'https://t')).toBe(
      'https://t/v1/c/10/512/375/20261107/routes.pmtiles',
    )
    expect(componentUrl('c-10-512-375', manifest, 'hiking', 'https://t')).toBeNull()
  })
  it('reads a z9 tile from the four cells under it', () => {
    expect(cellIdsFor(9, 270, 179)).toEqual([
      'c-10-540-358',
      'c-10-540-359',
      'c-10-541-358',
      'c-10-541-359',
    ])
    expect(cellIdsFor(8, 135, 89)).toEqual([])
  })
  it('merges same-named layers instead of keeping only the last one', () => {
    const tile = (name: string) =>
      fromVectorTileJs({
        layers: {
          water: {
            name: 'water',
            extent: 4096,
            length: 1,
            feature: () => ({
              type: 1,
              properties: { name },
              loadGeometry: () => [[{ x: 10, y: 10 }]],
            }),
          },
        },
      })
    const merged = new VectorTile(new Pbf(mergeTiles([tile('a'), tile('b')])))
    const water = merged.layers.water
    expect(water.length).toBe(2)
    expect([water.feature(0).properties.name, water.feature(1).properties.name]).toEqual(['a', 'b'])
  })
})

describe('trail page titles and descriptions', () => {
  const long = 'Torres del Paine O Circuit and W Trek'
  const cases = [
    gr20,
    trail({
      name: 'Adlerweg',
      countries: ['Austria'],
      status: 'live',
      guide: 'pending',
      lengthKm: 413,
    }),
    trail({ name: 'GR11', status: 'partial', guide: 'built', lengthKm: 840 }),
    trail({ name: 'Kepler Track', status: 'planned', guide: 'pending' }),
    trail({ name: 'Ala Kul', status: 'wishlist', guide: '' }),
    trail({
      name: long,
      countries: ['Chile', 'Argentina'],
      status: 'live',
      guide: 'published',
      lengthKm: 120,
    }),
  ]

  it('names what the page offers today', () => {
    expect(trailTitle(gr20)).toBe('GR20 offline map and guide')
    expect(trailTitle(cases[1])).toBe('Adlerweg offline hiking map')
    expect(trailTitle(cases[4])).toBe('Ala Kul offline map and guide')
    expect(trailDescription(gr20)).toBe(
      'GR20 (France, 180 km): offline map and trail guide in Disha for iPhone, with the water, huts, and campsites along the route and the distance to each.',
    )
    expect(trailDescription(cases[2])).toMatch(/built along part of the route.*coming soon\.$/)
  })

  it('fits search results, dropping detail from long names', () => {
    for (const t of cases) {
      expect(trailTitle(t).length).toBeLessThanOrEqual(TRAIL_TITLE_MAX)
      expect(trailDescription(t).length).toBeLessThanOrEqual(TRAIL_DESCRIPTION_MAX)
    }
    expect(trailTitle(cases[5])).toBe(`${long} offline guide`)
    expect(trailDescription(cases[5])).not.toContain('Chile, Argentina')
  })
})

describe('nearbyTrails', () => {
  const at = (id: string, lon: number, lat: number) =>
    trail({ id, bbox: [lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1] })
  // A cluster in the Alps and one trail far away in New Zealand.
  const alps = [at('a', 7, 46), at('b', 7.5, 46), at('c', 8, 46), at('d', 8.5, 46), at('e', 9, 46)]
  const far = at('nz', 168, -45)
  const noMap = trail({ id: 'wish' })
  const all = [...alps, far, noMap]

  it('lists the nearest mapped trails first, without the trail itself', () => {
    expect(nearbyTrails(alps[0], all, 2).map((t) => t.id)).toEqual(['b', 'c'])
  })

  it('leaves out trails without a map area, and gives them no list', () => {
    expect(nearbyTrails(alps[0], all, 10).map((t) => t.id)).not.toContain('wish')
    expect(nearbyTrails(noMap, all)).toEqual([])
  })

  it('links every mapped trail from at least one other, even a remote one', () => {
    const linked = new Set(all.flatMap((t) => nearbyTrails(t, all, 1).map((n) => n.id)))
    for (const t of [...alps, far]) expect(linked).toContain(t.id)
  })
})
