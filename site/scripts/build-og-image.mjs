#!/usr/bin/env node
/**
 * Writes public/og/disha.png, the 1200 × 630 image every page shares on social sites and in chat
 * previews (SHARE_IMAGE in src/lib/site.ts): the site's name and line beside the home page's Col
 * du Bonhomme map, with the TMB in violet. Rerun it when the line or the brand changes.
 *
 *   node scripts/build-og-image.mjs
 *
 * It draws the card as HTML and screenshots it with Google Chrome (CHROME_PATH overrides where
 * Chrome is). DM Sans loads from Google Fonts, so it needs a connection.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { colMap } from '../src/app/(site)/_components/tour/disha-col-map.ts'

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(SITE, 'public/og/disha.png')
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const W = 1200
const H = 630

// Kept in step with the site's light theme (src/app/globals.css) and its icon (src/app/icon.svg).
const BG = '#fafafa'
const INK = '#18181b'
const MUTED = '#52525b'
const FAINT = '#71717a'
const VIOLET = '#6d28d9'

const icon = readFileSync(join(SITE, 'src/app/icon.svg'), 'utf8')
const base = readFileSync(join(SITE, colMap.base.replace(/^\//, 'public/')), 'utf8')
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')

// The map fills the card's right side, its full height, cropped to the route's middle.
const MAP_W = 520
const mapScale = H / colMap.height
const viewW = MAP_W / mapScale
const viewX = colMap.places.col.x + 20 - viewW / 2
const { start, end, col } = colMap.places

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${BG}; }
  body { font-family: 'DM Sans', sans-serif; color: ${INK}; display: flex; }
  .text { flex: 1; padding: 64px 56px 56px 72px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 700; letter-spacing: -0.01em; }
  .brand svg { width: 64px; height: 64px; border-radius: 15px; }
  h1 { margin-top: 56px; font-size: 58px; line-height: 1.08; font-weight: 700; letter-spacing: -0.025em; }
  p { margin-top: 24px; font-size: 26px; line-height: 1.4; color: ${MUTED}; }
  .url { margin-top: auto; font-size: 22px; color: ${VIOLET}; font-weight: 600; }
  .map { position: relative; width: ${MAP_W}px; height: ${H}px; }
  .map svg { display: block; }
  .credit { position: absolute; right: 12px; bottom: 10px; font-size: 13px; color: ${FAINT};
    background: rgb(250 250 250 / 0.8); padding: 2px 8px; border-radius: 6px; }
</style></head>
<body>
  <div class="text">
    <div class="brand">${icon}<span>Disha</span></div>
    <h1>Offline hiking maps and trail guides for iPhone</h1>
    <p>The distance and climb to the next water, hut, or pass, with no signal. Built on OpenStreetMap.</p>
    <div class="url">disha.hikaya.io</div>
  </div>
  <div class="map">
    <svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${H}" viewBox="${viewX} 0 ${viewW} ${colMap.height}">
      ${base}
      <path d="${colMap.route}" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${colMap.route}" fill="none" stroke="${VIOLET}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${[start, col, end]
        .map(
          (p) =>
            `<circle cx="${p.x}" cy="${p.y}" r="5.5" fill="#fff" stroke="${VIOLET}" stroke-width="3"/>`,
        )
        .join('')}
    </svg>
    <div class="credit">Tour du Mont Blanc · © OpenStreetMap contributors · Copernicus</div>
  </div>
</body></html>`

const dir = mkdtempSync(join(tmpdir(), 'disha-og-'))
try {
  const page = join(dir, 'card.html')
  writeFileSync(page, html)
  mkdirSync(dirname(OUT), { recursive: true })
  execFileSync(CHROME, [
    '--headless=new',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--user-data-dir=${join(dir, 'profile')}`,
    `--window-size=${W},${H}`,
    '--virtual-time-budget=5000',
    `--screenshot=${OUT}`,
    `file://${page}`,
  ])
  console.log(`Wrote ${OUT}`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
