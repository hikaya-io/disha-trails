import { describe, expect, it } from 'vitest'
import { buildDocsIndex, sectionsFromMdx } from '@/lib/docs-index'
import { searchDocs, snippet, type SearchEntry } from '@/lib/docs-search'
import { PAGES } from '@/lib/pages'

const index: SearchEntry[] = [
  { url: '/docs/a/', title: 'Offline maps', pageTitle: 'Offline maps', text: 'Download an area.' },
  {
    url: '/docs/a/#sizes',
    title: 'Sizes',
    pageTitle: 'Offline maps',
    text: 'See the size of each layer.',
  },
  {
    url: '/docs/b/',
    title: 'Routes',
    pageTitle: 'Routes',
    text: 'Import a GPX file, or download a route.',
  },
]

describe('searchDocs', () => {
  it('returns nothing for an empty query', () => {
    expect(searchDocs(index, '   ')).toEqual([])
  })

  it('matches word prefixes and ranks headings above body text', () => {
    const urls = searchDocs(index, 'down').map((e) => e.url)
    // Both /docs/a/ and /docs/b/ mention "download" in their text; neither has it in a heading.
    expect(urls).toEqual(['/docs/a/', '/docs/b/'])
    expect(searchDocs(index, 'rout')[0].url).toBe('/docs/b/')
  })

  it('requires every word to match', () => {
    expect(searchDocs(index, 'gpx file').map((e) => e.url)).toEqual(['/docs/b/'])
    expect(searchDocs(index, 'gpx layer')).toEqual([])
  })

  it('prefers a match at the start of a word to one inside a word', () => {
    const entries: SearchEntry[] = [
      { url: '/x/', title: 'Backup', pageTitle: 'P', text: '' },
      { url: '/y/', title: 'Up next', pageTitle: 'P', text: '' },
    ]
    expect(searchDocs(entries, 'up').map((e) => e.url)).toEqual(['/y/', '/x/'])
  })

  it('respects the limit', () => {
    expect(searchDocs(index, 'a', 1)).toHaveLength(1)
  })
})

describe('snippet', () => {
  it('centers on the first match and marks the cut', () => {
    const entry = { ...index[0], text: `${'word '.repeat(30)}needle ${'word '.repeat(30)}` }
    const s = snippet(entry, 'needle')
    expect(s).toContain('needle')
    expect(s.startsWith('…')).toBe(true)
    expect(s.endsWith('…')).toBe(true)
  })
})

describe('sectionsFromMdx', () => {
  it('splits at headings, slugs them like rehype-slug and reads callout and list text', () => {
    const { pageTitle, sections } = sectionsFromMdx(
      [
        'import { x } from "y"',
        '',
        '# Title',
        '',
        'Intro text.',
        '',
        '## Same name',
        '',
        '- one item',
        '',
        '## Same name',
        '',
        '<Callout type="tip">',
        'Inside a callout.',
        '</Callout>',
      ].join('\n'),
    )
    expect(pageTitle).toBe('Title')
    expect(sections.map((s) => s.hash)).toEqual([null, 'same-name', 'same-name-1'])
    expect(sections[0].text).toEqual(['Intro text.'])
    expect(sections[1].text).toEqual(['one item'])
    expect(sections[2].text).toEqual(['Inside a callout.'])
  })
})

describe('buildDocsIndex', () => {
  it('has entries for every registered docs page', async () => {
    const index = await buildDocsIndex()
    for (const page of PAGES.filter((p) => p.path.startsWith('/docs/'))) {
      expect(
        index.some((e) => e.url === page.path),
        page.path,
      ).toBe(true)
    }
  })
})
