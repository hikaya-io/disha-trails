import Link from 'next/link'
import { Container } from '@/components/Container'
import { MobileMenu, type NavLink } from '@/components/layout/MobileMenu'
import { NavLinks } from '@/components/layout/NavLinks'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'

// Where Disha works first, then how to use it. The logo is the link to the home page. "Join the
// waitlist" is a button inside the phone menu, so it is not in this list.
const links: NavLink[] = [
  { href: '/trails/', label: 'trails' },
  { href: '/maps/', label: 'maps' },
  { href: '/docs/', label: 'docs' },
]

/**
 * Sticky, with a page-colored 80% background and an 8px blur: the one effect on the site. No
 * border, no shadow, no change on scroll. From md the links sit in the bar as mono words; below
 * md they collapse into a "menu" word that opens a full-screen sheet.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-sm">
      <Container className="flex items-center justify-between gap-x-4 py-2">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-x-1 text-sm">
            <NavLinks links={links} />
            <li>
              <Link
                href="/#waitlist"
                className="flex min-h-11 items-center px-3 text-muted hover:text-ink hover:underline"
              >
                join the waitlist
              </Link>
            </li>
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </nav>
        <div className="flex items-center gap-x-1 md:hidden">
          <ThemeToggle />
          <MobileMenu links={links} />
        </div>
      </Container>
    </header>
  )
}
