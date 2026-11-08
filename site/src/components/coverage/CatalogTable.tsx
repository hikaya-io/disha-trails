'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { type Badge, formatLength, formatSize } from '@/lib/coverage'
import { StatusBadge } from './StatusBadge'

const PAGE_SIZE = 25

export type CatalogRow = {
  key: string
  name: string
  href: string
  /** Selects the row on the map above (/maps/), for the map column. */
  mapHref?: string
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
  /** A vote count, a request link or a suggest-an-edit link. */
  action?: React.ReactNode
}

export type StatusOption = { value: string; badge: Badge }
export type Column = 'map' | 'length' | 'cells' | 'size' | 'action'
type SortKey = 'name' | 'country' | 'length' | 'cells' | 'size' | 'status'

const SORT_LABELS: Record<SortKey, string> = {
  name: 'name',
  country: 'country',
  length: 'length',
  cells: 'cells',
  size: 'size',
  status: 'status',
}

// Text sorts start A to Z and status starts most available; numbers start with the largest.
const ASCENDS_FIRST: SortKey[] = ['name', 'country', 'status']

const chip = 'min-h-9 pointer-coarse:min-h-11'

// Names read in the sans, like titles; the numbers and labels around them stay mono.
const nameClass = 'font-sans text-[15px] font-medium text-ink hover:underline'

/** Shows the row on the map above: the URL selects it, and following the link scrolls up. */
function MapButton({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      aria-label={`Show ${name} on the map`}
      className="inline-flex min-h-8 items-center gap-1 border border-line px-2 text-[12px] whitespace-nowrap text-muted hover:border-ink hover:text-ink pointer-coarse:min-h-11"
    >
      <span aria-hidden="true">◎</span> map
    </Link>
  )
}

/**
 * A searchable, filterable, sortable list of trails or places, for /trails/ and /maps/. Status
 * chips are a multi-select in the tags' own colors, with counts; the page picks which start on.
 * A table from sm, a list on phones, 25 rows a page. Status sits at the right of each row.
 */
