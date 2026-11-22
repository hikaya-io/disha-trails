# Development notes

Internal notes for working on this repo. The public README is [../README.md](../README.md). The code is the reference for how the catalog looks and behaves; this file keeps only what the code doesn't say.

## Requests

Trail requests and edits are GitHub issues made from two templates (`trail-request`, `trail-edit`). Titles end in `[trail-id]`. A link can prefill the title but not a dropdown, so a button's topic goes in the title, such as `Trail edit (route): …`. Don't add templates or labels. A 👍 votes a request up and a 👎 votes it down; the daily build skips accounts under 30 days old, and the catalog ranks by 👍 minus 👎.

## Coverage data

`coverage.json` is built daily in the private disha-tiles repo and force-pushed to the `coverage-data` branch, which holds only data. Never edit or merge it. Without the `DISHA_GUIDES_TOKEN` secret in disha-tiles, guide statuses are missing and `/trails/` is empty.

## Catalog site (`site/`)

The catalog of trails, maps and guides for Disha's data services. Next.js, MDX, static export, yarn. From `site/`:

- `yarn dev` runs it. Download `public/coverage.json` first (`curl -o public/coverage.json https://disha.hikaya.io/coverage.json`), then `node scripts/build-trail-routes.mjs`.
- `yarn lint`, `yarn test` and `yarn build` are the checks. A build needs `NEXT_PUBLIC_SITE_URL` (see `.env.example`). While `yarn dev` runs, use `NEXT_DIST_DIR=.next-check yarn build`.
- To check the GitHub Pages path, build with `NEXT_PUBLIC_SITE_URL=https://hikaya-io.github.io/disha-trails NEXT_PUBLIC_BASE_PATH=/disha-trails` and serve the export under `/disha-trails/`.

Rules that bite:

- **Pages.** Register every page in `src/lib/pages.ts`. A draft page is noindex and left out of the sitemap. Titles stay within 60 characters with " | Disha" and descriptions run 110 to 160 (`tests/pages.test.ts`).
- **Indexing.** Everything is noindex until the build sets `NEXT_PUBLIC_ALLOW_INDEXING=true`. Trail pages are always noindex.
- **One grid.** Everything on the maps is drawn from the map cells (z10 tiles, `c-10-x-y`), never from a place's own box or from degrees. `tests/coverage.test.ts` checks it.
- **Routes.** `public/routes/<id>.json` is gitignored and written at deploy time by `scripts/build-trail-routes.mjs` from published guides on `guides.hikaya.app`. The script fails when a published guide isn't in the catalog.
- **Map styles.** `node scripts/build-map-assets.mjs` reads sibling `disha-ios` and `me` checkouts. Rerun it when either style changes. `WORLD_VERSION` must match disha_ios `scripts/fetch-world-maps.sh`.
- **Base path.** Anything that loads a file from `public/` goes through `publicPath()` in `src/lib/site.ts`.
- **Explanations live in the docs.** Pages link to `/docs/...` instead of repeating what tags mean.
- **Analytics.** Off unless `NEXT_PUBLIC_GA_ID` is set. Google Analytics loads only after "Accept all". Mark GA4's `sign_up` event as a key event.
- **Waitlist.** Posts to the `hikaya-contact-form` Worker in website-2.0.

## Deploy

`.github/workflows/deploy-site.yml` builds `site/` and deploys it to GitHub Pages on a push to `main` that touches `site/`, `trails/` or the workflow, on a `coverage-updated` dispatch from disha-tiles, and by hand. It copies `coverage.json` from the `coverage-data` branch, writes the route files, runs lint, test and build, and deploys. A push to `coverage-data` can't start the workflow, so disha-tiles sends the dispatch with its `DISHA_TRAILS_TOKEN`.

Repo settings: **Pages** source is GitHub Actions. Optional variables: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_API_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_ALLOW_INDEXING`.

## Data files

`trails/` has the GPX files, `trails/pct/` the Pacific Crest Trail (whole trail, `sections/`, `halfmile/`), and `national-forests/` the boundaries.

The catalog serves `trails/` at `https://disha.hikaya.io/data/trails/` with the same paths, and andrewpham.dev's trail pages load from there. Renaming or moving a file breaks them; search `me/src/app/trails` first.

### Naming

`{trail-name}-{distance}-{year}.gpx`, kebab-case.

- **Trail name.** The name people know the route by. Abbreviate only when better known, such as `gr20`.
- **Distance.** Only when a race has several.
- **Year.** Always, because courses change. PCT whole-trail and section files carry no year.

Examples: `gr20-corsica-2024.gpx`, `grossglockner-ultra-trail-110k-2026.gpx`, `trails/pct/sections/pct-sierra.geojson`, `trails/pct/halfmile/ca/ca-sec-a-tracks.gpx`.

### Git LFS

Only the NPS boundary file uses LFS (`.gitattributes`). Commit every other file as a plain file, because a raw URL for an LFS file serves the pointer and breaks the maps.
