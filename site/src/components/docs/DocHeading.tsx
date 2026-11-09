/**
 * h2 and h3 in docs and guide pages. rehype-slug supplies the id; this adds a link to it with a
 * "#" that shows on hover or focus, as Minou's headings do. scroll-mt-5 plus the page-level
 * scroll-padding (5rem) lands a jumped-to heading about 100px down, below the docs header and,
 * on small screens, the section bar.
 */
export function DocHeading({
  level,
  id,
  children,
}: {
  level: 2 | 3
  id?: string
  children?: React.ReactNode
}) {
  const Tag = level === 2 ? 'h2' : 'h3'
  if (!id) return <Tag>{children}</Tag>
  return (
    <Tag id={id} className="group scroll-mt-5">
      <a href={`#${id}`} className="heading-anchor">
        {children}
        <span
          aria-hidden="true"
          className="ml-2 text-faint opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          #
        </span>
      </a>
    </Tag>
  )
}
