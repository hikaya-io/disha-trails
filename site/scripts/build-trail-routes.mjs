#!/usr/bin/env node
/**
 * Writes public/routes/<id>.json for each trail whose guide is published: the line the map draws
 * and an elevation profile for the chart (src/lib/trail-route.ts). The deploy runs it before
 * `next build`; the files are not committed (public/routes/ is gitignored).
 *
 *   node scripts/build-trail-routes.mjs [--coverage <file or url>] [--guides <catalog base url>] [ids...]
 *
 * The line and its heights come unchanged from the published guide package on guides.hikaya.app
 * (`centreline.line` and `centreline.elevations_m`, Copernicus GLO-30 at every point), so the site
 * shows the same route, distance and climb as the app and the GPX download (disha-guides R29.1).
 * Only published guides are in the catalog: a coming-soon guide's route shows on the map from the
 * cells' route tiles, from zoom 9, until it is published.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cumulativeKm, decodePolyline6, resample, simplify } from './route-profile.mjs'

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_GUIDES = 'https://guides.hikaya.app/v1/'

/**
 * Site trail ids (tile area ids) whose guide has another id, for coverage.json files written before
 * rows carried `guideId` (disha-tiles coverage-map.py, 2026-11-11). Drop once coverage-data has it.
 */
const GUIDE_FOR = {
  'camino-norte': 'camino-del-norte',
  'gr20-corsica': 'gr20',
  'hadrians-wall': 'hadrians-wall-path',
  'skyline-jasper': 'skyline-trail-jasper',
  'teton-crest': 'teton-crest-trail',
  rockwall: 'rockwall-trail',
  routeburn: 'routeburn-track',
  tmb: 'tour-du-mont-blanc',
}

/** About 600 chart samples per trail, never closer than 100 m. */
const SAMPLES = 600
const MIN_STEP_KM = 0.1
/** How far the map's line may stray from the package's line, in metres. */
const LINE_TOLERANCE_M = 10

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  if (i < 0) return fallback
  const [value] = args.splice(i, 2).slice(1)
  return value
}
const COVERAGE = option('coverage', 'public/coverage.json')
const GUIDES = option('guides', DEFAULT_GUIDES).replace(/\/*$/, '/')
const only = new Set(args)
const OUT = join(SITE, 'public/routes')

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} returned ${res.status}`)
  return res.json()
}

const loadCoverage = () =>
  /^https?:/.test(COVERAGE)
    ? getJson(COVERAGE)
    : JSON.parse(readFileSync(resolve(SITE, COVERAGE), 'utf8'))

const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places

/** The route file for a guide package. */
export function routeFromPackage(id, pkg) {
  const line = decodePolyline6(pkg.centreline.line)
  const heights = pkg.centreline.elevations_m
  if (!Array.isArray(heights) || heights.length !== line.length) {
    throw new Error(
      `${pkg.trail_id} ${pkg.version}: ${heights?.length ?? 'no'} heights for ${line.length} points`,
    )
  }
  const along = cumulativeKm(line)
  const lengthKm = along[along.length - 1]
  const samples = resample(line, Math.max(MIN_STEP_KM, lengthKm / SAMPLES), heights)
  return {
    id,
    source: `disha-guides ${pkg.trail_id} ${pkg.version}`,
    lengthKm: round(lengthKm, 1),
    line: simplify(line, LINE_TOLERANCE_M).map(([lon, lat]) => [round(lon, 5), round(lat, 5)]),
    profile: samples.map((s) => [
      round(s.km, 3),
      Math.round(s.ele),
      round(s.lon, 5),
      round(s.lat, 5),
    ]),
  }
}

async function main() {
  const [coverage, catalog] = await Promise.all([loadCoverage(), getJson(`${GUIDES}index.json`)])
  const guides = new Map(catalog.guides.map((g) => [g.trail_id, g]))
  const trails = coverage.trails.filter(
    (t) => t.guide === 'published' && (!only.size || only.has(t.id)),
  )

  // Every run writes the whole set, so a guide that is withdrawn loses its file.
  if (!only.size) rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })

  const missing = []
  for (const trail of trails) {
    const guideId = trail.guideId ?? GUIDE_FOR[trail.id] ?? trail.id
    const entry = guides.get(guideId)
    if (!entry) {
      missing.push(`${trail.id} (${guideId})`)
      continue
    }
    const route = routeFromPackage(trail.id, await getJson(GUIDES + entry.url))
    writeFileSync(join(OUT, `${trail.id}.json`), `${JSON.stringify(route)}\n`)
    console.log(
      `✓ ${trail.id}: ${route.lengthKm} km, ${route.line.length} line points, ${route.profile.length} heights`,
    )
  }
  console.log(
    `${trails.length - missing.length} of ${trails.length} published guides written to public/routes/.`,
  )
  // A published guide the catalog doesn't list means the ids disagree: fail, so it's fixed.
  if (missing.length) {
    throw new Error(`Not in the guides catalog: ${missing.join(', ')}. Add the id to GUIDE_FOR.`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
