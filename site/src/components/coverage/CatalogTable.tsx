'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { type Badge, formatLength, formatSize } from '@/lib/coverage'
import { StatusBadge } from './StatusBadge'
import { newTab } from './TrailAction'

const PAGE_SIZE = 25

export type CatalogRow = {
  key: string
  name: string
  href: string
  /** Countries, joined. Also the country sort key. */
  countries: string
  /** "trail" or "city", for the kind filter on /maps/. */
  kind?: 'trail' | 'city'
  /** The status filter and sort key: one of the table's `statuses` values. */
  status: string
  badge: Badge
  /** A second tag after the main one, such as a trail's guide on /maps/. */
  extraBadge?: Badge
  cells?: { built: number; total: number }
  bytes?: number
  lengthKm?: number | null
  /**
   * A vote count, a request link or a suggest-an-edit link. The table shows it on row hover or
   * keyboard focus; the phone list leaves it off, since each trail's page has the same button.
   */
  action?: React.ReactNode
  /** The action's words, so the search finds them: "suggest an edit". */
  actionText?: string
  /** Searched but not shown, such as a trail's continent. */
  region?: string
  /** Up and down votes, linked to the GitHub issue where they're cast. */
  votes?: { up: number; down: number; href: string }
}

export type StatusOption = { value: string; badge: Badge }
export type Column = 'length' | 'cells' | 'size' | 'votes' | 'action'
export type SortKey = 'name' | 'country' | 'length' | 'cells' | 'size' | 'status' | 'votes'

const SORT_LABELS: Record<SortKey, string> = {
  name: 'name',
  country: 'country',
  length: 'length',
  cells: 'cells',
  size: 'download size',
  status: 'status',
  votes: 'votes',
}

// Text sorts start A to Z and status starts most available; numbers start with the largest.
const ASCENDS_FIRST: SortKey[] = ['name', 'country', 'status']

const chip = 'min-h-8 pointer-coarse:min-h-11'

// Small caps over each group, so search, filters and sort read as separate controls.
const headingClass = 'text-[11px] tracking-[0.18em] text-faint uppercase'

// The search box, sort menu and order button share one look: a filled box with a border. Each
// sets its height: 44px, or 36px in a dense panel (44px still on touch screens).
const boxClass =
  'rounded-lg border border-line bg-surface font-mono text-ink hover:border-muted focus:border-ink focus:outline-none'

/** The current order in words, for the order button: "A–Z", "largest first". */
function orderLabel(key: SortKey, dir: 1 | -1): string {
  if (key === 'status') return dir === 1 ? 'available first' : 'available last'
  if (key === 'votes') return dir === 1 ? 'most first' : 'fewest first'
  if (ASCENDS_FIRST.includes(key)) return dir === 1 ? 'A–Z' : 'Z–A'
  return dir === 1 ? 'largest first' : 'smallest first'
}

// Names read in the sans, like titles; the numbers and labels around them stay mono.
const nameClass = 'font-sans text-[15px] font-medium text-ink hover:underline'

const score = (row: CatalogRow) => (row.votes ? row.votes.up - row.votes.down : 0)

/** A small up or down triangle, drawn so it matches the text size in any font. */
function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 10" className="size-2.5 fill-current">
      <path d={down ? 'M1 2.5h8L5 8.5z' : 'M1 7.5h8L5 1.5z'} />
    </svg>
  )
}

/** "▲ 12 ▼ 2", linked to the GitHub issue where votes are cast. Always shown: it's data. */
function VoteLink({ votes, name }: { votes: NonNullable<CatalogRow['votes']>; name: string }) {
  return (
    <a
      href={votes.href}
      {...newTab}
      aria-label={`${name}: ${votes.up} up, ${votes.down} down. Vote on GitHub (opens in a new tab)`}
      className="inline-flex min-h-8 items-center gap-3 whitespace-nowrap text-muted tabular-nums hover:text-ink pointer-coarse:min-h-11"
    >
      <span className="inline-flex items-center gap-1">
        <Arrow /> {votes.up}
      </span>
      <span className="inline-flex items-center gap-1 text-faint">
        <Arrow down /> {votes.down}
      </span>
    </a>
  )
}

/**
 * A searchable, filterable, sortable list of trails or places, for /trails/ and /maps/. Status
 * chips are a multi-select in the tags' own colors, with counts; the page picks which start on.
 * A table from sm, a list on phones (and in a `narrow` panel), 25 rows a page. Status sits at the right of each row.
 */
