/** One searchable section of a docs page: a heading and the text under it. */
export type SearchEntry = {
  /** Page path plus "#heading-id" for a section, or just the page path for its intro. */
  url: string
  /** The section heading, or the page title for the intro. */
  title: string
  pageTitle: string
  /** Paragraph, list and callout text under the heading, joined with spaces. */
  text: string
}

/**
 * Finds sections that contain every word of the query (each word may be a prefix or a part of a
 * word). Heading matches rank above page-title matches, which rank above body text, and a match
 * at the start of a word ranks above one in the middle. Equal scores keep the index order, which
 * is page order. The index is small, so this scans it instead of using a search library.
 */
export function searchDocs(index: readonly SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const scored: Array<{ entry: SearchEntry; score: number; order: number }> = []
  index.forEach((entry, order) => {
    const title = entry.title.toLowerCase()
    const page = entry.pageTitle.toLowerCase()
    const text = entry.text.toLowerCase()
    let score = 0
    for (const term of terms) {
      const termScore =
        fieldScore(title, term, 10, 6) + fieldScore(page, term, 3, 2) + fieldScore(text, term, 2, 1)
      if (termScore === 0) return // every word must match somewhere
      score += termScore
    }
    scored.push({ entry, score, order })
  })

  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((s) => s.entry)
}

/** `atWordStart` if the term begins a word in the field, `inside` if it is only a substring, else 0. */
function fieldScore(field: string, term: string, atWordStart: number, inside: number): number {
  const at = field.indexOf(term)
  if (at === -1) return 0
  if (at === 0 || /[^a-z0-9]/.test(field[at - 1])) return atWordStart
  // The first hit is mid-word; look for a later hit at the start of a word.
  let next = field.indexOf(term, at + 1)
  while (next !== -1) {
    if (/[^a-z0-9]/.test(field[next - 1])) return atWordStart
    next = field.indexOf(term, next + 1)
  }
  return inside
}

/** A short piece of the entry's text around the first matching word, for the results list. */
export function snippet(entry: SearchEntry, query: string, length = 110): string {
  const text = entry.text
  if (!text) return ''
  const lower = text.toLowerCase()
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const hit = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0)
  const first = hit.length ? Math.min(...hit) : 0
  const start = Math.max(0, first - 30)
  const piece = text.slice(start, start + length).trim()
  return `${start > 0 ? '…' : ''}${piece}${start + length < text.length ? '…' : ''}`
}
