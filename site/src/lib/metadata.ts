import type { Metadata } from 'next'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { getPage } from '@/lib/pages'

/** Title, description, canonical, Open Graph and robots for a registered page. */
export function pageMetadata(path: string): Metadata {
  const page = getPage(path)
  const url = absoluteUrl(path)
  return {
    // The home page title is absolute so it does not become "... | Disha | Disha".
    title: path === '/' ? { absolute: `${SITE_NAME}: ${page.title}` } : page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: page.title,
      description: page.description,
      url,
      locale: 'en_US',
    },
    ...(page.draft ? { robots: { index: false, follow: false } } : {}),
  }
}
