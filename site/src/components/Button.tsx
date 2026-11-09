import Link from 'next/link'
import clsx from 'clsx'

// Square, mono, caps with wide tracking. Hover uses `not-disabled:` because `:enabled` never
// matches a link. no-underline cancels the link underline that .prose-disha adds, since buttons
// sit inside long-form pages too.
const base =
  'inline-flex min-h-11 items-center justify-center gap-x-2 px-6 font-mono text-[13px] uppercase tracking-[0.18em] no-underline disabled:cursor-not-allowed'

const variants = {
  // One filled button per page, for the main action. The fill turns off-ink on hover. Disabled
  // is flat gray, which reads as off without looking like a rendering mistake.
  primary: 'bg-ink text-bg not-disabled:hover:bg-ink-soft disabled:bg-line disabled:text-faint',
  // An underlined word. Muted text turns ink on hover.
  secondary: 'text-muted underline not-disabled:hover:text-ink disabled:text-faint',
}

type Common = { variant?: keyof typeof variants; className?: string; children: React.ReactNode }

/** A link styled as a button when `href` is set, otherwise a <button>. */
export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: Common &
  (
    | ({ href: string } & Omit<React.ComponentProps<typeof Link>, 'className' | 'children'>)
    | ({ href?: undefined } & Omit<React.ComponentProps<'button'>, 'className' | 'children'>)
  )) {
  const classes = clsx(base, variants[variant], className)
  if (props.href !== undefined) {
    return (
      <Link {...(props as React.ComponentProps<typeof Link>)} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" {...(props as React.ComponentProps<'button'>)} className={classes}>
      {children}
    </button>
  )
}
