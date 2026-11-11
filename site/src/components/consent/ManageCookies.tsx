'use client'
import { useRef, useState } from 'react'
import { readConsent, saveConsent } from '@/lib/consent'
import { choiceButton } from './CookieBanner'

const rowClass = 'flex gap-x-4 border-t border-line py-4'
const boxClass = 'mt-1 size-5 flex-none accent-[var(--ink)] disabled:opacity-60'

/**
 * A button that opens the cookie preferences, to change or withdraw the choice. Uses the native
 * <dialog>, which brings its own focus trap, Escape to close and backdrop.
 */
export function ManageCookies({
  className = 'underline hover:text-ink',
  children = 'cookies',
}: {
  className?: string
  children?: React.ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [analytics, setAnalytics] = useState(false)

  const open = () => {
    setAnalytics(readConsent()?.analytics ?? false)
    dialog.current?.showModal()
  }
  const close = () => dialog.current?.close()

  return (
    <>
      <button type="button" onClick={open} className={`cursor-pointer ${className}`}>
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cookie-dialog-title"
        // A click on the backdrop lands on the dialog element itself.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-line bg-bg p-6 text-left font-sans text-base text-ink normal-case tracking-normal backdrop:bg-scrim sm:p-8"
      >
        <div className="flex items-start justify-between gap-x-6">
          <h2 id="cookie-dialog-title" className="text-xl font-bold">
            Cookie preferences
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="-m-2 flex size-11 items-center justify-center text-muted hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-5">
              <path d="m5.636 4.223 14.142 14.142-1.414 1.414L4.222 5.637z" />
              <path d="M4.222 18.363 18.364 4.22l1.414 1.414L5.636 19.777z" />
            </svg>
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Choose what you are comfortable with. You can change this at any time.
        </p>
        <div className="mt-5">
          <div className={rowClass}>
            <input id="cookies-essential" type="checkbox" checked disabled className={boxClass} />
            <label htmlFor="cookies-essential" className="text-sm">
              <span className="block font-semibold">Essential</span>
              <span className="mt-1 block text-muted">
                Remembers your cookie choice and your light or dark theme, and checks the waitlist
                form for bots. Always on.
              </span>
            </label>
          </div>
          <div className={rowClass}>
            <input
              id="cookies-analytics"
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className={boxClass}
            />
            <label htmlFor="cookies-analytics" className="text-sm">
              <span className="block font-semibold">Analytics</span>
              <span className="mt-1 block text-muted">
                Google Analytics shows us which pages are viewed and how visitors use the site, so
                we can improve it. It sets cookies in your browser.
              </span>
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            saveConsent(analytics)
            close()
          }}
          className={`mt-5 ${choiceButton}`}
        >
          Done
        </button>
      </dialog>
    </>
  )
}
