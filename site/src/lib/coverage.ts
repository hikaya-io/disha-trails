/**
 * The coverage data behind /maps/ and /trails/, and the pure helpers both pages use.
 *
 * disha-tiles builds coverage.json daily (tools/coverage-map.py --json-out) and publishes it to
 * the gh-pages branch of disha-trails, so the pages pick up new maps, guides and votes without a
 * site rebuild. See docs/coverage-dashboard.md in disha-tiles for where each field comes from.
 */

/** [west, south, east, north] in degrees. */
export type Bounds = [number, number, number, number]

/**
 * Offline map status from the tile catalog. live: every cell along the route is published.
 * partial: some are. planned: queued for the next build. candidate: listed, not enabled.
 * wishlist: only in the guides registry, with no tile area yet.
 */
export type MapStatus = 'live' | 'partial' | 'planned' | 'candidate' | 'wishlist'

export type TrailRequest = { number: number; url: string; votes: number }

export type Trail = {
  id: string
  name: string
  countries: string[]
  /** ISO codes, set on rows that come from the guides registry instead of `countries`. */
  countryCodes?: string[]
  continent: string
  lengthKm: number | null
  /** Published bytes of the route's cells. */
  bytes: number
  status: MapStatus
  bbox: Bounds | null
  cellIds: string[]
  /** Status in the disha-guides registry, or "" when the trail has no guide row. */
  guide: string
  request: TrailRequest | null
  /** OpenStreetMap route relation the trail's route comes from. Missing on a few rows. */
  osmRelation?: number | null
}

export type City = {
  id: string
  name: string
  countryCodes: string[]
  status: MapStatus
  bbox: Bounds
  cellIds: string[]
}

export type CoverageData = {
  /** Lower-left corners of 1° land squares with no published cell. */
  land: Array<[number, number]>
  /**
   * Lower-left corners of 1° land squares with at least one published cell. Not drawn: 1° doesn't
   * divide into z10 cells, so the map draws the cells' z8 parent tiles instead.
   */
  covered: Array<[number, number]>
  /** Published z10 cells. */
  cells: Record<string, Bounds>
  /** Cells along a trail or city that are not built yet. */
  routeCells: Record<string, Bounds>
  trails: Trail[]
  cities: City[]
  /** GitHub repo that holds trail requests, such as "andrewtpham/disha-trails". */
  repo: string
  requestLabel: string
  /** "YYYY-MM-DD". */
  generated: string
}

/** Checks the fields the pages read, so a broken build of the file fails with a clear message. */
export function parseCoverage(json: unknown): CoverageData {
  const data = json as Partial<CoverageData> | null
  const missing = (['land', 'covered', 'trails', 'cities'] as const).filter(
    (key) => !Array.isArray(data?.[key]),
  )
  if (!data || missing.length || typeof data.cells !== 'object' || !data.repo) {
    throw new Error(`coverage.json is missing ${missing.join(', ') || 'cells or repo'}`)
  }
  return data as CoverageData
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** Country names for a row, from `countries` or, failing that, its ISO codes. */
export function countriesOf(row: { countries?: string[]; countryCodes?: string[] }): string[] {
  if (row.countries?.length) return row.countries
  return (row.countryCodes ?? []).map((code) => {
    try {
      return regionNames.of(code) ?? code
    } catch {
      // An unknown code is still better shown than dropped.
      return code
    }
  })
}

/** What a hiker cares about: can I download it, some of it, or not yet. */
export type MapAvailability = 'available' | 'partial' | 'none'

export function mapAvailability(status: MapStatus): MapAvailability {
  if (status === 'live') return 'available'
  if (status === 'partial') return 'partial'
  return 'none'
}

export const MAP_LABELS: Record<MapAvailability, string> = {
  available: 'Available',
  partial: 'Partial',
  none: 'Not yet',
}

/**
 * Registry statuses folded into what a visitor can act on. `published` guides are in the app;
 * `built` ones are made and waiting to ship; `pending` and `blocked` are still to do (blocked
 * means the OpenStreetMap route has gaps). `retired` and no row show nothing.
 */
export type GuideAvailability = 'available' | 'soon' | 'planned' | 'none'

export function guideAvailability(guide: string): GuideAvailability {
  if (guide === 'published') return 'available'
  if (guide === 'built') return 'soon'
  if (guide === 'pending' || guide === 'blocked') return 'planned'
  return 'none'
}

export const GUIDE_LABELS: Record<GuideAvailability, string> = {
  available: 'Available',
  soon: 'Coming soon',
  planned: 'Planned',
  none: 'None',
}

/** A status tag's color: green, yellow, red or gray. */
export type Tone = 'good' | 'warn' | 'bad' | 'none'

/** A status as a tag: its word on the trail page, a longer one in lists, and its color. */
export type Badge = { tone: Tone; label: string; short: string }

/** An offline map's status as a tag. Shortlisted maps are gray: nothing to download yet. */
export function mapBadge(status: MapStatus): Badge {
  if (status === 'live') return { tone: 'good', label: 'Available', short: 'Map available' }
  if (status === 'partial') return { tone: 'warn', label: 'Partial', short: 'Map partial' }
  if (status === 'planned' || status === 'candidate') {
    return { tone: 'none', label: 'Shortlisted', short: 'Map shortlisted' }
  }
  return { tone: 'none', label: 'Not yet', short: 'No map yet' }
}

/** A guide's status as a tag. Blocked is red: its OpenStreetMap route has gaps to fix first. */
export function guideBadge(guide: string): Badge {
  if (guide === 'published') return { tone: 'good', label: 'Available', short: 'Guide available' }
  if (guide === 'built') return { tone: 'warn', label: 'Coming soon', short: 'Guide coming soon' }
  if (guide === 'pending') return { tone: 'none', label: 'Planned', short: 'Guide planned' }
  if (guide === 'blocked') return { tone: 'bad', label: 'Blocked', short: 'Guide blocked' }
  return { tone: 'none', label: 'None', short: 'No guide' }
}

/**
 * The funnel both pages are built around, for offline maps and guides alike. Popular: trails
 * people want, ranked by the 👍 on their request issue. Shortlisted: the next batch, picked from
 * the popular ones. Available: in the app.
 */
export type Stage = 'available' | 'shortlisted' | 'popular'

export const STAGES: Stage[] = ['available', 'shortlisted', 'popular']

/** Where an offline map is in the funnel. Partial maps count as available: some cells download. */
export function mapStage(status: MapStatus): Stage {
  if (status === 'live' || status === 'partial') return 'available'
  if (status === 'planned' || status === 'candidate') return 'shortlisted'
  return 'popular'
}

/** Where a guide is in the funnel, or null for a trail with no guide row or a retired one. */
export function guideStage(guide: string): Stage | null {
  if (guide === 'published') return 'available'
  if (guide === 'built') return 'shortlisted'
  if (guide === 'pending' || guide === 'blocked') return 'popular'
  return null
}

const votes = (row: { request?: TrailRequest | null }) => row.request?.votes ?? 0

/** A sorted copy: most votes first, then A to Z. */
export function byVotes<T extends { name: string; request?: TrailRequest | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => votes(b) - votes(a) || a.name.localeCompare(b.name))
}

