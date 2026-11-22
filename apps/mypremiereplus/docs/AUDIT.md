# Web migration audit

Audit performed 1 November 2026 against the checked-out source, before migration.

## Repository boundaries

| Repository | Local checkout                  | Remote                         | Branch           | Audited commit                             |
| ---------- | ------------------------------- | ------------------------------ | ---------------- | ------------------------------------------ |
| Source     | sibling `lelibrambas-tv/`       | `bramapeters97/lelibrambas-tv` | `main`           | `50951d7ad10ce4c8a11ab9b3b0262af38cf41f27` |
| Target     | this `MyPremierePlus/` checkout | `bramapeters97/MyPremierePlus` | initially `main` | initially `eeff56a`                        |

The source `git status --short` was empty. Target initially contained only its README and untracked design references. No source branch, files, deployment, remote resource, or Git history is changed by the migration.

## Current source architecture

The working browser viewer is React DOM 19 with Vite, TypeScript and HLS.js. Its entry is `apps/tv/src/main.tsx`; the similarly named `apps/tv/App.tsx` is an Expo/native entry and is excluded. Browser routes are an internal screen state and history stack, rather than a React Router configuration. Query parameters support direct screen/video selection and deterministic capture states.

`apps/tv/src/App.tsx` contains the studio introduction, profile picker, profile loading screen, cinematic home, detail page, ambient previews and full player. `Discovery.tsx` provides the navigation rail, responsive mobile navigation, search, collection screens, discovery hubs, full library and profile watchlists. `styles.css` and `streaming.css` contain the established visual and responsive baseline.

Source catalog loading first requests a hardcoded production Movies API and then a local JSON fallback. The target must replace that loader completely; it must never use the original production endpoint or family catalog as a fallback. `packages/catalog/src/index.ts` normalises records into the viewer contract and contains family-specific profiles and categories. Only its reusable transformation logic is appropriate for migration.

## Feature inventory and treatment

| Existing web feature                                           | Source                                                                 | Treatment                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Cinematic home, posters, rails, featured titles                | `apps/tv/src/App.tsx`                                                  | Preserve components and layout; provide tenant-filtered records and identity.                       |
| Movie details, related recommendations                         | `App.tsx`, `playNext.ts`                                               | Preserve eligible-record selection and UI; feed authorised records only.                            |
| Search, collection browsing, library                           | `Discovery.tsx`                                                        | Preserve presentation and navigation; extend server search for moments/transcripts/stories.         |
| Sidebar, phone navigation, orientation                         | `Discovery.tsx`, `App.tsx`, stylesheets                                | Reuse browser behavior; add links for new viewer sections.                                          |
| HLS/MP4 playback, seek, volume, fullscreen, buffering recovery | `App.tsx`, `media.ts`                                                  | Reuse browser player; obtain playback source from authorised target backend.                        |
| Play Next and source cleanup                                   | `PlayNextRecommendation.tsx`, `playNext.ts`, `App.tsx`                 | Preserve and test with fictional records.                                                           |
| Ambient home/detail previews                                   | `App.tsx`                                                              | Preserve idle, scroll, reduced-motion and disposal behavior.                                        |
| Keyboard/spatial focus                                         | `packages/navigation/src/index.ts`                                     | Reuse browser module; no native shell required.                                                     |
| Progress, Continue Watching, watchlist                         | `packages/shared/src/index.ts`, `Discovery.tsx`                        | Adapt identity keys to tenant/account/profile and persist through backend.                          |
| Share links                                                    | `shareVideo.ts`                                                        | Preserve browser sharing with target origins and generic metadata.                                  |
| Brand intro, logo, jingle, profiles                            | `App.tsx`, source assets/catalog                                       | Replace identity and assets. Do not migrate family imagery or names.                                |
| Types/catalog validation                                       | `packages/types`, `packages/catalog`                                   | Reuse web contracts as appropriate; extend tenant and date-precision fields.                        |
| Cloudflare Stream media provider                               | `packages/media`                                                       | Reusable provider interface and signed-playback behavior; never copy credentials.                   |
| Source API authentication                                      | `services/api/src/app.ts`                                              | Replace single-archive admin/device bearer model with tenant-aware accounts and sessions.           |
| D1 catalog/progress repositories                               | `services/api/src/d1-repositories.ts`                                  | Useful reference; existing SQL has no tenant boundary and cannot be reused unchanged.               |
| R2 artwork storage                                             | `services/api/src/r2-artwork.ts`                                       | Reuse bounded streaming/range principles; add tenant ownership and private access.                  |
| Importer                                                       | `tools/video-importer`                                                 | Reference for source-preserving processing; do not copy manifests, local paths or personal content. |
| New admin, onboarding and ten feature areas                    | absent from current browser app                                        | Implement in target.                                                                                |
| Native iPhone/tvOS and desktop shell                           | `apps/apple-tv`, `apps/tv/native-tv`, `apps/tv/mobile`, `apps/desktop` | Deliberately excluded.                                                                              |

## Backend and storage findings

The source includes Cloudflare Worker adapters in `services/api`, D1 migration `infra/d1/migrations/0001_initial.sql`, R2 artwork handling and a Stream provider. The checked-in Worker configuration uses placeholder database identifiers. These source adapters are distinct from the browser's hardcoded Movies API; their presence is not proof they are provisioned or serve the current browser.

The source schema models users, devices, profiles, people, places, videos, tags, collections, home rails, progress, watchlists, playback events, imports, conversions, settings, webhook receipts and rate-limit buckets. It has no tenant column. Authentication accepts one admin token or approved device token. Any approved device can request a media asset ID directly; adapting that endpoint without verifying catalog ownership would create an object-level authorisation flaw. Target access must begin with authenticated tenant membership, then resolve and authorise the underlying video.

The Stream provider creates uploads requiring signed URLs, maps processing statuses, issues one-hour playback tokens and obtains provider thumbnails at a selected timestamp. `apps/tv/src/media.ts` already distinguishes a watch page from media, converting supported Cloudflare watch/iframe URLs to HLS manifests when direct seeking is needed.

## Build, tests and PWA

The source uses Node 22.13–24, Yarn Classic workspaces and exact dependency versions. Its `build:web` prepares content, typechecks the web project and runs Vite. Root `test` includes unrelated native/desktop/importer concerns; it must not be copied as the target test runner unchanged. Browser tests cover navigation, responsive widths, profiles, details, exact playback selection, watched state, collections, autoplay fallbacks and Play Next. Unit suites exist for the viewer, navigation, shared storage, catalog, types, media providers, D1 and API adapters.

Source PWA support consists of install metadata and icons in `apps/tv/public/site.webmanifest`, browser app metadata and security headers. No offline service worker was found in the inspected web implementation. Source manifest, icons, canonical/social metadata, CSP production origins and build icon plugin are brand-specific and require replacement.

## Migration exclusions and provenance

Do not copy `.git`, `.env`, production data, catalog JSON, artwork, audio, importer manifests, user records, credentials, root family logos, native projects, desktop shells, compiled output or source deployment configuration. The provided design screenshots are reference inputs only and must not be shipped as interface backgrounds or production imagery.

No source license file was found. This target preserves provenance here and in source attribution; the owner must confirm distribution rights and dependency notices before commercial distribution. This audit does not grant a license or assert rights to family assets.
