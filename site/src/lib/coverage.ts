/**
 * The coverage data behind /maps/ and /trails/, and the pure helpers both pages use.
 *
 * disha-tiles builds coverage.json daily (tools/coverage-map.py --json-out), pushes it to the
 * coverage-data branch of disha-trails and triggers a redeploy, which copies it into the site as
 * /coverage.json. See docs/coverage-dashboard.md in disha-tiles for where each field comes from.
 */

/** [west, south, east, north] in degrees. */
export type Bounds = [number, number, number, number]

/**
 * Offline map status from the tile catalog. live: every cell along the route is published.
 * partial: some are. planned: in the next batch, shown as shortlisted; the tile repo recomputes it
 * on every run from what's enabled, built and voted on, so it rotates. candidate: has a tile area
 * but is waiting, not in the next batch. wishlist: only in the guides registry, no tile area yet.
 */
export type MapStatus = 'live' | 'partial' | 'planned' | 'candidate' | 'wishlist'

/**
 * A trail's open request issue on GitHub. Its 👍 and 👎 are the up and down votes, counted daily
 * from accounts at least 30 days old; `votes` is the score, up minus down. Files written before
 * 2026-11-10 have only `votes`, the 👍 count.
 */
export type TrailRequest = {
  number: number
  url: string
  votes: number
  up?: number
  down?: number
}

/** A request's up and down votes, reading older files' `votes` as all up. */
export function voteCounts(request: TrailRequest): { up: number; down: number } {
  return { up: request.up ?? request.votes, down: request.down ?? 0 }
}

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
  /** Wishlist rows only: the extent of the trail's countries, to frame a map with no cells yet. */
  countryBox?: Bounds | null
  cellIds: string[]
  /** Status in the disha-guides registry, or "" when the trail has no guide row. */
  guide: string
  request: TrailRequest | null
  /** OpenStreetMap route relation the trail's route comes from. Missing on a few rows. */
  osmRelation?: number | null
  /** When its map was last built, YYYY-MM-DD (see formatDay). Missing in files before 2026-11-10. */
  updated?: string | null
}

