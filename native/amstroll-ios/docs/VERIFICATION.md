# Verification record

## Explore redesign — 14 November 2026

- Built and ran the SwiftUI app in Xcode on the iPhone 18 Pro Simulator. The UI journey checks cover the 47-minute planner, appending more outings, returning to the opened outing, and saving a journal note after skipping a stop and finishing.
- Ran the Foundation planning tests and the app’s planning, persistence and provider tests. The bundled guide tests exercise time feasibility and preserving the original finish during active progress.
- Captured Explore, the clock, results, outing detail, progress, Saved and Journal in the simulator. Also captured Explore and the planner with Accessibility Large text and Increase Contrast enabled and inspected their layout.
- Physical-device checks, signing and distribution are separate. Manual VoiceOver, Reduce Motion and Reduce Transparency on iOS remain to be verified.

## Initial preparation — 4 November 2026

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

## Pending at initial preparation

- Foundation Swift package parity and persistence tests (`swift test`).
- Xcode app compilation, unit/provider tests and UI journey tests.
- Seven native screenshot scene captures, screenshot export and visual overlays.
- Device checks for VoiceOver, Dynamic Type, Reduce Motion, location permissions and PhotosPicker.
- Native API/MapKit execution, signing, archive validation and installation on a physical iPhone.

## Owner/release work

Complete `AppStore/RELEASE-CHECKLIST.md`, including the legal identity, final public policy URLs, privacy/provider declarations, signing identity and explicit upload/submission approval. The local simulator build has no distribution signing.
