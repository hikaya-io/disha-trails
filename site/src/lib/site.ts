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
 * The path the site is served under, such as "/disha-trails" on hikaya-io.github.io, or "" at a
 * domain root. next.config.mjs reads the same variable as Next's basePath, which next/link and the
 * router add on their own; anything else that loads a file from public/ goes through publicPath().
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '')

/**
 * Whether search engines may index the site. Off unless the build sets
 * NEXT_PUBLIC_ALLOW_INDEXING=true: every page is then noindex and robots.txt names no sitemap.
 * Even when on, only the registered pages in lib/pages.ts are indexed; trail pages never are.
 */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'

/** A public/ file's URL with the base path, such as "/disha-trails/map/style-light.json". */
export function publicPath(path: string): string {
  return `${BASE_PATH}${path}`
}

/**
 * The coverage data, built daily by disha-tiles. The deploy copies the latest file into the export,
 * so the site reads its own /coverage.json. A local address is read from public/ at build time;
 * NEXT_PUBLIC_COVERAGE_DATA_URL points a build elsewhere, such as the live file or a copy written
 * by `coverage-map.py --json-out` at /coverage-local.json.
 */
export const COVERAGE_DATA_URL = process.env.NEXT_PUBLIC_COVERAGE_DATA_URL || '/coverage.json'

/** The trail request form. Update disha-tiles' coverage-map.py (REQUESTS_REPO) with it. */
export const TRAIL_REQUEST_URL =
  'https://github.com/hikaya-io/disha-trails/issues/new?template=trail-request.yml'
export const TRAIL_REQUESTS_URL =
  'https://github.com/hikaya-io/disha-trails/issues?q=is%3Aissue+label%3Atrail-request'

/** Absolute URL for a site path such as "/trails/". */
export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path}`
}

/** The image every page shares on social sites and in chat previews (scripts/build-og-image.mjs). */
export const SHARE_IMAGE = {
  path: '/og/disha.png',
  width: 1200,
  height: 630,
  alt: 'Disha, offline hiking maps and trail guides for iPhone, beside a map of the Tour du Mont Blanc',
} as const
