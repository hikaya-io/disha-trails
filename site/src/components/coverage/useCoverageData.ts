'use client'
import { useEffect, useState } from 'react'
import { type CoverageData, parseCoverage } from '@/lib/coverage'
import { COVERAGE_DATA_URL } from '@/lib/site'

export type CoverageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: CoverageData }

// One request per page view, shared by every section that reads the data.
let request: Promise<CoverageData> | null = null

function loadCoverage(): Promise<CoverageData> {
  request ??= fetch(COVERAGE_DATA_URL)
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
        console.warn(`Coverage data from ${COVERAGE_DATA_URL} didn't load:`, error.message)
        if (live) setState({ status: 'error', message: error.message })
      })
    return () => {
      live = false
    }
  }, [])
  return state
}
