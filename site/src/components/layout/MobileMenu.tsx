'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { Button } from '@/components/Button'
import { useModalDialog } from '@/components/useModalDialog'

export type NavLink = { href: string; label: string }

/**
 * The phone menu (below md): the word "menu" in the bar, and a full-screen sheet in the page
 * color with a mono label, a "close" word and large link rows. Built on a native <dialog>, so
 * focus is trapped and Escape closes it without a library.
 */
export function MobileMenu({ links }: { links: NavLink[] }) {
  const pathname = usePathname()
  const { ref, open, close, backdropProps } = useModalDialog()
  return (
    <>
      <button
        type="button"
        onClick={open}
        className="-mr-2 flex min-h-11 items-center px-3 text-sm text-muted hover:text-ink hover:underline md:hidden"
      >
        menu
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        {...backdropProps}
        className="m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-bg px-6 pb-12 pt-4 text-ink backdrop:bg-scrim sm:px-16"
      >
        <div className="flex h-11 items-center justify-between">
          <p className="text-xs uppercase tracking-[0.08em] text-faint">Menu</p>
          <button
            type="button"
            onClick={close}
            className="-mr-2 flex min-h-11 items-center px-3 text-sm text-muted hover:text-ink hover:underline"
          >
            close
          </button>
        </div>
        <nav aria-label="Menu">
          <ul role="list" className="mt-8">
            {links.map((link) => {
              const active = pathname.startsWith(link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex min-h-14 items-center py-3 font-sans text-4xl font-extrabold tracking-[-0.035em] hover:text-ink hover:underline',
                      active ? 'text-ink' : 'text-muted',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="mt-8">
          <Button href="/#waitlist" onClick={close}>
            Join beta waitlist
          </Button>
        </div>
      </dialog>
    </>
  )
}
