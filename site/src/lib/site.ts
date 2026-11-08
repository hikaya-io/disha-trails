export const SITE_NAME = 'Disha'

/**
 * Canonical origin, no trailing slash. A production build without NEXT_PUBLIC_SITE_URL fails on
 * purpose: a wrong canonical or sitemap host costs more to undo than a failed build.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')
  if (url) return url
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set NEXT_PUBLIC_SITE_URL (see .env.example) before building for production.')
  }
  return 'http://localhost:3000'
}

/**
 * The coverage data (built daily by disha-tiles, served from the gh-pages branch of disha-trails)
 * and the trail request form. These addresses change when the repo moves from andrewtpham to the
 * hikaya-io org: update them here and in disha-tiles' coverage-map.py (REQUESTS_REPO). GitHub
 * Pages addresses are not redirected after a transfer. NEXT_PUBLIC_COVERAGE_DATA_URL points a
 * local build at another copy, such as one written by `coverage-map.py --json-out`.
 */
export const COVERAGE_DATA_URL =
  process.env.NEXT_PUBLIC_COVERAGE_DATA_URL ||
  'https://andrewtpham.github.io/disha-trails/coverage.json'
export const TRAIL_REQUEST_URL =
  'https://github.com/andrewtpham/disha-trails/issues/new?template=trail-request.yml'
export const TRAIL_REQUESTS_URL =
  'https://github.com/andrewtpham/disha-trails/issues?q=is%3Aissue+label%3Atrail-request'

/** Absolute URL for a site path such as "/trails/". */
export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path}`
}
