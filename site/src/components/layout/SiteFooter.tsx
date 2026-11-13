import clsx from 'clsx'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { ManageCookies } from '@/components/consent/ManageCookies'
import { GA_ID } from '@/lib/analytics'

const links = [
  { href: '/trails/', label: 'trails' },
  { href: '/maps/', label: 'maps' },
  { href: '/docs/', label: 'docs' },
  { href: '/docs/faq/', label: 'faq' },
  { href: '/docs/support/', label: 'help' },
  { href: '/privacy/', label: 'privacy' },
  { href: '/terms/', label: 'terms' },
  { href: '/#waitlist', label: 'waitlist' },
]

const link = 'min-h-8 py-1 text-muted underline hover:text-ink pointer-coarse:py-3'

/**
 * The map data credit, short: "© OpenStreetMap contributors" is the credit OpenStreetMap asks for,
 * and ODbL names its license. The full credits (Copernicus terrain, tile sources) are on
 * /privacy/#map-credits. It closes every page with a footer; the maps page, which has none, shows
 * the credits in its own panel.
 */
export function SiteCredit({ className }: { className?: string }) {
  return (
    <p className={clsx('text-xs leading-5 text-faint', className)}>
      Map data ©{' '}
      <a href="https://www.openstreetmap.org/copyright" className="underline hover:text-ink">
        OpenStreetMap contributors
      </a>
      ,{' '}
      <a href="https://opendatacommons.org/licenses/odbl/1-0/" className="underline hover:text-ink">
        ODbL
      </a>
      .{' '}
      <Link href="/privacy/#map-credits" className="underline hover:text-ink">
        Map credits
      </Link>
    </p>
  )
}

/** One mono line of underlined links, with the year and "top" on the right, over the map credit. */
export function SiteFooter() {
  return (
    <footer className="mt-24 pb-12 pt-6 text-[13px] text-muted">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <ul role="list" className="flex flex-wrap gap-x-5">
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={`flex items-center ${link}`}>
                  {item.label}
                </Link>
              </li>
            ))}
            {GA_ID && (
              <li>
                <ManageCookies className={`flex cursor-pointer items-center ${link}`} />
              </li>
            )}
          </ul>
          <p className="flex items-center gap-x-2 text-faint">
            <span>
              Made by{' '}
              <a href="https://hikaya.io/" className="underline hover:text-ink">
                Hikaya
              </a>
              , &copy; {new Date().getFullYear()}
            </span>
            <span aria-hidden="true">·</span>
            <a href="#main" className="min-h-8 py-1 underline hover:text-ink pointer-coarse:py-3">
              top
            </a>
          </p>
        </div>
        <SiteCredit className="mt-4 max-w-xl" />
      </Container>
    </footer>
  )
}
