'use client'
import { useCallback, useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

/** Cloudflare Turnstile bot check. Loads Cloudflare's script when it mounts, not before. */
export function Turnstile({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void
  onExpire: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onExpire,
      theme: 'auto',
    })
  }, [onVerify, onExpire])

  useEffect(() => {
    const removeWidget = () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    if (window.turnstile) {
      renderWidget()
      return removeWidget
    }
    // The script may be on the page but still loading, so wait for it either way.
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', renderWidget)
    return () => {
      script?.removeEventListener('load', renderWidget)
      removeWidget()
    }
  }, [renderWidget])

  return <div ref={containerRef} className="mt-4 max-w-full overflow-x-auto" />
}
