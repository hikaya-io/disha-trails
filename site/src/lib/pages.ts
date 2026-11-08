/**
 * Every public page, in one place. The sitemap, each page's metadata and the footer links read
 * from here, and tests/pages.test.ts fails if a route under src/app is missing from this list.
 *
 * Paths have a leading and trailing slash (the site exports with trailingSlash). A draft page
 * builds, but it is marked noindex, left out of the sitemap and not linked from anywhere.
 */
export type SitePage = {
  path: string
  /** Page title without the site name; the layout's title template adds " | Disha". */
  title: string
  /** 70 to 160 characters reads well in results. */
  description: string
  draft?: boolean
}

export const PAGES: readonly SitePage[] = [
  {
    path: '/',
    title: 'Offline hiking app for iPhone, on OpenStreetMap',
    description:
      'Disha is an offline hiking app for iPhone. Drag along the trail and see the distance to the next water, hut or pass. Join the beta waitlist.',
  },
  {
    // Draft since 2026-11-08: every section repeated the home page or /trails/. Delete it, or
    // give it content of its own before publishing.
    path: '/openstreetmap-hiking-app-iphone/',
    title: 'OpenStreetMap hiking app for iPhone',
    description:
      'Disha is an OpenStreetMap hiking app for iPhone. Offline maps, live distance to the next point of interest, a route builder and open trail data.',
    draft: true,
  },
  {
    path: '/trails/',
    title: 'Hiking trail guides',
    description:
      'Curated Disha guides for long-distance trails: the ones in the app, the next batch, and the most-voted requests. Vote, request a trail or suggest an edit.',
  },
  {
    path: '/maps/',
    title: 'Offline maps for hiking',
    description:
      'Where Disha has offline maps for hiking, along trails and around cities, updated daily. See what is available, shortlisted next and most requested.',
  },
  {
    path: '/docs/',
    title: 'Disha documentation',
    description:
      'How to use Disha, the offline hiking app for iPhone: get the beta, download an area, install a guide and plan or import a route.',
  },
  {
    path: '/docs/getting-started/',
    title: 'Getting started with Disha',
    description:
      'Join the Disha beta on TestFlight, download an area on Wi-Fi and check that the map, route and elevation profile work in airplane mode.',
  },
  {
    path: '/docs/offline-maps/',
    title: 'Offline maps',
    description:
      'What a Disha offline area includes, how to download, cancel or delete one, and what to check before you leave without a signal.',
  },
  {
    path: '/docs/guides/',
    title: 'Trail guides',
    description:
      'How to browse and install a Disha trail guide, what it shows along the route, and where its stops and distances come from.',
  },
  {
    path: '/docs/offline-maps/coverage/',
    title: 'Where offline maps are available',
    description:
      'How to read the Disha maps page: which trails and cities have offline maps, what each map status means and how the map cells line up.',
  },
  {
    path: '/docs/guides/trails/',
    title: 'Which trails have guides',
    description:
      'How to read the Disha trails page: which trails have a guide, what each guide status means, and what a trail with only a map gives you.',
  },
  {
    path: '/docs/routes/',
    title: 'Routes: import GPX or draw your own',
    description:
      'Import a GPX file into Disha, look at a section of a route, or draw a new route that follows the paths in your offline map.',
  },
  {
    path: '/docs/requests/',
    title: 'Request a trail',
    description:
      'How to ask Disha for a trail map or guide, vote on a request with a GitHub 👍, and how the most-voted requests are shortlisted next.',
  },
  {
    path: '/docs/edits/',
    title: 'Suggest an edit to a guide',
    description:
      'How to report a change on a published Disha guide, such as a dry spring, a closed hut or a reroute, and confirm edits others have reported.',
  },
  {
    path: '/docs/open-data/',
    title: 'Open trail data',
    description:
      'How Disha keeps trail data open and current: seasonal conditions, water and stops, votes on reports, season summaries and OpenStreetMap.',
  },
  {
    path: '/docs/faq/',
    title: 'Disha FAQ',
    description:
      'Short answers about Disha: working without a signal, accounts and tracking, where the map data comes from, price and Android.',
  },
  {
    path: '/docs/support/',
    title: 'Get help with Disha',
    description:
      'How to report a problem in the Disha beta, share diagnostics from the app, and ask a question or fix a docs page.',
  },
  {
    path: '/privacy/',
    title: 'Privacy',
    description:
      'What the Disha site collects when you join the beta waitlist, who handles it, and how to get off the list.',
  },
  {
    path: '/routes/gr20/',
    title: 'GR20 offline map and guide for iPhone',
    description:
      'The GR20 in Corsica, north to south from Calenzana to Conca, with an offline map, water points, huts and distance to the next stop in Disha.',
    draft: true,
  },
]

export function getPage(path: string): SitePage {
  const page = PAGES.find((p) => p.path === path)
  if (!page) throw new Error(`No page registered for ${path}. Add it to src/lib/pages.ts.`)
  return page
}

export const PUBLISHED_PAGES: readonly SitePage[] = PAGES.filter((p) => !p.draft)
