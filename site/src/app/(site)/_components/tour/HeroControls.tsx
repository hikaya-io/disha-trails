'use client'
import { useEffect, useState } from 'react'

import styles from './DishaTour.module.css'

type Status = 'playing' | 'paused' | 'done'

/**
 * Pause, play and replay for the hero animation (WCAG 2.2.2: moving content that starts on
 * its own and lasts over five seconds needs a way to stop). The animation is plain CSS and
 * runs without this; the button only toggles two classes on the scene and listens for the
 * invisible marker that finishes with it. Hidden when the visitor prefers reduced motion,
 * since nothing plays then.
 */
export function HeroControls({ target }: { target: string }) {
  const [status, setStatus] = useState<Status>('playing')

  useEffect(() => {
    const scene = document.getElementById(target)
    if (!scene) return

    // On a phone the scene sits below the text and the page has been playing it for seconds by
    // the time it scrolls into view. If it starts off screen, hold it at its end state and play
    // it from the start once half of it is visible. Not needed with reduced motion: it never plays.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let first = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          if (!first) {
            void scene.offsetWidth
            scene.classList.add(styles.run)
            setStatus('playing')
          }
        } else if (first) {
          scene.classList.remove(styles.run)
          setStatus('done')
        }
        first = false
      },
      { threshold: 0.5 },
    )
    if (!reduced) observer.observe(scene)

    // The animation can finish before this hydrates on a slow device.
    const animations = scene.querySelector('[data-hero-end]')?.getAnimations() ?? []
    if (animations.length > 0 && animations.every((a) => a.playState === 'finished')) {
      setStatus('done')
    }
    const onEnd = (event: AnimationEvent) => {
      if ((event.target as Element).hasAttribute('data-hero-end')) setStatus('done')
    }
    scene.addEventListener('animationend', onEnd)
    return () => {
      observer.disconnect()
      scene.removeEventListener('animationend', onEnd)
    }
  }, [target])

  function toggle() {
    const scene = document.getElementById(target)
    if (!scene) return
    if (status === 'playing') {
      scene.classList.add(styles.paused)
      setStatus('paused')
    } else if (status === 'paused') {
      scene.classList.remove(styles.paused)
      setStatus('playing')
    } else {
      // Take the class off and put it back to start every animation again.
      scene.classList.remove(styles.run, styles.paused)
      void scene.offsetWidth
      scene.classList.add(styles.run)
      setStatus('playing')
    }
  }

  const label =
    status === 'playing'
      ? 'Pause the animation'
      : status === 'paused'
        ? 'Play the animation'
        : 'Replay the animation'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="-mr-2 -mt-2.5 flex size-11 flex-none items-center justify-center text-faint hover:text-ink motion-reduce:hidden"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
        {status === 'playing' ? (
          <path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor" />
        ) : status === 'paused' ? (
          <path d="M6 4l10 6-10 6z" fill="currentColor" />
        ) : (
          <path
            d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4.5 4v3.5H8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  )
}
