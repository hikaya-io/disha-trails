import type { Metadata, Viewport } from 'next'
import { DM_Sans, Red_Hat_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Analytics } from '@/components/consent/Analytics'
import { CookieBanner } from '@/components/consent/CookieBanner'
import { GA_ID } from '@/lib/analytics'
import { ALLOW_INDEXING, getSiteUrl, SITE_NAME } from '@/lib/site'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
// One weight of mono. Emphasis comes from color, not weight. Red Hat Mono replaced DM Mono
// (2026-11-10), whose curly "f" read oddly in body text.
const redHatMono = Red_Hat_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-red-hat-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { template: `%s | ${SITE_NAME}`, default: SITE_NAME },
  // Until indexing is switched on, every page is noindex. A page that sets its own robots (drafts,
  // trail pages) replaces this. Links are still followed, so crawlers see the tag on each page.
  ...(ALLOW_INDEXING ? {} : { robots: { index: false, follow: true } }),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

/** Bare shell. The marketing pages add the header and footer in (site)/layout.tsx, the map pages only the header in (map)/layout.tsx; the docs add their own. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets the class on <html> before React hydrates.
    <html
      lang="en"
      className={`${dmSans.variable} ${redHatMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
        {/* No measurement ID, no analytics: then there is nothing to ask consent for. */}
        {GA_ID && (
          <>
            <CookieBanner />
            <Analytics />
          </>
        )}
      </body>
    </html>
  )
}
