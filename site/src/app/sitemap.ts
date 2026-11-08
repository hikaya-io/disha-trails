import type { MetadataRoute } from 'next'
import { loadCoverageForBuild } from '@/lib/coverage-build'
import { trailHref } from '@/lib/coverage'
import { PUBLISHED_PAGES } from '@/lib/pages'
import { absoluteUrl } from '@/lib/site'

// Required for the static export.
export const dynamic = 'force-static'

/**
 * Built from the page registry, so a new page appears here once it is registered and not a draft,
 * plus a page for each trail that has a map area. Trails without one are noindex.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await loadCoverageForBuild()
  return [
    ...PUBLISHED_PAGES.map((page) => ({ url: absoluteUrl(page.path) })),
    ...data.trails.filter((t) => t.bbox).map((t) => ({ url: absoluteUrl(trailHref(t.id)) })),
  ]
}
