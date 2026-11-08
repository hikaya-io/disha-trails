#!/usr/bin/env node
/**
 * Writes public/routes/<id>.json for each trail page that has a route line: the line the map
 * draws and an elevation profile for the chart (src/lib/trail-route.ts). Run it from site/ when
 * trails or their cells change, and commit the output; the site build doesn't run it.
 *
 *   node scripts/build-trail-routes.mjs [--guides ../../disha-guides] [--coverage <url or file>] [ids...]
 *
 * - The line is the trail's disha-guides corridor (out/corridors/<id>.geojson), stitched from its
 *   OpenStreetMap route relation. Trails without one are skipped; they get one when disha-guides
 *   builds it.
 * - The heights are read from the published terrain cells on tiles.hikaya.app (Copernicus GLO-30,
 *   Terrarium, z12), the same model the map's hillshade and contours come from. A trail whose
 *   cells aren't built along most of the line is skipped.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PMTiles } from 'pmtiles'
import sharp from 'sharp'
import {
  corridorLine,
  cumulativeKm,
  fillGaps,
  resample,
  simplify,
  terrarium,
  tilePixel,
} from './route-profile.mjs'

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TILES = 'https://tiles.hikaya.app'
const DEFAULT_COVERAGE = 'https://andrewtpham.github.io/disha-trails/coverage.json'

/** Corridors disha-guides names differently from the site's trail ids. */
const CORRIDOR_FOR = {
  'gr20-corsica': 'gr20',
  'hadrians-wall': 'hadrians-wall-path',
  'teton-crest': 'teton-crest-trail',
  rockwall: 'rockwall-trail',
  routeburn: 'routeburn-track',
  'skyline-jasper': 'skyline-trail-jasper',
}

/** About 600 chart samples per trail, never closer than 100 m. */
const SAMPLES = 600
const MIN_STEP_KM = 0.1
/** How far the map's line may stray from the corridor, in metres. */
const LINE_TOLERANCE_M = 10
/** The terrain's top zoom and tile size (disha-tiles terrain.pmtiles). */
const DEM_ZOOM = 12
const DEM_SIZE = 512
/** Up to this share of heights may be missing (unbuilt cells, sea) and get filled. */
const MAX_MISSING = 0.05

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  if (i < 0) return fallback
  const [value] = args.splice(i, 2).slice(1)
  return value
}
const GUIDES = resolve(SITE, option('guides', '../../disha-guides'))
const COVERAGE = option('coverage', DEFAULT_COVERAGE)
const only = new Set(args)
const CORRIDORS = join(GUIDES, 'out/corridors')
const OUT = join(SITE, 'public/routes')

async function loadCoverage() {
  if (/^https?:/.test(COVERAGE)) {
    const res = await fetch(COVERAGE)
    if (!res.ok) throw new Error(`${COVERAGE} returned ${res.status}`)
    return res.json()
  }
  return JSON.parse(readFileSync(resolve(SITE, COVERAGE), 'utf8'))
}