/** Whether a row's name or countries contain the query, ignoring case and spaces at the ends. */
export function matchesQuery(
  row: { name: string; countries?: string[]; countryCodes?: string[] },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase()
  return !needle || `${row.name} ${countriesOf(row).join(' ')}`.toLowerCase().includes(needle)
}

/** Counts for the stats row on /maps/. */
export function coverageStats(data: Pick<CoverageData, 'trails' | 'cities'>) {
  const live = data.trails.filter((t) => t.status === 'live')
  return {
    trailsWithMaps: live.length,
    countries: new Set(live.flatMap(countriesOf)).size,
    guides: data.trails.filter((t) => guideAvailability(t.guide) === 'available').length,
    cities: data.cities.filter((c) => c.status === 'live' || c.status === 'partial').length,
  }
}

/** A new trail-request issue, titled so the generator can match it back to the trail's id. */
export function requestUrl(data: Pick<CoverageData, 'repo' | 'requestLabel'>, trail: Trail) {
  const params = new URLSearchParams({
    template: 'trail-request.yml',
    labels: data.requestLabel,
    title: `Trail request: ${trail.name} [${trail.id}]`,
  })
  return `https://github.com/${data.repo}/issues/new?${params}`
}

/**
 * Label on suggested edits to a published guide: a moved spring, a closed hut, a reroute. Issues
 * with it come from .github/ISSUE_TEMPLATE/trail-edit.yml.
 */
export const EDIT_LABEL = 'trail-edit'

/** A trail is open to edits once its guide is published and its map cells are all built. */
export function takesEdits(trail: Pick<Trail, 'status' | 'guide'>): boolean {
  return trail.status === 'live' && guideStage(trail.guide) === 'available'
}

/**
 * What an edit is about, when the button knows: it goes in the issue title, the one part of an
 * issue form a link can always fill in, so edits can be sorted by searching titles.
 */
export type EditTopic = 'route'

/** A new suggested-edit issue, titled with the trail id like a request, so it can be found again. */
export function editUrl(data: Pick<CoverageData, 'repo'>, trail: Trail, topic?: EditTopic) {
  const params = new URLSearchParams({
    template: 'trail-edit.yml',
    labels: EDIT_LABEL,
    title: `Trail edit${topic ? ` (${topic})` : ''}: ${trail.name} [${trail.id}]`,
  })
  return `https://github.com/${data.repo}/issues/new?${params}`
}

/**
 * What a visitor can do about a trail, all on GitHub. A trail with a published guide and a built
 * map takes edits. Otherwise it's a request: its vote count when one is open, or a link to open
 * one. A shortlisted trail is already picked, so it shows its votes but no link to request it.
 */
