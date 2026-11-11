import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { docsLinks } from '@/components/docs/docs-navigation'
import { PAGES, PUBLISHED_PAGES } from '@/lib/pages'

const APP_DIR = join(import.meta.dirname, '..', 'src', 'app')

/**
 * URL paths of every page.tsx / page.mdx under src/app, skipping _private folders, [dynamic]
 * folders and (groups). The trail pages under /trails/[id]/ come from coverage.json, not the registry.
 */
function routePaths(dir = APP_DIR): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!/^[_[]/.test(entry.name)) found.push(...routePaths(join(dir, entry.name)))
    } else if (/^page\.(tsx|mdx)$/.test(entry.name)) {
      const segments = relative(APP_DIR, dir)
        .split(sep)
        .filter((segment) => segment && !/^\(.*\)$/.test(segment))
      found.push(segments.length ? `/${segments.join('/')}/` : '/')
    }
  }
  return found
}

describe('page registry', () => {
  it('lists every route under src/app, and nothing else', () => {
    expect([...routePaths()].sort()).toEqual(PAGES.map((p) => p.path).sort())
  })

  it('uses slash-wrapped, unique paths and unique titles', () => {
    const paths = PAGES.map((p) => p.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) expect(path).toMatch(/^\/([a-z0-9-]+\/)*$/)
    const titles = PAGES.map((p) => p.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('gives every page a description of 110 to 160 characters', () => {
    for (const page of PAGES) {
      expect(page.description.length, page.path).toBeGreaterThanOrEqual(110)
      expect(page.description.length, page.path).toBeLessThanOrEqual(160)
    }
  })

  it('keeps drafts out of the sitemap list', () => {
    expect(PUBLISHED_PAGES.some((p) => p.draft)).toBe(false)
  })
})

describe('docs navigation', () => {
  const docsPaths = PAGES.filter((p) => p.path.startsWith('/docs/')).map((p) => p.path)

  it('links only to registered pages, once each', () => {
    const hrefs = docsLinks.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    for (const href of hrefs) expect(docsPaths, href).toContain(href)
  })

  it('lists every registered docs page', () => {
    expect(docsLinks.map((l) => l.href).sort()).toEqual([...docsPaths].sort())
  })
})
