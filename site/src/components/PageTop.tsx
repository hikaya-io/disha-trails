import Link from 'next/link'
import clsx from 'clsx'

export type Crumb = { href: string; label: string }

/**
 * The top of every page but home: a mono breadcrumb, a heavy title and a one-line mono intro,
 * about 40px apart. The breadcrumb replaces a "back" link; its links are ink and underlined and
 * the current page is faint.
 */
export function PageTop({
  crumbs,
  current,
  title,
  subtitle,
  intro,
  compact = false,
  tight = false,
}: {
  crumbs: Crumb[]
  current: string
  title: string
  /** A smaller second line under the title, such as a trail's region. */
  subtitle?: string | null
  intro?: React.ReactNode
  /** A smaller title and tighter spacing, for a page whose title sits in a side column. */
  compact?: boolean
  /**
   * Smaller again, for a page whose title sits over a list in a narrow panel: the breadcrumb is
   * for screen readers only (the site header marks the page) and the intro is one short line.
   */
  tight?: boolean
}) {
  return (
    <div>
      <nav aria-label="Breadcrumb" className={clsx('text-xs text-faint', tight && 'sr-only')}>
        <ol className="flex flex-wrap items-center">
          {crumbs.map((crumb) => (
            <li key={crumb.href} className="flex items-center">
              <Link
                href={crumb.href}
                className="flex min-h-8 items-center text-ink underline hover:text-ink-soft"
              >
                {crumb.label}
              </Link>
              <span aria-hidden="true" className="px-1.5">
                /
              </span>
            </li>
          ))}
          <li aria-current="page">{current}</li>
        </ol>
      </nav>
      <h1
        className={clsx(
          'font-sans leading-[1.05] font-black tracking-[-0.04em] text-balance [overflow-wrap:anywhere]',
          tight
            ? 'text-2xl'
            : compact
              ? 'mt-4 text-3xl sm:text-4xl lg:text-3xl'
              : 'mt-8 text-4xl sm:text-5xl',
        )}
      >
        {title}
        {subtitle && (
          <span className="mt-2 block text-[clamp(1.125rem,3vw,1.5rem)] leading-tight font-bold tracking-[-0.02em] text-muted">
            {subtitle}
          </span>
        )}
      </h1>
      {intro && (
        <p
          className={clsx(
            'max-w-xl text-sm leading-relaxed text-muted',
            tight ? 'mt-1 text-[13px]' : compact ? 'mt-3' : 'mt-6',
          )}
        >
          {intro}
        </p>
      )}
    </div>
  )
}
