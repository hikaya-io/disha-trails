'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import type { NavLink } from '@/components/layout/MobileMenu'

/** The header's page links. The current section is ink and underlined, the rest muted. */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname()
  return links.map((link) => {
    const active = pathname.startsWith(link.href)
    return (
      <li key={link.href}>
        <Link
          href={link.href}
          aria-current={active ? 'page' : undefined}
          className={clsx(
            'flex min-h-11 items-center px-3 hover:text-ink hover:underline',
            active ? 'text-ink underline' : 'text-muted',
          )}
        >
          {link.label}
        </Link>
      </li>
    )
  })
}
