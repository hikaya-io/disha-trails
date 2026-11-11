import clsx from 'clsx'

const kinds = {
  tip: { label: 'Tip', tone: 'text-faint' },
  note: { label: 'Note', tone: 'text-faint' },
  beta: { label: 'In the beta', tone: 'text-faint' },
  warning: { label: 'Heads up', tone: 'text-danger' },
}

/** A short aside: one flat box, a caps mono label. Only the warning label is red. */
export function Callout({
  type = 'note',
  children,
}: {
  type?: keyof typeof kinds
  children: React.ReactNode
}) {
  const kind = kinds[type]
  return (
    <aside className="rounded-xl bg-surface px-5 py-4">
      <p className={clsx('text-xs uppercase tracking-[0.08em]', kind.tone)}>{kind.label}</p>
      <div className="mt-1 font-sans text-base [&>p+p]:mt-3 [&>p]:m-0">{children}</div>
    </aside>
  )
}
