# bramapeters97.github.io
Bram Peters

| My personal portfolio website at https://www.bram-peters.com |

## Cloudflare Pages

Use the repository root, framework preset **None**, build command `npm run build`
and build output directory `dist`. Use Node 22 or later. Branch previews use the
same settings. The build keeps the portfolio pages and regenerates the
LELIBRAMBAS+ icons, then adds the original Vinobo app as a static export at
`/vinobo/`. Only `/vinobo/api/get_transcript` runs a Pages Function. It needs
no secret, storage binding or server. Firebase keeps using the original project.

The existing J. Meijer film exceeds Pages' 25 MiB per-file limit. Its original
portfolio URL redirects to the same MP4 in this public GitHub repository.

To run the complete site locally, use `npm ci`, `npm run build` and
`npx wrangler pages dev dist` from the repository root.

## Portfolio maintenance

The twelve portfolio case studies share navigation generated from
`scripts/update-project-navigation.mjs`. After changing its project list, run
`npm run update:project-navigation`, then `npm run check:portfolio`.

Amstroll uses the self-contained export in `projects/amstroll/portfolio-embed/`.
Its six transparent phone images (`assets/img/am1.png` through `am6.png`) are
generated from the original prototype captures on Windows with
`pwsh scripts/generate-amstroll-media.ps1`. The supplied cover
(`assets/img/amstroll.png`, 2200×900) is preserved unchanged; the generator
validates it but never overwrites it. Photo and font attribution are under
`assets/amstroll/`.

Regenerate the three-page résumé with `python3 scripts/generate-resume.py`
(requires ReportLab and Pillow). It reads the homepage's current roles, dates,
education, certificates, languages, skills and project images; concise print
descriptions live in the generator. The homepage Resume button opens the result
at `assets/pdf/bapeters_cv.pdf`.

All pages and the web manifest use `assets/img/bram-peters-studio.png` for the
site icon. After replacing that image, run
`python3 scripts/generate-studio-favicon.py` (Pillow) to refresh the legacy
browser fallback at `favicon.ico`.

## Native iPhone app

The independent SwiftUI app is in [`ios-app/`](ios-app/README.md). Open
`ios-app/Portfolio.xcodeproj` on a Mac. Its portfolio content and optimized images
are bundled for offline browsing and generated from this website; run
`python3 ios-app/scripts/import_content.py` after content changes. See the app's
README for Python setup, signing, mail behavior and validation commands.

## MyPremiere+ preview

The homepage card opens a full-screen image with a left-to-right cinematic pan
and subtle desktop pointer depth. It stays on the homepage and respects reduced
motion. Its styles and lifecycle live in `assets/css/mypremiere-preview.css` and
`assets/js/mypremiere-preview.js`. To verify desktop/mobile interactions, install
Playwright in your development environment and run
`node scripts/check-mypremiere-preview.cjs`; set `CHROMIUM_PATH` to use an existing
Chromium installation. The test serves the repository only on localhost.

## The Honeymoon Webshop

From the portfolio root, run `npm run build` and `python3 -m http.server 4173`.
Open `http://localhost:4173/the-gift-chapter/`. The root is both the local
build output and the source for the repository’s GitHub Pages site. The demo
ships as static files in `the-gift-chapter/` with local WebP photographs
and local fonts with licenses in `the-gift-chapter/assets/licenses/`.
The Thailand itinerary photo attributions are in `the-gift-chapter/photo-credits.html`.
Nested URLs such as `#gift/coast` and `#colours` work on refresh.

The demo is inspired by Eline and Luca’s wedding and Thailand honeymoon.
It uses illustrative wedding details and sample gift prices. The **Colours**
page offers six wedding palettes, with Eucalyptus as the default. Selections, replies, gifts and notes are
stored in this browser in IndexedDB. New notes stay with their demo gift.
Use **Colours → Reset to sample data** to restore the sample after
confirming. Checkout simulates giving and shows a disabled Apple Pay example.

A real wedding would need shared records, authenticated couple accounts and
co-editor permissions, private invitation tokens, server-side gift holds,
hosted provider checkout, signed and idempotent payment confirmations, and
reconciliation for failed and expired reservations, refunds and receipts.
Payout onboarding also belongs on the live service. The static demo contains
none of these integrations.
