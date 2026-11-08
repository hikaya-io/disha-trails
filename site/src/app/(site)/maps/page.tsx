import { Suspense } from 'react'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { PageTop } from '@/components/PageTop'
import { pageMetadata } from '@/lib/metadata'
import { routeIds } from '@/lib/route-files'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { MapsSection } from './_components/MapsSection'

const PATH = '/maps/'
export const metadata = pageMetadata(PATH)

export default function MapsPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Offline maps',
          url: absoluteUrl(PATH),
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
        }}
      />
      <Container className="pt-8 sm:pt-10">
        <PageTop
          crumbs={[{ href: '/', label: 'home' }]}
          current="maps"
          title="Maps"
          intro="Where you can download offline maps, along trails and around cities."
        />
        <div className="mt-12">
          {/* useSearchParams needs a Suspense boundary in a static export. */}
          <Suspense>
            <MapsSection routes={routeIds()} />
          </Suspense>
        </div>
      </Container>
    </>
  )
}
