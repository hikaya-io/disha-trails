import type { Metadata } from 'next'
import { absoluteUrl, SHARE_IMAGE, SITE_NAME } from '@/lib/site'
import { getPage } from '@/lib/pages'

/**
 * The Open Graph and Twitter card tags for a page: its title, description and canonical URL, with
 * the site's share image. A page's own `openGraph` replaces the layout's whole, so every page sets
 * the image through here.
 */
export function shareMetadata({
  title,
  description,
  url,
}: {
  title: string
  description: string
  url: string
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = {
    url: absoluteUrl(SHARE_IMAGE.path),
    width: SHARE_IMAGE.width,
    height: SHARE_IMAGE.height,
    alt: SHARE_IMAGE.alt,
  }
  return {
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: 'en_US',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

/** Title, description, canonical, share tags and robots for a registered page. */
export function pageMetadata(path: string): Metadata {
  const page = getPage(path)
  const url = absoluteUrl(path)
  return {
    // The home page title is absolute so it does not become "... | Disha | Disha".
    title: path === '/' ? { absolute: `${SITE_NAME}: ${page.title}` } : page.title,
    description: page.description,
    alternates: { canonical: url },
    ...shareMetadata({ title: page.title, description: page.description, url }),
    ...(page.draft ? { robots: { index: false, follow: false } } : {}),
  }
}
