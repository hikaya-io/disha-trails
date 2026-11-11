import Link from 'next/link'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { PageTop } from '@/components/PageTop'
import { StatusLink } from '@/components/coverage/StatusLink'
import { guideStage, trailHref } from '@/lib/coverage'
import { loadCoverageForBuild } from '@/lib/coverage-build'
import { pageMetadata } from '@/lib/metadata'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { TrailsSection, type TrailsData } from './_components/TrailsSection'

const PATH = '/trails/'

export const metadata = pageMetadata(PATH)

const noteLink = 'text-ink underline hover:text-ink-soft'

export default async function TrailsPage() {
  // The build's copy of the list, trimmed to what the table shows: the full coverage.json is
  // about 380 KB, mostly map cells this page doesn't draw.
  const data = await loadCoverageForBuild()
  const initial: TrailsData = {
    repo: data.repo,
    requestLabel: data.requestLabel,
    trails: data.trails
      .filter((t) => guideStage(t.guide) !== null)
      .map((t) => ({ ...t, bbox: null, cellIds: [] })),
  }
  const published = initial.trails.filter((t) => guideStage(t.guide) === 'available')

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Hiking trail guides',
          url: absoluteUrl(PATH),
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
          mainEntity: {
            '@type': 'ItemList',
            name: 'Trail guides in Disha',
            numberOfItems: published.length,
            itemListElement: published.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: t.name,
              url: absoluteUrl(trailHref(t.id)),
            })),
          },
        }}
      />
      <Container className="pt-8 sm:pt-10 lg:pt-4">
        <TrailsSection
          initial={initial}
          statusHelp={<StatusLink key="status-help" kind="guide" className="min-h-8 text-[12px]" />}
          sidebar={{
            header: (
              <PageTop
                compact
                crumbs={[{ href: '/', label: 'home' }]}
                current="trails"
                title="Hiking trail guides"
                intro="Water, huts, and campsites along each trail, with its offline map."
              />
            ),
            footer: (
              <div className="space-y-2 text-[13px] text-muted">
                <p>
                  Missing a trail? Votes decide which guides come next.{' '}
                  <Link href="/docs/requests/" className={noteLink}>
                    Request a trail
                  </Link>
                </p>
                <p>
                  Guides start from OpenStreetMap.{' '}
                  <Link href="/docs/open-data/" className={noteLink}>
                    How it works
                  </Link>
                </p>
              </div>
            ),
          }}
        />
      </Container>
    </>
  )
}
