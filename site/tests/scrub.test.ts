import { describe, expect, it } from 'vitest'
import { formatKm, nextStop } from '@/lib/scrub'

const pois = [
  { km: 10, name: 'Hut' },
  { km: 3, name: 'Spring' },
  { km: 20, name: 'Pass' },
]

describe('nextStop', () => {
  it('returns the closest stop ahead, whatever the list order', () => {
    expect(nextStop(pois, 0)).toEqual({ poi: pois[1], distanceKm: 3 })
    expect(nextStop(pois, 5)).toEqual({ poi: pois[0], distanceKm: 5 })
  })

  it('treats a stop at the current position as reached', () => {
    expect(nextStop(pois, 3)?.poi.name).toBe('Hut')
  })

  it('returns null past the last stop and for an empty list', () => {
    expect(nextStop(pois, 20)).toBeNull()
    expect(nextStop([], 0)).toBeNull()
  })
})

describe('formatKm', () => {
  it('shows one decimal below 10 km and whole kilometers above', () => {
    expect(formatKm(2.44)).toBe('2.4 km')
    expect(formatKm(12.4)).toBe('12 km')
  })
})
