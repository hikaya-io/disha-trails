import Link from 'next/link'
import clsx from 'clsx'

/**
 * The link to the docs page that explains a page's tags: /docs/offline-maps/coverage/ for map
 * tags, /docs/guides/trails/ for guide tags. The docs are the one place they are explained.
 */
export function StatusLink({
  href,
  className,
}: {
  href: '/docs/offline-maps/coverage/#map-status' | '/docs/guides/trails/#guide-status'
  className?: string
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex min-h-11 items-center gap-1.5 text-[13px] text-muted underline hover:text-ink',
        className,
      )}
    >
      <span aria-hidden="true">ⓘ</span> what the tags mean
    </Link>
  )
}
