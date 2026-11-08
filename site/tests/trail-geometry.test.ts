import { describe, expect, it } from 'vitest'
import { colMap } from '@/app/(site)/_components/tour/disha-col-map'
import {
  formatDuration,
  pathPoints,
  pointAtShare,
  segmentStats,
  type Profile,
} from '@/lib/trail-geometry'

describe('pathPoints', () => {
  it('reads absolute and relative line-tos, with implicit repeats after a move', () => {
    expect(pathPoints('M10 10L20 10 20 20')).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
    ])
    expect(pathPoints('M1 1l2 0 0 3')).toEqual([
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 4 },
    ])
  })

  it('splits numbers that run together at a minus sign', () => {
    expect(pathPoints('M0 0l1.5-2.5-3 1')).toEqual([
      { x: 0, y: 0 },
      { x: 1.5, y: -2.5 },
      { x: -1.5, y: -1.5 },
    ])
  })

  it('refuses a command it cannot draw instead of returning a wrong line', () => {
    expect(() => pathPoints('M0 0C1 1 2 2 3 3')).toThrow('Unsupported path command "C"')
  })
})

describe('pointAtShare', () => {
  const line = pathPoints('M0 0l10 0 0 10')

  it('measures by length along the line, around corners', () => {
    expect(pointAtShare(line, 0)).toEqual({ x: 0, y: 0 })
    expect(pointAtShare(line, 0.5)).toEqual({ x: 10, y: 0 })
    expect(pointAtShare(line, 0.75)).toEqual({ x: 10, y: 5 })
    expect(pointAtShare(line, 1)).toEqual({ x: 10, y: 10 })
  })

  it('stays on the line for shares outside 0 to 1', () => {
    expect(pointAtShare(line, -1)).toEqual({ x: 0, y: 0 })
    expect(pointAtShare(line, 2)).toEqual({ x: 10, y: 10 })
  })

  it('puts the tour map’s stops where the map data says they are', () => {
    const route = pathPoints(colMap.route)
    for (const place of [colMap.places.spring, colMap.places.col, colMap.places.end]) {
      const at = pointAtShare(route, place.t)
      expect(Math.abs(at.x - place.x)).toBeLessThan(1.5)
      expect(Math.abs(at.y - place.y)).toBeLessThan(1.5)
    }
  })
})

describe('segmentStats', () => {
  const profile: Profile = colMap.profile
  const { km } = colMap.stats

  // The walking times the tour already shows: stage, start to refuge, and the climb.
  it('reproduces the tour’s distances and times', () => {
    const stage = segmentStats(profile, km, 0, 1)
    const toRefuge = segmentStats(profile, km, 0, colMap.places.hut.t)
    const climb = segmentStats(profile, km, colMap.places.balme.t, colMap.places.hut.t)
    expect([stage.km, toRefuge.km, climb.km]).toEqual([15.3, 10.3, 5.5])
    expect([stage.minutes, toRefuge.minutes, climb.minutes]).toEqual([310, 250, 140])
  })

  it('stays within 20 m of the tour’s climb and descent', () => {
    const stage = segmentStats(profile, km, 0, 1)
    expect(Math.abs(stage.up - colMap.ranges.stage.up)).toBeLessThanOrEqual(20)
    expect(Math.abs(stage.down - colMap.ranges.stage.down)).toBeLessThanOrEqual(20)
  })

  it('splits a stage into parts that add back up to it', () => {
    const first = segmentStats(profile, km, 0, 0.5)
    const second = segmentStats(profile, km, 0.5, 1)
    const whole = segmentStats(profile, km, 0, 1)
    expect(Math.abs(first.up + second.up - whole.up)).toBeLessThanOrEqual(10)
    expect(Math.abs(first.down + second.down - whole.down)).toBeLessThanOrEqual(10)
  })
})

describe('formatDuration', () => {
  it('writes hours and minutes the way the app’s route pill does', () => {
    expect(formatDuration(310)).toBe('~5 h 10')
    expect(formatDuration(120)).toBe('~2 h')
    expect(formatDuration(40)).toBe('~40 min')
  })
})
