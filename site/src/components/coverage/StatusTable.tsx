import { type Badge, guideBadge, mapBadge } from '@/lib/coverage'
import { StatusBadge } from './StatusBadge'

const ROWS: Record<'map' | 'guide', Array<[Badge, string]>> = {
  map: [
    [mapBadge('live'), 'Every cell is built. Download it in the app.'],
    [mapBadge('partial'), 'Some cells are built. The rest are dashed on the map.'],
    [
      mapBadge('planned'),
      'In the next batch, picked by votes. It changes as maps are built and votes come in.',
    ],
    [mapBadge('wishlist'), 'Requested. Votes decide what is built next.'],
  ],
  guide: [
    [guideBadge('published'), 'Install it in the app.'],
    [guideBadge('built'), 'Ready and coming in the next release.'],
    [guideBadge('pending'), 'Requested. Votes decide what is made next.'],
    [guideBadge('blocked'), 'Its OpenStreetMap route has gaps to fix first.'],
    [guideBadge(''), 'No guide planned. The trail may still have an offline map.'],
  ],
}

/**
 * The status tags and what each means: the one place they are worded, shown in the docs and in
 * the "what the tags mean" dialog (StatusLink).
 */
export function StatusTable({ kind }: { kind: 'map' | 'guide' }) {
  return (
    <dl className="not-prose grid gap-x-4 gap-y-1 text-[15px] sm:grid-cols-[minmax(9.5rem,auto)_1fr] sm:items-baseline sm:gap-y-2">
      {ROWS[kind].map(([badge, text]) => (
        <div key={badge.short} className="contents">
          <dt>
            <StatusBadge badge={badge} long />
          </dt>
          <dd className="!mt-0 mb-2 sm:mb-0">{text}</dd>
        </div>
      ))}
    </dl>
  )
}
