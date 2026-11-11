'use client'
import {
  CatalogTable,
  type CatalogRow,
  type StatusOption,
} from '@/components/coverage/CatalogTable'
import { TrailAction } from '@/components/coverage/TrailAction'
import { useCoverageData } from '@/components/coverage/useCoverageData'
import {
  type CoverageData,
  countriesOf,
  guideBadge,
  guideStage,
  mapBadge,
  type Trail,
  takesEdits,
  trailAction,
  trailHref,
  voteCounts,
} from '@/lib/coverage'

// The guide funnel, most available first. Trails with no guide row are only on /maps/.
const STATUSES: StatusOption[] = ['published', 'built', 'pending', 'blocked'].map((value) => ({
  value,
  badge: guideBadge(value),
}))

/** What the list needs: the trails with a guide status, and where their GitHub links go. */
export type TrailsData = Pick<CoverageData, 'repo' | 'requestLabel'> & { trails: Trail[] }

function row(trail: Trail, data: TrailsData): CatalogRow {
  const shortlisted = guideStage(trail.guide) === 'shortlisted'
  // A published guide takes edits; every other trail is voted on. With no request issue yet, the
  // votes link opens one, which starts the vote.
  const edits = takesEdits(trail)
  const request = edits ? null : trailAction(trail, data, shortlisted)
  return {
    key: trail.id,
    name: trail.name,
    href: trailHref(trail.id),
    countries: countriesOf(trail).join(', '),
    status: trail.guide,
    badge: guideBadge(trail.guide),
    // The map's tag only when it falls short of the guide: a guide without its map is the odd case.
    extraBadge:
      mapBadge(trail.status).tone === 'good' ? undefined : mapBadge(trail.status, 'trail'),
    lengthKm: trail.lengthKm,
    bytes: trail.bytes,
    region: trail.continent,
    votes: trail.request
      ? { ...voteCounts(trail.request), href: trail.request.url }
      : request
        ? { up: 0, down: 0, href: request.href }
        : undefined,
    actionText: edits ? 'suggest an edit' : undefined,
    action: edits ? <TrailAction trail={trail} data={data} /> : undefined,
  }
}

/**
 * The guide catalog, ranked by votes (up minus down). It opens on the guides in the app, coming
 * soon and planned, so the trails people can vote on are in view; blocked ones are a chip away. It renders from the build's
 * copy of the data (`initial`), so the trail names and links are in the HTML for search engines,
 * then switches to the live coverage.json once it loads.
 */
export function TrailsSection({
  initial,
  sidebar,
  statusHelp,
}: {
  initial: TrailsData
  sidebar: { header: React.ReactNode; footer?: React.ReactNode }
  statusHelp?: React.ReactNode
}) {
  const state = useCoverageData()
  const data: TrailsData = state.status === 'ready' ? state.data : initial
  const rows = data.trails.filter((t) => guideStage(t.guide) !== null).map((t) => row(t, data))
  return (
    <CatalogTable
      rows={rows}
      statuses={STATUSES}
      initialStatuses={['published', 'built', 'pending']}
      columns={['length', 'size', 'votes']}
      sorts={['votes', 'status', 'name', 'country', 'length', 'size']}
      initialSort="votes"
      label="trails"
      sidebar={sidebar}
      statusHelp={statusHelp}
    />
  )
}
