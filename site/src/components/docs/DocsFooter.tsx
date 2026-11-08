'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { docsLinks } from '@/components/docs/docs-navigation'

/** Previous and next page, in sidebar order, then a pointer to the beta feedback route. */
export function DocsFooter() {
  const pathname = usePathname()
  const index = docsLinks.findIndex((link) => link.href === pathname)
  const prev = index > 0 ? docsLinks[index - 1] : null
  const next = index >= 0 && index < docsLinks.length - 1 ? docsLinks[index + 1] : null

  return (
    <footer className="mt-16 border-t border-line pt-8">
      {(prev || next) && (
        <div className="flex flex-wrap justify-between gap-4">
          {prev ? (
            <Link href={prev.href} className="group flex min-h-11 flex-col text-sm">
              <span className="text-faint">Previous</span>
              <span className="group-hover:text-ink">
                <span aria-hidden="true">← </span>
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={next.href} className="group flex min-h-11 flex-col text-right text-sm">
              <span className="text-faint">Next</span>
              <span className="group-hover:text-ink">
                {next.title}
                <span aria-hidden="true"> →</span>
              </span>
            </Link>
          )}
        </div>
      )}
      <p className="mt-8 text-sm text-muted">
        Something missing or wrong?{' '}
        <Link
          href="/docs/support/"
          className="text-ink underline decoration-line underline-offset-4 hover:text-link hover:decoration-link"
        >
          Tell us how
        </Link>
        .
      </p>
    </footer>
  )
}
