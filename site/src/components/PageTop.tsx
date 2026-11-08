import Link from 'next/link'

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
}: {
  crumbs: Crumb[]
  current: string
  title: string
  /** A smaller second line under the title, such as a trail's region. */
  subtitle?: string | null
  intro?: React.ReactNode
}) {
  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-xs text-faint">
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
      <h1 className="mt-8 font-sans text-4xl leading-[1.05] font-black tracking-[-0.04em] text-balance [overflow-wrap:anywhere] sm:text-5xl">
        {title}
        {subtitle && (
          <span className="mt-2 block text-[clamp(1.125rem,3vw,1.5rem)] leading-tight font-bold tracking-[-0.02em] text-muted">
            {subtitle}
          </span>
        )}
      </h1>
      {intro && <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">{intro}</p>}
    </div>
  )
}
