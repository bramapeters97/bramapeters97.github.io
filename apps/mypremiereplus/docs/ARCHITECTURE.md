# Architecture

## Application boundaries

MyPremierePlus has two browser experiences on one origin: the family viewer and archive administration. React, TypeScript and Vite are retained from the source web stack. `src/viewer/` contains the migrated browser implementation and established styles; reusable browser types, storage helpers and keyboard navigation live in `src/lib/`. New management components use the same authorised API and archive identity.

The local server uses Node 24 and its built-in SQLite driver. `migrations/0001_initial.sql` establishes storage; `0002_domain_tables.sql` migrates domain records into physical tables with tenant-scoped relationships. Setup seeds three fictional archives, each with a separate owner account and three viewing profiles. Default local demo storage is the editable `demo-data/mypremiereplus.db`, with private uploads in `.local/assets/`. `DB_PATH` or `DATA_DIRECTORY` selects separate private storage. Vite's development proxy connects the browser on port 5173 to the API on port 8787. This avoids requiring the original production account, a cloud database or a container to demonstrate persistent workflows.

The product name is MyPremierePlus. An archive's published identity supplies its viewer name, slogan, icon, accent and background. Settings can be edited as a draft; publication is an explicit state transition. A preview may show the draft, while ordinary viewers use published settings.

Appearance settings also select from ten named dark colour palettes and ten actual locally served font families. Variable Latin WOFF2 assets and their upstream font licenses are bundled under `public/fonts/`; choosing a font does not require contacting a third-party font CDN at runtime. Palette/font IDs are validated against server allowlists.

Public `/about` and `/legal/:slug` routes are loaded separately from authenticated archive workflows. They do not request a private session or catalogue. Pricing rules are shared between the public calculator and backend plan summaries. Policy content is explicitly marked as demonstration drafts, with release gaps recorded in `docs/LEGAL.md`.

## Persistent data

The migration separates:

- `tenants`: archive identity and settings.
- `accounts` and `memberships`: authenticated users and archive-specific roles.
- `sessions`: authenticated tenant/account context, expiry and Gathering Mode.
- Physical `videos`, `collections`, `moments`, `profiles`, `stories`, `transcripts`, `chapters`, `channels`, `programmes`, `premieres` and related domain tables: tenant-scoped JSON payloads, readable generated columns, timestamps and soft deletion.
- Relationship tables such as `video_collections`, `channel_collections`, `programme_items` and `watchlist_items`: explicit linked records rather than a separate browser-side catalogue.
- `records`: a read/write compatibility view over domain tables, preserving the earlier SQL editing contract without duplicating storage.
- `assets`: tenant-owned file metadata and private storage paths.
- `tokens`: hashed, scoped, expiring invitation/contribution capabilities.
- `progress`: tenant/account/profile/video history.
- `devices` and `device_codes`: account/membership-bound browser pairing, hashed one-time codes, expiry, consumption and revocation.

Domain primary keys include tenant and record ID. The migration retains custom JSON fields, unpublished drafts, timestamps and soft-deletion state. Generated reference columns and relationship tables enforce supported tenant-scoped foreign keys. The API additionally checks visibility, valid intervals and field semantics; raw SQL editing must preserve those rules. `demo-data/SCHEMA.md` describes the tables and compatibility view. Production scale still requires suitable search indexes, migrations and operational validation.

The `demo-data/` folder separates a trackable pristine `seed.db` from the ignored, editable `mypremiereplus.db` that the application reads. First setup copies the seed only when the default working file is missing; an existing working file receives versioned migrations without fixture reseeding, preserving intentional profile/channel deletions. A missing seed falls back to fresh fictional initialisation. Custom database paths and production mode never receive the seed-file copy. Rebuilding the seed uses an isolated fresh database and never opens or clones the working file.

`datasets.json` is sanitised readable metadata generated from that pristine seed, not an export of working accounts or activity. SQL/schema guidance describes the working tables. The application queries SQLite on each request, so committed SQL changes become visible without a server restart. Account insertion alone creates a directory entry; membership and tenant records determine whether it can sign in and which archive records it can see.

The unauthenticated account selector endpoint is restricted to the known fictional demo database, an explicit demo-fixture marker, demo mode, and a loopback connection/Host. Explicit custom databases do not expose that directory. Responses contain selector metadata only, excluding password hashes, sessions, tokens, local paths and private files. Production mode disables both the directory and demo sign-in.

## Authorisation

Tenant identity is resolved from the authenticated session and membership. Client-supplied tenant identifiers are not authority. Every private record and asset lookup must include this resolved tenant. Owner/editor checks guard management operations; viewing profile selection never grants a role.

