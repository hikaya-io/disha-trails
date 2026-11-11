import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/JsonLd'
import { PageTop } from '@/components/PageTop'
import { loadCoverageForBuild } from '@/lib/coverage-build'
import { routeIds } from '@/lib/route-files'
import Link from 'next/link'
import {
  formatLength,
  nearbyTrails,
  splitTrailName,
  type Trail,
  trailDescription,
  trailHref,
  trailTitle,
} from '@/lib/coverage'
import { shareMetadata } from '@/lib/metadata'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { TrailDetail } from './_components/TrailDetail'

// One page per trail in coverage.json at build time. These aren't in lib/pages.ts, which lists
// the fixed pages, and they are noindex and left out of the sitemap.
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
  const title = trailTitle(trail)
  const description = trailDescription(trail)
  return {
    title,
    description,
    alternates: { canonical: url },
    ...shareMetadata({ title, description, url }),
    // Trail pages stay out of search results; only the main pages are indexed (2026-11-12). The
    // title and description still serve link previews.
    robots: { index: false, follow: true },
  }
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
          name: trailTitle(trail),
          url,
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
        }}
      />
      <TrailDetail
        initial={trail}
        hasRoute={routeIds().includes(trail.id)}
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
        nearby={<NearbyTrails trails={nearbyTrails(trail, data.trails)} />}
      />
    </>
  )
}

// Server-rendered, so the links are in the page's HTML: the /trails/ table shows 25 rows at a
// time, and without these most trail pages would have no plain link to them.
function NearbyTrails({ trails }: { trails: Trail[] }) {
  if (!trails.length) return null
  return (
    <section aria-labelledby="nearby-trails" className="mt-8 text-[13px]">
      <h2 id="nearby-trails" className="text-faint">
        Trails nearby
      </h2>
      <ul className="mt-2">
        {trails.map((t) => (
          <li key={t.id}>
            <Link
              href={trailHref(t.id)}
              className="inline-flex min-h-11 items-center gap-2 text-ink hover:text-ink-soft"
            >
              <span className="underline">{t.name}</span>
              <span className="text-muted tabular-nums">{formatLength(t.lengthKm)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
