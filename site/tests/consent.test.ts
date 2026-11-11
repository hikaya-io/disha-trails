import { describe, expect, it } from 'vitest'
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  isAnalyticsCookie,
  readConsent,
  saveConsent,
} from '../src/lib/consent'

function memoryStore() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

const day = 24 * 60 * 60 * 1000
const saved = Date.UTC(2026, 0, 15)

describe('consent', () => {
  it('has no choice until one is saved', () => {
    expect(readConsent(memoryStore())).toBeNull()
    expect(readConsent(null)).toBeNull()
  })

  it('reads back a saved choice, either way', () => {
    const store = memoryStore()
    saveConsent(true, store, saved)
    expect(readConsent(store, saved + day)?.analytics).toBe(true)
    saveConsent(false, store, saved)
    expect(readConsent(store, saved + day)?.analytics).toBe(false)
  })

  it('asks again after 12 months', () => {
    const store = memoryStore()
    saveConsent(true, store, saved)
    expect(readConsent(store, Date.UTC(2027, 0, 14))).not.toBeNull()
    expect(readConsent(store, Date.UTC(2027, 0, 15))).toBeNull()
  })

  it('asks again when the version changes or the value is broken', () => {
    const store = memoryStore()
    store.setItem(
      CONSENT_KEY,
      JSON.stringify({ analytics: true, version: CONSENT_VERSION + 1, savedAt: saved }),
    )
    expect(readConsent(store, saved)).toBeNull()
    store.setItem(CONSENT_KEY, '{not json')
    expect(readConsent(store, saved)).toBeNull()
    store.setItem(CONSENT_KEY, JSON.stringify({ analytics: 'yes', savedAt: saved }))
    expect(readConsent(store, saved)).toBeNull()
  })

  it('matches only Google Analytics cookies for deletion', () => {
    for (const name of ['_ga', '_ga_ABC123', '_gid', '_gat_gtag_G_X']) {
      expect(isAnalyticsCookie(name)).toBe(true)
    }
    for (const name of ['_gallery', 'cf_clearance', 'theme', 'ga']) {
      expect(isAnalyticsCookie(name)).toBe(false)
    }
  })
})
