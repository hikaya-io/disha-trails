import Link from 'next/link'
import { DocsFooter } from '@/components/docs/DocsFooter'
import { DocsMobileNavigation } from '@/components/docs/DocsMobileNavigation'
import { DocsNavigation } from '@/components/docs/DocsNavigation'
import { DocsSearch } from '@/components/docs/DocsSearch'
import { DocsSectionBar } from '@/components/docs/DocsSectionBar'
import { DocsSectionsProvider } from '@/components/docs/DocsSectionsProvider'
import { DocsHeaderBrand, DocsShell, SidebarHideButton } from '@/components/docs/DocsShell'
import { DocsTableOfContents } from '@/components/docs/DocsTableOfContents'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { buildDocsIndex } from '@/lib/docs-index'

/**
 * Docs shell, laid out like Minou's: a fixed, compact sidebar from lg that can be hidden (DocsShell), a blurred sticky header with search
 * and the theme toggle, a section bar below lg, the page, and a compact "On this page" from lg. The
 * marketing header and footer are not used here, so this sits outside the (site) route group.
 */
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const searchIndex = await buildDocsIndex()
  return (
    <DocsSectionsProvider>
      <DocsShell
        sidebar={
          <>
            <div className="flex h-12 items-center justify-between">
              <Logo />
              <SidebarHideButton />
            </div>
            <div className="mt-6 flex-1">
              <DocsNavigation compact />
            </div>
          </>
        }
      >
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-bg/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-2">
            <DocsMobileNavigation />
            <DocsHeaderBrand logo={<Logo />} />
          </div>
          <div className="flex items-center gap-1">
            {/* One instance only: each registers the ⌘K shortcut. */}
            <DocsSearch index={searchIndex} />
            <Link
              href="/#waitlist"
              className="hidden min-h-11 items-center px-2 text-sm text-muted hover:text-ink md:flex"
            >
              Join the waitlist
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <DocsSectionBar />
        <main id="main" className="px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl lg:flex lg:max-w-none lg:justify-center lg:gap-10 xl:gap-16">
            <div className="min-w-0 flex-auto lg:max-w-2xl">
              <article id="docs-article" className="prose-disha">
                {children}
              </article>
              <DocsFooter />
            </div>
            <DocsTableOfContents />
          </div>
        </main>
      </DocsShell>
    </DocsSectionsProvider>
  )
}
