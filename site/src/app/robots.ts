import type { MetadataRoute } from 'next'
import { absoluteUrl, ALLOW_INDEXING } from '@/lib/site'

// Required for the static export.
export const dynamic = 'force-static'

/**
 * Crawling stays allowed even while indexing is off: a crawler blocked here never reads a page's
 * noindex tag, and Google can still list a blocked URL it finds linked elsewhere. The sitemap is
 * named only once indexing is on.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(ALLOW_INDEXING ? { sitemap: absoluteUrl('/sitemap.xml') } : {}),
  }
}
