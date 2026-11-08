'use client'
import clsx from 'clsx'
import { useDocsSections } from '@/components/docs/DocsSectionsProvider'
import { useModalDialog } from '@/components/useModalDialog'

/**
 * A sticky bar under the docs header on screens below xl, where there is no "On this page" list.
 * It names the section the reader is in as they scroll, and opens a sheet to jump to another.
 */
export function DocsSectionBar() {
  const { title, sections, activeId } = useDocsSections()
  const { ref, open, close, backdropProps } = useModalDialog()
  if (sections.length === 0) return null

  const current = sections.find((s) => s.id === activeId)?.title ?? title

  return (
    <>
      <div className="sticky top-14 z-20 border-b border-line bg-bg/90 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          aria-label={`On this page: ${current}. Choose a section`}
          className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm sm:px-6 lg:px-8"
        >
          <span className="shrink-0 text-xs uppercase tracking-widest text-faint">
            On this page
          </span>
          <span className="min-w-0 flex-1 truncate">{current}</span>
          <svg
            viewBox="0 0 24 24"
            className="size-4 shrink-0 text-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      <dialog
        ref={ref}
        aria-label="On this page"
        {...backdropProps}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[70vh] w-full max-w-none overflow-y-auto border-t border-line bg-bg p-6 text-ink backdrop:bg-scrim"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold">On this page</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="-mr-2 flex size-11 items-center justify-center text-muted hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <ol role="list" className="mt-2 divide-y divide-line">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={close}
                aria-current={section.id === activeId ? 'location' : undefined}
                className={clsx(
                  'flex min-h-12 items-center py-2 text-base hover:text-ink',
                  section.level === 3 && 'pl-5',
                  section.id === activeId ? 'text-ink' : 'text-muted',
                )}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </dialog>
    </>
  )
}
