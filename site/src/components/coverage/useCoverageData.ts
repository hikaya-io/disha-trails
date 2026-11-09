'use client'
import { useEffect, useState } from 'react'
import { type CoverageData, parseCoverage } from '@/lib/coverage'
import { COVERAGE_DATA_URL, publicPath } from '@/lib/site'

export type CoverageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: CoverageData }

// The site's own copy, with the base path, unless an override points elsewhere.
const url = COVERAGE_DATA_URL.startsWith('/') ? publicPath(COVERAGE_DATA_URL) : COVERAGE_DATA_URL

// One request per page view, shared by every section that reads the data.
let request: Promise<CoverageData> | null = null

function loadCoverage(): Promise<CoverageData> {
  // no-cache revalidates with the server, so a page sees the day's file without a hard reload.
  request ??= fetch(url, { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`coverage.json returned ${res.status}`)
      return res.json()
    })
    .then(parseCoverage)
    .catch((error: Error) => {
      // Let the next mount try again instead of caching the failure.
      request = null
      throw error
    })
  return request
}

/** coverage.json for a section. The page's own copy renders while it loads. */
export function useCoverageData(): CoverageState {
  const [state, setState] = useState<CoverageState>({ status: 'loading' })
  useEffect(() => {
    let live = true
    loadCoverage()
      .then((data) => live && setState({ status: 'ready', data }))
      .catch((error: Error) => {
        // Non-critical: the section shows its own error line. A warning, because Next's dev
        // overlay treats console.error as a crash.
        console.warn(`Coverage data from ${url} didn't load:`, error.message)
        if (live) setState({ status: 'error', message: error.message })
      })
    return () => {
      live = false
    }
  }, [])
  return state
}
