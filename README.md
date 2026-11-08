# disha-trails

Trail routes and boundary data for maps. The GPX files are free to download. See [ATTRIBUTION.md](ATTRIBUTION.md) for where each file comes from.

## Request a trail

Disha's offline maps and guides grow by request. Everything runs on GitHub issues, with two
templates and nothing else:

- **[Trail request](https://github.com/andrewtpham/disha-trails/issues/new?template=trail-request.yml)**
  (`trail-request`): a trail with no map or guide yet. One request per trail, so its votes stay in
  one place. A vote is a 👍; the daily build counts them, and the most-voted are built next.
- **[Trail edit](https://github.com/andrewtpham/disha-trails/issues/new?template=trail-edit.yml)**
  (`trail-edit`): something wrong on a published guide, such as a dry spring, a closed hut, a
  reroute or a wrong distance. A 👍 confirms it.

Both titles end in `[trail-id]`, which ties the issue to its trail. The site's buttons only fill in
those forms; what a button is about goes in the title, such as `Trail edit (route): …`, because a
link can always prefill the title but not a dropdown. Add a topic, never a new template or label.
The `trail-edit` label has to exist in the repo for the template to apply it.

`coverage.json` is rebuilt daily and published to the `gh-pages` branch from the private
disha-tiles repo; don't edit that branch by hand. It carries guide statuses only when that repo
has a `DISHA_GUIDES_TOKEN` secret (read access to disha-guides); without it, `/trails/` is empty.
The standalone dashboard at the `gh-pages` root goes away once the site is live.

## Marketing site

`site/` holds the public Disha site (Next.js, MDX, static export, yarn). From `site/`:

- `yarn dev` runs it locally.
- `yarn lint`, `yarn test` and `yarn build` are the checks. A production build needs `NEXT_PUBLIC_SITE_URL`; see `site/.env.example`. While `yarn dev` is running, check a build with `NEXT_DIST_DIR=.next-check yarn build`: a build into `.next` overwrites the files the dev server serves and breaks it until it restarts. That build exports into `.next-check/`, not `out/`, so use a plain `yarn build` for the files you deploy.
- Every page is registered in `site/src/lib/pages.ts`, which feeds the sitemap and metadata. A draft page is noindex and left out of the sitemap.
- The waitlist posts to the `hikaya-contact-form` Worker in website-2.0 (`POST /waitlist/disha`).
- `/trails/[id]/` is one page per trail, generated at build time from `coverage.json` (a build needs network, or `NEXT_PUBLIC_COVERAGE_DATA_URL=/coverage-local.json`). A trail added to the data shows on `/trails/` at once and gets its page on the next build.
- **One grid.** Every square and line on the maps comes from the map cells, which are z10 web map tiles (`c-10-x-y`), the unit disha-tiles builds and publishes. Zoomed out, the squares are the cells' z8 parents (4 × 4 cells); a city's dashed outline is the edge of its cells (`cellsBounds` in `src/lib/coverage-geo.ts`), never its raw 40 km box. Don't draw anything from a place's own box or from degrees: it won't line up. Tests in `tests/coverage.test.ts` check this.
- **Trails and maps.** `/trails/` lists curated guides, `/maps/` where offline maps download. Both use one table (`src/components/coverage/CatalogTable.tsx`): search, multi-select status chips in the tags' colors, sort, 25 rows a page, status on the right. Trails opens on available and coming-soon guides, Maps on available and partial maps; the other chips hold the rest of the funnel (`mapStage`, `guideStage` and the badge helpers in `src/lib/coverage.ts`). Trails with a map and no guide row are only on `/maps/`.
- **Maps page.** A trail's name opens its page; a row's map button sets `/maps/?trail=` or `?city=`, which names the selection in a bar above the map, highlights the row and zooms to it. A selected trail with a route file (see Routes) draws its line.
- **One place for explanations.** The docs explain the site's catalogs, by section: map tags and squares on `/docs/offline-maps/coverage/`, guide tags on `/docs/guides/trails/`, and requests, edits and open data under Contribute (`/docs/requests/`, `/docs/edits/`, `/docs/open-data/`). The pages only link to them ("what the tags mean", `StatusLink`). Map credits are in the footer on every page, so maps don't repeat them; only the OpenFreeMap credit shows under a map, and only on that layer.
- **Map layers.** Both maps (`/maps/` and the trail pages) offer the same three layers as andrewpham.dev's trail maps, picked from the layers button and drawn light or dark with the site's theme (`src/lib/map/layers.ts`):
  - **Terrain** (the default): the Disha app's own map. Every tile comes from `tiles.hikaya.app` through the `disha://` protocol in `src/lib/map/disha-protocol.ts`: the OSM world map (`v1/world/<version>/`: world-base, world-relief and world-routes, the version pinned as `WORLD_VERSION` to match disha_ios `scripts/fetch-world-maps.sh`) to z8, then the published cells' base map, paths and routes from z9, hillshade from z10 and contours from z11. Blank outside the published cells, as in the app.
  - **OpenFreeMap**: andrewpham.dev's trail style on OpenFreeMap's data, with the cells' hillshade and contours in me's paint. It fills the ground outside the cells.
  - **OSM Classic**: OpenStreetMap's raster tiles.
- `node scripts/build-map-assets.mjs` writes the Terrain and OpenFreeMap styles, fonts and sprite into `public/map/`. It reads sibling `disha_ios` (the app's `disha-outdoor-osm` styles) and `me` (`public/map-styles/outdoor-terrain-open*.json`) checkouts; rerun it when either style changes.
- The map buttons (`src/components/coverage/MapControls.tsx`) are me's set: layers, fullscreen and km/mi on the left, zoom and zoom-to-fit on the right. km/mi shows only on a trail with a route.
- **Trail page layout.** As on andrewpham.dev's trail stories: from `lg`, the title and facts in the left half and the map in the right half, flush to the window, the screen's height under the sticky header and staying put while the text scrolls (`TrailDetail.tsx`; the 60px header height is a constant there). On phones the map runs edge to edge under the text.
- **Routes and elevation.** A trail page draws the trail's route with a frosted elevation chart over the bottom of the map (`ElevationChart.tsx`, ported from me's), the two linked: pointing at either marks the same spot on both. The data is `public/routes/<id>.json`, written by `node scripts/build-trail-routes.mjs` (committed; the site build doesn't run it). Its line is the trail's disha-guides corridor (`out/corridors/`, from a sibling `disha-guides` checkout) and its heights are read from the published terrain cells, the model behind the hillshade. Rerun it when corridors are added or more cells are built; a trail without a corridor, or with too little built terrain, gets no file and keeps the cells' route on the map. 11 trails had one on 2026-11-08. Pages learn which trails have a file at build time (`src/lib/route-files.ts`), so they never fetch a missing one.
- `/maps/` and `/trails/` fetch `coverage.json` from GitHub Pages in the browser, so they show new data without a rebuild. To preview other data, put a copy at `public/coverage-local.json` (gitignored) and set `NEXT_PUBLIC_COVERAGE_DATA_URL=/coverage-local.json`.

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

Open a file on GitHub and click **Download raw file**. To link to a file or load it in code, use its raw URL:

```
https://raw.githubusercontent.com/andrewtpham/disha-trails/refs/heads/main/trails/gr20-corsica-2024.gpx
```

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
| `tour-du-mont-blanc-2024.gpx` | Full name and year |
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
