import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'

export const metadata = { title: 'Page not found', robots: { index: false } }

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Container className="pt-24">
          <h1 className="text-4xl font-extrabold tracking-[-0.04em]">That page isn't here</h1>
          <p className="mt-4 text-lg text-muted">
            The link may be old, or the page may have moved.
          </p>
          <div className="mt-8">
            <Button href="/">Go to the home page</Button>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  )
}
