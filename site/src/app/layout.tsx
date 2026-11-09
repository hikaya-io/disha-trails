import type { Metadata, Viewport } from 'next'
import { DM_Mono, DM_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { getSiteUrl, SITE_NAME } from '@/lib/site'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
// One weight of mono. Emphasis comes from color, not weight.
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { template: `%s | ${SITE_NAME}`, default: SITE_NAME },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

/** Bare shell. The marketing pages add the header and footer in (site)/layout.tsx; the docs add their own. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets the class on <html> before React hydrates.
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
