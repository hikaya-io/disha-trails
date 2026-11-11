/**
 * The visitor's cookie choice, kept in their own browser. Ported from hikaya.io (website-2.0,
 * src/lib/consent.ts) on 2026-11-12.
 *
 * There are two groups. Essential items (the choice itself, the light or dark theme and the
 * waitlist's bot check) are always on. Analytics (Google Analytics) runs only after the visitor
 * accepts it.
 */

export const CONSENT_KEY = 'disha-consent'
export const CONSENT_EVENT = 'disha-consent-change'

/** Raise this when a new kind of tracking is added, so everyone is asked again. */
export const CONSENT_VERSION = 1

/** How long a choice counts, in months. 12 sits inside the 6 to 12 months regulators usually cite. */
export const CONSENT_MONTHS = 12

export type Consent = {
  analytics: boolean
  version: number
  savedAt: number
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

function defaultStore(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** The saved choice, or null if there is none, it has expired, or the version changed. */
export function readConsent(
  store: Store | null = defaultStore(),
  now = Date.now(),
): Consent | null {
  if (!store) return null
  try {
    const raw = store.getItem(CONSENT_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<Consent>
    if (typeof value.analytics !== 'boolean' || typeof value.savedAt !== 'number') return null
    if (value.version !== CONSENT_VERSION) return null
    const expires = new Date(value.savedAt)
    expires.setMonth(expires.getMonth() + CONSENT_MONTHS)
    if (now >= expires.getTime()) return null
    return value as Consent
  } catch {
    return null
  }
}

export function saveConsent(
  analytics: boolean,
  store: Store | null = defaultStore(),
  now = Date.now(),
): Consent {
  const consent: Consent = { analytics, version: CONSENT_VERSION, savedAt: now }
  if (store) {
    try {
      store.setItem(CONSENT_KEY, JSON.stringify(consent))
    } catch {
      // Storage can be blocked; the choice then lasts only for this page view.
    }
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONSENT_EVENT))
  return consent
}

/** The Google Analytics cookie names: _ga, _ga_<id>, _gid and _gat*. */
export function isAnalyticsCookie(name: string): boolean {
  return name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name.startsWith('_gat')
}

/**
 * Deletes Google Analytics cookies on this host and its parent domain. GA sets them on the
 * parent (hikaya.io), so they would otherwise outlive a withdrawn choice.
 */
export function clearAnalyticsCookies() {
  if (typeof document === 'undefined') return
  const host = window.location.hostname
  const parts = host.split('.')
  const domains = [host, ...(parts.length > 2 ? [parts.slice(-2).join('.')] : [])].flatMap((d) => [
    d,
    `.${d}`,
  ])
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (!isAnalyticsCookie(name)) continue
    for (const domain of domains) document.cookie = `${name}=; ${expired}; domain=${domain}`
    document.cookie = `${name}=; ${expired}`
  }
}
