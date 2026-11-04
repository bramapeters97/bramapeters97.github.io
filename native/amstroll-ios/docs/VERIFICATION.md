# Verification record — 4 November 2026

Prepared on Windows with Node.js. Swift, Xcode and an iOS Simulator are unavailable in this environment.

## Performed

- Ran the recovered self-contained web reference locally and exercised planning, preferences, authored suggestions, outing detail, start, skip, finish early, optional note, Saved and Journal. Real cropped **web** captures and measurements are in `References/Screenshots/`. These are not native screenshots.
- Extracted and checked 166 places, 104 authored experiences, 14 starting areas and stable identifiers. All catalogue photograph keys resolve to bundled assets.
- Checked 28 licensed image/alias PNGs against the asset manifest and their SHA-256 hashes; checked original font resources and the opaque RGB 1024px app icon.
- Generated eleven planning and three ranked-suggestion fixtures by executing the original JavaScript. These are expected results for the future Swift test run, not proof that Swift parity tests have passed.
- Generated the checked-in Xcode project and shared scheme. A strict OpenStep parser validates project-file syntax; reference checks validate source/resource/test membership and object identifiers. XML parsing checks Info.plist, the privacy manifest and shared scheme. None substitutes for `xcodebuild`.
- Ran preparation-script JavaScript syntax checks and `node scripts/verify-preparation.mjs` successfully.
- Ran the repository's `npm run check:portfolio` successfully. No tracked website files were changed; other concurrent work outside this native folder was left alone.
- Inspected sources for integration problems and corrected project dictionary terminators, bootstrap error handling, preference persistence flushing, obsolete-request cancellation, image timeouts, photo import bounds and test isolation.

## Prepared, not executed

- Foundation Swift package parity and persistence tests (`swift test`).
- Xcode app compilation, unit/provider tests and UI journey tests.
- Seven native screenshot scene captures, screenshot export and visual overlays.
- Device checks for VoiceOver, Dynamic Type, Reduce Motion, location permissions and PhotosPicker.
- Native API/MapKit execution, signing, archive validation and installation on a physical iPhone.

## Owner/release work

No build was uploaded or submitted. Native screenshots, tested visual parity and App Store approval are not claimed. Complete `AppStore/RELEASE-CHECKLIST.md`, including the legal identity, final public policy URLs, privacy/provider declarations, signing identity and explicit upload/submission approval.

Start on a Mac with the README instructions; run the tests and resolve any SDK/compiler/runtime issues before treating this as a verified release.
