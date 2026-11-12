# disha-trails

Trail routes and boundary data for maps. The GPX files are free to download. See [ATTRIBUTION.md](ATTRIBUTION.md) for where each file comes from.

## Request a trail

Disha's offline maps and guides grow by request. Requests and edits are GitHub issues with two
templates:

- **[Trail request](https://github.com/hikaya-io/disha-trails/issues/new?template=trail-request.yml)**
  (`trail-request`): a trail with no map or guide yet. One request per trail, so its votes stay in
  one place. A 👍 votes it up and a 👎 votes it down. The daily build counts both and skips GitHub
  accounts under 30 days old. The site ranks trails by 👍 minus 👎, and the highest are built next.
- **[Trail edit](https://github.com/hikaya-io/disha-trails/issues/new?template=trail-edit.yml)**
  (`trail-edit`): a change to a published guide, such as a dry spring, a closed hut, a reroute or
  a wrong distance. A 👍 confirms it.

Both titles end in `[trail-id]`, which ties the issue to its trail. The site's buttons open these
forms. A link can prefill the title but not a dropdown, so a button's topic goes in the title, such
as `Trail edit (route): …`. New topics go in the title; don't add templates or labels. The
`trail-edit` label must exist in the repo for the template to apply it.

`coverage.json` is rebuilt daily in the private disha-tiles repo and pushed, with the old
standalone dashboard (`index.html`), to the root of this repo's `coverage-data` branch; don't edit
that branch by hand, and don't merge it, because it holds only data. The deploy copies its `coverage.json`
into every build, and disha-tiles force-pushes the branch daily as a single commit, so there's no
history to merge. It carries guide statuses only when disha-tiles has a `DISHA_GUIDES_TOKEN`
secret (read access to hikaya-io/disha-guides); without it, `/trails/` is empty.

## Marketing site

`site/` holds the public Disha site (Next.js, MDX, static export, yarn). From `site/`:

- `yarn dev` runs it locally. The site reads its own `public/coverage.json` (gitignored), so download it first: `curl -o public/coverage.json https://disha.hikaya.io/coverage.json`, then `node scripts/build-trail-routes.mjs` for the route files. Or set `NEXT_PUBLIC_COVERAGE_DATA_URL` to that URL in `.env.local` to read the live file instead.
- `yarn lint`, `yarn test` and `yarn build` are the checks. A production build needs `NEXT_PUBLIC_SITE_URL`; see `site/.env.example`. While `yarn dev` is running, check a build with `NEXT_DIST_DIR=.next-check yarn build`: a build into `.next` overwrites the files the dev server serves and breaks it until it restarts. That build exports into `.next-check/`, not `out/`.
- To check a build under the GitHub Pages path, build with `NEXT_PUBLIC_SITE_URL=https://hikaya-io.github.io/disha-trails NEXT_PUBLIC_BASE_PATH=/disha-trails`, copy the export into `<tmp>/disha-trails/` and serve `<tmp>` with `python3 -m http.server`.
- Every page is registered in `site/src/lib/pages.ts`, which feeds the sitemap and metadata. A draft page is noindex and left out of the sitemap.
- **Indexing.** Every page is noindex until the build sets `NEXT_PUBLIC_ALLOW_INDEXING=true` (`ALLOW_INDEXING` in `src/lib/site.ts`); robots.txt names the sitemap only then. Crawling stays allowed so crawlers can read the noindex tags. Even with indexing on, only the registered pages are indexed: trail pages are always noindex and left out of the sitemap.
- **Search and sharing.** Titles stay within 60 characters with " | Disha", and descriptions run 110 to 160 (`tests/pages.test.ts`). A trail page's title and description come from `trailTitle` and `trailDescription` in `src/lib/coverage.ts`, which name what the page offers today and shorten long names to fit. Every page shares `public/og/disha.png` (`SHARE_IMAGE`, set through `shareMetadata` in `src/lib/metadata.ts`); `node scripts/build-og-image.mjs` redraws it with Google Chrome. Trail titles and descriptions serve link previews, since trail pages aren't indexed. Each trail page lists the trails nearest to it (`nearbyTrails`), so every mapped trail is linked from another page's HTML; the `/trails/` table shows only 25 rows at a time.
- **Analytics and cookies.** Off unless `NEXT_PUBLIC_GA_ID` is set. With it, a banner asks first (Essential only or Accept all) and Google Analytics loads only after Accept all; "cookies" in the footer reopens the choice, and the privacy page describes it. Without it there is no banner and the privacy page says the site runs no analytics. The consent code (`src/lib/consent.ts`, `src/components/consent/`) is ported from hikaya.io. The waitlist sends GA4's `sign_up` event; mark it as a key event in GA.
- The waitlist posts to the `hikaya-contact-form` Worker in website-2.0 (`POST /waitlist/disha`).
- `/trails/[id]/` is one page per trail, generated at build time from `coverage.json` (from `public/coverage.json`, or wherever `NEXT_PUBLIC_COVERAGE_DATA_URL` points). A trail added to the data shows on `/trails/` at once and gets its page on the next build.
- **One grid.** Every square and line on the maps comes from the map cells, which are z10 web map tiles (`c-10-x-y`), the unit disha-tiles builds and publishes. Zoomed out, the squares are the cells' z8 parents (4 × 4 cells); a city's dashed outline is the edge of its cells (`cellsBounds` in `src/lib/coverage-geo.ts`), never its raw 40 km box. Don't draw anything from a place's own box or from degrees: it won't line up. Tests in `tests/coverage.test.ts` check this.
- **Trails and maps.** `/trails/` lists curated guides, `/maps/` where offline maps download. Both use one table (`src/components/coverage/CatalogTable.tsx`): search, multi-select status chips in the tags' colors, sort, 25 rows a page, status on the right. Trails opens on available and coming-soon guides, Maps on available and partial maps; the other chips hold the rest of the funnel (`mapStage`, `guideStage` and the badge helpers in `src/lib/coverage.ts`). Trails with a map and no guide row are only on `/maps/`.
- **Map pages.** `/maps/` and the trail pages sit in the `(map)` route group: the site header over a map, with no site footer. Their side panel's shared pieces are in `src/components/coverage/drawer.tsx`. On a phone the map fills the screen under the header and the panel is a drawer over it, opened by a button on the map and closed by its tab, a tap on the map or a swipe to the left.
- **Maps page.** From `lg` the panel floats over the map's left side, and its tab hides it for the whole map. Choosing a row's name or a dot sets `/maps/?trail=` or `?city=`, which names the selection in a bar in the panel (with a link to a trail's page), highlights the row and zooms to it. A selected trail with a route file (see Routes) draws its line.
- **One place for explanations.** The docs explain the site's catalogs, by section: map tags and squares on `/docs/offline-maps/coverage/`, guide tags on `/docs/guides/trails/`, and requests, edits and open data under Contribute (`/docs/requests/`, `/docs/edits/`, `/docs/open-data/`). The pages only link to them ("what the tags mean", `StatusLink`).
- **Map credits.** The other pages carry them in the site footer. The map pages close their panel with them instead (`MapCredits`), and a trail page shows the footer from `lg`. Only the OpenFreeMap credit shows on a map, and only on that layer.
- **Map layers.** Both maps (`/maps/` and the trail pages) offer the same three layers as andrewpham.dev's trail maps, picked from the layers button and drawn light or dark with the site's theme (`src/lib/map/layers.ts`):
  - **Terrain** (the default): the Disha app's own map. Every tile comes from `tiles.hikaya.app` through the `disha://` protocol in `src/lib/map/disha-protocol.ts`: the OSM world map (`v1/world/<version>/`: world-base, world-relief and world-routes, the version pinned as `WORLD_VERSION` to match disha_ios `scripts/fetch-world-maps.sh`) to z8, then the published cells' base map, paths and routes from z9, hillshade from z10 and contours from z11. Blank outside the published cells, as in the app.
  - **OpenFreeMap**: andrewpham.dev's trail style on OpenFreeMap's data, with the cells' hillshade and contours in me's paint. It fills the ground outside the cells.
  - **OSM Classic**: OpenStreetMap's raster tiles.
- `node scripts/build-map-assets.mjs` writes the Terrain and OpenFreeMap styles, fonts and sprite into `public/map/`. It reads sibling `disha-ios` (the app's `disha-outdoor-osm` styles) and `me` (`public/map-styles/outdoor-terrain-open*.json`) checkouts; rerun it when either style changes.
- The map buttons (`src/components/coverage/MapControls.tsx`) are me's set: layers, fullscreen and km/mi on the left, zoom and zoom-to-fit on the right. km/mi shows only on a trail with a route.
- **Trail page layout.** As on andrewpham.dev's trail stories: from `lg`, the title and facts in the left half and the map in the right half, flush to the window, the screen's height under the sticky header and staying put while the text scrolls (`TrailDetail.tsx`; the 60px header height is a constant there). On phones the map is the page, as on `/maps/`: a button with the trail's name opens the text as a drawer.
- **Trail map framing.** The map fits the trail's cells. A trail with no cells fits its route once the route file loads, and its countries until then (`countryBox`).
- **Routes and elevation.** A trail page draws the trail's route with a frosted elevation chart over the bottom of the map (`ElevationChart.tsx`, ported from me's), the two linked: pointing at either marks the same spot on both. The data is `public/routes/<id>.json` (gitignored), written at deploy time by `node scripts/build-trail-routes.mjs` from each published guide's package on `guides.hikaya.app`: its line and its elevation at every point, unchanged, so the site's distance and climb match the app and the GPX download (disha-guides R29.1). Only published guides get a file; a coming-soon guide's route shows from the cells' route tiles from zoom 9 until it's published. The run fails when a published guide isn't in the catalog, which means the site and guide ids disagree (`GUIDE_FOR` in the script, until coverage.json rows carry `guideId`). Run it locally after downloading `coverage.json`. Pages learn which trails have a file at build time (`src/lib/route-files.ts`), so they never fetch a missing one.
- `/maps/` and `/trails/` also fetch the site's `/coverage.json` in the browser (revalidating, so a new deploy's file shows without a hard reload). To preview other data, put a copy at `public/coverage-local.json` (gitignored) and set `NEXT_PUBLIC_COVERAGE_DATA_URL=/coverage-local.json`.
- **Base path.** On `hikaya-io.github.io` the site lives under `/disha-trails`, set by `NEXT_PUBLIC_BASE_PATH` (Next's `basePath`). `next/link` and the router add it; anything else that loads a file from `public/` (fetches, map styles, images) goes through `publicPath()` in `src/lib/site.ts`.

### Deploy

`.github/workflows/deploy-site.yml` builds `site/` and deploys it to GitHub Pages. It runs on a push to `main` that touches `site/`, `trails/` or the workflow, on a `repository_dispatch` of type `coverage-updated`, and by hand (**Actions** › **Deploy site** › **Run workflow**). Each run:

1. checks out `main` and copies `coverage.json` from the `coverage-data` branch into `site/public/`, failing if the branch or file is missing;
2. writes the route files from the published guides (`scripts/build-trail-routes.mjs`), then runs `yarn lint`, `yarn test` and `yarn build`, with `NEXT_PUBLIC_SITE_URL` from the repo variable of that name (default `https://hikaya-io.github.io/disha-trails`) and `NEXT_PUBLIC_BASE_PATH` taken from that URL's path (`/disha-trails`, or empty on a custom domain);
3. copies the branch's dashboard `index.html` to `/coverage/` in the export (it is self-contained, so it needs no rewriting) and deploys the export.

A push to `coverage-data` doesn't start the workflow: GitHub reads a push's workflows from the pushed commit, and that branch holds only the data. So disha-tiles sends the `coverage-updated` dispatch after each push, with the same `DISHA_TRAILS_TOKEN` PAT it pushes with (`gh api repos/hikaya-io/disha-trails/dispatches -f event_type=coverage-updated`). The default `GITHUB_TOKEN` couldn't do either: its pushes and dispatches don't start other workflows.

Repo settings it needs:

- **Settings** › **Pages** › **Source**: GitHub Actions.
- Repo variables (**Settings** › **Secrets and variables** › **Actions** › **Variables**), all optional: `NEXT_PUBLIC_SITE_URL` once a custom domain is live, and `NEXT_PUBLIC_CONTACT_API_URL` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the waitlist (public values, the same as website-2.0's), `NEXT_PUBLIC_GA_ID`, the Disha GA4 property's measurement ID, to turn on analytics and the cookie banner, and `NEXT_PUBLIC_ALLOW_INDEXING` set to `true` when the main pages may be indexed.

## Project structure

```
disha-trails/
├── site/                    # Marketing site, see above
├── national-forests/        # US forest and park boundaries
│   ├── fs-administrative-forest-simplified.json
│   ├── nps-land-resources-division-boundary-and-tract-data-service.geojson
│   ├── nps-land-resources-division-boundary-simplified.json
│   └── usfs-administrative-forest-simplified.json
└── trails/
    ├── *.gpx                # One file per trail or race route
    └── pct/                 # Pacific Crest Trail
        ├── pacific-crest-trail.geojson                      # Whole trail with elevation, one feature per section
        ├── pacific-crest-trail-complete-simplified.geojson  # Whole trail, simplified, no elevation
        ├── pacific-crest-trail-pcta-simplified.gpx          # Whole trail, simplified, no elevation (26 MB)
        ├── sections/        # One GeoJSON per section: desert, sierra, northern-california, oregon, washington
        └── halfmile/        # Halfmile section tracks and waypoints
            ├── ca/          # Sections A to R
            ├── or/          # Sections B to G
            └── wa/          # Sections H to L
```

## Downloading a file

Open a file on GitHub and click **Download raw file**. To link to a file or load it in code, use its address on the Disha site, which serves everything in `trails/` at `/data/trails/` with the same paths (the deploy copies it, see `deploy-site.yml`):

```
https://disha.hikaya.io/data/trails/gr20-corsica-2024.gpx
```

andrewpham.dev's trail pages load their GPX and GeoJSON from there, so renaming or moving a file breaks them. Search `me/src/app/trails` first.

The NPS boundary file is stored in Git LFS, so its raw URL returns a pointer. Download it from the GitHub page instead.

## File naming

Trail GPX files follow this pattern:

```
{trail-name}-{distance}-{year}.gpx
```

### Rules

- **Kebab-case.** Lowercase, with hyphens as separators. No underscores or capitals.
- **Trail name.** The name people know the route by. Use an abbreviation only when it's better known than the full name, such as `gr20` or `pct`.
- **Distance.** Include it when a race has more than one distance. Leave it out for routes with one fixed length.
- **Year.** Include it on every trail and race file. Courses change from year to year with reroutes and conditions, and the year tells readers how current the route is.

### Examples

| File | Why |
|------|-----|
| `gr20-corsica-2024.gpx` | Known abbreviation, location and year |
| `tour-du-mont-blanc-2026.gpx` | Full name and year |
| `grossglockner-ultra-trail-110k-2026.gpx` | Full name, distance (the race has several) and year |
| `transylvania-50k-2025.gpx` | Name, distance and year |
| `madeira-crossing-2026.gpx` | Name and year (one known route) |

### PCT files

PCT files live in `trails/pct/` and use kebab-case too. Whole-trail and section files are named after the trail or section and carry no year. Halfmile files keep their section labels in lowercase:

```
trails/pct/sections/pct-sierra.geojson
trails/pct/halfmile/ca/ca-sec-a-tracks.gpx
trails/pct/halfmile/ca/ca-sec-a-waypoints.gpx
```

## Git LFS

Only the NPS boundary file uses Git LFS (see `.gitattributes`). Commit every trail file as a plain file. A raw URL for a file in LFS serves the pointer, which breaks the maps on andrewpham.dev.

## License

The code in `site/` is under the [MIT license](LICENSE): copies and forks must keep its copyright notice. Trail data marked ODbL in [ATTRIBUTION.md](ATTRIBUTION.md) is under the [Open Database License](DATA-LICENSE.md). Other files keep their source's terms. Using the hosted services (`tiles.hikaya.app`, `guides.hikaya.app` and the site's `/data/trails/`) is covered by the [terms of use](https://disha.hikaya.io/terms/), which the licenses don't change.
