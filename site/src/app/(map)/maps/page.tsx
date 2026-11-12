import { Suspense } from 'react'
import { JsonLd } from '@/components/JsonLd'
import { PageTop } from '@/components/PageTop'
import { pageMetadata } from '@/lib/metadata'
import { routeIds } from '@/lib/route-files'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { MapsSection } from './_components/MapsSection'

const PATH = '/maps/'
export const metadata = pageMetadata(PATH)

// The panel's padding while the list loads, as in MapsSection's PANEL_PAD.
const PANEL_PAD = 'px-4 sm:px-6 lg:px-4'

export default function MapsPage() {
  const header = (
    <PageTop
      tight
      crumbs={[{ href: '/', label: 'home' }]}
      current="maps"
      title="Offline hiking maps"
      intro="Offline maps along trails and around cities."
    />
  )
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Offline hiking maps',
          url: absoluteUrl(PATH),
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
        }}
      />
      {/* useSearchParams needs a Suspense boundary in a static export. The header is the
          fallback, so the title is in the exported HTML. */}
      <Suspense fallback={<div className={`${PANEL_PAD} pt-8 sm:pt-10 lg:pt-3`}>{header}</div>}>
        <MapsSection routes={routeIds()} header={header} />
      </Suspense>
    </>
  )
}
