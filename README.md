# bramapeters97.github.io
Bram Peters

| My personal portfolio website at https://www.bram-peters.com |

## Cloudflare Pages

The site has no runtime dependencies. Configure the Pages project with:

- **Build command:** `npm run build`
- **Build output directory:** `.`

The build command reconstructs the binary LELIBRAMBAS+ favicon and home-screen
icons from their text-only source in `scripts/generate-lelibrambas-icons.mjs`.
This keeps binary files out of Git while still placing every referenced icon in
`projects/lelibrambas/` before Cloudflare publishes the site. Run `npm run build`
before serving the repository locally as well.

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

## The Gift Chapter

From the portfolio root, run `npm run build` and `python3 -m http.server 4173`.
Open `http://localhost:4173/the-gift-chapter/`. The root is both the local
build output and the source for the repository’s GitHub Pages site. The demo
ships as static files in `the-gift-chapter/` with local WebP photographs from the
starter and local fonts with licenses in `the-gift-chapter/assets/licenses/`.
Nested URLs such as `#gift/coast` and `#studio` work on refresh.

The fictional wedding uses a versioned IndexedDB record scoped to this origin.
Guest records, cover uploads, note approvals and studio edits stay in that
browser. Open the invitation link in a new browser profile to start with the
seeded wedding. Use **Couple’s studio → Reset to sample data** to clear this
browser’s demo after confirming. The studio is an open role preview. Gifts and
voucher promises are simulations. The browser can print the approved collage
or save it as a PDF in A4 or US Letter.

A real wedding would need shared records, authenticated couple accounts and
co-editor permissions, private invitation tokens, server-side gift holds,
hosted provider checkout, signed and idempotent payment confirmations, and
reconciliation for failed and expired reservations, refunds and receipts.
Payout onboarding also belongs on the live service. The static demo contains
none of these integrations.
