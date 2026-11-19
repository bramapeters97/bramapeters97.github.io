# Amstroll for iPhone

Amstroll is a standalone SwiftUI iPhone guide. Explore opens with Amsterdam photography and a single Plan a stroll action. The planner holds a draft for the silver clock, start and finish, and optional preferences. Suggestions append while scrolling, and Back returns to the outing in the existing feed.

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

The script runs the screenshot UI tests and exports actual native captures. The updated screens can be captured in the iPhone Simulator. The AppStore directory retains the earlier release material.

## Architecture and resources

- Amstroll/App: app entry/state and screen selection.
- Amstroll/DesignSystem and Features: styled native controls and views.
- Amstroll/Models, Planning and Persistence: typed catalogue/constraints, progress and local JSON/files.
- Amstroll/Services: cancellable open-data requests, optional foreground location, context/weather, supported native routing and planner links.
- Amstroll/Resources: bundled routes and guide photos, the original catalogue, fonts, logo, app icon and credits.
- AmstrollTests and AmstrollUITests: planning fixtures, persistence/provider tests, a start/skip/finish/journal tap-through and seven screenshot tests.
- AppStore: metadata, legal drafts, review worksheets, icon master and release checklist.
- References: the recovered original web export and planning/provider/interface source for traceability, not bundled in the app.

The default guide uses the same bundled OpenStreetMap and Valhalla walking graph as the web app. It works offline across the five supported starting areas. Unsupported crossings and transit show operator links. Step-free mode requires documented access. The original Amsterdam collection remains available with its sample estimates.

Preferences, saved ideas, active progress and journal memories stay on the device. Existing entries can still be opened. When refreshing web guide routes or photography, regenerate the native bundle and Xcode references from this directory:

```sh
node scripts/import-guide-data.mjs
node scripts/generate-project.mjs
```

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

Open `Amstroll.xcodeproj`, select the Amstroll scheme and **Any iOS Device (arm64)**, then choose **Product → Archive**. To archive from Terminal:

```sh
bash scripts/archive-on-mac.sh
```

The script saves the signed archive in Xcode Organizer’s Archives directory. Release uses the explicit team, bundle ID and App Store profile in `Configuration.xcconfig`. When the Mac has distribution certificates with identical names, `Signing.local.xcconfig` can select the certificate that the profile includes by SHA-1 fingerprint. Keep it local. Increment `AMSTROLL_BUILD_NUMBER` before each subsequent upload and use Organizer to validate and distribute. See [publishing instructions](AppStore/PUBLISHING.md) and the [release checklist](AppStore/RELEASE-CHECKLIST.md).

Detailed performed/pending checks: [docs/VERIFICATION.md](docs/VERIFICATION.md). Real web reference captures are in References/Screenshots/ and must not be confused with native App Store screenshots.