export function CatalogTable({
  rows,
  statuses,
  initialStatuses,
  initialSort = 'status',
  columns,
  sorts,
  kinds = false,
  label,
  selectedKey = null,
  sidebar,
  statusHelp,
  narrow = false,
  onMatchesChange,
}: {
  rows: CatalogRow[]
  /** Every status, in funnel order (most available first): the chips and the status sort. */
  statuses: StatusOption[]
  initialStatuses: string[]
  /** The sort the table opens on. */
  initialSort?: SortKey
  columns: Column[]
  sorts: SortKey[]
  /** Adds an all · trails · cities filter. */
  kinds?: boolean
  /** What the rows are, for counts and the table's name: "trails", "places". */
  label: string
  /** The row shown on the map, highlighted. */
  selectedKey?: string | null
  /** Puts the page's title (header), the controls and notes (footer) in a sticky left column. */
  sidebar?: { header: React.ReactNode; footer?: React.ReactNode }
  /** A link under the status filters to where the tags are explained. */
  statusHelp?: React.ReactNode
  /** For a narrow side panel, as beside the maps page's map: the controls in three tight rows,
   * and the list at every width, sorted from a header row over it, instead of the table. */
  narrow?: boolean
  /**
   * Told the keys of every row the search and filters match, on all pages, as they change. Pass a
   * function that keeps its identity, such as a state setter.
   */
  onMatchesChange?: (keys: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState<Set<string>>(() => new Set(initialStatuses))
  const [kind, setKind] = useState<'all' | 'trail' | 'city'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: initialSort,
    dir: 1,
  })
  const [page, setPage] = useState(0)

  const order = useMemo(() => statuses.map((s) => s.value), [statuses])
  const counts = useMemo(() => {
    const byStatus = new Map<string, number>()
    for (const row of rows) {
      if (kind !== 'all' && row.kind !== kind) continue
      byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1)
    }
    return byStatus
  }, [rows, kind])

  // Everything a row shows, so the search covers every column.
  const searchText = useMemo(
    () =>
      new Map(
        rows.map((r) => [
          r.key,
          [
            r.name,
            r.countries,
            r.region,
            r.kind === 'city' ? 'city' : null,
            r.badge.label,
            r.badge.short,
            r.extraBadge?.short,
            r.lengthKm ? formatLength(r.lengthKm) : null,
            r.cells?.total ? `${cellsText(r)} cells` : null,
            r.bytes ? formatSize(r.bytes) : null,
            r.actionText,
            r.votes ? `${r.votes.up} up ${r.votes.down} down` : null,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        ]),
      ),
    [rows],
  )

  const needle = query.trim().toLowerCase()
  const found = useCallback(
    (r: CatalogRow) =>
      (kind === 'all' || r.kind === kind) && (!needle || searchText.get(r.key)!.includes(needle)),
    [kind, needle, searchText],
  )
  // Matches the status chips hide, so a search for a hidden status doesn't come up empty.
  const hiddenMatches = needle ? rows.filter((r) => !shown.has(r.status) && found(r)).length : 0

  const matches = useMemo(() => {
    const compare: Record<SortKey, (a: CatalogRow, b: CatalogRow) => number> = {
      name: () => 0,
      country: (a, b) => a.countries.localeCompare(b.countries),
      length: (a, b) => (b.lengthKm ?? 0) - (a.lengthKm ?? 0),
      cells: (a, b) => (b.cells?.built ?? 0) - (a.cells?.built ?? 0),
      size: (a, b) => (b.bytes ?? 0) - (a.bytes ?? 0),
      status: (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
      // Score is up minus down; ties keep the status order, so unvoted rows stay grouped.
      votes: (a, b) => score(b) - score(a) || order.indexOf(a.status) - order.indexOf(b.status),
    }
    return rows
      .filter((r) => shown.has(r.status) && found(r))
      .sort((a, b) => sort.dir * (compare[sort.key](a, b) || a.name.localeCompare(b.name)))
  }, [rows, shown, found, sort, order])

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  // Keyed on the joined keys, so a parent that re-renders with new row objects doesn't loop.
  const matchKeys = matches.map((r) => r.key).join('\n')
  useEffect(() => {
    onMatchesChange?.(matchKeys ? matchKeys.split('\n') : [])
  }, [matchKeys, onMatchesChange])
  const visible = matches.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  const toggle = (value: string) => {
    setShown((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
    setPage(0)
  }
  const sortBy = (key: SortKey) => {
    setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))
    setPage(0)
  }

  const groupClass = 'grid gap-2'
  const optionsClass = sidebar ? 'grid gap-0.5' : 'flex flex-wrap gap-x-6 gap-y-0.5'

  // The pieces of the controls, laid out below as labeled groups, or in three tight rows in a
  // `narrow` panel.
  const searchBox = (dense: boolean) => (
    <span className="relative block w-full">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="m13 13 4 4" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setPage(0)
        }}
        placeholder={dense ? 'search trails, cities, countries' : 'name, region, status'}
        className={clsx(
          boxClass,
          'w-full pr-3 pl-9 placeholder:text-faint',
          dense ? 'min-h-10 py-1.5 text-[15px] pointer-coarse:min-h-11' : 'min-h-11 py-2 text-base',
        )}
      />
    </span>
  )

  const statusOptions = (dense: boolean) =>
    statuses.map(({ value, badge }) => {
      const on = shown.has(value)
      return (
        <label
          key={value}
          className={clsx(
            chip,
            'group/opt flex cursor-pointer items-center text-[13px]',
            dense ? 'gap-1.5' : 'gap-2.5',
          )}
        >
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(value)}
              className="peer size-4 cursor-pointer appearance-none rounded-[4px] border border-muted bg-bg checked:border-accent checked:bg-accent group-hover/opt:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
            >
              <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className={clsx(!on && 'opacity-60')}>
            {/* Dense, the tag drops its "Map" or "Guide": the panel says what it lists. */}
            <StatusBadge badge={badge} long={!dense} />
          </span>
          <span className={clsx('text-[12px] text-faint tabular-nums', sidebar && 'ml-auto')}>
            {counts.get(value) ?? 0}
          </span>
        </label>
      )
    })

  const kindToggle = (dense: boolean) => (
    // A segmented control: a faint track, the chosen option raised on it in the page color.
    <div className="flex w-fit gap-0.5 rounded-lg bg-ink/[0.06] p-0.5">
      {(['all', 'trail', 'city'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={kind === value}
          onClick={() => {
            setKind(value)
            setPage(0)
          }}
          className={clsx(
            'rounded-md text-[13px] pointer-coarse:min-h-11',
            dense ? 'min-h-8 px-3' : 'min-h-9 px-4',
            kind === value
              ? 'bg-bg text-ink shadow-[0_1px_3px_rgb(0_0_0/0.18)]'
              : 'text-muted hover:text-ink',
          )}
        >
          {value === 'all' ? 'all' : value === 'trail' ? 'trails' : 'cities'}
        </button>
      ))}
    </div>
  )

  const sortSelect = (
    <span className="relative min-w-0 flex-1 sm:max-w-48">
      <select
        id={`${label}-sort`}
        value={sort.key}
        onChange={(e) => {
          setSort({ key: e.target.value as SortKey, dir: 1 })
          setPage(0)
        }}
        className={clsx(
          boxClass,
          'min-h-11 w-full cursor-pointer appearance-none pr-8 pl-3 text-[13px]',
        )}
      >
        {sorts.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )

  const orderButton = (
    <button
      type="button"
      onClick={() => sortBy(sort.key)}
      aria-label={`Order: ${orderLabel(sort.key, sort.dir)}. Reverse it`}
      className={clsx(
        boxClass,
        'min-h-11 shrink-0 cursor-pointer px-3 text-[13px] whitespace-nowrap',
      )}
    >
      <span aria-hidden="true">⇅ </span>
      {orderLabel(sort.key, sort.dir)}
    </button>
  )

  // In a narrow panel the sort is a header row over the list: each sort's name, the current one
  // with an arrow; choosing it again reverses it.
  const sortRow = (
    <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-faint">
      {sorts.map((key) => {
        const on = sort.key === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => sortBy(key)}
            aria-pressed={on}
            aria-label={`Sort by ${SORT_LABELS[key]}${on ? `, ${orderLabel(key, sort.dir)}. Reverse it` : ''}`}
            className={clsx(
              'inline-flex min-h-8 cursor-pointer items-center gap-1 pointer-coarse:min-h-11',
              on ? 'text-ink' : 'hover:text-ink',
            )}
          >
            {SORT_LABELS[key]}
            <span aria-hidden="true" className={clsx(!on && 'opacity-40')}>
              {on ? (sort.dir === 1 ? '↓' : '↑') : '↕'}
            </span>
          </button>
        )
      })}
    </div>
  )

  const controls = narrow ? (
    // Three rows: the search, the whole width; the statuses; the kinds and the tags link. The
    // sort is the header row over the list (sortRow).
    <div className="grid gap-2">
      <label className="block">
        <span className="sr-only">Search</span>
        {searchBox(true)}
      </label>
      <fieldset className="flex flex-wrap items-center gap-x-4">
        <legend className="sr-only">Status</legend>
        {statusOptions(true)}
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {kinds && (
          <fieldset>
            <legend className="sr-only">Show</legend>
            {kindToggle(true)}
          </fieldset>
        )}
        {statusHelp}
      </div>
    </div>
  ) : (
    <div className={sidebar ? 'grid gap-6' : 'grid gap-6 sm:grid-cols-2'}>
      <label className={clsx(groupClass, !sidebar && 'sm:col-span-2')}>
        <span className={headingClass}>Search</span>
        {/* A box with an icon, so the search reads as the first thing to use. */}
        <span className={clsx('w-full', !sidebar && 'max-w-sm')}>{searchBox(false)}</span>
      </label>

      <fieldset className={clsx(groupClass, !sidebar && 'sm:col-span-2')}>
        <div className="flex items-baseline justify-between gap-4">
          <legend className={headingClass}>Status</legend>
          <button
            type="button"
            onClick={() => {
              setShown(new Set(shown.size === statuses.length ? initialStatuses : order))
              setPage(0)
            }}
            className="text-[12px] text-muted underline hover:text-ink"
          >
            {shown.size === statuses.length ? 'reset' : 'show all'}
          </button>
        </div>
        <div className={optionsClass}>{statusOptions(false)}</div>
        {statusHelp}
      </fieldset>

      {kinds && (
        <fieldset className={groupClass}>
          <legend className={clsx(headingClass, 'mb-2')}>Show</legend>
          {kindToggle(false)}
        </fieldset>
      )}

      <div className={groupClass}>
        <label htmlFor={`${label}-sort`} className={headingClass}>
          Sort by
        </label>
        <div className="flex gap-2">
          {sortSelect}
          {orderButton}
        </div>
      </div>
    </div>
  )

  const results = (
    <>
      {visible.length === 0 ? (
        <p className="mt-8 text-[13px] text-muted">
          No {label} match. Turn on more statuses or clear the search.
        </p>
      ) : (
        <>
          <table
            className={clsx(
              'mt-8 hidden w-full text-[13px]',
              !narrow && 'sm:table',
              sidebar && 'lg:mt-0',
            )}
          >
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className="border-b border-line text-left text-faint">
                {/* w-full: names get the spare width; the other columns fit their content */}
                <th scope="col" className="w-full py-2 pr-4 font-normal">
                  Name
                </th>
                {columns.includes('length') && (
                  <th scope="col" className="py-2 pr-4 text-right font-normal">
                    Length
                  </th>
                )}
                {columns.includes('cells') && (
                  <th scope="col" className="py-2 pr-4 text-right font-normal">
                    Cells
                  </th>
                )}
                {columns.includes('size') && (
                  <th scope="col" className="py-2 pr-4 text-right font-normal">
                    Size
                  </th>
                )}
                {columns.includes('votes') && (
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Votes
                  </th>
                )}
                {columns.includes('action') && (
                  <th scope="col" className="py-2 pr-4 font-normal">
                    <span className="sr-only">Action</span>
                  </th>
                )}
                <th scope="col" className="py-2 text-right font-normal">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.key}
                  aria-current={row.key === selectedKey ? 'true' : undefined}
                  className={clsx(
                    'group border-b border-line align-top',
                    row.key === selectedKey && 'bg-surface',
                  )}
                >
                  <td className="py-2 pr-4">
                    <Link href={row.href} className={nameClass}>
                      {row.name}
                    </Link>
                    <span className="block text-faint">
                      {[row.kind === 'city' ? 'city' : null, row.countries]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </td>
                  {columns.includes('length') && (
                    <td className="py-2 pr-4 text-right whitespace-nowrap text-muted tabular-nums">
                      {formatLength(row.lengthKm ?? null)}
                    </td>
                  )}
                  {columns.includes('cells') && (
                    <td className="py-2 pr-4 text-right whitespace-nowrap text-muted tabular-nums">
                      {cellsText(row)}
                    </td>
                  )}
                  {columns.includes('size') && (
                    <td className="py-2 pr-4 text-right whitespace-nowrap text-muted tabular-nums">
                      {formatSize(row.bytes ?? 0)}
                    </td>
                  )}
                  {columns.includes('votes') && (
                    <td className="py-1 pr-4">
                      {row.votes ? (
                        <VoteLink votes={row.votes} name={row.name} />
                      ) : (
                        // A row that isn't voted on, such as a published guide, can put its action
                        // here instead of in a column of its own: shown on hover, like that column.
                        !columns.includes('action') &&
                        row.action && (
                          <span className="inline-flex min-h-8 items-center whitespace-nowrap opacity-0 group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
                            {row.action}
                          </span>
                        )
                      )}
                    </td>
                  )}
                  {columns.includes('action') && (
                    <td
                      // opacity, not hidden, so the link stays in the tab order and shows on focus
                      className="py-2 pr-4 whitespace-nowrap opacity-0 group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100"
                    >
                      {row.action}
                    </td>
                  )}
                  <td className="py-2 text-right">
                    <span className="inline-flex flex-wrap justify-end gap-1">
                      <StatusBadge badge={row.badge} long />
                      {row.extraBadge && <StatusBadge badge={row.extraBadge} long />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {narrow && sortRow}
          <ul
            role="list"
            className={clsx('border-t border-line text-[13px]', narrow ? 'mt-1' : 'mt-6 sm:hidden')}
          >
            {visible.map((row) => (
              <li
                key={row.key}
                aria-current={row.key === selectedKey ? 'true' : undefined}
                className={clsx(
                  'border-b border-line py-3',
                  narrow && 'lg:py-2',
                  row.key === selectedKey && 'bg-surface',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={row.href} className={nameClass}>
                    {row.name}
                  </Link>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge badge={row.badge} long />
                    {row.extraBadge && <StatusBadge badge={row.extraBadge} long />}
                  </span>
                </div>
                <p className="text-faint">
                  {[
                    row.kind === 'city' ? 'city' : null,
                    row.countries,
                    columns.includes('length') && row.lengthKm ? formatLength(row.lengthKm) : null,
                    columns.includes('cells') && row.cells?.total
                      ? `${cellsText(row)} cells`
                      : null,
                    columns.includes('size') && row.bytes ? formatSize(row.bytes) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {columns.includes('votes') && row.votes && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-4">
                    <VoteLink votes={row.votes} name={row.name} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {hiddenMatches > 0 && (
        <p className="mt-2 text-[13px] text-muted">
          {hiddenMatches} more in other statuses.{' '}
          <button
            type="button"
            onClick={() => {
              setShown(new Set(order))
              setPage(0)
            }}
            className="min-h-11 text-ink underline hover:text-ink-soft"
          >
            Show them
          </button>
        </p>
      )}

      <nav
        aria-label={`${label} pages`}
        className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted"
      >
        <span aria-live="polite">
          {matches.length
            ? `${current * PAGE_SIZE + 1}–${current * PAGE_SIZE + visible.length} of ${matches.length} ${label}`
            : ''}
        </span>
        {pages > 1 && (
          <span className="flex gap-6">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              className="min-h-11 underline not-disabled:hover:text-ink disabled:text-faint disabled:no-underline"
            >
              ← previous
            </button>
            <button
              type="button"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
              className="min-h-11 underline not-disabled:hover:text-ink disabled:text-faint disabled:no-underline"
            >
              next →
            </button>
          </span>
        )}
      </nav>
    </>
  )

  if (!sidebar) {
    return (
      <div>
        {controls}
        {results}
      </div>
    )
  }

  // From lg the page's title and the controls sit in a column on the left that stays in view
  // under the sticky site header (60px), so the table starts at the top of the screen. The column
  // is kept short enough to fit a laptop screen; it only scrolls in a very short window. Below lg
  // it stacks: title, controls, table. The footer notes go under the table either way.
  return (
    <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-x-12">
      <div className="lg:sticky lg:top-[60px] lg:max-h-[calc(100dvh-60px)] lg:self-start lg:overflow-y-auto lg:pt-6 lg:pb-6">
        {sidebar.header}
        <div className="mt-8">{controls}</div>
      </div>
      <div className="lg:pt-6">
        {results}
        {sidebar.footer && <div className="mt-10">{sidebar.footer}</div>}
      </div>
    </div>
  )
}

/** "5 / 6": built of total. A dash for a row with no cells yet. */
function cellsText(row: CatalogRow): string {
  if (!row.cells?.total) return '–'
  return `${row.cells.built} / ${row.cells.total}`
}
