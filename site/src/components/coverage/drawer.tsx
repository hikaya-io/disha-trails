'use client'
import { useRef, useState, useSyncExternalStore } from 'react'
import clsx from 'clsx'
import Link from 'next/link'

/**
 * The pieces the map pages share for their side panel: on a phone it is a drawer over a map that
 * fills the screen; from lg each page lays it out its own way (the maps page floats it over the
 * map, a trail page sets it beside the map).
 */

/** The sticky site header's height (its py-2 and 44px links, components/layout/SiteHeader.tsx). */
export const HEADER = 60

/** A phone's drawer: under the header to the bottom, leaving a strip of map to tap. */
export const DRAWER_WIDTH = 'min(26rem, 100% - 3.5rem)'

const WIDE = '(min-width: 1024px)'
/** Whether the window is lg or wider, where the panel is no longer a drawer. */
export function useWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(WIDE)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => matchMedia(WIDE).matches,
    () => false,
  )
}

/**
 * Swipe a drawer left to close it, on touch screens. The drawer follows the finger once a move is
 * clearly sideways (an up or down move is left to the list's scroll; `touch-action: pan-y` keeps
 * it with the browser), then closes past a third of its width or on a quick flick, and springs
 * back otherwise. A swipe never also counts as a tap on what it started on.
 */
export function useSwipeToClose(onClose: () => void, enabled: boolean) {
  const [dragX, setDragX] = useState<number | null>(null)
  const start = useRef<{
    x: number
    y: number
    t: number
    sideways: boolean | null
    dx: number
  } | null>(null)
  const swiped = useRef(false)

  const end = (event: React.PointerEvent<HTMLElement>) => {
    const from = start.current
    start.current = null
    if (!from?.sideways) return
    // From the last move, not this event: a cancelled touch reports no position.
    const dx = from.dx
    const speed = dx / Math.max(1, event.timeStamp - from.t)
    if (dx < -event.currentTarget.offsetWidth / 3 || speed < -0.5) onClose()
    setDragX(null)
  }

  const handlers = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      swiped.current = false
      if (!enabled || event.pointerType === 'mouse') return
      start.current = {
        x: event.clientX,
        y: event.clientY,
        t: event.timeStamp,
        sideways: null,
        dx: 0,
      }
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      const from = start.current
      if (!from) return
      const dx = event.clientX - from.x
      const dy = event.clientY - from.y
      if (from.sideways === null) {
        // Decide once the finger has moved 10px: sideways is a swipe, anything else a scroll.
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return
        from.sideways = Math.abs(dx) > Math.abs(dy)
        if (!from.sideways) {
          start.current = null
          return
        }
        swiped.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      from.dx = Math.min(0, dx)
      setDragX(from.dx)
    },
    onPointerUp: end,
    onPointerCancel: end,
    onClickCapture: (event: React.MouseEvent<HTMLElement>) => {
      if (!swiped.current) return
      swiped.current = false
      event.preventDefault()
      event.stopPropagation()
    },
  }
  return { dragX, handlers }
}

/**
 * The tab on the panel's edge, halfway down the map, that hides it, or brings it back when `left`
 * puts it on the window's edge. `what` names the panel for its label, such as "list".
 *
 * Keep it mounted while its drawer is closed, `tucked` just off the window's left edge: when the
 * drawer opens, the tab slides out with it instead of showing at the open edge before the drawer
 * gets there. Tucked, it can't be seen, clicked or focused.
 */
export function DrawerTab({
  open,
  onToggle,
  controls,
  what,
  left,
  top = `calc(50% + ${HEADER / 2}px)`,
  dragging,
  tucked = false,
  className,
}: {
  open: boolean
  onToggle: () => void
  controls: string
  what: string
  left: number | string
  /** Halfway down the map; the default is for a map under the header's glass. */
  top?: number | string
  dragging: boolean
  tucked?: boolean
  className?: string
}) {
  const label = open ? `Hide the ${what}` : `Show the ${what}`
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      title={label}
      aria-hidden={tucked || undefined}
      tabIndex={tucked ? -1 : undefined}
      className={clsx(
        'glass absolute z-20 flex h-14 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-lg border-l-0 text-muted duration-300 ease-out hover:text-ink motion-reduce:transition-none',
        // The same 300ms as the drawer's slide, so the two move as one.
        !dragging && 'transition-[left,translate]',
        tucked && 'pointer-events-none -translate-x-full',
        className,
      )}
      style={{ top, left: tucked ? 0 : left }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d={open ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

/** The map beside an open drawer, which closes it when tapped, as drawers do. Phones only. */
export function DrawerScrim({
  onClose,
  what,
  top = HEADER,
}: {
  onClose: () => void
  what: string
  /** Where the map starts: under the header's glass by default. */
  top?: number
}) {
  return (
    <button
      type="button"
      aria-label={`Close the ${what}`}
      onClick={onClose}
      className="absolute inset-0 z-20 cursor-default bg-scrim/40 lg:hidden"
      style={{ top }}
    />
  )
}

/**
 * The map data's credits and the site's legal links in one line, for the map pages, which have no
 * site footer. The full notice is on /privacy/.
 */
export function MapCredits({ className }: { className?: string }) {
  return (
    <p className={clsx('text-[11px] leading-4 text-faint', className)}>
      &copy; {new Date().getFullYear()}{' '}
      <a href="https://hikaya.io" className="underline hover:text-ink">
        Hikaya
      </a>
      {' · Map data © '}
      <a href="https://www.openstreetmap.org/copyright" className="underline hover:text-ink">
        OpenStreetMap contributors
      </a>
      {', ODbL · terrain Copernicus · '}
      <Link href="/privacy/#map-credits" className="underline hover:text-ink">
        credits
      </Link>
      {' · '}
      <Link href="/privacy/" className="underline hover:text-ink">
        privacy
      </Link>
      {' · '}
      <Link href="/terms/" className="underline hover:text-ink">
        terms
      </Link>
    </p>
  )
}
