import Link from 'next/link'

/**
 * A linked block, not a box: a mono label, a heavy title that underlines on hover and a short
 * description on the page background. The whole block is the link.
 */
export function FeatureCard({
  href,
  label,
  title,
  children,
  cta,
}: {
  href: string
  label: string
  title: string
  children: React.ReactNode
  cta: string
}) {
  return (
    <Link href={href} className="group flex h-full flex-col">
      <span className="text-xs uppercase tracking-[0.08em] text-faint">{label}</span>
      <span className="mt-3 font-sans text-2xl font-extrabold tracking-[-0.035em] group-hover:underline">
        {title}
      </span>
      <span className="mt-3 text-sm text-muted">{children}</span>
      <span className="mt-auto pt-6 text-sm text-ink underline">{cta} →</span>
    </Link>
  )
}
