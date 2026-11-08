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
 * A local address such as /coverage-local.json is read from public/, so a build works offline.
 */
export function loadCoverageForBuild(): Promise<CoverageData> {
  request ??= (async () => {
    let json: unknown
    if (COVERAGE_DATA_URL.startsWith('/')) {
      json = JSON.parse(await readFile(join(process.cwd(), 'public', COVERAGE_DATA_URL), 'utf8'))
    } else {
      const res = await fetch(COVERAGE_DATA_URL)
      if (!res.ok) throw new Error(`${COVERAGE_DATA_URL} returned ${res.status}`)
      json = await res.json()
    }
    return parseCoverage(json)
  })()
  return request
}
