import { JsonLd } from '@/components/JsonLd'
import { getPage } from '@/lib/pages'
import { absoluteUrl, SITE_NAME } from '@/lib/site'

/** TechArticle JSON-LD for a docs page, read from the page registry. Put it last in the MDX file. */
export function DocsSeo({ path }: { path: string }) {
  const page = getPage(path)
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: page.title,
        description: page.description,
        mainEntityOfPage: absoluteUrl(path),
        publisher: { '@type': 'Organization', name: 'Hikaya', url: 'https://hikaya.io' },
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
      }}
    />
  )
}
