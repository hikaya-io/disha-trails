'use client'
import clsx from 'clsx'
import { useDocsSections } from '@/components/docs/DocsSectionsProvider'

/** "On this page" list for wide screens (xl). Small screens get DocsSectionBar instead. */
export function DocsTableOfContents() {
  const { sections, activeId } = useDocsSections()

  // Keep the column's width even when a page has no sections, so the article does not shift.
  if (sections.length === 0) return <div className="hidden lg:block lg:w-44 lg:flex-none" />

  return (
    <div className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:w-44 lg:flex-none lg:self-start lg:overflow-y-auto">
      <nav aria-label="On this page">
        <h2 className="text-xs uppercase tracking-[0.08em] text-faint">On this page</h2>
        <ol role="list" className="mt-3 space-y-2 border-l border-line text-[13px] leading-snug">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={section.id === activeId ? 'location' : undefined}
                className={clsx(
                  '-ml-px block border-l-2',
                  section.level === 3 ? 'pl-6' : 'pl-3',
                  section.id === activeId
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
