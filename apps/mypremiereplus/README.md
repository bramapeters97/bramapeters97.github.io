# MyPremierePlus

An independent, tenant-aware family streaming web application. The viewer preserves the browser implementation from LELIBRAMBAS+; the archive administration portal adds private library management and family viewing workflows.

This checkout is for local development. Nothing in setup or the development commands provisions Cloudflare resources, deploys the app, or contacts the original family's API. Demo records are fictional. The stock-media dataset uses ten distinct approved external clips, partitioned between the three demonstration archives as four, three and three sources. Each archive rotates its own sources across eight fictional film records. The original supplied sample remains an optional fallback; existing working data changes only through the reviewed media migration described in [the media guide](demo-data/MEDIA.md).

## Run locally

Use Node.js 24 and npm. From this checkout:

```sh
npm install
npm run setup
npm run dev
```

Open `http://127.0.0.1:5173`. The local API listens on port `8787`; Vite proxies API requests. Keep the development server bound to loopback and use the same hostname throughout sign-in and pairing. The default editable database is `demo-data/mypremiereplus.db`. Uploaded files remain in ignored `.local/assets/`. Both database records and uploads survive restarts.

For one local server serving the built app, stop the development server, run `npm run build`, then `npm start`. Open `http://127.0.0.1:8787`. The start command serves `dist/` when a build exists and uses the same database. Setup, start and the API development commands read an optional `.env` file; `.env.example` lists supported settings. Keep `PORT=8787` when using `npm run dev`, because the Vite proxy targets that API port.

Demo sign-ins use the password `premiere-demo`:

| Email                | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `demo@example.test`  | Owner of the first demonstration archive |
| `other@example.test` | Owner of an isolated second archive      |
| `third@example.test` | Owner of an isolated third archive       |

The pristine fixture gives each owner a separate archive with three viewing profiles: Everyone, Alex and Sam. Archive libraries and settings are isolated from other archives. Profiles within an archive share its authorised library while keeping account/profile-scoped watchlists and progress. One SQLite database contains the three tenant archives; there is no separate database per profile. Existing working databases keep their edits and intentional profile/channel deletions when the app starts or setup runs.

The auxiliary sign-in `viewer@example.test` uses the same password and has viewer access to the first archive. It exists to exercise role restrictions; it is separate from the three owner demonstrations.

The sign-in selector reads the local demo database. Accounts added to its `accounts` table appear without restarting the app; a valid `memberships` row links an account to an archive and enables sign-in. Profiles, videos, collections and related records are loaded from that same database, rather than a fixed browser-side account list.

See [demo-data instructions](demo-data/README.md) for the schema, sanitised seed metadata, SQL editing examples and account helper. The editable `mypremiereplus.db` is the application's data source and is ignored by Git. The separate trackable `seed.db` is built from fresh fictional data and is copied only when the default working database is missing; existing working files are never replaced. `datasets.json` describes the pristine seed rather than exporting working data, and editing it does not change the app. Leave `DB_PATH` and `DATA_DIRECTORY` unset to use the default demonstration. An explicitly configured database hides the public demo-account directory and does not receive a copy of `seed.db`.

Use the viewer and management links after signing in. Create a new archive through onboarding to explore an empty customer archive. Viewing profiles change watch history and appearance; they are separate from account permissions.

Demo authentication and known sample passwords are intended for local use. Do not expose this installation as a public service.

Each demonstration archive has three published TV stations. Family TV offers numbered station cards, presets and channel up/down controls, plus a brief VHS tuning effect. Arrow Up/Down or Page Up/Down changes stations outside form fields. Opening the guide preserves the programme. Playback modes include Memory Mix, Favourite Moments and Full Films, with 30/60/120-minute or explicitly continuous sessions.

The broadcast fullscreen control expands the persistent programme surface, including its remote and exit control. Clips advance inside that surface. Devices without element fullscreen use an immersive viewport with an explicit exit action. Ordinary film playback retains its normal player and progress; returning restores the saved TV queue.

Desktop poster cards offer silent previews after a short hover or keyboard-focus delay. Previews recheck playback permission, stop when the card is left, and retain posters for reduced-motion preferences. A touch tap keeps its existing details/play action.

The local browser-code flow can link a television browser without typing a password there. Approve its short-lived code from a signed-in browser, or create a one-time code in the account screen. Codes expire after five minutes and pair as the approving account's current archive membership. This is a browser pairing demonstration, not a native TV application or production identity provider.

To try it on the default loopback server, use separate browser profiles or a private window on the same computer: choose the phone/code sign-in option in the new browser, then approve its code at `/activate` in your signed-in browser. The reverse flow starts at Account → Devices → Get a sign-in code, which you enter in the new browser. A physical phone needs a separately configured reachable private origin; its own `127.0.0.1` does not point to this computer. Connected browser devices can be revoked from Account → Devices.

Appearance settings offer ten gradient colour palettes and ten genuine self-hosted font families, alongside archive identity, icons and welcome-screen settings. Save a draft to preview it; publish when ready. Font assets, source URLs, hashes and licenses are under [public/fonts](public/fonts/README.md).

The account screen includes viewing profiles, personal details and a local demonstration plan. Owners can edit fictional billing details and download sample invoices. Illustrative pricing starts at EUR 14.99 monthly or EUR 179.88 annually for ten hours, with EUR 2.50 monthly or EUR 30 annually per started additional five-hour block. The public calculator at `/about` uses the same price rules. No payment processor is connected, no charge is made, and sample invoices are not tax invoices.

Public product information is available at `/about`; policy pages are under `/legal/`. These are clearly marked local demonstration drafts with operator details still to complete. See [legal implementation notes](docs/LEGAL.md) and the production guide before any public release.

The user-requested public studio attribution identifies MyPremierePlus as part of [Bram Peters Studio](https://bram-peters.com). This intentional branding is separate from private source-family fixtures and does not establish the service's legal operator details.

## Validate

```sh
npm test
npm run build
```

See [acceptance and verification](docs/ACCEPTANCE.md) for recorded results and remaining checks, and the [implementation report](docs/IMPLEMENTATION.md) for the migration and integration summary. A build passing does not establish playback, screenshot fidelity, production security or production readiness.

## Configuration and providers

See `.env.example` for supported local configuration, [architecture](docs/ARCHITECTURE.md) for tenant and storage boundaries, and [production integrations](docs/PRODUCTION.md) for deployment work. Do not copy source `.env` files or live credentials.

The demonstration playback source is configured centrally in `server/demo.ts`. The original `/watch` page is not used as a media file; the browser uses a supported HLS playback manifest. Playback requires network access to that externally hosted stream, which retains its own on-screen branding. Local uploaded video files use private application storage; uploading locally does not upload to Cloudflare.

Cover previews without an image-generation provider are explicitly labelled demonstration artwork. They do not call an AI service. Cloudflare provisioning, signed customer playback, live AI generation, transcription, billing and production identity require configuration and further release validation described in the production guide.

## Source and design provenance

The web viewer was extracted from source commit `50951d7ad10ce4c8a11ab9b3b0262af38cf41f27` of `bramapeters97/lelibrambas-tv`. Reused web code and migration exclusions are listed in the [repository audit](docs/AUDIT.md). No native tvOS/iPhone/Android app or Electron shell is included. The source repository remains separate and unchanged.

The images under `design-references/` guide the new administration layouts. They are not customer data, default artwork, or shipped interface screenshots. No source family photographs, production catalog or credentials should be included in distributable assets. No source license file was found; confirm distribution rights before commercial release.