export function CatalogTable({
  rows,
  statuses,
  initialStatuses,
  columns,
  sorts,
  kinds = false,
  label,
  selectedKey = null,
}: {
  rows: CatalogRow[]
  /** Every status, in funnel order (most available first): the chips and the status sort. */
  statuses: StatusOption[]
  initialStatuses: string[]
  columns: Column[]
  sorts: SortKey[]
  /** Adds an all · trails · cities filter. */
  kinds?: boolean
  /** What the rows are, for counts and the table's name: "trails", "places". */
  label: string
  /** The row shown on the map, highlighted. */
  selectedKey?: string | null
}) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState<Set<string>>(() => new Set(initialStatuses))
  const [kind, setKind] = useState<'all' | 'trail' | 'city'>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'status', dir: 1 })
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

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const compare: Record<SortKey, (a: CatalogRow, b: CatalogRow) => number> = {
      name: () => 0,
      country: (a, b) => a.countries.localeCompare(b.countries),
      length: (a, b) => (b.lengthKm ?? 0) - (a.lengthKm ?? 0),
      cells: (a, b) => (b.cells?.built ?? 0) - (a.cells?.built ?? 0),
      size: (a, b) => (b.bytes ?? 0) - (a.bytes ?? 0),
      status: (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
    }
    return rows
      .filter(
        (r) =>
          shown.has(r.status) &&
          (kind === 'all' || r.kind === kind) &&
          (!needle || `${r.name} ${r.countries}`.toLowerCase().includes(needle)),
      )
      .sort((a, b) => sort.dir * (compare[sort.key](a, b) || a.name.localeCompare(b.name)))
  }, [rows, shown, kind, query, sort, order])

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
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
  const arrow = (key: SortKey) => {
    if (sort.key !== key) return ''
    const ascending = ASCENDS_FIRST.includes(key) === (sort.dir === 1)
    return ascending ? ' ↑' : ' ↓'
  }

  return (
    <div>
      <div className="grid gap-2">
        <label className="flex items-center gap-x-2 text-[13px]">
          <span className="w-14 shrink-0 text-faint">search:</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="trail or country"
            className="min-h-11 w-full max-w-sm border-0 border-b border-line bg-transparent py-2 font-mono text-base text-ink placeholder:text-faint focus:border-ink focus:outline-none"
          />
        </label>

        <div
          role="group"
          aria-label="Status"
          className="flex flex-wrap items-center gap-2 text-[13px]"
        >
          <span className="w-14 shrink-0 text-faint">status:</span>
          {statuses.map(({ value, badge }) => {
            const on = shown.has(value)
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(value)}
                className={clsx(chip, 'flex items-center', !on && 'opacity-45 hover:opacity-80')}
              >
                <StatusBadge badge={badge} long />
                <span className="ml-1 text-[11px] text-faint tabular-nums">
                  {counts.get(value) ?? 0}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => {
              setShown(new Set(shown.size === statuses.length ? initialStatuses : order))
              setPage(0)
            }}
            className={clsx(chip, 'text-muted underline hover:text-ink')}
          >
            {shown.size === statuses.length ? 'reset' : 'all'}
          </button>
        </div>

        {kinds && (
          <div
            role="group"
            aria-label="Show"
            className="flex flex-wrap items-center gap-x-2 text-[13px]"
          >
            <span className="w-14 shrink-0 text-faint">show:</span>
            {(['all', 'trail', 'city'] as const).map((value, index) => (
              <span key={value} className="flex items-center gap-x-2">
                {index > 0 && (
                  <span aria-hidden="true" className="text-faint">
                    ·
                  </span>
                )}
                <button
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => {
                    setKind(value)
                    setPage(0)
                  }}
                  className={clsx(
                    chip,
                    'hover:text-ink hover:underline',
                    kind === value ? 'text-ink underline' : 'text-muted',
                  )}
                >
                  {value === 'all' ? 'all' : value === 'trail' ? 'trails' : 'cities'}
                </button>
              </span>
            ))}
          </div>
        )}

        <div
          role="group"
          aria-label="Sort"
          className="flex flex-wrap items-center gap-x-2 text-[13px]"
        >
          <span className="w-14 shrink-0 text-faint">sort:</span>
          {sorts.map((key, index) => (
            <span key={key} className="flex items-center gap-x-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-faint">
                  ·
                </span>
              )}
              <button
                type="button"
                aria-pressed={sort.key === key}
                onClick={() => sortBy(key)}
                className={clsx(
                  chip,
                  'hover:text-ink hover:underline',
                  sort.key === key ? 'text-ink underline' : 'text-muted',
                )}
              >
                {SORT_LABELS[key]}
                {arrow(key) && <span aria-hidden="true">{arrow(key)}</span>}
              </button>
            </span>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-[13px] text-muted">
          No {label} match. Turn on more statuses or clear the search.
        </p>
      ) : (
        <>
          <table className="mt-8 hidden w-full text-[13px] sm:table">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className="border-b border-line text-left text-faint">
                <th scope="col" className="py-2 pr-4 font-normal">
                  Name
                </th>
                {columns.includes('map') && (
                  <th scope="col" className="py-2 pr-4 font-normal">
                    <span className="sr-only">Map</span>
                  </th>
                )}
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
                    'border-b border-line align-top',
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
                  {columns.includes('map') && (
                    <td className="py-2 pr-4">
                      {row.mapHref && <MapButton href={row.mapHref} name={row.name} />}
                    </td>
                  )}
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
                  {columns.includes('action') && (
                    <td className="py-2 pr-4 whitespace-nowrap">{row.action}</td>
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

          <ul role="list" className="mt-6 border-t border-line text-[13px] sm:hidden">
            {visible.map((row) => (
              <li
                key={row.key}
                aria-current={row.key === selectedKey ? 'true' : undefined}
                className={clsx(
                  'border-b border-line py-3',
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
                {((columns.includes('map') && row.mapHref) ||
                  (columns.includes('action') && row.action)) && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-4">
                    {columns.includes('map') && row.mapHref && (
                      <MapButton href={row.mapHref} name={row.name} />
                    )}
                    {columns.includes('action') && row.action}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
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
    </div>
  )
}

/** "5 / 6": built of total. A dash for a row with no cells yet. */
function cellsText(row: CatalogRow): string {
  if (!row.cells?.total) return '–'
  return `${row.cells.built} / ${row.cells.total}`
}
