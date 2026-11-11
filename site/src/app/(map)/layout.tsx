import { SiteHeader } from '@/components/layout/SiteHeader'

/**
 * The map pages, /maps/ and each trail's page: the site header over a map that fills the rest of
 * the screen on a phone. No site footer here; the credits close the map's side panel instead
 * (MapCredits), and a trail page adds the footer itself from lg, where its text scrolls.
 */
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
    </>
  )
}
