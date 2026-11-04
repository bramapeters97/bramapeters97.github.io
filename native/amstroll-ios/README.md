# Amstroll for iPhone — native source and release preparation

This folder is a standalone SwiftUI iPhone project, with the original Amstroll identity, catalogue, licensed photos/fonts, planning rules and local-first outing journey. It contains no web wrapper and does not need the portfolio repository at runtime. Copy this entire folder to a Mac to continue verification.

**Environment boundary:** source/resources/project preparation was performed on Windows, without Swift, Xcode or an iOS Simulator. A checked-in project and tests are supplied; native compilation, screenshots, device accessibility checks, signing and archive validation are **not yet performed**. No `.ipa`, uploaded build or App Store approval is claimed.

## Open and test on a Mac

Install a current supported Xcode with an iOS Simulator runtime. Complete Xcode's normal first-run setup, select its command-line tools, then:

```sh
cd /path/to/amstroll-ios
xcodebuild -version
xcrun simctl list devices available
# Optional: regenerate the checked-in project after adding/removing Swift files.
node scripts/generate-project.mjs
open Amstroll.xcodeproj
# In Xcode choose the Amstroll scheme and a supported iPhone Simulator.
# Or pass an actual installed Simulator UDID:
bash scripts/test-on-mac.sh YOUR_SIMULATOR_UDID
# Foundation-only planning tests, using the included Swift package:
swift test
```

The project targets iOS 17+ and uses Apple frameworks with no runtime third-party dependencies. The upload SDK requirement is separate: use a currently accepted Xcode/SDK and recheck AppStore/RELEASE-CHECKLIST.md before release. Bundle identifier/team values in Configuration.xcconfig are configurable examples, not registered identities or credentials.

## Demo and screenshots

Release starts without a fictional account or seeded journal. Use `--demo`, or `--screenshot-mode --screenshot-scene explore` in an Xcode run scheme for isolated deterministic demo data. Supported scenes: explore, preferences, results, detail, progress, saved, journal. These modes do not establish that a production account or cloud service exists.

```sh
bash scripts/capture-screenshots.sh YOUR_SIMULATOR_UDID
```

The script runs the screenshot UI tests and exports actual native captures. There are no native screenshots in this delivery because Simulator is unavailable. See docs/SCREEN-PARITY.md for the comparison procedure and honest verification status.

## Architecture and resources

- Amstroll/App: app entry/state and screen selection.
- Amstroll/DesignSystem and Features: styled native controls and views.
- Amstroll/Models, Planning and Persistence: typed catalogue/constraints, progress and local JSON/files.
- Amstroll/Services: cancellable open-data requests, optional foreground location, context/weather, supported native routing and planner links.
- Amstroll/Resources: complete catalogue, 28 valid photo/alias assets, original fonts, logo/wordmark, app icon, attribution, privacy/help and licences.
- AmstrollTests and AmstrollUITests: planning fixtures, persistence/provider tests, a start/skip/finish/journal tap-through and seven screenshot tests.
- AppStore: metadata, legal drafts, review worksheets, icon master and release checklist.
- References: the recovered original web export and planning/provider/interface source for traceability, not bundled in the app.

The primary Amstroll files were absent from the current portfolio checkout. They were recovered read-only from Git revision 27084d4 into this folder. The website was not restored or changed. See docs/REFERENCE-AUDIT.md and Amstroll/Resources/asset-manifest.json.

The app uses local storage for preferences, saved ideas, progress and journal notes/photos. Optional Open places uses external sources and aims for 50 distinct linked photographs, displaying five at a time. Route, access and price checks remain explicit. The bundled Amsterdam collection works offline and is never silently substituted for a failed provider. No Google key, backend, analytics or advertising is included.

## Reproduce asset extraction

The committed resources are ready to build; no image-conversion dependency is required for the app. To refresh them from References/web-prototype.html, use Node and an existing installation of Sharp as a **development-only** image converter:

```sh
node scripts/extract-resources.mjs --sharp-module /absolute/path/to/sharp
node scripts/generate-planning-fixtures.mjs
node scripts/generate-project.mjs
node scripts/verify-preparation.mjs
```

The extractor preserves original vector paths, font bytes and photo source/licence metadata. It rejects tiny/invalid photo bytes, converts embedded WebP to PNG, and builds an opaque 1024px icon without rounded masking. Do not overwrite these assets with the one-byte placeholder files from the historical external photo directory.

## Archive and App Store handoff

Review AppStore/RELEASE-CHECKLIST.md. Supply your own registered identifier and signing team only when available:

```sh
export AMSTROLL_TEAM_ID=YOUR_TEAM_ID
export AMSTROLL_BUNDLE_ID=YOUR_REGISTERED_BUNDLE_ID
bash scripts/archive-on-mac.sh
```

The script creates a local archive only. Validate it in Organizer and investigate all issues. Upload/TestFlight/submission require a separate explicit owner instruction. Confirm public policy/support URLs, legal identity, age rating, provider terms, privacy labels, EU trader status and encryption answers before submission. Preparing these files does not guarantee Apple approval.

Detailed performed/pending checks: [docs/VERIFICATION.md](docs/VERIFICATION.md). Real web reference captures are in References/Screenshots/ and must not be confused with native App Store screenshots.