export type City = {
  id: string
  name: string
  countryCodes: string[]
  status: MapStatus
  bbox: Bounds
  cellIds: string[]
  /** When its map was last built, YYYY-MM-DD (see formatDay). Missing in files before 2026-11-10. */
  updated?: string | null
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
  /** GitHub repo that holds trail requests, such as "hikaya-io/disha-trails". */
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
 * `built` ones are made and waiting to ship; `pending` ones are still to do. `retired` and no row
 * show nothing.
 */
export type GuideAvailability = 'available' | 'soon' | 'planned' | 'none'

export function guideAvailability(guide: string): GuideAvailability {
  if (guide === 'published') return 'available'
  if (guide === 'built') return 'soon'
  if (guide === 'pending') return 'planned'
  return 'none'
}

export const GUIDE_LABELS: Record<GuideAvailability, string> = {
  available: 'Available',
  soon: 'Coming soon',
  planned: 'Planned',
  none: 'None',
}

/** A status tag's color: green, yellow or gray. */
export type Tone = 'good' | 'warn' | 'none'

/**
 * What a map tag is drawn like: the dot of the trail (teal) or city (pink) it belongs to, or, for
 * a tag that stands for both such as a filter, the same shapes in ink. See StatusBadge.
 */
export type Mark = 'trail' | 'city' | 'any'

/**
 * A status as a tag: its word on the trail page, a longer one in lists, and its color. A map tag
 * also carries its `mark` and the `shape` of its dot: solid when available, a colored ring when
 * partial, a gray ring when shortlisted.
 */
export type Badge = {
  tone: Tone
  label: string
  short: string
  mark?: Mark
  shape?: 'solid' | 'ring' | 'gray'
}

/**
 * An offline map's status as a tag. Available and partial are drawn like the place's dot on the
 * map (`mark`): solid when available, outlined when partial. Shortlisted maps are gray: nothing
 * to download yet.
 */
export function mapBadge(status: MapStatus, mark: Mark = 'any'): Badge {
  // Available and partial need no "Map": drawn in the trail or city color, they read as map tags.
  if (status === 'live') {
    return { tone: 'good', label: 'Available', short: 'Available', mark, shape: 'solid' }
  }
  if (status === 'partial') {
    return { tone: 'warn', label: 'Partial', short: 'Partial', mark, shape: 'ring' }
  }
  if (status === 'planned') {
    return { tone: 'none', label: 'Shortlisted', short: 'Map shortlisted', mark, shape: 'gray' }
  }
  return { tone: 'none', label: 'Not yet', short: 'No map yet' }
}

/** A guide's status as a tag. */
export function guideBadge(guide: string): Badge {
  if (guide === 'published') return { tone: 'good', label: 'Available', short: 'Guide available' }
  if (guide === 'built') return { tone: 'warn', label: 'Coming soon', short: 'Guide coming soon' }
  if (guide === 'pending') return { tone: 'none', label: 'Planned', short: 'Guide planned' }
  return { tone: 'none', label: 'None', short: 'No guide' }
}

/**
 * The funnel both pages are built around, for offline maps and guides alike. Popular: trails
 * people want, ranked by the 👍 on their request issue. Shortlisted: the next batch, picked from
 * the popular ones. Available: in the app.
 */
export type Stage = 'available' | 'shortlisted' | 'popular'

/** Where an offline map is in the funnel. Partial maps count as available: some cells download. */
export function mapStage(status: MapStatus): Stage {
  if (status === 'live' || status === 'partial') return 'available'
  if (status === 'planned') return 'shortlisted'
  return 'popular'
}

/** Where a guide is in the funnel, or null for a trail with no guide row or a retired one. */
export function guideStage(guide: string): Stage | null {
  if (guide === 'published') return 'available'
  if (guide === 'built') return 'shortlisted'
  if (guide === 'pending') return 'popular'
  return null
}

const votes = (row: { request?: TrailRequest | null }) => row.request?.votes ?? 0

/** A sorted copy: highest score (up minus down) first, then A to Z. */
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
    const { up, down } = voteCounts(trail.request)
    return { href: trail.request.url, label: `${up} up, ${down} down · vote` }
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

/** Great-circle distance in km between the centers of two boxes. */
function centerDistanceKm(a: Bounds, b: Bounds): number {
  const rad = Math.PI / 180
  const lat1 = ((a[1] + a[3]) / 2) * rad
  const lat2 = ((b[1] + b[3]) / 2) * rad
  const dLat = lat2 - lat1
  const dLon = ((b[0] + b[2]) / 2 - (a[0] + a[2]) / 2) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * The trails nearest to one trail, for the links at the foot of its page. Only trails with a map
 * area count, since the others have little to show. Besides the `count` nearest, it adds any trail
 * whose own nearest is this one, so every mapped trail page gets a link from at least one other
 * trail page, however remote it is. Nearest first.
 */
export function nearbyTrails<T extends Pick<Trail, 'id' | 'bbox'>>(
  trail: T,
  trails: readonly T[],
  count = 5,
): T[] {
  const mapped = trails.filter((t): t is T & { bbox: Bounds } => t.bbox !== null)
  const byDistance = (from: Bounds, list: (T & { bbox: Bounds })[]) =>
    list
      .map((t) => ({ t, km: centerDistanceKm(from, t.bbox) }))
      .sort((a, b) => a.km - b.km || a.t.id.localeCompare(b.t.id))
  if (!trail.bbox) return []
  const others = byDistance(
    trail.bbox,
    mapped.filter((t) => t.id !== trail.id),
  )
  const pointingHere = new Set(
    others
      .filter(
        ({ t }) =>
          byDistance(
            t.bbox,
            mapped.filter((o) => o.id !== t.id),
          )[0]?.t.id === trail.id,
      )
      .map(({ t }) => t.id),
  )
  return others.filter(({ t }, i) => i < count || pointingHere.has(t.id)).map(({ t }) => t)
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

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * A place's map build date for people: "2026-11-07" reads "7 Nov 2026". Cells are built in
 * batches, so each trail and city has its own date. Null for a missing or malformed date.
 */
export function formatDay(day: string | null | undefined): string | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return dayFormat.format(new Date(`${day}T00:00:00Z`))
}

/**
 * Search results cut a title at about 60 characters, so a trail's title leaves room for the
 * layout's " | Disha" (8). Descriptions are cut at about 160.
 */
export const TRAIL_TITLE_MAX = 52
export const TRAIL_DESCRIPTION_MAX = 160

/** The first of `options` that fits in `max` characters, or the shortest. */
function firstThatFits(options: string[], max: number): string {
  return options.find((text) => text.length <= max) ?? options[options.length - 1]
}

/** Whether the trail's page offers a map today but no guide yet. */
function mapOnly(trail: Pick<Trail, 'status' | 'guide'>): boolean {
  return mapStage(trail.status) === 'available' && guideAvailability(trail.guide) !== 'available'
}

/**
 * A trail page's title, naming what the page offers: "GR20 offline map and guide", or "Adlerweg
 * offline hiking map" while only the map is built. A long name keeps a shorter suffix, or none.
 */
export function trailTitle(trail: Pick<Trail, 'name' | 'status' | 'guide'>): string {
  const { name } = trail
  const options = mapOnly(trail)
    ? [`${name} offline hiking map`, `${name} offline map`, name]
    : [`${name} offline map and guide`, `${name} offline guide`, name]
  return firstThatFits(options, TRAIL_TITLE_MAX)
}

/**
 * A trail page's meta description: where the trail is and how long, then what Disha has for it
 * today, from the guide's water, huts and campsites down to a request to vote on. Where and length
 * drop out, in that order, when the whole would run past TRAIL_DESCRIPTION_MAX, and then the
 * sentence's last clause.
 */
export function trailDescription(trail: Trail): string {
  const where = countriesOf(trail).join(', ')
  const length = trail.lengthKm ? formatLength(trail.lengthKm) : ''
  const facts = [where, length].filter(Boolean)
  const named = [facts, length ? [length] : [], []].map((parts) =>
    parts.length ? `${trail.name} (${parts.join(', ')})` : trail.name,
  )

  const guide = guideAvailability(trail.guide)
  const guideNext =
    guide === 'soon' ? ' Its guide is coming soon.' : ' Vote for its guide to be made next.'
  // Each as [full, short]: the short form is for a name too long for the full one.
  const says = (lead: string): [string, string] => {
    if (guide === 'available') {
      const start = `${lead}: offline map and trail guide in Disha for iPhone, with the water, huts, and campsites along the route`
      return [`${start} and the distance to each.`, `${start}.`]
    }
    if (trail.status === 'live') {
      const start = `${lead}: offline hiking map in Disha for iPhone, with paths, contours, and hillshade`
      return [`${start} that work with no signal.${guideNext}`, `${start}.${guideNext}`]
    }
    if (trail.status === 'partial') {
      const start = `${lead}: offline hiking map in Disha for iPhone, built along part of the route so far`
      return [`${start}, with paths, contours, and hillshade.${guideNext}`, `${start}.${guideNext}`]
    }
    if (trail.status === 'planned') {
      const start = `${lead} is shortlisted for Disha's next batch of offline maps for iPhone.`
      return [
        `${start} See its route and status, and vote for it on GitHub.`,
        `${start} Vote for it on GitHub.`,
      ]
    }
    const start = `${lead} has been requested for an offline map and guide in Disha for iPhone.`
    return [
      `${start} Vote for it on GitHub to help decide what is built next.`,
      `${start} Vote for it on GitHub.`,
    ]
  }
  const forms = named.map(says)
  return firstThatFits(
    [...forms.map(([full]) => full), ...forms.map(([, short]) => short)],
    TRAIL_DESCRIPTION_MAX,
  )
}
