'use client'
import { useEffect, useRef } from 'react'
import { loadAnalytics } from '@/lib/analytics'
import { CONSENT_EVENT, clearAnalyticsCookies, readConsent } from '@/lib/consent'

/** Starts Google Analytics once the visitor accepts it, and stops it when they withdraw. */
export function Analytics() {
  const on = useRef(false)

  useEffect(() => {
    function apply() {
      if (readConsent()?.analytics) {
        on.current = true
        loadAnalytics()
      } else if (on.current) {
        // gtag is already in memory, so delete its cookies and reload to stop it.
        clearAnalyticsCookies()
        window.location.reload()
      }
    }
    apply()
    window.addEventListener(CONSENT_EVENT, apply)
    return () => window.removeEventListener(CONSENT_EVENT, apply)
  }, [])

  return null
}
