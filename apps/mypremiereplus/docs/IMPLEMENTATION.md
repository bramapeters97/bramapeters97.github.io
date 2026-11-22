# Implementation report

## A. Migration

The target is an independent React/Vite/TypeScript web project extracted from `bramapeters97/lelibrambas-tv` at commit `50951d7ad10ce4c8a11ab9b3b0262af38cf41f27`. The source checkout remained clean and on the same commit. No source branch, production deployment or cloud resource was changed. Nothing was pushed or deployed.

Only web code was migrated. The native Expo/iPhone/tvOS entries, Swift/Xcode projects, Android implementations, Electron shell, source catalog, media, family photographs, launch audio, logos, credentials and Git history were excluded.

## B. Reused web components

`src/viewer/App.tsx` retains the original cinematic home, studio/profile flow, details, ambient previews, browser player, orientation handling and navigation state. `Discovery.tsx`, `PlayNextRecommendation.tsx`, `playNext.ts`, `media.ts`, `shareVideo.ts`, `styles.css` and `streaming.css` preserve existing browsing and player behavior. Browser types, keyboard navigation and scoped storage helpers are under `src/lib/`.

Branding, profiles, catalogs, playback requests and persistent progress are adapted to authenticated archive context. The original production API/fallback catalog is absent. Source authorisation and SQL were replaced because they lacked a tenant boundary.

## C. New implementation

The new Node/SQLite API, migration, demo seed and private local asset store support owner/editor/viewer roles, membership sessions, invitations, revocation, visibility, Gathering Mode, draft publication, uploads and history. A separate admin portal provides overview, library list/grid, editing drawers, collections, appearance previews, family/access, moments/stories/transcripts, premieres, contribution moderation, storage and recovery/export.

The viewer adds saved moments, years/person/location/occasion browsing, text/voice stories, transcript search and timestamp jumps, memory discovery, Family TV, mixed film/moment programmes and scheduled premieres. Family TV has three queue modes, exclusions, session state, segment boundaries and a return path from ordinary full-film playback. Shared programme state is polled across authorised clients.

Family TV now behaves as a private broadcast interface, with numbered stations, a channel remote, presets and keyboard channel surfing. Tuning requests the chosen station's actual queue and briefly shows a VHS tracking effect; reduced-motion users receive a minimal fade. Guide/settings menus preserve the current programme. Three separate stations per demo archive provide different collection choices.

Broadcast fullscreen uses a persistent wrapper and video element rather than entering native video fullscreen for each clip. Its HLS binding is reused for an unchanged media URL, with authorisation and interval cueing repeated at each programme boundary. The surface includes its remote and explicit exit; unsupported element fullscreen uses a reversible immersive viewport. Rendered automatic-boundary verification is recorded separately in the acceptance report.

Poster cards add delayed silent hover/keyboard previews with fresh playback authorisation and a bounded real clip. They stop other previews, abort pending work and unload media when left. Touch taps keep their existing action, reduced-motion users retain posters, and previews do not write film progress. Existing hero/details ambient previews are also silent.

Account settings edit the signed-in user's details. Owner billing screens expose fictional plan preferences and downloadable demo invoice records, with separate tenant/role checks. Ten archive colour palettes and ten self-hosted variable font families extend draft/published appearance settings. Font files include their upstream licenses.

Public product and pricing information at `/about` and policy pages under `/legal/` are available without account data. The calculator and API share illustrative pricing rules. The policy pages remain explicitly marked demonstration drafts; operator identity, provider contracts and operational retention/purge work must be completed before release. [LEGAL.md](LEGAL.md) records those boundaries.

The user explicitly authorised the public “MyPremierePlus is part of Bram Peters Studio” attribution linking to `https://bram-peters.com`. It appears on the requested sign-in, account, administration and public-policy surfaces. This is intended studio branding rather than copied private family data, and it does not resolve the legal-operator placeholders.

The cover studio offers provider thumbnails/local frame extraction, uploaded/cropped artwork, and clearly labelled demo cover/backdrop previews with editable title/year overlays. Local crop and title effects are baked into stored artwork; live AI is not silently simulated.

## D. Local workflows and demonstrations

Persistent local workflows include archive registration, draft/published appearance, video metadata drafts, local file ingestion and processing state, covers, collections, moments, moderation, manual transcript import/edit/search, channel publication, shared programmes, timed premieres, upload-only contributions, recovery, metadata export and authenticated ownership transfer.

Three owner demonstrations are seeded: `demo@example.test`, `other@example.test`, and `third@example.test`, password `premiere-demo`. Each archive has three viewing profiles, Everyone, Alex and Sam, which share its authorised library while keeping account/profile-scoped viewing preferences. The three archives are isolated tenants in one SQLite database. `viewer@example.test` is an additional restricted account for the first archive. Profiles are not accounts and never confer administrator privileges.

The editable, Git-ignored `demo-data/mypremiereplus.db` is the default demo data source. Its linked account, membership, profile and domain tables drive the running application. The login selector queries its accounts live; new committed account rows appear without restart, with sign-in enabled only after archive membership exists. A separate trackable `seed.db` contains freshly generated fiction and is copied only if the default working file is absent. Existing working files are not overwritten or reseeded. The seed builder uses an isolated fresh database without reading working data. `datasets.json` is sanitised seed metadata, not a working-data export. Schema guidance, SQL examples and an account helper accompany these files; editing JSON alone does not update SQLite.

The second migration creates physical domain and relationship tables while preserving custom metadata and a read/write `records` compatibility view. Browser pairing uses expiring hashed codes, current-role membership checks and a single-use device session. Account/profile watchlists are persisted in the same database. The source's bearer/device authentication is not reused.

