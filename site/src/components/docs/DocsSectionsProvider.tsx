'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export type DocsSection = { id: string; title: string; level: 2 | 3 }

type DocsSectionsState = {
  /** The page's h1, shown when the reader is above the first section. */
  title: string
  sections: DocsSection[]
  /** The section the reader is in, or null above the first heading. */
  activeId: string | null
}

const Context = createContext<DocsSectionsState>({ title: '', sections: [], activeId: null })

export function useDocsSections() {
  return useContext(Context)
}

// A heading counts as reached once its top is within this many px of the viewport top: the 56px
// header, the 44px section bar on small screens, and a little room. Headings scroll to ~100px.
const REACHED_OFFSET = 112

/** The last heading that has reached the top, or the last heading when scrolled to the page bottom. */
function findActive(headings: HTMLElement[]): string | null {
  if (headings.length === 0) return null
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
  if (atBottom) return headings[headings.length - 1].id
  let current: string | null = null
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= REACHED_OFFSET) current = heading.id
    else break
  }
  return current
}

/**
 * Reads the current docs page's headings and tracks which one the reader has scrolled to, for
 * the "On this page" list on wide screens and the section bar on small ones. It uses the scroll
 * position instead of an IntersectionObserver so the answer is right when scrolling up, when a
 * section is taller than the screen, and at the end of a short page.
 */
export function DocsSectionsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState<DocsSectionsState>({ title: '', sections: [], activeId: null })

  useEffect(() => {
    const article = document.getElementById('docs-article')
    if (!article) return
    const headings = Array.from(article.querySelectorAll<HTMLElement>('h2[id], h3[id]'))
    const sections: DocsSection[] = headings.map((h) => ({
      id: h.id,
      title: h.textContent?.replace(/#$/, '').trim() ?? '',
      level: h.tagName === 'H2' ? 2 : 3,
    }))
    const title = article.querySelector('h1')?.textContent?.trim() ?? ''

    let frame = 0
    const update = () => {
      frame = 0
      const activeId = findActive(headings)
      setState((prev) =>
        prev.activeId === activeId &&
        prev.title === title &&
        prev.sections.length === sections.length
          ? prev
          : { title, sections, activeId },
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pathname])

  return <Context.Provider value={state}>{children}</Context.Provider>
}
