import clsx from 'clsx'
import type { Badge, Tone } from '@/lib/coverage'

const tones: Record<Tone, string> = {
  good: 'bg-good-bg text-good-ink',
  warn: 'bg-warn-bg text-warn-ink',
  bad: 'bg-bad-bg text-bad-ink',
  none: 'bg-none-bg text-none-ink',
}

/**
 * A status as a small colored tag: darker text on a light fill. The word carries the meaning, so
 * the color only speeds up scanning. `long` uses the list wording, such as "Map partial".
 */
export function StatusBadge({ badge, long = false }: { badge: Badge; long?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 text-[11px] leading-4 whitespace-nowrap',
        tones[badge.tone],
      )}
    >
      {long ? badge.short : badge.label}
    </span>
  )
}
