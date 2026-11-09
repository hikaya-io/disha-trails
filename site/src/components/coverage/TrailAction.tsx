import { type CoverageData, type Trail, trailAction } from '@/lib/coverage'

const actionClass = 'text-muted underline hover:text-ink'

/** The props that open GitHub in a new tab, so the trail or map stays open behind it. */
export const newTab = { target: '_blank', rel: 'noopener noreferrer' } as const

/** Read after a link that opens in a new tab; the ↗ shows it to sighted visitors. */
export function NewTabHint() {
  return <span className="sr-only"> (opens in a new tab)</span>
}

/** A trail's GitHub action as a small link, for the rows on /trails/ and /maps/. */
export function TrailAction({
  trail,
  data,
  shortlisted = false,
}: {
  trail: Trail
  data: Pick<CoverageData, 'repo' | 'requestLabel'>
  shortlisted?: boolean
}) {
  const action = trailAction(trail, data, shortlisted)
  if (!action) return null
  return (
    <a href={action.href} {...newTab} className={actionClass}>
      {action.label.toLowerCase()} ↗
      <NewTabHint />
    </a>
  )
}