/** Reads heights from the published terrain cells, one decoded z12 tile at a time. */
function terrainReader(published) {
  const archives = new Map()
  const tiles = new Map()

  async function archiveFor(cellId) {
    if (!archives.has(cellId)) {
      archives.set(
        cellId,
        (async () => {
          const [, z, x, y] = cellId.split('-')
          const res = await fetch(`${TILES}/v1/c/${z}/${x}/${y}/manifest.json`)
          if (!res.ok) return null
          const { components } = await res.json()
          const terrain = components.find((c) => c.filename === 'terrain.pmtiles')
          return terrain
            ? new PMTiles(`${TILES}/v1/c/${z}/${x}/${y}/${terrain.version}/terrain.pmtiles`)
            : null
        })(),
      )
    }
    return archives.get(cellId)
  }

  async function tile(tx, ty) {
    const key = `${tx}/${ty}`
    if (!tiles.has(key)) {
      tiles.set(
        key,
        (async () => {
          const shift = 2 ** (DEM_ZOOM - 10)
          const cellId = `c-10-${Math.floor(tx / shift)}-${Math.floor(ty / shift)}`
          if (!published.has(cellId)) return null
          const archive = await archiveFor(cellId)
          const found = archive && (await archive.getZxy(DEM_ZOOM, tx, ty))
          if (!found) return null
          const { data, info } = await sharp(Buffer.from(found.data))
            .raw()
            .toBuffer({ resolveWithObject: true })
          return { data, channels: info.channels, size: info.width }
        })(),
      )
    }
    return tiles.get(key)
  }

  /** Metres at a point, bilinear between the four pixels around it, or null without terrain. */
  return async function height(lon, lat) {
    const { tx, ty, px, py } = tilePixel(lon, lat, DEM_ZOOM, DEM_SIZE)
    const t = await tile(tx, ty)
    if (!t) return null
    const at = (x, y) => {
      const cx = Math.max(0, Math.min(t.size - 1, x))
      const cy = Math.max(0, Math.min(t.size - 1, y))
      const i = (cy * t.size + cx) * t.channels
      if (t.channels === 4 && t.data[i + 3] === 0) return null
      return terrarium(t.data[i], t.data[i + 1], t.data[i + 2])
    }
    const x0 = Math.floor(px - 0.5)
    const y0 = Math.floor(py - 0.5)
    const fx = px - 0.5 - x0
    const fy = py - 0.5 - y0
    const h = [at(x0, y0), at(x0 + 1, y0), at(x0, y0 + 1), at(x0 + 1, y0 + 1)]
    if (h.some((v) => v == null)) return null
    return (h[0] * (1 - fx) + h[1] * fx) * (1 - fy) + (h[2] * (1 - fx) + h[3] * fx) * fy
  }
}

const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places

async function main() {
  const coverage = await loadCoverage()
  const published = new Set(Object.keys(coverage.cells ?? {}))
  const height = terrainReader(published)
  const corridors = new Set(
    existsSync(CORRIDORS)
      ? readdirSync(CORRIDORS)
          .filter((f) => f.endsWith('.geojson'))
          .map((f) => f.slice(0, -8))
      : [],
  )
  if (!corridors.size)
    throw new Error(`No corridors in ${CORRIDORS}. Pass --guides <disha-guides checkout>.`)
  mkdirSync(OUT, { recursive: true })

  const corridorOf = (id) => CORRIDOR_FOR[id] ?? id
  const trails = coverage.trails.filter(
    (t) => corridors.has(corridorOf(t.id)) && (!only.size || only.has(t.id)),
  )
  let written = 0
  for (const trail of trails) {
    const file = join(CORRIDORS, `${corridorOf(trail.id)}.geojson`)
    const line = corridorLine(JSON.parse(readFileSync(file, 'utf8')))
    const along = cumulativeKm(line)
    const lengthKm = along[along.length - 1]
    const samples = resample(line, Math.max(MIN_STEP_KM, lengthKm / SAMPLES))
    const raw = []
    for (const s of samples) raw.push(await height(s.lon, s.lat))
    const heights = fillGaps(raw, MAX_MISSING)
    if (!heights) {
      const missing = raw.filter((h) => h == null).length
      console.log(
        `- ${trail.id}: skipped, no terrain for ${missing} of ${raw.length} points (cells not built)`,
      )
      continue
    }
    const route = {
      id: trail.id,
      source: 'disha-guides corridor',
      lengthKm: round(lengthKm, 1),
      line: simplify(line, LINE_TOLERANCE_M).map(([lon, lat]) => [round(lon, 5), round(lat, 5)]),
      profile: samples.map((s, i) => [
        round(s.km, 3),
        Math.round(heights[i]),
        round(s.lon, 5),
        round(s.lat, 5),
      ]),
    }
    writeFileSync(join(OUT, `${trail.id}.json`), `${JSON.stringify(route)}\n`)
    written++
    console.log(
      `✓ ${trail.id}: ${route.lengthKm} km, ${route.line.length} line points, ${route.profile.length} heights`,
    )
  }
  console.log(`${written} of ${trails.length} trails with a corridor written to public/routes/.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
