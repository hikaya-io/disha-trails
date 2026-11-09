import { describe, expect, it } from 'vitest'
import { absolutize, MAP_LAYERS, osmClassicStyle, styleUrl } from '@/lib/map/layers'
import { formatDistance, formatHeight, nearestSample, pointAtKm } from '@/lib/trail-route'
import {
  corridorLine,
  cumulativeKm,
  fillGaps,
  haversineKm,
  resample,
  simplify,
  terrarium,
  tilePixel,
} from '../scripts/route-profile.mjs'

describe('map layers', () => {
  it('offers Terrain, OpenFreeMap and OSM Classic, in that order', () => {
    expect(MAP_LAYERS.map((l) => l.label)).toEqual(['Terrain', 'OpenFreeMap', 'OSM Classic'])
  })
  it('picks the light or dark style by theme, and builds OSM Classic in code', () => {
    expect(styleUrl('terrain', 'dark')).toBe('/map/style-dark.json')
    expect(styleUrl('openfreemap', 'light')).toBe('/map/ofm-light.json')
    expect(styleUrl('osm', 'dark')).toBeNull()
    const osm = osmClassicStyle('https://hikaya.app')
    expect(osm.glyphs).toBe('https://hikaya.app/map/fonts/{fontstack}/{range}.pbf')
    expect(osm.layers).toHaveLength(1)
  })
  it('makes relative glyph and sprite urls absolute, and leaves full ones alone', () => {
    const style = absolutize(
      {
        version: 8,
        sources: {},
        layers: [],
        glyphs: '/map/fonts/{fontstack}/{range}.pbf',
        sprite: '/map/sprite',
      },
      'https://hikaya.app',
    )
    expect(style.glyphs).toBe('https://hikaya.app/map/fonts/{fontstack}/{range}.pbf')
    expect(style.sprite).toBe('https://hikaya.app/map/sprite')
    const open = absolutize(
      {
        version: 8,
        sources: {},
        layers: [],
        glyphs: 'https://example.com/{fontstack}/{range}.pbf',
      },
      'https://hikaya.app',
    )
    expect(open.glyphs).toBe('https://example.com/{fontstack}/{range}.pbf')
  })
})

describe('trail route', () => {
  const profile: [number, number, number, number][] = [
    [0, 1000, 10, 45],
    [1, 1100, 10.01, 45],
    [2, 1050, 10.02, 45],
  ]
  it('finds the point at a distance between two samples', () => {
    const [lon, lat] = pointAtKm(profile, 0.5)!
    expect(lon).toBeCloseTo(10.005, 6)
    expect(lat).toBe(45)
    expect(pointAtKm(profile, -1)).toEqual([10, 45])
    expect(pointAtKm(profile, 9)).toEqual([10.02, 45])
    expect(pointAtKm([], 1)).toBeNull()
  })
  it('finds the sample nearest a screen point', () => {
    const project = ([lon]: [number, number]) => ({ x: (lon - 10) * 10000, y: 0 })
    // The km-1 sample projects to x 100: 4 across and 3 down is 5 pixels away.
    const near = nearestSample(profile, { x: 96, y: 3 }, project)!
    expect(near.km).toBe(1)
    expect(near.pixels).toBeCloseTo(5, 6)
  })
  it('formats distances and heights in either units', () => {
    expect(formatDistance(10, 'metric')).toBe('10.0 km')
    expect(formatDistance(10, 'imperial')).toBe('6.2 mi')
    expect(formatHeight(2104.4, 'metric')).toBe('2,104 m')
    expect(formatHeight(1000, 'imperial')).toBe('3,281 ft')
  })
})

describe('route profile build', () => {
  it('measures great-circle distance', () => {
    // One degree of latitude is about 111.2 km.
    expect(haversineKm([0, 0], [0, 1])).toBeCloseTo(111.19, 1)
    expect(
      cumulativeKm([
        [0, 0],
        [0, 1],
        [0, 2],
      ]).map((k) => Math.round(k)),
    ).toEqual([0, 111, 222])
  })
  it('joins corridor stages that meet, keeping one copy of each meeting point', () => {
    const stage = (coordinates: number[][]) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
    })
    const line = corridorLine({
      type: 'FeatureCollection',
      features: [
        stage([
          [0, 0],
          [0, 1],
        ]),
        stage([
          [0, 1],
          [0, 2],
        ]),
      ],
    })
    expect(line).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ])
    expect(() => corridorLine({ type: 'FeatureCollection', features: [] })).toThrow()
  })
  it('resamples evenly and keeps the last point', () => {
    const points = resample(
      [
        [0, 0],
        [0, 1],
      ],
      50,
    )
    expect(points.map((p) => Math.round(p.km))).toEqual([0, 50, 100, 111])
    expect(points[1].lat).toBeCloseTo(50 / 111.19, 3)
    expect(points.at(-1)).toMatchObject({ lon: 0, lat: 1 })
  })
  it('simplifies a straight line to its ends and keeps a real bend', () => {
    expect(
      simplify(
        [
          [0, 0],
          [0, 0.5],
          [0, 1],
        ],
        10,
      ),
    ).toEqual([
      [0, 0],
      [0, 1],
    ])
    expect(
      simplify(
        [
          [0, 0],
          [0.01, 0.5],
          [0, 1],
        ],
        10,
      ),
    ).toHaveLength(3)
  })
  it('decodes Terrarium heights', () => {
    expect(terrarium(128, 0, 0)).toBe(0)
    expect(terrarium(131, 230, 0)).toBe(998)
  })
  it('finds the tile and pixel a point falls in', () => {
    expect(tilePixel(0, 0, 1, 512)).toEqual({ tx: 1, ty: 1, px: 0, py: 0 })
    expect(tilePixel(-90, 0, 1, 512)).toMatchObject({ tx: 0, px: 256 })
  })
  it('fills short gaps in the heights and gives up on long ones or open ends', () => {
    expect(fillGaps([100, null, 300], 0.5)).toEqual([100, 200, 300])
    expect(fillGaps([100, null, null, 400], 0.5)).toEqual([100, 200, 300, 400])
    expect(fillGaps([100, null, null, 400], 0.1)).toBeNull()
    expect(fillGaps([null, 200, 300], 0.5)).toBeNull()
  })
})
