import Link from 'next/link'
import { Container } from '@/components/Container'
import { JsonLd } from '@/components/JsonLd'
import { Waitlist } from '@/components/Waitlist'
import { pageMetadata } from '@/lib/metadata'
import { absoluteUrl, SITE_NAME } from '@/lib/site'

const PATH = '/openstreetmap-hiking-app-iphone/'

export const metadata = pageMetadata(PATH)

export default function ProductPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: SITE_NAME,
          url: absoluteUrl(PATH),
          description: 'An offline hiking navigation app for iPhone built on OpenStreetMap data.',
          applicationCategory: 'TravelApplication',
          operatingSystem: 'iOS 17.5 or later',
          publisher: { '@type': 'Organization', name: 'Hikaya', url: 'https://hikaya.io' },
        }}
      />
      <Container className="pt-16 sm:pt-24">
        <article className="prose-disha">
          <p className="!mt-0 text-sm text-muted">The app</p>
          <h1 className="!mt-4 text-4xl font-extrabold tracking-[-0.04em] text-ink text-balance sm:text-5xl">
            An OpenStreetMap hiking app for iPhone
          </h1>
          <p className="text-xl">
            Disha is an iPhone hiking app built on OpenStreetMap data. Download a trail before you
            leave, and the map, the route and the guide keep working with no connection.
          </p>

          <h2>Offline maps for the trail</h2>
          <p>
            Download a trail at home or at the hut. The map, the route line and the guide for that
            trail stay on your phone, so nothing waits on a signal.
          </p>
          <p>
            The map uses OpenStreetMap data, the same open map behind many other hiking and
            navigation apps. If a path or a spring is wrong, you can fix it at the source.
          </p>

          <h2 id="distance">Distance to the next point of interest</h2>
          <p>
            Drag along the trail and Disha shows the distance to the next stop, measured from your
            position. Stops come from OpenStreetMap and include springs, huts, campsites, shops and
            viewpoints.
          </p>
          <p>
            On a multi-day route this answers the questions you ask all day. How far to water? Can I
            make the hut before dark? <Link href="/">Try the example on the home page.</Link>
          </p>

          <h2 id="route-builder">Build a route or bring your own</h2>
          <p>
            Draw a route on the map, import a GPX file, or build a route to a target amount of
            climbing. Use it to fit stages to your own days, to plan a self-made tour or to set up a
            training route.
          </p>

          <h2>Open trail data</h2>
          <p>
            Seasonal conditions, water points and points of interest will be open to view and add to
            on the web, without the app. Reports are voted up or down, and older comments are rolled
            into a short summary at the end of each season.{' '}
            <Link href="/docs/open-data/">Read how the open trail data works.</Link>
          </p>

          <h2>Which routes</h2>
          <p>
            Disha is built first for the waymarked long routes of Europe, such as the GR system in
            France, Spain and Portugal. Guides for the GR20 in Corsica and the Tour du Mont Blanc
            are in the beta. The GR10 and GR11 are on the list.
          </p>

          <h2>Availability and price</h2>
          <ul>
            <li>Disha is in beta on TestFlight and needs iOS 17.5 or later.</li>
            <li>It is iPhone only for now.</li>
            <li>It will be a paid app. Pricing is not final.</li>
            <li>The trail data stays free to view on the web.</li>
          </ul>

          <h2 id="waitlist">Join the beta waitlist</h2>
          <p>Sign up and we'll email an invite when seats open.</p>
          <div className="pt-2">
            <Waitlist />
          </div>
        </article>
      </Container>
    </>
  )
}
