'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

/**
 * The word "dark" or "light" in the header: the theme you would switch to. It switches from
 * whatever is showing now, so the first click always changes the page. The word waits for mount
 * because the resolved theme is unknown during server rendering; the space is reserved so the
 * header doesn't shift.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const next = resolvedTheme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      aria-label={mounted ? `Switch to ${next} theme` : 'Switch theme'}
      onClick={() => setTheme(next)}
      className="flex min-h-11 min-w-14 items-center justify-center px-3 text-sm text-muted hover:text-ink hover:underline"
    >
      {mounted ? next : '\u00a0'}
    </button>
  )
}
