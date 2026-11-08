import Link from 'next/link'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { PageTop } from '@/components/PageTop'
import { pageMetadata } from '@/lib/metadata'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { StatusLink } from '@/components/coverage/StatusLink'
import { TrailsSection } from './_components/TrailsSection'

const PATH = '/trails/'

export const metadata = pageMetadata(PATH)

export default function TrailsPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Trail guides',
          url: absoluteUrl(PATH),
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
        }}
      />
      <Container className="pt-8 sm:pt-10">
        <PageTop
          crumbs={[{ href: '/', label: 'home' }]}
          current="trails"
          title="Trails"
          intro="Curated guides with water, huts and campsites along the route, each with its offline map."
        />
        <StatusLink href="/docs/guides/trails/#guide-status" className="mt-6" />
        <div className="mt-10">
          <TrailsSection />
        </div>

        <p className="mt-12 max-w-2xl text-[13px] text-muted">
          Guide data is open and built on OpenStreetMap.{' '}
          <Link
            href="/docs/guides/#open-trail-data"
            className="text-ink underline hover:text-ink-soft"
          >
            How it works
          </Link>
        </p>
      </Container>
    </>
  )
}
