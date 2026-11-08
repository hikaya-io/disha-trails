'use client'
import {
  CatalogTable,
  type CatalogRow,
  type StatusOption,
} from '@/components/coverage/CatalogTable'
import { CoverageStatus } from '@/components/coverage/CoverageStatus'
import { TrailAction } from '@/components/coverage/TrailAction'
import { useCoverageData } from '@/components/coverage/useCoverageData'
import {
  type CoverageData,
  countriesOf,
  guideBadge,
  guideStage,
  mapBadge,
  type Trail,
  trailHref,
} from '@/lib/coverage'

// The guide funnel, most available first. Trails with no guide row are only on /maps/.
const STATUSES: StatusOption[] = ['published', 'built', 'pending', 'blocked'].map((value) => ({
  value,
  badge: guideBadge(value),
}))

function row(trail: Trail, data: CoverageData): CatalogRow {
  return {
    key: trail.id,
    name: trail.name,
    href: trailHref(trail.id),
    countries: countriesOf(trail).join(', '),
    status: trail.guide,
    badge: guideBadge(trail.guide),
    // The map's tag only when it falls short of the guide: a guide without its map is the odd case.
    extraBadge: mapBadge(trail.status).tone === 'good' ? undefined : mapBadge(trail.status),
    lengthKm: trail.lengthKm,
    action: (
      <TrailAction
        trail={trail}
        data={data}
        shortlisted={guideStage(trail.guide) === 'shortlisted'}
      />
    ),
  }
}

/**
 * The guide catalog. It opens on the guides in the app and the ones coming soon; the status chips
 * bring in the planned and blocked ones, which is where votes come in.
 */
export function TrailsSection() {
  const state = useCoverageData()
  if (state.status !== 'ready') return <CoverageStatus state={state} />
  const { data } = state
  const rows = data.trails.filter((t) => guideStage(t.guide) !== null).map((t) => row(t, data))
  return (
    <CatalogTable
      rows={rows}
      statuses={STATUSES}
      initialStatuses={['published', 'built']}
      columns={['length', 'action']}
      sorts={['status', 'name', 'country', 'length']}
      label="trails"
    />
  )
}
