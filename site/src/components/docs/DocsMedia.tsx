/* eslint-disable @next/next/no-img-element -- Docs media comes from a CDN or bucket and may be an animated GIF; next/image would add nothing here. */

export type DocsMediaProps = {
  kind?: 'screenshot' | 'gif'
  title: string
  /** Capture guidance, shown only in development while `src` is missing. */
  description?: string
  /** Public https URL of the finished image. */
  src?: string
  /** Defaults to the title. */
  alt?: string
  caption?: string
}

/**
 * A screenshot or GIF with a caption, after Minou's DocsMedia. Without `src` it shows a capture
 * brief in development so the page can be written first, and renders nothing in a production
 * build so visitors never see an empty placeholder.
 */
export function DocsMedia({
  kind = 'screenshot',
  title,
  description,
  src,
  alt,
  caption,
}: DocsMediaProps) {
  if (src) {
    return (
      <figure className="my-8">
        <div className="overflow-hidden border border-line bg-surface">
          <img
            src={src}
            alt={alt || title}
            loading="lazy"
            decoding="async"
            className="block h-auto max-h-[75vh] w-full object-contain"
          />
        </div>
        <figcaption className="mt-3 text-sm text-muted">
          <span className="text-ink">{title}</span>
          {caption ? `. ${caption}` : null}
        </figcaption>
      </figure>
    )
  }
  if (process.env.NODE_ENV === 'production') return null
  return (
    <aside className="my-8 border border-dashed border-faint bg-surface p-5 text-sm">
      <p className="text-xs uppercase tracking-widest text-muted">
        {kind === 'gif' ? 'GIF placeholder' : 'Screenshot placeholder'} (development only)
      </p>
      <p className="mt-1 text-ink">{title}</p>
      {description && <p className="mt-2 text-muted">Capture brief: {description}</p>}
    </aside>
  )
}
