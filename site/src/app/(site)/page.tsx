import { AppIcon } from '@/components/AppIcon'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { Waitlist } from '@/components/Waitlist'
import { pageMetadata } from '@/lib/metadata'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { DishaTour } from './_components/tour/DishaTour'
import { HeroTrail } from './_components/tour/HeroTrail'
import { MapDefs } from './_components/tour/scene-parts'

export const metadata = pageMetadata('/')

function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-24 sm:mt-32">
      <Container>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">{title}</h2>
          <div className="mt-4 space-y-4 text-lg text-muted">{children}</div>
        </div>
      </Container>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              '@id': absoluteUrl('/#website'),
              url: absoluteUrl('/'),
              name: SITE_NAME,
              publisher: { '@id': 'https://hikaya.io/#organization' },
            },
            {
              '@type': 'Organization',
              '@id': 'https://hikaya.io/#organization',
              name: 'Hikaya',
              url: 'https://hikaya.io',
            },
          ],
        }}
      />

      {/* The map's shared SVG defs, used by the hero and by the tour below */}
      <MapDefs />

      <section className="pt-16 sm:pt-24">
        <Container>
          <div className="grid items-center gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            <div>
              <div className="flex items-center gap-4">
                <AppIcon size={64} />
                <p className="text-sm text-muted">Offline hiking app for iPhone</p>
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-balance sm:text-5xl">
                Know what&apos;s ahead on the trail.
              </h1>
              <p className="mt-6 max-w-xl text-xl text-muted">
                Disha puts the map, the trail guide, and the latest reports from other hikers in one
                app, all offline.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/#waitlist">Join beta waitlist</Button>
                <Button href="/#how-it-works" variant="secondary">
                  See how it works
                </Button>
              </div>
            </div>
            <HeroTrail />
          </div>
        </Container>
      </section>

      <section id="how-it-works" className="mt-24 sm:mt-32">
        <Container>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
              How Disha works
            </h2>
          </div>
          <div className="mt-10">
            <DishaTour />
          </div>
        </Container>
      </section>

      <Section title="Offline maps and guides for Europe's long-distance trails">
        <p>
          Disha starts with Europe&apos;s long-distance trails: the GR20 in Corsica and the Tour du
          Mont Blanc, then the GR10 and GR11 across the Pyrenees. Each guide lists the water, huts,
          and campsites along the trail with what hikers last reported.
        </p>
        {/* -ml-6 lines the text of the two link buttons up with the paragraph above */}
        <div className="-ml-6 flex flex-wrap pt-2">
          <Button href="/trails/" variant="secondary">
            See available trail guides
          </Button>
          <Button href="/maps/" variant="secondary">
            See offline map coverage
          </Button>
        </div>
      </Section>

      <Section id="waitlist" title="Join beta waitlist">
        <p>
          Disha is in beta on TestFlight for iPhone. Sign up and we'll email an invite when seats
          open.
        </p>
        <div className="pt-2">
          <Waitlist />
        </div>
      </Section>
    </>
  )
}
