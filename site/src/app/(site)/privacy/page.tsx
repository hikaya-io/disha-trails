import { Container } from '@/components/Container'
import { ManageCookies } from '@/components/consent/ManageCookies'
import { GA_ID } from '@/lib/analytics'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata('/privacy/')

export default function PrivacyPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <article className="prose-disha">
        <h1 className="!mt-0 text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-5xl">
          Privacy
        </h1>
        {GA_ID ? (
          <p>
            This site is published by Hikaya. It loads no ads. It runs Google Analytics only if you
            accept analytics cookies, and the only personal data it asks you for is the email
            address you give the waitlist.
          </p>
        ) : (
          <p>
            This site is published by Hikaya. It sets no cookies of its own, runs no analytics, and
            loads no ads. The only personal data it collects is the email address you give the
            waitlist.
          </p>
        )}

        {GA_ID && (
          <>
            <h2 id="cookies">Cookies and analytics</h2>
            <p>
              On your first visit the site asks whether you accept analytics cookies. You can change
              your choice at any time with{' '}
              <ManageCookies className="underline">cookies</ManageCookies> in the footer. Your
              choice is saved in your browser for 12 months, and then the site asks again.
            </p>
            <ul>
              <li>
                <strong>Essential, always on.</strong> Your browser&apos;s storage keeps your cookie
                choice and your light or dark theme, and the waitlist form&apos;s bot check is
                covered below. None of these identify you or follow you to other sites.
              </li>
              <li>
                <strong>Analytics, only if you accept.</strong> Google Analytics records the pages
                you view, your device, browser and operating system, the site that sent you, and
                your approximate location, and sets cookies that recognize your browser on later
                visits. It does not load until you choose Accept all. If you choose Essential only,
                or later turn analytics off, it does not run and we delete its cookies.
              </li>
            </ul>
            <p>
              We use analytics only to see which pages are read and to improve the site, never for
              ads, and we do not use it to train AI models. Where the GDPR applies, the legal basis
              is your consent, which you can withdraw at any time. Google processes this data under
              the{' '}
              <a href="https://google.com/analytics/terms/us.html">
                Google Analytics Terms of Service
              </a>{' '}
              and the <a href="https://policies.google.com/privacy">Google Privacy Policy</a>. You
              can also install the{' '}
              <a href="https://tools.google.com/dlpage/gaoptout/">
                Google Analytics Opt-out Browser Add-on
              </a>
              .
            </p>
          </>
        )}

        <h2 id="map-credits">Map credits</h2>
        <p>
          The maps on this site, from the home page animation to the maps and trail pages, use these
          sources.
        </p>
        <ul>
          <li>
            <strong>Map data.</strong> Paths, streams, lakes, land cover, and trail routes are ©{' '}
            <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>,
            available under the Open Database License (ODbL).
          </li>
          <li>
            <strong>Terrain.</strong> Contours, hillshade, and elevation profiles come from the
            Copernicus DEM GLO-30. © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH
            2014–2018, provided under COPERNICUS by the European Union and ESA. All rights reserved.
          </li>
          <li>
            <strong>OpenFreeMap layer.</strong> Map tiles from{' '}
            <a href="https://openfreemap.org">OpenFreeMap</a>, © OpenMapTiles, built from
            OpenStreetMap data.
          </li>
          <li>
            <strong>OSM Classic layer.</strong> Map tiles from{' '}
            <a href="https://www.openstreetmap.org">OpenStreetMap</a>.
          </li>
          <li>
            <strong>Disha trail data.</strong> Routes built by Hikaya from OpenStreetMap data are
            available under the ODbL.
          </li>
          <li>
            <strong>Map labels.</strong> Noto Sans, under the SIL Open Font License.
          </li>
        </ul>
        <p>
          If you switch to another map layer, your browser loads its tiles from that layer&apos;s
          provider, which receives your IP address and browser details to send them.
        </p>

        <h2 id="waitlist">The beta waitlist</h2>
        <p>
          When you join the waitlist, we store your email address and the date you signed up, share
          them with our team to review the sign-up, and use providers that host and send email for
          us. When the beta opens, we use the same address to invite you. The invite comes through
          Apple&apos;s TestFlight, and Apple then handles your address under its own privacy policy.
        </p>
        <p>
          We use the address only for the Disha waitlist and invite, not for a newsletter or
          marketing. To leave the list, reply to any waitlist email.
        </p>
        <p>
          The waitlist form has a bot check from a security provider. It loads when you click into
          the email field, not when the page opens, and receives your IP address and browser details
          to make that check.
        </p>

        <h2>Everything else</h2>
        <p>
          Hikaya's full privacy policy, including who is responsible for your data, your rights, and
          how to contact us, is at <a href="https://hikaya.io/privacy/">hikaya.io/privacy</a>.
        </p>
      </article>
    </Container>
  )
}