The stock dataset uses ten distinct approved external clips with separate source sets for the three archives: four, three and three. Each archive rotates its sources across eight fictional film records. Source URLs, author/licence credits, HTTP/CORS evidence and checked durations live in the central registry; the optional original four-second sample remains available as a fallback. The explicit, versioned migration skips edited/uploaded/custom films and preserves publishing state and valid interval boundaries. Pristine profile-specific watchlists demonstrate preference links without changing existing working watchlists. No stock files are redistributed or uploaded to Cloudflare by this feature. The resulting dataset still uses short demonstration footage and does not prove long-film performance.

The approved migration connected 22 unchanged films in the editable working database, preserving the complete rows of two edited films. The separately regenerated pristine seed connects all 24 films and contains no runtime auth, viewing activity, uploads or private files. Both databases represent all ten sources and pass integrity and foreign-key checks. Detailed source credits and application evidence are in [the media guide](../demo-data/MEDIA.md).

## E. External services

`server/providers.ts` defines private R2 and configured Stream signing/upload interfaces, alongside the demo image provider. These boundaries are not a deployed Workers/D1/R2 service. Customer cloud playback is refused when its protected provider is unavailable.

Live AI imagery, automatic transcription, production identity, email/notification delivery, billing, signed customer streaming and cloud persistence require explicit configuration and integration validation. Manual transcripts, deterministic labelled artwork previews and private local uploads remain usable without them. See [PRODUCTION.md](PRODUCTION.md).

## F. Tenant separation

Session cookies resolve the authenticated account and membership; request-body tenant IDs are not trusted. Record, asset, progress, recovery and export operations include the resolved tenant. Record visibility is enforced before metadata/search/related-resource serialisation and playback. Saved queues recheck changed source and moment permissions. Profiles remain cosmetic viewing identities.

Guest tokens are hashed, scoped, expiring upload capabilities. Upload quotas are reserved atomically. A guest gets upload policy and submission confirmation only. Voice staging is uploader-owned until it is attached to an appropriately moderated story. No Cloudflare administrative credential is sent to the browser.

## G. Run

Use Node 24. Run `npm install`, `npm run setup`, then `npm run dev`. Open `http://127.0.0.1:5173`; API traffic is proxied to loopback port 8787. After stopping development, `npm run build` and `npm start` serve the built app at `http://127.0.0.1:8787`. The working database is `demo-data/mypremiereplus.db`; uploaded files are under ignored `.local/assets/`. Repeated setup preserves the existing working file and applies migrations without reintroducing deleted fixture records. Leave `DB_PATH` and `DATA_DIRECTORY` unset for the default demonstration; explicit custom storage hides the demo directory and does not copy the seed. Setup/start/API commands load an optional `.env`; `.env.example` contains placeholders, not live credentials.

## H. Verification

Final validation after the stock-media migration and direct-SQL preservation regression passed `npm test` (35 unit tests in eight Vitest files, plus 75 passed in the Node API/security runner; 110 total with no failures or skips) and `npm run build` (TypeScript and Vite). Independent security cases cover direct cross-tenant access, injected tenant IDs/roles, private child-resource/search leaks, stale queues, private moments, asset assignment, guest expiry, premiere release, voice moderation, discovery settings, live SQL data edits, self-scoped account changes, owner billing and station-specific queues. Browser-code tests additionally cover throttling, changed roles, revoked memberships and concurrent consumption. Schema/artwork migration tests preserve custom images, drafts and unrelated metadata. Thumbnail lifecycle tests exercise delayed requests, mute, clip bounds and cancellation races. Watchlist sync tests cover immediate cached edits, API persistence, surfaced failures and safe cache replacement after reload. Pricing tests check block boundaries and annual arithmetic without inventing a discount.

Admin browser QA inspected desktop, tablet, phone portrait and phone landscape layouts and captured clean-fixture screenshots. Video/appearance draft publication, account changes and demo billing changes were exercised in the actual UI. All ten self-hosted fonts loaded, ten palettes produced distinct gradients, and no console warning/error was observed during that QA. Browser evidence, precise limits and the acceptance matrix are recorded in [ACCEPTANCE.md](ACCEPTANCE.md). The original source was audited directly; its deployment was not run for side-by-side screenshot comparison.

Public product and legal pages were inspected before sign-in across desktop, tablet, landscape and phone widths down to 320 pixels. Live identity/font/palette changes, calculator block boundaries, FAQ/menu behavior, local registration links and all seven policy routes worked. Public navigation produced generic connection messages without an observed application stack; their origin is unconfirmed, so the earlier admin console result is not a claim of a clean overall console. The acceptance report records viewport captures and their exact limits.

Final browser checks verified the persistent TV immersive fallback for twelve seconds across automatic clip boundaries and a channel change, with working exit controls. Chromium automation denied native fullscreen, leaving unrestricted-browser/device native fullscreen unverified. Trusted Tab focus played a muted thumbnail preview and leaving focus released it; direct pointer-hover rendering was not separately verified. Device approval in another browser tab automatically signed the polling screen into the profile picker. These are actual rendered checks, with screenshots and precise boundaries in the acceptance report.

## I. Before production

Complete independent production identity, runtime/storage wiring, signed customer media, webhook verification, provider consent/cost limits, quotas, operational monitoring, backup/recovery drills and release/load testing. Review source distribution rights and dependency notices; no source license file was found. Do not treat known demo accounts or the public sample stream as production security.

Validate long-film seeking/buffering and cross-browser playback with customer-owned test media. Full responsive/accessibility coverage and exact visual comparison against the original viewer require explicit rendered evidence. Shared queue polling provides collaboration, not frame-synchronised watch parties. The export is metadata-only and does not promise original-video preservation.
