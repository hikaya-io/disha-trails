/**
 * Docs navigation, as in Minou's docs: groups of links in one flat list per group. A plain module
 * with no React imports, so server components and tests can read it. tests/pages.test.ts checks
 * that every link here is a registered page and every registered /docs/ page is listed here.
 */
export type NavGroup = {
  title: string
  links: Array<{ title: string; href: string }>
}

export const docsNavigation: Array<NavGroup> = [
  {
    title: 'Start here',
    links: [
      { title: 'Overview', href: '/docs/' },
      { title: 'Getting started', href: '/docs/getting-started/' },
    ],
  },
  {
    title: 'Offline maps',
    links: [
      { title: 'Download maps', href: '/docs/offline-maps/' },
      { title: 'Available maps', href: '/docs/offline-maps/coverage/' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { title: 'Use a guide', href: '/docs/guides/' },
      { title: 'Available guides', href: '/docs/guides/trails/' },
    ],
  },
  {
    title: 'Routes',
    links: [{ title: 'Import or draw', href: '/docs/routes/' }],
  },
  {
    title: 'Contribute',
    links: [
      { title: 'Request a trail', href: '/docs/requests/' },
      { title: 'Suggest an edit', href: '/docs/edits/' },
      { title: 'Open trail data', href: '/docs/open-data/' },
    ],
  },
  {
    title: 'Help',
    links: [
      { title: 'FAQ', href: '/docs/faq/' },
      { title: 'Get help', href: '/docs/support/' },
    ],
  },
]

export const docsLinks = docsNavigation.flatMap((group) => group.links)
