# Amstroll native release checklist

Prepared 4 November 2026. This is a release preparation package, not an uploaded or approved app. Recheck linked Apple requirements immediately before submission.

## A. Included local work

- [x] Native Swift/SwiftUI source and a checked-in Xcode project/shared scheme.
- [x] Original 166-place / 104-experience / 14-start catalogue extracted from the reference.
- [x] 28 valid bundled photo assets (including aliases), source/licence manifest and original font licences.
- [x] Original logo/wordmark assets and opaque 1024×1024 app-icon PNG derived from the supplied mark.
- [x] Deterministic planning fixtures, native test sources and native screenshot capture workflow.
- [x] Draft store metadata, description, review notes, privacy/support documents and compliance worksheets.
- [x] No portfolio edits, upload, submission or private provider credentials.

## B. Requires a Mac / device

- [ ] Select a supported current Xcode and installed iOS Simulator runtime. The inspected Windows environment has neither Swift nor Xcode.
- [ ] Open Amstroll.xcodeproj; resolve any compilation issues exposed by the actual SDK.
- [ ] Run `swift test` for the Foundation planning package and `scripts/test-on-mac.sh` for app/UI tests.
- [ ] Verify each UI screen against the actual reference content, without the fake phone hardware.
- [ ] Exercise small/large iPhones, larger text, VoiceOver, Reduce Motion, denied location, no network, slow provider/images, keyboard and long content.
- [ ] Verify all native provider requests and supported MapKit routes on a device. Provider metadata and route estimates do not verify opening times, prices or disruptions.
- [ ] Capture seven actual native screenshot scenes using `scripts/capture-screenshots.sh`; inspect content and accepted dimensions. None have been fabricated or captured on Windows.
- [ ] Validate the release icon in Simulator, the installed app and the archive.
- [ ] Create and validate an archive in Xcode Organizer. Investigate privacy reports, required-reason API findings, dSYM and distribution warnings.
- [ ] Complete TestFlight testing after the owner explicitly authorizes an upload.

## C. Owner/account actions

- [ ] Confirm legal rights holder/controller and contact details; review photo/provider redistribution and attribution obligations.
- [ ] Maintain Apple Developer Program membership and App Store Connect access; accept required Apple agreements personally.
- [ ] Register a unique explicit bundle identifier; choose the signing team and provisioning. Configuration.xcconfig values are examples until verified.
- [ ] Create the App Store Connect app record, select territories, version/build, categories, age rating and release method.
- [ ] Review the dynamic catalogue for mature/alcohol content and answer the current age-rating questionnaire honestly. Do not select Kids category by default.
- [ ] Publish reviewed support/privacy documents at real public URLs, then enter those URLs in metadata and verify in-app links.
- [ ] Finalize privacy labels against actual provider collection/retention. Review the conservative precise-location manifest declaration and any required-reason APIs in the final binary.
- [ ] Assess encryption/export compliance from actual implementation. OS HTTPS does not justify blindly checking an exemption without reviewing Apple's questionnaire. Add ITSAppUsesNonExemptEncryption only after the owner confirms the applicable answer.
- [ ] Declare EU trader/non-trader status and complete verification where applicable.
- [ ] Confirm final screenshots, app description, accessibility declarations and review contact are accurate for the tested release.
- [ ] Authorize upload and submission separately. No script in this folder uploads or submits the app.

## Official requirements checked

The SDK upload minimum and deployment target are different. The project targets iOS 17+. Apple's current requirements page states Xcode 26+ and the iOS 26 SDK+ for uploads since 28 April 2026, and iOS 13+ as the deployment-target floor since 9 September 2026. Use a current supported stable Xcode; inspect scheduled requirements again on submission day. [Apple requirements](https://developer.apple.com/news/upcoming-requirements/), [submission](https://developer.apple.com/app-store/submitting/).

The current screenshot page requires an iPhone with Dynamic Island (medium-display) set, with accepted portrait dimensions including 1179×2556 and 1206×2622. It permits one to ten screenshots per device size and no transparency. Capture a matching available Simulator; verify Apple's page and App Store Connect again rather than resizing arbitrary images. This target is iPhone-only, so no iPad screenshot set is supplied. [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

The app icon is provided as a square 1024px source/master. Confirm the asset-catalog appearance variants generated by the actual Xcode and whether a layered Icon Composer asset would be beneficial; no rounded mask is baked in. [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons/), [asset-catalog configuration](https://developer.apple.com/documentation/xcode/configuring-your-app-icon).

Privacy answers must include relevant third-party handling. All-app policy links, account-free access when accounts are unnecessary, and meaningful working app functionality are covered in review guidance. [App privacy details](https://developer.apple.com/app-store/app-privacy-details/), [SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/), [review guidelines](https://developer.apple.com/app-store/review/guidelines/).

Owner declarations also include applicable [encryption/export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/) and [EU trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements). Preparing documents does not establish legal compliance or guarantee approval.
