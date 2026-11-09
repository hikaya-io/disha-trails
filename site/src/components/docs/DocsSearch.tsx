'use client'
import { useEffect, useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { searchDocs, snippet, type SearchEntry } from '@/lib/docs-search'
import { useModalDialog } from '@/components/useModalDialog'

/**
 * Docs search, after Minou's: a button in the header (or ⌘K / Ctrl+K) opens a dialog with a
 * search field and a list of matching sections. Arrow keys move through the list, Enter opens
 * the section, Escape closes. The index is passed in from the server, built from the MDX files.
 */
export function DocsSearch({ index }: { index: SearchEntry[] }) {
  const router = useRouter()
  const { ref, open, close, backdropProps } = useModalDialog()
  const id = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = useMemo(() => searchDocs(index, query), [index, query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Start fresh each time the dialog opens, however it was closed.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const reset = () => {
      setQuery('')
      setActive(0)
    }
    dialog.addEventListener('close', reset)
    return () => dialog.removeEventListener('close', reset)
  }, [ref])

  function go(entry: SearchEntry) {
    close()
    router.push(entry.url)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active])
    }
  }

  const listId = `${id}-results`
  const trimmed = query.trim()

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Search the docs"
        aria-haspopup="dialog"
        className="flex size-11 items-center justify-center text-muted hover:text-ink sm:h-10 sm:w-64 sm:justify-start sm:gap-2 sm:border sm:border-line sm:px-3 sm:text-sm sm:text-faint sm:hover:border-faint"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5 shrink-0 sm:size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <span className="hidden sm:inline">Search docs</span>
        <kbd className="ml-auto hidden border border-line px-1.5 text-xs text-faint lg:inline">
          ⌘K
        </kbd>
      </button>
      <dialog
        ref={ref}
        aria-label="Search the docs"
        {...backdropProps}
        className="fixed inset-x-0 top-0 mx-auto mb-0 mt-[8vh] h-fit max-h-[80vh] w-[min(92vw,40rem)] max-w-none overflow-hidden border border-line bg-bg p-0 text-ink backdrop:bg-scrim"
      >
        {/* The field has no outline of its own; the rule under it turns dark while it has focus. */}
        <div className="flex items-center gap-3 border-b border-line px-4 focus-within:border-ink">
          <svg
            viewBox="0 0 24 24"
            className="size-5 shrink-0 text-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results.length > 0 ? `${id}-option-${active}` : undefined}
            aria-label="Search the docs"
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search the docs"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            className="min-h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
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
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length > 0 ? (
            <ul role="listbox" id={listId} aria-label="Results" className="p-2">
              {results.map((entry, i) => (
                <li
                  key={entry.url}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(entry)}
                  className={clsx('cursor-pointer px-3 py-3', i === active && 'bg-surface')}
                >
                  <p className="text-xs text-faint">
                    {entry.pageTitle}
                    {entry.title !== entry.pageTitle && ` › ${entry.title}`}
                  </p>
                  <p className={clsx('mt-0.5', i === active && 'text-link')}>{entry.title}</p>
                  {entry.text && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{snippet(entry, query)}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted">
              {trimmed ? `No results for “${trimmed}”.` : 'Type to search the docs.'}
            </p>
          )}
        </div>
        <p className="sr-only" role="status">
          {trimmed ? `${results.length} results` : ''}
        </p>
      </dialog>
    </>
  )
}
