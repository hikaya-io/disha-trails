import { Container } from '@/components/Container'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata('/privacy/')

export default function PrivacyPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <article className="prose-disha">
        <h1 className="!mt-0 text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-5xl">
          Privacy
        </h1>
        <p>
          This site is published by Hikaya. It sets no cookies of its own, runs no analytics and
          loads no ads. The only personal data it collects is the email address you give the
          waitlist.
        </p>

        <h2 id="map-credits">Map credits</h2>
        <p>
          The maps on this site, in the home page animation and the tour, are drawn from these
          sources. They do not collect any information about you.
        </p>
        <ul>
          <li>
            <strong>Map data.</strong> Paths, streams, lakes, land cover and the Tour du Mont Blanc
            route are ©{' '}
            <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>,
            available under the Open Database License.
          </li>
          <li>
            <strong>Terrain.</strong> Contours and elevation come from the Copernicus DEM GLO-30. ©
            DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under
            COPERNICUS by the European Union and ESA. All rights reserved.
          </li>
        </ul>

        <h2 id="waitlist">The beta waitlist</h2>
        <p>
          When you join the waitlist, we store your email address and the date you signed up in a
          database at Cloudflare, and post them to our team in Slack so we can review the sign-up.
          If we approve it, Postmark sends you one confirmation email. When the beta opens, we use
          the same address to invite you. The invite comes through Apple's TestFlight, and Apple
          then handles your address under its own privacy policy.
        </p>
        <p>
          We use the address only for the Disha waitlist and invite, not for a newsletter or
          marketing. To leave the list, reply to any waitlist email.
        </p>

        <h2>The bot check</h2>
        <p>
          The waitlist form uses Cloudflare Turnstile to block bots. Its script loads when you click
          into the email field, not when the page opens. Turnstile receives your IP address and
          browser details to make that check.
        </p>

        <h2>Everything else</h2>
        <p>
          Hikaya's full privacy policy, including who is responsible for your data, your rights and
          how to contact us, is at <a href="https://hikaya.io/privacy/">hikaya.io/privacy</a>.
        </p>
      </article>
    </Container>
  )
}
