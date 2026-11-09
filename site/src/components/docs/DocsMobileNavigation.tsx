'use client'
import { DocsNavigation } from '@/components/docs/DocsNavigation'
import { useModalDialog } from '@/components/useModalDialog'

/**
 * Menu button and a modal <dialog> for phones and tablets (below lg). The native dialog traps
 * focus and closes on Escape; useModalDialog adds the scroll lock and backdrop click.
 */
export function DocsMobileNavigation() {
  const { ref, open, close, backdropProps } = useModalDialog()
  return (
    <>
      <button
        type="button"
        aria-label="Open documentation menu"
        onClick={open}
        className="-ml-2 flex size-11 items-center justify-center text-muted hover:text-ink lg:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <dialog
        ref={ref}
        aria-label="Documentation menu"
        {...backdropProps}
        className="m-0 h-full max-h-none w-80 max-w-[85vw] overflow-y-auto bg-bg p-6 text-ink backdrop:bg-scrim"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-faint">Docs</p>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="-mr-2 flex size-11 items-center justify-center text-muted hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-6">
          <DocsNavigation onNavigate={close} />
        </div>
      </dialog>
    </>
  )
}
