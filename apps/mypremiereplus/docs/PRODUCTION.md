# Production integrations and release work

This project is a local implementation. Production deployment, live Cloudflare changes and pushes are outside the authorised execution scope. No source production resource should be reused implicitly.

## Cloudflare services

Create a separate MyPremierePlus project and environment. The local Node HTTP/SQLite/filesystem adapter needs a Workers-compatible implementation using D1 and private R2, or an independently secured Node deployment. The local schema provides a starting point, not evidence that remote migrations or bindings have been applied.

Cloudflare Stream direct uploads must be created server-side with signed playback required. Verify webhook signatures and age, make updates idempotent, associate every asset with its owning tenant, and publish only when the provider confirms readiness. Obtain playback tokens after account, tenant, visibility and release checks. Never expose administrative tokens through Vite variables. Provider thumbnails are the supported fallback when a cross-origin video cannot be captured to canvas.

The supplied demonstration stream is publicly reachable and cannot prove privacy for customer media. All demo titles intentionally reference that single stream. Replace it with tenant-owned, signed assets before accepting real family material.

R2 buckets must remain private. Asset retrieval should resolve the asset owner and authorised referencing record, prevent cross-tenant reads, stream bounded content, and use safe content types and private caching. Keep originals only under an explicit original-preservation policy; an encoded Stream download is not an original backup. Add retention, deletion, disaster recovery, malware scanning and storage quotas before accepting public uploads.

## Identity and access

Replace known local demo passwords and local identity assumptions with a reviewed production account flow. Required release work includes secure identity verification, account recovery, transport security, password policy or managed identity, session expiry and revocation, CSRF/origin enforcement, rate limits, audit retention, invitations and ownership-transfer verification. Confirm tenant membership on every request and test direct access to all subordinate resources.

Local browser pairing has hashed, five-minute, single-use codes and account-bound revocable devices. Its public start/poll/redemption routes are disabled outside demo mode. Connect these screens to the production identity provider and validate rate limits across instances before enabling production pairing. The in-memory attempt limiter is intended for one local server, not a distributed abuse-control service.

Account and billing screens currently use local records. Subscription preferences and downloadable invoices are explicitly fictional demonstrations, with no payment, tax-document, payment-method update or external subscription action implied. Integrate and verify an actual billing provider before using these screens for real customers. Billing details and invoice access must remain restricted to the owning archive's owner.

Do not treat a cosmetic profile or a participant list as an account permission. Validate gathering restrictions, selected-member visibility, token expiry/use limits and release schedules on the server. Exporting, restoring and permanently deleting private records need the same tenant boundary as normal browsing.

## Optional AI and transcription

Unconfigured cover generation returns explicitly identified demonstration previews. A production image adapter needs server-side credentials, provider selection, consent, limits/cost disclosure, content checks, job status and safe output persistence. Do not send private uploads to an image service silently.

Automatic transcription similarly needs an explicit provider and cost/consent settings. Manual subtitle/transcript workflows must remain available. Do not seed fabricated dialogue or present manual entries as extracted speech. Verify subtitle timestamp parsing, duration limits and per-video visibility.

## Product and operational limits

Shared programme polling coordinates queue state, not tightly synchronised video playback across households. Scheduled premieres gate access using server time; the UI must describe this distinction accurately.

Before commercial release, complete provider integration tests, deployment configuration, backups and recovery drills, monitoring, cross-browser playback/accessibility checks, performance/load tests, dependency review and source licensing/attribution review. No source license file was found. Default artwork and fixtures must be non-personal and properly licensed. Billing, subscription enforcement, email delivery and production notifications require separate service integration and verification.

The ten bundled font families carry their upstream OFL notices under `public/fonts/`. Preserve those notices and the recorded asset provenance when distributing or subsetting fonts.

Actual verification results and any incomplete requested workflows are recorded in [ACCEPTANCE.md](ACCEPTANCE.md). Do not infer production readiness from a local build or demonstration.
