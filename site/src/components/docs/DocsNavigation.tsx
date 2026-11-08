'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { docsNavigation } from '@/components/docs/docs-navigation'

/** Grouped docs links with a marker on the current page. `onNavigate` closes the mobile menu. */
export function DocsNavigation({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void
  /** Tighter spacing and smaller links, for the desktop sidebar. */
  compact?: boolean
}) {
  const pathname = usePathname()
  return (
    <nav aria-label="Documentation">
      <ul role="list" className={compact ? 'space-y-6' : 'space-y-8'}>
        {docsNavigation.map((group) => (
          <li key={group.title}>
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-faint">
              {group.title}
            </h2>
            <ul role="list" className={clsx(compact ? 'mt-2' : 'mt-3', 'border-l border-line')}>
              {group.links.map((link) => {
                const active = pathname === link.href
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        '-ml-px flex items-center border-l-2 pr-3',
                        compact ? 'min-h-8 py-0.5 pl-3 text-[13px]' : 'min-h-9 py-1 pl-4 text-sm',
                        active
                          ? 'border-ink text-ink'
                          : 'border-transparent text-muted hover:border-faint hover:text-ink',
                      )}
                    >
                      {link.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}
