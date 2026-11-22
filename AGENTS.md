# disha-trails

## Purpose

Public open trail data for Disha and andrewpham.dev: GPX routes from trail races and thru-hikes, US national forest and park boundaries (GeoJSON), and the catalog of trails, maps and guides for Disha's data services in `site/` (`disha.hikaya.io`). Formerly `andrewtpham/forest-data`; moved to the `hikaya-io` org on 2026-11-09. The repo is public.

## Stack

- Data: GPX and GeoJSON in `trails/` and `national-forests/`. No build for the data.
- Site (`site/`): Next.js 15, React 19, MDX, Tailwind, static export, yarn, Node 22 or newer. Vitest and ESLint for checks.
- Hosting: GitHub Pages via `.github/workflows/deploy-site.yml`. Cloudflare Pages is the planned host (check).
- Data URLs: the site serves `trails/` at `/data/trails/` on `disha.hikaya.io`, and andrewpham.dev loads GPX from there.

## Commands

Run from `site/`:

```sh
yarn install
yarn dev
yarn lint
yarn test
yarn build        # needs NEXT_PUBLIC_SITE_URL, see site/.env.example
```

`yarn lint`, `yarn test` and `yarn build` must pass for any change under `site/`. While `yarn dev` runs, build with `NEXT_DIST_DIR=.next-check yarn build`. A plain build overwrites the dev server's files.

## Architecture

- `trails/`: GPX files. `trails/pct/` holds whole-trail files, `sections/` and Halfmile GPX by state.
- `national-forests/`: boundary GeoJSON.
- `site/src/lib/pages.ts` registers every page (sitemap and metadata). `draft: true` means noindex and no sitemap entry.
- Trail pages and the maps read `coverage.json`. disha-tiles builds it daily and pushes it to the `coverage-data` branch, which holds only data. Never edit or merge that branch.
- Route files `site/public/routes/<id>.json` are generated at deploy time by `site/scripts/build-trail-routes.mjs` from published guides on `guides.hikaya.app`. They are gitignored.
- Read `docs/development.md` first for site rules (one grid, map layers, base path, analytics, indexing). `ATTRIBUTION.md` and `DATA-LICENSE.md` cover the data.

## Rules for this repo

- GPX names are kebab-case `{trail-name}-{distance}-{year}.gpx`. Add distance only when it disambiguates. Always add the year, except for PCT whole-trail and section files.
- Never say "free app" or "no subscription". Disha is paid and pricing isn't final. Trail data is free to view on the web.
- Keep ATTRIBUTION.md current when you add a data file.
- When you bring a feature into the site, build it in the page and drop the outbound link. Don't propose a separate page.
- Before proposing site structure, audit the whole site for nav order, label casing and duplicated copy.
- Fix what you find, including in sibling repos once Andrew has approved the task.
- A UI behavior Andrew asks for on one element of a set applies to every element of that kind.
- Before building a pipeline in one Disha repo, read the other repos' specs and decision records for one that already owns that data (for example disha-guides R29 and R30).
- Before saying a UI change is fixed, screenshot it against `next dev` with headless Chrome: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --virtual-time-budget=30000 --screenshot=<file> <url>`. Check the trail's data first: no map may mean no bbox.
- Site copy follows the writing-voice and hikaya-brands skills.

## Gotchas

- Renaming or moving a file under `trails/` breaks the URLs in andrewpham.dev trail pages. Search `me/src/app/trails` first.
- Files the site loads must not be in LFS: raw URLs serve the LFS pointer. `.gitattributes` sends only the NPS boundary file to LFS.
- `site/public/coverage.json` goes stale (gitignored). Refresh it before work that reads it: `git fetch origin coverage-data && git show origin/coverage-data:coverage.json > site/public/coverage.json`. Safe to re-run. Check `generated` in the file.
- The PCT GeoJSON comes from `build_pct_geojson.py`, which is not in this repo (check where it lives).
- Anything that loads a file from `public/` must go through `publicPath()` in `src/lib/site.ts`, or it breaks under the GitHub Pages base path.
- The whole site is noindex until the `NEXT_PUBLIC_ALLOW_INDEXING` repo variable is `true`.

## Client

Own product (Disha). No client skill applies.