Record-level visibility is evaluated before serialisation and before playback. Search, moments, commentary, channels, programmes and premiere access must inherit the underlying video's policy. Gathering Mode further limits content. Guessing an object ID must not bypass these checks. Guest tokens grant a bounded contribution workflow and do not create a library session.

The source's global bearer token and device pairing authentication were not migrated. Nor was its unscoped SQL schema. The local password/session implementation is a development identity system, not a claim of production identity assurance.

The new browser-code flow is independent of that source authentication. Device-start and phone-issued codes expire after five minutes, store only hashes and have bounded attempts. Approval binds the current signed-in account and archive; consumption rechecks its current membership and role, creates one device/session, and refuses reuse. Device revocation invalidates its sessions. Public pairing and redemption are disabled outside demo mode until a production identity adapter is configured.

## Playback and programme state

The migrated player resolves supported Cloudflare watch/iframe links into HLS where seeking is required, loads HLS.js only when needed, and tears down playback when leaving. Ordinary film progress is independent of Family TV queue state and shared programme history.

Saved moments and channel segments reference a source video plus start/end seconds. No source film is duplicated to create an excerpt. The queue generator in `server/queue.ts` balances candidates, attempts to avoid adjacent source repetition, and supports Memory Mix, Favourite Moments and Full Films. Active queue state is persistent; opening a menu must not produce a new mix. Visibility, publication, availability, collections and exclusions constrain the candidate set before playback.

`server/demo-media.ts` centrally allowlists ten individually reviewed stock sources with source/author/licence credits, verified durations, HTTP/content-type evidence and CORS information. The demo archive uses stock01–04, the second uses stock05–07, and the third uses stock08–10, rotating within each archive's eight film records. The three profiles in each archive share that archive's library; progress and watchlists remain account/profile-scoped in the same SQLite database. The original four-second Cloudflare sample remains an optional fallback, not a global duration assumption.

The explicit media migration changes only unchanged seed-owned source references and exact original template descriptions. Edited films, uploads, custom sources, publication changes, drafts and incompatible child intervals are preserved. Each archive records the dataset version and manifest fingerprint in settings. Existing working databases are not silently replaced. The pristine builder applies the approved registry independently and may seed different watchlists for its three profiles without modifying working preferences.

Stock playback URLs must exactly match the approved registry. Source durations bound moments and Family TV segments. Short clips still yield excerpts below the normal 30–90 second target; these samples do not prove long-film performance. Stock clips do not use the original Cloudflare video's thumbnail service: the API explicitly reports an unavailable provider frame, and browser extraction depends on the selected source's CORS permission. Real uploaded files retain their own measured duration and private asset checks. See [media evidence and application](../demo-data/MEDIA.md).

Shared Tonight's Programme state belongs to the backend. Clients observe programme updates through lightweight polling; this is shared queue coordination, not frame-synchronised watch-party playback. Premiere release checks use server time; browser countdowns are presentation only.

Family TV presents numbered station cards and a remote with presets, channel up/down, pause/resume and programme controls. Channel changes request that specific channel's authorised queue. Opening the guide or settings preserves the active queue. Its fullscreen wrapper and video node remain mounted across clips and channel requests; permission is rechecked and the existing HLS binding is reused when the actual source URL is identical. Leaving TV releases its media and only its own fullscreen surface. Unsupported element fullscreen uses a reversible immersive viewport. A brief 580 ms tracking/static transition indicates tuning; reduced-motion users get a minimal fade. Station captions fade away instead of permanently covering the footage. Three distinct stations are seeded per demonstration archive.

Poster previews wait 500 ms before requesting an authorised playback source. A global owner event stops other card previews and ambient hero/details playback. Preview media is always muted, loops within a short real interval, never writes film progress, and aborts/unloads on leave, blur or loss of visibility. Reduced-motion preferences and touch-only pointer interaction retain the poster. Watchlists persist by account and viewing profile; a watchlist entry does not confer playback permission.

Account editing is self-scoped. The billing endpoint exposes a safe plan summary to members and reserves billing details and invoice records for the owner of that archive. Demo invoices and subscription preferences are fictional local records; no payment processor is called and no charge or external subscription change occurs.

## Provider boundary

Local uploads and deterministic cover previews provide working development workflows without cloud credentials. Provider interfaces should retain the distinction between local storage, the supplied public demo stream and protected customer media. A Cloudflare production adapter must issue signed playback only after tenant/video authorisation, store private artwork/originals in tenant-scoped R2 keys, and apply upload/webhook validation.

The Node/SQLite server is a local adapter. It is not directly deployable to Workers without replacing the runtime-specific HTTP/storage layer with D1/R2-compatible adapters. See [production requirements](PRODUCTION.md).
