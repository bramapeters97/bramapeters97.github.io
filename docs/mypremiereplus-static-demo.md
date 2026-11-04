# MyPremiere+ static demos

Prepared and locally verified on 4 November 2026. These additions are unpublished.

## Files and architecture

- `mypremiereplus/index.html`: buildless launcher for the three viewing contexts.
- `mypremiereplus.html`: complete case study, using the existing portfolio styles and navbar. No MyPremiere+ link was added to the navbar or homepage.
- `apps/mypremiereplus/ios/`, `ipad/`, `tvos/`: new platform HTML/CSS/JavaScript entries. Existing full-application files in their parent folder were preserved.
- `assets/mypremiereplus/demo.js`: small, purpose-built six-title fixture, optional saved/progress state and a shared modal player.
- `assets/mypremiereplus/demo.css`: player styles. Other new CSS is scoped to the launcher, case study or individual demo.
- `assets/mypremiereplus/artwork/`, `media/`, `screenshots/`: allowlisted illustrations, one local sample and captures of these demos. See `assets/mypremiereplus/ASSETS.md`.

The demos load directly into one fictional Everyone viewer in The Sunday Cinema. They support home/library/search, category filters, details, saved titles, local playback progress and reset. They contain no account registration, account switching, authentication, upload, archive administration, pairing, billing or API code. Their module graph has no dependency on the full application's database, services, source, mock authentication or tenant store.

Viewing state uses only `mpp:public-demo:<platform>:v1` in browser localStorage. Each platform is independent. Blocked/unavailable browser storage falls back to in-memory state. There is no cross-device sync. Browser code is public and inspectable; no protection claim relies on minification.

## Preview and intended routes

From the portfolio repository root, with Node 24:

```powershell
node scripts/preview-mypremiereplus.mjs
```

Open `http://127.0.0.1:5184/mypremiereplus/`. Stop the preview with Ctrl+C. No dependency installation or build is required. The loopback preview is read-only, supports media byte ranges and restricts application serving to the three new demo folders. These preview restrictions do not configure GitHub Pages.

Intended public routes after a separately approved publication:

- `https://bram-peters.com/mypremiereplus/`
- `https://bram-peters.com/apps/mypremiereplus/ios/`
- `https://bram-peters.com/apps/mypremiereplus/ipad/`
- `https://bram-peters.com/apps/mypremiereplus/tvos/`
- `https://bram-peters.com/mypremiereplus.html`

The launcher uses a directory index; the case study is a separate `.html` file. The local preview redirects `/mypremiereplus` to `/mypremiereplus/`. Live Pages redirect/extensionless precedence was not verified or changed. Use the explicit trailing-slash launcher and explicit `.html` case-study links. All prototype destinations are directory entries, without history-routing rewrites.

## Verification

Dependency-free targeted artifact checks:

```powershell
node scripts/check-mypremiereplus.mjs
```

Browser checks require a running preview, an existing Playwright installation and installed Microsoft Edge. No package manifest, lockfile or browser installation was changed for this task. Supply the absolute path to an available Playwright `index.mjs`:

```powershell
node scripts/check-mypremiereplus-browser.mjs <path-to-playwright-index.mjs>
```

Append `--capture` to explicitly regenerate the three portfolio screenshots from fresh demo state. Other QA captures are written to the operating system's temporary directory, outside the repository.

Passed in headless desktop Edge through Playwright:

- All five page routes and hard refreshes; exact-cased local asset/module links.
- Six-film catalogue, category filtering, search and no-result states.
- Saving and persistence after refresh; empty saved state and reset.
- Related-title navigation with Back and focus restoration, including entry through Saved.
- Real local H.264 playback, media duration, Space pause/resume, Escape close and restored focus.
- An intentionally aborted sample request followed by the visible Retry recovery path.
- TV arrows, Enter, Back and moving from the search input into directional controls.
- No demo backend/API or external requests; no browser application exceptions.
- iPhone widths 320, 375, 393, 430 and 1440; iPad 390, 768, 820 and 1180 including portrait/landscape; TV 320, 390, 1280 and 1920.
- Launcher/article widths 320, 390, 768, 1024 and 1440; no horizontal page overflow; images and demo links.
- Exact reference navbar markup except removal of its incorrect current-page marker; mobile toggle, Escape and focus restoration; no new project entry.

Desktop demo, phone/tablet portrait, launcher and article screenshots were visually inspected. All artwork and output captures were checked as synthetic. Existing tracked file hashes were compared with the pre-work baseline; none changed. Existing untracked native work was left untouched. No dependency/native build, database, environment, private media, release output or Playwright report was added or staged.

Not tested: Safari/WebKit, Firefox, real touch hardware, VoiceOver, native iPhone/iPad/tvOS apps, Siri Remote, native player performance, production domain routing or a live GitHub Pages deployment. This work establishes browser behavior only. No original backend/native builds were run because those files were not changed.

The existing `check:portfolio` can check its current page list but does not include this new article. The existing `check:responsive` enumerates new root HTML and then reads every page from Git HEAD, so it cannot validate an untracked new article. The targeted checks cover it without changing shared tooling or staging the file. Navigation generation was not run.

## Publication concerns in the existing repository

The existing root README documents publishing `main` as a static GitHub Pages root, without running the npm build. The same tracked tree already contains the full application's `apps/mypremiereplus/server/app.ts`, `src/admin/`, migrations and fictional `demo-data/seed.db`. Preparing these new viewer-only artifacts does not remove or conceal those older files. Inspect the actual Pages publication artifact and approve any exclusions separately before publishing. This task did not perform a secrets audit of that existing application or change hosting configuration.

The alternative Docker/Caddy setup is different: `deployment/Caddyfile` proxies `/mypremiereplus` and its descendants to the original Node application, which would intercept the new launcher, while `.dockerignore` excludes `apps`, which would omit the three demos from that image. That setup needs separately authorized routing/packaging work if selected; it was not used or modified here.

No existing portfolio page, shared asset, navbar registry, homepage, full-application file, package manifest, lockfile, CNAME, workflow or deployment configuration was changed. Nothing was staged, committed, pushed, merged, uploaded, published or deployed.
