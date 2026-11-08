import Link from 'next/link'
import { Container } from '@/components/Container'

const links = [
  { href: '/trails/', label: 'trails' },
  { href: '/maps/', label: 'maps' },
  { href: '/docs/', label: 'docs' },
  { href: '/docs/faq/', label: 'faq' },
  { href: '/docs/support/', label: 'help' },
  { href: '/privacy/', label: 'privacy' },
  { href: '/#waitlist', label: 'waitlist' },
]

const link = 'min-h-8 py-1 text-muted underline hover:text-ink pointer-coarse:py-3'

/**
 * One mono line of underlined links, with the year and "top" on the right. The map credit sits
 * under it, the one place it appears on a page; the full notice is on /privacy/.
 */
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
          </ul>
          <p className="flex items-center gap-x-2 text-faint">
            <span>&copy; {new Date().getFullYear()} Hikaya</span>
            <span aria-hidden="true">·</span>
            <a href="#main" className="min-h-8 py-1 underline hover:text-ink pointer-coarse:py-3">
              top
            </a>
          </p>
        </div>
        <p className="mt-4 max-w-xl text-xs leading-5 text-faint">
          Made by{' '}
          <a href="https://hikaya.io" className="underline hover:text-ink">
            Hikaya
          </a>
          . Maps use data from{' '}
          <a href="https://www.openstreetmap.org/copyright" className="underline hover:text-ink">
            OpenStreetMap contributors
          </a>
          , available under the Open Database License, with terrain from Copernicus.{' '}
          <Link href="/privacy/#map-credits" className="underline hover:text-ink">
            Map credits
          </Link>
        </p>
      </Container>
    </footer>
  )
}
