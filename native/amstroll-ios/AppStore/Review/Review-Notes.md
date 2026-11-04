# App Review notes — draft

Amstroll is an account-free, local-first Amsterdam outing app. It is a native SwiftUI implementation with an offline authored catalogue, local Saved/Journal data, manual outing progress and live nearby discovery with checked walking routes. There is no login, subscription or purchase to unlock the core experience.

## Reviewer journey

1. Open the app. A brief first-launch welcome fades into a selection sheet for time, mood, start, effort, budget and finish. Release starts with the user's own empty local Saved/Journal state; it does not pretend a fictional account or memories belong to the user.
2. Select Sources and explicitly choose Amsterdam collection for a deterministic offline path.
3. Keep 47 minutes, Amsterdam Centraal and walking, or change preferences. The app displays estimates and eligibility.
4. Open a fitting authored plan. Inspect total time, walking effort, spending and the timeline. Start the sample only when eligible.
5. Complete or skip a stop. Finish early if desired. Add an optional note and a photo through the system picker.
6. Open Saved and Journal, then relaunch to inspect local persistence.
7. Return to Nearby places with a network connection. Public data and Apple Maps listings are shortlisted by mood and category. Up to five suggestions fit calculated walking legs, an estimated visit and a five-minute buffer. Distinct licensed place photographs appear where available; photo-less places use text cards. Provider failures and partial coverage remain visible.
8. Decline foreground location permission and choose a manual area. The core remains usable.

## Data and provider qualifications

Nearby places combines open data with Apple Maps, not an "open now" filter. Dynamic source results are not presented as verified itineraries. Authored travel, visit and spending allowances are planning estimates. GVB/NS buttons open official planners; they are not live departures. The municipal inventory shows stops, not services running now. No paid Google integration or additional provider subscription is used. Public endpoints can be unavailable; unconfirmed walking routes are excluded from the nearby selection.

Journal notes and selected photos are not uploaded. Current location is requested only on explicit use, with no background tracking. Public requests may transmit selected coordinates to providers. Photo and font licences are accessible in the app.

## Before submission

Run the Mac build, tests, actual screenshot capture and device checks. Confirm public privacy/support URLs and privacy-label answers. Verify every instruction above matches the release. Enter a real review contact in App Store Connect. These notes are preparation material, not a claim that a build was tested, uploaded or approved.

## Local distribution export (Mac, after signing is configured)

The example ExportOptions.plist.example deliberately contains a placeholder team ID and `destination=export`. Copy it to Build/ExportOptions.plist, replace the team ID with the owner's real registered value, and verify the current `xcodebuild -help` export options for the chosen Xcode. Then:

```sh
xcodebuild -exportArchive \
  -archivePath Build/Amstroll.xcarchive \
  -exportOptionsPlist Build/ExportOptions.plist \
  -exportPath Build/Export
```

This is a local distribution export, not an upload or submission. The script/template has not been run here; no .ipa is present. TestFlight upload and App Review submission require separate owner authorization, a valid distribution account and completion of all release checklist items.
