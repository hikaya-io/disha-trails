import { readConsent } from './consent'

/**
 * The Disha GA4 property's measurement ID (G-…), set per build. Without it the site loads no
 * analytics, shows no cookie banner and the privacy page says so.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? ''

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Loads Google Analytics (gtag.js) once. Call this only after the visitor accepted analytics.
 * Page views on client-side navigation come from GA4's enhanced measurement ("page changes
 * based on browser history events"), which is on by default.
 */
export function loadAnalytics() {
  if (!GA_ID || typeof window === 'undefined' || document.getElementById('ga-script')) return
  window.dataLayer = window.dataLayer || []
  // gtag must push the arguments object itself, not an array, or GA ignores the call.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID)
  const script = document.createElement('script')
  script.id = 'ga-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)
}

/** Sends a GA4 event, but only if the visitor accepted analytics and GA has loaded. */
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || !window.gtag || !readConsent()?.analytics) return
  window.gtag('event', event, params)
}
