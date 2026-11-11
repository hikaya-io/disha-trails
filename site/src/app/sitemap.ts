import type { MetadataRoute } from 'next'
import { PUBLISHED_PAGES } from '@/lib/pages'
import { absoluteUrl } from '@/lib/site'

// Required for the static export.
export const dynamic = 'force-static'

/**
 * Built from the page registry, so a new page appears here once it is registered and not a draft.
 * Trail pages are left out: they are noindex (decided 2026-11-12). robots.txt names this file only
 * once indexing is switched on (ALLOW_INDEXING in lib/site.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLISHED_PAGES.map((page) => ({ url: absoluteUrl(page.path) }))
}
