import Link from 'next/link'
import { Container } from '@/components/Container'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata('/terms/')

const REPO = 'https://github.com/hikaya-io/disha-trails'

export default function TermsPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <article className="prose-disha">
        <h1 className="!mt-0 text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-5xl">
          Terms of use
        </h1>
        <p>Last updated November 9, 2026.</p>
        <p>
          These terms cover this site and the services behind the Disha app: the map tiles at
          tiles.hikaya.app, the trail guides at guides.hikaya.app and the trail files at
          /data/trails/ on this site. Hikaya runs all of them. By using them, you agree to these
          terms.
        </p>

        <h2 id="services">Map tiles and guides</h2>
        <p>
          The map tiles and guides are for the Disha app, this site and other Hikaya sites. Please
          don't:
        </p>
        <ul>
          <li>use them as the map or guide service for another app or website,</li>
          <li>download them in bulk, scrape them or mirror them,</li>
          <li>get around the access checks or rate limits on them.</li>
        </ul>
        <p>
          Requests may be rate limited. We may block a client that breaks these terms or puts heavy
          load on the services, with or without notice.
        </p>
        <p>
          To build on the same data, start from its sources. The base map comes from{' '}
          <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, and the site&apos;s
          code is open on <a href={REPO}>GitHub</a>.
        </p>

        <h2 id="data">Trail files and licenses</h2>
        <p>
          You can download the trail files at /data/trails/ and in the{' '}
          <a href={REPO}>disha-trails repo</a>, one at a time, for your own use and to share. Each
          file&apos;s license is listed in its{' '}
          <a href={`${REPO}/blob/main/ATTRIBUTION.md`}>attribution file</a>. Trail data marked ODbL
          is under the <a href={`${REPO}/blob/main/DATA-LICENSE.md`}>Open Database License</a>, and
          the site&apos;s code is under the <a href={`${REPO}/blob/main/LICENSE`}>MIT license</a>.
          The licenses cover the files and code. They give no right to use the hosted services
          beyond these terms.
        </p>
        <p>
          Map data is ©{' '}
          <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>. The full
          map credits are on the <Link href="/privacy/#map-credits">privacy page</Link>.
        </p>

        <h2 id="safety">Your safety</h2>
        <p>
          Trails, water sources, huts and conditions change, and the maps, routes and guides may be
          wrong or out of date. Use them alongside other sources, check current conditions locally
          and plan for the terrain and weather. You are responsible for your own safety on the
          trail.
        </p>

        <h2 id="as-is">No guarantees</h2>
        <p>
          The site and services are provided as they are, without any warranty. They may change, go
          down or stop. We may update these terms, and the date at the top shows the latest version.
        </p>

        <h2 id="contact">Contact</h2>
        <p>
          To ask about these terms or about using the data more widely, contact Hikaya through{' '}
          <a href="https://hikaya.io">hikaya.io</a>.
        </p>
      </article>
    </Container>
  )
}
