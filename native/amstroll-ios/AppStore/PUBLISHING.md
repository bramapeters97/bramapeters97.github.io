# Publish Amstroll on the App Store

Updated 5 November 2026. TestFlight availability does not automatically publish the app. No physical iPhone is required to upload a distribution-signed archive.

## Prepare the release

1. Test the release flow from Explore through the planner, suggestions and walking map. Exercise Saved, Journal, denied location, offline routing and larger text.
2. Increase the build number beyond the most recently uploaded build. Keep the version aligned with the App Store version you plan to release.
3. Select **Any iOS Device (arm64)** and choose **Product → Archive**, or run `bash scripts/archive-on-mac.sh` from the native project directory. Release for iOS devices uses the `Amstroll App Store` profile and Apple Distribution signing. If two valid identities have the same name, put `AMSTROLL_DISTRIBUTION_CERTIFICATE = <matching SHA-1 fingerprint>` in the ignored `Signing.local.xcconfig`. The fingerprint must correspond to a certificate included in the provisioning profile.
4. In Organizer, select the archive and choose **Validate App**, then **Distribute App → TestFlight & App Store**. For an exported App Store Connect IPA, you can use Transporter instead. Wait for Apple to process the build, then answer the applicable export-compliance questions in TestFlight.

## Screenshots

Capture the real release UI with Simulator. The repository capture script runs seven native UI scenes and strips PNG transparency without resizing. It must run on a Mac with Xcode:

```sh
bash scripts/capture-screenshots.sh YOUR_SIMULATOR_UDID
```

Apple currently requires at least one iPhone Dynamic Island medium-display screenshot; accepted portrait sizes include 1179×2556 and 1206×2622. Supply 1–10 PNG/JPEG images per device size with no alpha channel. Amstroll is iPhone-only, so an iPad set is not needed. Check the current upload slots before submission: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

Suggested order: selection criteria, home, suggestions, route/detail, saved ideas, journal. Screenshots of the offline collection must keep the app's sample/estimate labels visible. Don't use a generated interface, claim real-time prices/opening hours, or advertise a Google rating integration. The existing demo screenshots use isolated sample content, not personal data. Live route screenshots should show the actually calculated path.

## Complete the App Store Connect listing

Open My Apps → Amstroll → the iOS version under Distribution. Attach the processed build. Fill in:

- App name, subtitle, description, keywords, primary category and copyright.
- Screenshots for the requested display sizes and languages. Preview video is optional.
- Working public support and privacy-policy URLs. The bundled policy is still marked as a draft; finalize controller/contact details and publish it before review.
- Pricing (Free), countries/regions and release method. Choose manual release if you want to control launch day.
- Age-rating questions, content rights and applicable EU trader information.
- App Privacy answers reflecting coordinates sent to public data providers and Apple Maps. “No account” does not mean network requests are anonymous or entirely on-device. Review provider retention, not just SDK presence.
- Export-compliance answers matching the implementation; respond to Apple's questionnaire rather than guessing.
- App Review contact details and notes. Explain the Amsterdam-only coverage, no-login flow, estimated visit allowances, offline collection, and how to select a starting area without location permission. No review login is needed.

Store text drafts and review worksheets already live under AppStore. Review them against the final build; none are proof of publication or approval.

## Submit and release

Save the version, choose Add for Review, then submit the review submission. Respond to any messages in App Review. If approved with manual release selected, choose Release This Version. Apple controls processing, review and availability timing.

Official guides: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app and https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/
