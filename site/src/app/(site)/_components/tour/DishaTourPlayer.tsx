'use client'

import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'

import styles from './DishaTour.module.css'

/*
 * Plays the Disha tour: one slide at a time, once, then stops on the last slide.
 * The slides are server-rendered children. This only scrolls the track, moves the
 * `.run` class and listens for a hidden CSS timer to end; CSS does all the animating,
 * including the step highlights. Swiping the track or picking a tab plays that slide.
 * One pause button covers the whole tour (WCAG 2.2.2), and the tour holds while it's
 * off screen. With reduced motion nothing plays and every slide shows its summary.
 */

type Status = 'idle' | 'playing' | 'paused' | 'done'

export function DishaTourPlayer({
  labels,
  children,
}: {
  labels: Array<string>
  children: React.ReactNode
}) {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLUListElement>(null)
  const target = useRef<number | null>(null)
  const [active, setActive] = useState(0)
  const [run, setRun] = useState(0) // bumps to restart a slide's animations
  const [status, setStatus] = useState<Status>('idle')
  const [offscreen, setOffscreen] = useState(false)
  const reduced = useRef(false)
  const started = useRef(false)
  const current = useRef(0)

  const slides = () =>
    Array.from(track.current?.querySelectorAll<HTMLElement>('[data-slide]') ?? [])

  const go = useCallback((index: number, play: boolean) => {
    const list = slides()
    const slide = list[index]
    if (!slide || !track.current) return
    target.current = Math.abs(track.current.scrollLeft - slide.offsetLeft) > 2 ? index : null
    track.current.scrollTo({
      left: slide.offsetLeft,
      behavior: reduced.current ? 'auto' : 'smooth',
    })
    list.forEach((s) => s.classList.remove(styles.run))
    if (play && !reduced.current) {
      void slide.offsetWidth // restart the animations
      slide.classList.add(styles.run)
    }
    current.current = index
    if (play) started.current = true
    setActive(index)
    setRun((r) => r + 1)
    if (play && !reduced.current) setStatus('playing')
  }, [])

  // Start the first time the tour is mostly in view; hold while it's off screen
  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const element = root.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setOffscreen(!entry.isIntersecting)
        if (entry.isIntersecting && !started.current && !reduced.current) {
          started.current = true
          go(0, true)
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [go])

  // A swipe that settles on another slide plays that slide. Scrolls the player
  // started itself are ignored until they reach their slide.
  useEffect(() => {
    const container = track.current
    if (!container) return
    let settle = 0
    const onScroll = () => {
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        const list = slides()
        const step =
          list.length > 1 ? list[1].offsetLeft - list[0].offsetLeft : container.clientWidth
        const index = Math.round(container.scrollLeft / step)
        if (target.current !== null) {
          if (index === target.current) target.current = null
          return
        }
        if (started.current && index !== current.current) go(index, !reduced.current)
      }, 150)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      window.clearTimeout(settle)
    }
  }, [go])

  function onTimerEnd() {
    if (status !== 'playing') return
    if (active < labels.length - 1) go(active + 1, true)
    else setStatus('done')
  }

  function toggle() {
    if (status === 'playing') setStatus('paused')
    else if (status === 'paused') setStatus('playing')
    else {
      started.current = true
      go(0, true)
    }
  }

  const playing = status === 'playing'
  const label =
    status === 'playing'
      ? 'Pause the tour'
      : status === 'paused'
        ? 'Play the tour'
        : 'Play the tour from the start'

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label="How Disha works"
      className={clsx(
        styles.root,
        status === 'paused' && styles.paused,
        offscreen && styles.offscreen,
      )}
    >
      <div className="flex items-end gap-2 sm:gap-4">
        <div className="grid flex-1 grid-cols-3 gap-2 sm:gap-4">
          {labels.map((text, index) => (
            <button
              key={text}
              type="button"
              onClick={() => go(index, true)}
              aria-controls={`disha-slide-${index}`}
              aria-current={index === active ? 'true' : undefined}
              className={clsx(
                'flex flex-col justify-end border-b-2 pt-2 pb-3 text-left text-sm leading-snug sm:text-base',
                index === active ? 'border-ink text-ink' : 'border-line text-faint hover:text-ink',
              )}
            >
              {text}
            </button>
          ))}
        </div>
        {/* An invisible clock for the slide playing; when it ends, the next slide plays */}
        {(status === 'playing' || status === 'paused') && (
          <span
            key={`run-${run}`}
            aria-hidden="true"
            onAnimationEnd={onTimerEnd}
            className={clsx('sr-only', styles.timer)}
          />
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          className="mb-1 flex-none p-2 text-faint hover:text-ink"
        >
          {playing ? (
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
              <path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor" />
            </svg>
          ) : status === 'paused' ? (
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
              <path d="M6 4l10 6-10 6z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
              <path
                d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4.5 4v3.5H8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      <ul
        ref={track}
        role="list"
        aria-live={playing ? 'off' : 'polite'}
        className={clsx(
          'relative mt-6 flex snap-x snap-mandatory gap-8 overflow-x-auto overscroll-x-contain',
          styles.track,
        )}
      >
        {children}
      </ul>
    </section>
  )
}
