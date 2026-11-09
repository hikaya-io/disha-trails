import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type CoverageData, parseCoverage } from '@/lib/coverage'
import { COVERAGE_DATA_URL } from '@/lib/site'

let request: Promise<CoverageData> | null = null

/**
 * coverage.json at build time, for the trail pages: which pages to generate, and each page's
 * title and first paint. The page itself reads the live file in the browser, so a trail's map and
 * status stay current between builds. A trail added to the data shows on /trails/ right away and
 * gets its own page on the next build.
 *
 * A local address, the default /coverage.json or /coverage-local.json, is read from public/, so a
 * build works offline. The deploy workflow puts the latest file there; locally, download it first
 * (see the README).
 */
export function loadCoverageForBuild(): Promise<CoverageData> {
  request ??= (async () => {
    let json: unknown
    if (COVERAGE_DATA_URL.startsWith('/')) {
      const file = join(process.cwd(), 'public', COVERAGE_DATA_URL)
      const text = await readFile(file, 'utf8').catch(() => {
        throw new Error(
          `${file} is missing. Download coverage.json into public/ (see the README), or set NEXT_PUBLIC_COVERAGE_DATA_URL.`,
        )
      })
      json = JSON.parse(text)
    } else {
      const res = await fetch(COVERAGE_DATA_URL)
      if (!res.ok) throw new Error(`${COVERAGE_DATA_URL} returned ${res.status}`)
      json = await res.json()
    }
    return parseCoverage(json)
  })()
  return request
}
