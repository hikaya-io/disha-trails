import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/JsonLd'
import { PageTop } from '@/components/PageTop'
import { loadCoverageForBuild } from '@/lib/coverage-build'
import { splitTrailName, trailDescription, trailHref } from '@/lib/coverage'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { TrailDetail } from './_components/TrailDetail'

// One page per trail in coverage.json at build time. These aren't in lib/pages.ts, which lists
// the fixed pages; the sitemap adds the trails that have a map.
export const dynamicParams = false

export async function generateStaticParams() {
  const data = await loadCoverageForBuild()
  return data.trails.map((trail) => ({ id: trail.id }))
}

async function findTrail(params: Promise<{ id: string }>) {
  const { id } = await params
  const data = await loadCoverageForBuild()
  const trail = data.trails.find((t) => t.id === id)
  if (!trail) notFound()
  return { trail, data }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { trail } = await findTrail(params)
  const url = absoluteUrl(trailHref(trail.id))
  const title = `${trail.name}: offline map and guide`
  const description = trailDescription(trail)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName: SITE_NAME, title, description, url, locale: 'en_US' },
    // A trail with no map area yet has little to show, so keep it out of search results.
    ...(trail.bbox ? {} : { robots: { index: false, follow: true } }),
  }
}

/** Whether scripts/build-trail-routes.mjs wrote a route and elevation profile for the trail. */
function hasRoute(id: string): boolean {
  return existsSync(join(process.cwd(), 'public/routes', `${id}.json`))
}

export default async function TrailPage({ params }: { params: Promise<{ id: string }> }) {
  const { trail, data } = await findTrail(params)
  const url = absoluteUrl(trailHref(trail.id))
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${trail.name}: offline map and guide`,
          url,
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
        }}
      />
      <TrailDetail
        initial={trail}
        hasRoute={hasRoute(trail.id)}
        header={
          <PageTop
            crumbs={[
              { href: '/', label: 'home' },
              { href: '/trails/', label: 'trails' },
            ]}
            current={trail.name}
            title={splitTrailName(trail.name).title}
            subtitle={splitTrailName(trail.name).qualifier}
          />
        }
        repo={{ repo: data.repo, requestLabel: data.requestLabel }}
      />
    </>
  )
}
