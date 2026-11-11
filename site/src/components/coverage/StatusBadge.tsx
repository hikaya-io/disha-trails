import clsx from 'clsx'
import type { Badge, Tone } from '@/lib/coverage'

const tones: Record<Tone, string> = {
  good: 'bg-good-bg text-good-ink',
  warn: 'bg-warn-bg text-warn-ink',
  bad: 'bg-bad-bg text-bad-ink',
  none: 'bg-none-bg text-none-ink',
}

// A map tag's dot, as on the maps page: solid when available, a ring of its color around a light
// fill when partial, a gray ring when shortlisted; teal for a trail, pink for a city.
const dots: Record<'trail' | 'city', Record<'solid' | 'ring', string>> = {
  trail: { solid: 'bg-trail', ring: 'border-[1.5px] border-trail bg-trail-fill' },
  city: { solid: 'bg-city', ring: 'border-[1.5px] border-city bg-city-fill' },
}

function Dot({ mark, shape }: { mark: 'trail' | 'city' | null; shape: 'solid' | 'ring' | 'gray' }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'size-2 shrink-0 rounded-full',
        shape === 'gray' || !mark ? 'border-[1.5px] border-faint' : dots[mark][shape],
      )}
    />
  )
}

/**
 * A status as a small tag: darker text on a light fill. A map tag (one with a `mark`) is instead a
 * light neutral tag led by its dot from the map, so a tag and its place's dot read alike; one that
 * stands for both kinds, such as a filter, shows the trail's and the city's dots. The word carries
 * the meaning, so the color only speeds up scanning. `long` uses the list wording, such as
 * "Guide planned".
 */
export function StatusBadge({ badge, long = false }: { badge: Badge; long?: boolean }) {
  const { mark, shape } = badge
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] leading-4 whitespace-nowrap',
        mark && shape ? 'gap-1.5 bg-ink/[0.06] text-ink' : tones[badge.tone],
      )}
    >
      {mark &&
        shape &&
        (mark === 'any' && shape !== 'gray' ? (
          <span className="flex gap-0.5">
            <Dot mark="trail" shape={shape} />
            <Dot mark="city" shape={shape} />
          </span>
        ) : (
          <Dot mark={mark === 'any' ? null : mark} shape={shape} />
        ))}
      {long ? badge.short : badge.label}
    </span>
  )
}
