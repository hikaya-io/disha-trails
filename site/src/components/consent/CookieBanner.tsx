'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { CONSENT_EVENT, readConsent, saveConsent } from '@/lib/consent'

/**
 * Two buttons of equal weight, and nothing runs until one is chosen (ported from hikaya.io).
 * Shared with the cookie dialog's Done button.
 */
export const choiceButton =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-faint px-5 font-mono text-[13px] uppercase tracking-[0.18em] text-ink hover:border-ink'

/** Asks once, at the foot of the screen, until the visitor chooses. Rendered only when GA is set up. */
export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(readConsent() === null)
    update()
    window.addEventListener(CONSENT_EVENT, update)
    return () => window.removeEventListener(CONSENT_EVENT, update)
  }, [])

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg"
    >
      <Container>
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between md:gap-10">
          <p className="max-w-2xl text-sm text-muted">
            We use essential storage to make this site work. With your consent, we also use
            analytics cookies to see how the site is used. You can change your choice at any time.
            See the{' '}
            <Link href="/privacy/#cookies" className="text-ink underline hover:text-ink-soft">
              privacy page
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-3 md:shrink-0">
            <button type="button" onClick={() => saveConsent(false)} className={choiceButton}>
              Essential only
            </button>
            <button type="button" onClick={() => saveConsent(true)} className={choiceButton}>
              Accept all
            </button>
          </div>
        </div>
      </Container>
    </div>
  )
}
