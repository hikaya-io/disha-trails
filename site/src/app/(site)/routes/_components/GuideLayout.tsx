import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { Waitlist } from '@/components/Waitlist'
import { getPage } from '@/lib/pages'
import { absoluteUrl, SITE_NAME } from '@/lib/site'

export type Guide = {
  /** Registered path in src/lib/pages.ts, such as "/routes/gr20/". */
  path: string
  /** The page's h1. */
  heading: string
  /** One or two sentences under the h1. */
  lead: string
  /** "YYYY-MM-DD". Leave both dates out until the guide is published. */
  datePublished?: string
  dateModified?: string
}

/** Shared frame for a named-route guide: h1, lead, MDX body, Article JSON-LD and the waitlist. */
export function GuideLayout({ guide, children }: { guide: Guide; children: React.ReactNode }) {
  const page = getPage(guide.path)
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.heading,
          description: page.description,
          mainEntityOfPage: absoluteUrl(guide.path),
          author: { '@type': 'Organization', name: 'Hikaya', url: 'https://hikaya.io' },
          publisher: { '@type': 'Organization', name: 'Hikaya', url: 'https://hikaya.io' },
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
          ...(guide.datePublished ? { datePublished: guide.datePublished } : {}),
          ...(guide.dateModified ? { dateModified: guide.dateModified } : {}),
        }}
      />
      <Container className="pt-16 sm:pt-24">
        <article className="prose-disha">
          <p className="!mt-0 text-sm text-muted">Route guide</p>
          <h1 className="!mt-4 text-4xl font-extrabold tracking-[-0.04em] text-ink text-balance sm:text-5xl">
            {guide.heading}
          </h1>
          <p className="text-xl">{guide.lead}</p>
          {children}
          <h2 id="waitlist">Join the beta waitlist</h2>
          <p>Disha is in beta on TestFlight for iPhone. Sign up and we'll email an invite.</p>
          <div className="pt-2">
            <Waitlist />
          </div>
        </article>
      </Container>
    </>
  )
}
