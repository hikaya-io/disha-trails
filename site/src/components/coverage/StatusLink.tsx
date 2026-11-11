'use client'
import Link from 'next/link'
import clsx from 'clsx'
import { useModalDialog } from '@/components/useModalDialog'
import { StatusTable } from './StatusTable'

const DOCS = {
  map: '/docs/offline-maps/coverage/#map-status',
  guide: '/docs/guides/trails/#guide-status',
} as const

/**
 * "What the tags mean": opens a small dialog with the status tags and what each means, so the
 * page stays put. It shows the same table as the docs (StatusTable, where the wording lives) and
 * links to the docs page for the rest.
 */
export function StatusLink({ kind, className }: { kind: 'map' | 'guide'; className?: string }) {
  const { ref, open, close, backdropProps } = useModalDialog()
  const title = kind === 'map' ? 'Map tags' : 'Guide tags'
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={clsx(
          'inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[13px] text-muted underline hover:text-ink',
          className,
        )}
      >
        <span aria-hidden="true">ⓘ</span> what the tags mean
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        {...backdropProps}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-bg p-6 text-ink backdrop:bg-scrim"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-xl font-extrabold tracking-[-0.03em]">{title}</h2>
          <button
            type="button"
            onClick={close}
            className="-mr-2 flex min-h-11 items-center px-3 text-sm text-muted underline hover:text-ink"
          >
            close
          </button>
        </div>
        <div className="mt-4">
          <StatusTable kind={kind} />
        </div>
        {kind === 'map' && (
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            Maps download cell by cell, so a partial map works wherever its cells are built. On the
            map, filled squares are cells you can download and dashed outlines are cells not built
            yet.
          </p>
        )}
        <Link
          href={DOCS[kind]}
          onClick={close}
          className="mt-4 inline-flex min-h-11 items-center text-[13px] text-ink underline hover:text-ink-soft"
        >
          More in the docs →
        </Link>
      </dialog>
    </>
  )
}