export function trailAction(
  trail: Trail,
  data: Pick<CoverageData, 'repo' | 'requestLabel'>,
  shortlisted = false,
): { href: string; label: string } | null {
  if (takesEdits(trail)) return { href: editUrl(data, trail), label: 'Suggest an edit' }
  if (trail.request) {
    const { votes, url } = trail.request
    return { href: url, label: `${votes} ${votes === 1 ? 'vote' : 'votes'} · add yours` }
  }
  if (shortlisted) return null
  return { href: requestUrl(data, trail), label: requestLabel(trail) }
}

/**
 * What a request is for, named after what's missing. It's still one request issue per trail, so
 * every vote for the trail lands in one place; the form asks which part matters most.
 */
export function requestLabel(trail: Pick<Trail, 'status' | 'guide'>): string {
  const hasMap = mapStage(trail.status) === 'available'
  const hasGuide = guideStage(trail.guide) === 'available'
  if (hasMap && !hasGuide) return 'Request a guide'
  if (hasGuide && !hasMap) return 'Request a map'
  return 'Request this trail'
}

/** The trail's open request when there is one, or a new one. */
export function requestHref(data: Pick<CoverageData, 'repo' | 'requestLabel'>, trail: Trail) {
  return trail.request?.url ?? requestUrl(data, trail)
}

/** GitHub's own issue search, most 👍 first: GitHub does the listing and the voting. */
function issueSearch(repo: string, query: string) {
  const q = `is:issue is:open ${query} sort:reactions-+1-desc`
  return `https://github.com/${repo}/issues?${new URLSearchParams({ q })}`
}

/** Open suggested edits for one trail. */
export function editsUrl(data: Pick<CoverageData, 'repo'>, trail: Trail) {
  return issueSearch(data.repo, `label:${EDIT_LABEL} in:title "[${trail.id}]"`)
}

/** Every open trail request. */
export function requestsUrl(data: Pick<CoverageData, 'repo' | 'requestLabel'>) {
  return issueSearch(data.repo, `label:${data.requestLabel}`)
}

const number = new Intl.NumberFormat('en-US')

export function formatLength(km: number | null): string {
  return km ? `${number.format(Math.round(km))} km` : '–'
}

export function formatSize(bytes: number): string {
  return bytes ? `${number.format(Math.round(bytes / 1e6))} MB` : '–'
}

/** The /maps/ link that zooms the map to a trail or city. */
export function mapHref(kind: 'trail' | 'city', id: string): string {
  return `/maps/?${kind}=${encodeURIComponent(id)}`
}

/**
 * A trail name as a title and an optional qualifier, for the trail page's heading. A trailing
 * "(…)" or a ": …" part is the qualifier: "GR20 (Corsica)" → GR20 + Corsica, "Pacific Crest
 * Trail: Washington" → Pacific Crest Trail + Washington. Anything else stays whole.
 */
export function splitTrailName(name: string): { title: string; qualifier: string | null } {
  const match = /^(.+?)\s*\(([^()]+)\)$/.exec(name) ?? /^(.+?):\s+(.+)$/.exec(name)
  return match ? { title: match[1], qualifier: match[2] } : { title: name, qualifier: null }
}

/** A trail's own page on this site. */
export function trailHref(id: string): string {
  return `/trails/${encodeURIComponent(id)}/`
}

/** The route relation on openstreetmap.org, or null when the trail has none. */
export function osmUrl(trail: Pick<Trail, 'osmRelation'>): string | null {
  return trail.osmRelation ? `https://www.openstreetmap.org/relation/${trail.osmRelation}` : null
}

/** The same relation on Waymarked Trails, which draws it on a hiking map. */
export function waymarkedUrl(trail: Pick<Trail, 'osmRelation'>): string | null {
  return trail.osmRelation
    ? `https://hiking.waymarkedtrails.org/#route?id=${trail.osmRelation}`
    : null
}

/** How many of the route's map cells are built, for the trail page and the map caption. */
export function cellProgress(
  trail: Pick<Trail, 'cellIds'>,
  data: Pick<CoverageData, 'cells'>,
): { built: number; total: number } {
  return {
    built: trail.cellIds.filter((id) => id in data.cells).length,
    total: trail.cellIds.length,
  }
}

/** The meta description for a trail's page. */
export function trailDescription(trail: Trail): string {
  const where = countriesOf(trail).join(', ')
  const length = trail.lengthKm ? `, ${formatLength(trail.lengthKm)}` : ''
  const map = MAP_LABELS[mapAvailability(trail.status)].toLowerCase()
  const guide = GUIDE_LABELS[guideAvailability(trail.guide)].toLowerCase()
  return `${trail.name}${where ? ` in ${where}` : ''}${length}. Offline map: ${map}. Guide: ${guide}. See where the map cells run along the route, with its OpenStreetMap source.`
}
