'use client'
/**
 * The buttons over the site's maps, the same set and icons as andrewpham.dev's trail maps: the
 * layer picker, fullscreen and units on the left, zoom and fit on the right. Square, page-colored
 * and 44px, so they're easy to tap.
 */
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { MAP_LAYERS, type MapLayerId } from '@/lib/map/layers'
import type { Units } from '@/lib/trail-route'

// No fill of its own: each group of buttons sits on one glass surface (MapButtonGroup).
export const mapButton =
  'flex size-11 cursor-pointer items-center justify-center text-ink hover:text-ink-soft focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink'

/** Map buttons stacked on one glass surface, a hairline between each, as the app's controls. */
export function MapButtonGroup({ children }: { children: React.ReactNode }) {
  return <div className="glass flex flex-col divide-y divide-line rounded-xl">{children}</div>
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function LayerPicker({
  layer,
  onSelect,
}: {
  layer: MapLayerId
  onSelect: (layer: MapLayerId) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !ref.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={mapButton}
        aria-label="Change map layer"
        title="Change map layer"
        aria-expanded={open}
      >
        <Icon>
          <path d="m12 2 8 4.5v3L12 14 4 9.5v-3L12 2z" />
          <path d="m20 12.5-8 4.5-8-4.5" />
          <path d="m20 17-8 4.5L4 17" />
        </Icon>
      </button>
      {open && (
        // To the button's left, as the buttons sit at the map's right edge. Glass's edge and
        // shadow on a solid fill: inside the button group's glass, a blur of its own has no effect.
        <div
          className="glass absolute top-0 right-full mr-3 w-36 overflow-hidden rounded-xl text-[13px]"
          style={{ background: 'var(--bg)' }}
        >
          {MAP_LAYERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === layer}
              onClick={() => {
                onSelect(id)
                setOpen(false)
              }}
              className={clsx(
                'flex min-h-11 w-full cursor-pointer items-center px-3 text-left',
                id === layer
                  ? 'text-ink underline underline-offset-4'
                  : 'text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function FullscreenButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={mapButton}
      aria-label={on ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={on ? 'Exit fullscreen' : 'Fullscreen'}
    >
      <Icon>
        {on ? (
          <>
            <polyline points="4 14 8 14 8 18" />
            <polyline points="20 10 16 10 16 6" />
            <polyline points="14 4 14 8 18 8" />
            <polyline points="10 20 10 16 6 16" />
          </>
        ) : (
          <>
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <polyline points="21 3 14 10" />
            <polyline points="3 21 10 14" />
          </>
        )}
      </Icon>
    </button>
  )
}

/** Switches km and mi. Shows the current unit, as andrewpham.dev does. */
export function UnitsButton({ units, onToggle }: { units: Units; onToggle: () => void }) {
  const next = units === 'metric' ? 'miles and feet' : 'kilometres and metres'
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(mapButton, 'font-mono text-[12px]')}
      aria-label={`Show ${next}`}
      title={`Show ${next}`}
    >
      {units === 'metric' ? 'km' : 'mi'}
    </button>
  )
}

export function ZoomButtons({
  onZoomIn,
  onZoomOut,
  onFit,
  fitLabel,
}: {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  fitLabel: string
}) {
  return (
    <MapButtonGroup>
      <button
        type="button"
        onClick={onZoomIn}
        className={mapButton}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <Icon>
          <line x1="12" y1="6" x2="12" y2="18" />
          <line x1="6" y1="12" x2="18" y2="12" />
        </Icon>
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className={mapButton}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <Icon>
          <line x1="6" y1="12" x2="18" y2="12" />
        </Icon>
      </button>
      <button
        type="button"
        onClick={onFit}
        className={mapButton}
        aria-label={fitLabel}
        title={fitLabel}
      >
        {/* Zoom to fit: four corners around the middle. */}
        <Icon>
          <path d="M3 8V5a2 2 0 0 1 2-2h3" />
          <path d="M16 3h3a2 2 0 0 1 2 2v3" />
          <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
          <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
          <circle cx="12" cy="12" r="1.5" />
        </Icon>
      </button>
    </MapButtonGroup>
  )
}
