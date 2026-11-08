import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'

/** App icon plus the lowercase wordmark (DM Sans 800, -0.04em), linking home. */
export function Logo() {
  return (
    <Link
      href="/"
      aria-label="disha home"
      className="group -mx-2 flex min-h-11 items-center gap-2.5 px-2"
    >
      <AppIcon size={28} />
      <span className="font-sans text-xl font-extrabold tracking-[-0.04em] group-hover:underline">
        disha
      </span>
    </Link>
  )
}
