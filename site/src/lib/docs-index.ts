import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import GithubSlugger from 'github-slugger'
import { toString } from 'mdast-util-to-string'
import { remark } from 'remark'
import remarkMdx from 'remark-mdx'
import { SKIP, visit } from 'unist-util-visit'
import type { SearchEntry } from '@/lib/docs-search'

const DOCS_DIR = join(process.cwd(), 'src', 'app', 'docs')
const processor = remark().use(remarkMdx)

type Section = { title: string; hash: string | null; text: string[] }

/** Splits one MDX file into sections at its h1, h2 and h3 headings. Exported for tests. */
export function sectionsFromMdx(source: string): { pageTitle: string; sections: Section[] } {
  const tree = processor.parse(source)
  // rehype-slug uses github-slugger with one slugger per file, so these hashes match the page's ids.
  const slugger = new GithubSlugger()
  const sections: Section[] = []
  let pageTitle = ''

  visit(tree, (node) => {
    if (node.type === 'heading') {
      const title = toString(node)
      if (node.depth === 1) {
        pageTitle = title
        sections.push({ title, hash: null, text: [] })
      } else if (node.depth <= 3) {
        sections.push({ title, hash: slugger.slug(title), text: [] })
      }
      return SKIP
    }
    // Paragraphs inside lists and callouts are visited on the way down; the list item itself is not added twice.
    if (node.type === 'paragraph') {
      sections.at(-1)?.text.push(toString(node))
      return SKIP
    }
  })
  return { pageTitle, sections }
}

let cached: Promise<SearchEntry[]> | undefined

/** The search index for every docs page, built from the MDX files. Runs at build time only. */
export function buildDocsIndex(): Promise<SearchEntry[]> {
  cached ??= (async () => {
    const files = (await readdir(DOCS_DIR, { recursive: true }))
      .filter((f) => /(^|[\\/])page\.mdx$/.test(f))
      .sort()
    const entries: SearchEntry[] = []
    for (const file of files) {
      const dir = dirname(file).replace(/\\/g, '/')
      const path = dir === '.' ? '/docs/' : `/docs/${dir}/`
      const { pageTitle, sections } = sectionsFromMdx(await readFile(join(DOCS_DIR, file), 'utf8'))
      for (const section of sections) {
        entries.push({
          url: section.hash ? `${path}#${section.hash}` : path,
          title: section.title,
          pageTitle,
          text: section.text.join(' '),
        })
      }
    }
    return entries
  })()
  return cached
}
