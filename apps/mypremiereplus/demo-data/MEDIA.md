# Approved demo media registry

`server/demo-media.ts` is the central allowlist for demo playback. The original supplied Cloudflare sample remains an optional fallback. New stock entries must be individually approved with distinct provider/source IDs, source and licence pages, author credit, checked duration, byte-length information, HTTP/content-type evidence, CORS status and the review for recognisable people. A different encoding of the same stock asset does not count as another clip.

The registry contains ten approved 1280 × 720 MP4 sources reviewed on 1 November 2026. The recorded evidence is in [Pexels research](../docs/demo-media-research-a.json) and [Mixkit research](../docs/demo-media-research-b.json). Approval here records the selected demo sources and their licence checks; it is not a guarantee of future availability or clearance of every possible third-party right. No code in the registry or migration downloads, redistributes or uploads video files.

| ID | Source and credited creator | Seconds | Licence |
| --- | --- | ---: | --- |
| `stock01` | [Ocean waves — ArtHouse Studio](https://www.pexels.com/video/aerial-view-of-ocean-waves-4631568/) | 12.436667 | [Pexels](https://www.pexels.com/license/) |
| `stock02` | [Mountain clouds — Erhan Dayı](https://www.pexels.com/video/time-lapse-of-moving-clouds-over-the-mountains-at-sunset-11998311/) | 14.25 | [Pexels](https://www.pexels.com/license/) |
| `stock03` | [Waterfall — Ambient_Nature_ Atmosphere](https://www.pexels.com/video/flowing-water-in-waterfall-13071923/) | 31.018333 | [Pexels](https://www.pexels.com/license/) |
| `stock04` | [Forest — Cristina Verceles](https://www.pexels.com/video/a-footage-of-a-forest-5367420/) | 14.933333 | [Pexels](https://www.pexels.com/license/) |
| `stock05` | [Placid lake — Mehmet Ali Turan](https://www.pexels.com/video/scenic-view-of-a-placid-lake-5511816/) | 15.486667 | [Pexels](https://www.pexels.com/license/) |
| `stock06` | [Alps — @dubassy](https://mixkit.co/free-stock-video/mountainous-area-in-the-alps-4132/) | 15.8 | [Mixkit Free](https://mixkit.co/license/modal/videoFree/) |
| `stock07` | [Turquoise bay — @marcolopez](https://mixkit.co/free-stock-video/turquoise-blue-water-bay-from-above-5008/) | 15.098417 | [Mixkit Free](https://mixkit.co/license/modal/videoFree/) |
| `stock08` | [Woodland waterfall — @marcolopez](https://mixkit.co/free-stock-video/waterfall-in-woods-2212/) | 15.056708 | [Mixkit Free](https://mixkit.co/license/modal/videoFree/) |
| `stock09` | [Countryside meadow — @dubassy](https://mixkit.co/free-stock-video/countryside-meadow-4075/) | 23.12 | [Mixkit Free](https://mixkit.co/license/modal/videoFree/) |
| `stock10` | [Night traffic — @franklandgrave](https://mixkit.co/free-stock-video/aerial-view-of-city-traffic-at-night-11/) | 12.5125 | [Mixkit Free](https://mixkit.co/license/modal/videoFree/) |

Each URL returned HTTP 200 to HEAD and 206 to a byte-range request with `video/mp4`. Pexels durations were read from the selected file's MP4 metadata; Mixkit durations were observed through the browser's video metadata. All five Pexels sources returned CORS `*`. Mixkit CORS remains unknown, so its native playback does not enable anonymous canvas capture. Multiple actual video frames were inspected per source; no recognisable people or obvious branding were observed in those samples. This was not an exhaustive frame-by-frame audit. A candidate containing people and another showing a prominent logo were rejected.

The licences allow use in projects subject to their terms. This app does not offer a stock download library, standalone resale or an ownership/endorsement claim. Public URL access does not promise a permanent CDN or hotlink service. Browser playback sends requests to the source provider. The registry stores the exact uncredentialed URLs and preserves source credits for review.

## Archive allocation

The completed ten-clip dataset partitions sources between archives:

| Archive ID | Stock IDs | Seed film records |
| --- | --- | --- |
| `demo` | `stock01`–`stock04` | Rotate within those four sources |
| `other` | `stock05`–`stock07` | Rotate within those three sources |
| `third` | `stock08`–`stock10` | Rotate within those three sources |

All three archives live in the same SQLite database. Memberships and tenant-scoped records isolate them. Viewing profiles share their archive's authorised library; each profile does not receive a separate database.

## Applied dataset

The approved `stock-v1` migration was applied on 1 November 2026. The editable working database contains 22 migrated films using all ten sources. `demo-video-7` and `demo-video-8` retain their exact pre-migration rows because they were edited. Those two keep the original fallback. The pristine `seed.db` was independently regenerated from fresh fictional data with all 24 films migrated, ten sources, nine profiles and nine profile-specific watchlists. The readable `datasets.json` describes this pristine seed.

Both files passed SQLite integrity checks with zero foreign-key violations. A before/after comparison confirmed that every unrelated working table, including sessions, tokens, progress, queues, history and watchlists, remained unchanged. Film recording metadata, publication state and timestamps were preserved. Nine untouched seeded moment descriptions were corrected to remove the obsolete shared-four-second wording; their intervals stayed unchanged. The pristine seed has zero runtime sessions, device codes, tokens, activity, uploads, contributions or private assets.

Manifest SHA-256: `8ebb80b0121b89e84c9da947f8afd1e51f888e2394f48aaad588e80cec692a58`. The online SQLite backup and detailed comparison report are kept under ignored `.local/qa-backups/`; they are not distributable fixtures. No working file was reset or replaced by the pristine seed.

## Explicit application

After all ten entries have been verified and approved, inspect the read-only plan:

```powershell
npx tsx scripts/apply-demo-media.ts --database demo-data/mypremiereplus.db
```

Applying requires an additional explicit flag:

```powershell
npx tsx scripts/apply-demo-media.ts --database demo-data/mypremiereplus.db --apply
```

The migration recognises the 24 original seeded film IDs and compares their source, metadata, publication state, artwork, timestamps, draft and edit history. Edited, uploaded, custom, deleted and otherwise changed films are skipped. Existing moments, chapters and transcript boundaries must fit the replacement duration. The migration preserves recording metadata, publishing state, collections, user viewing state, time boundaries and timestamps. Only migrated default films receive a sample-source description. Moment rows are never rewritten, including direct SQL edits that leave timestamps unchanged; obsolete template wording is normalised only for display.

Each archive gets a `settings` record named `demo-media-stock-v1`, including the dataset version, approved manifest fingerprint, applied film/source IDs and skipped records. Repeating the same migration does not replace its already migrated films. A changed dataset requires a newly reviewed migration rather than silently changing an existing approved source.

To regenerate the separate pristine fixture after approval, use `scripts/build-seed.ts`. It applies the approved registry to a fresh isolated seed and never clones or replaces the editable working database. The readable `datasets.json` remains sanitised seed metadata.

## Playback and frames

The API returns a stock URL only when it exactly matches an approved registry entry and the authenticated account may access the underlying film. The response identifies `provider: demo-stock`. Unregistered demo URLs are rejected. Existing private local-file access and the original fallback retain their separate checks.

Stock clips do not use the original Cloudflare video's thumbnail service. Their thumbnail response explicitly says the provider frame is unavailable and returns the current cover as a fallback. Browser frame extraction may be attempted only when the selected stock source permits it through CORS; otherwise the owner can upload a cover. The API does not claim a fallback cover is a captured frame.

`GET /api/demo/media` returns source, author, licence and verification credits for stock sources used by the current account's visible films. It does not expose other archives' private film metadata or any administrative API credentials. Raw-video download controls are not part of this demo feature.
