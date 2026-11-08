'use client'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Controls a native modal <dialog>. The browser traps focus and closes it on Escape; this adds
 * the two things it does not: locking page scroll while it is open (restored however the dialog
 * is closed) and closing on a click outside the panel.
 *
 * The close listener is attached in open(), not in an effect, because a dialog can mount after
 * the hook's first render (DocsSectionBar renders nothing until the page has sections), and an
 * effect that ran before it existed would never unlock the page.
 */
export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null)

  const open = useCallback(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    dialog.addEventListener(
      'close',
      () => {
        document.body.style.overflow = ''
      },
      { once: true },
    )
  }, [])
  const close = useCallback(() => ref.current?.close(), [])

  // If the component unmounts while open (a route change), release the lock.
  useEffect(
    () => () => {
      document.body.style.overflow = ''
    },
    [],
  )

  /** Spread on the <dialog>: a click on the backdrop lands on the dialog element itself. */
  const backdropProps = {
    onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === ref.current) ref.current?.close()
    },
  }

  return { ref, open, close, backdropProps }
}
