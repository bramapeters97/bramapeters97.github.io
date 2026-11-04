# Bram Peters Studio for iPhone

A standalone SwiftUI portfolio app using this website's actual content and images. It has native Portfolio, About, and Request tabs, category filtering and search, offline case-study text and galleries, full-screen image sheets, system sharing and external links. The existing website and deployment remain independent.

## Open and run on a Mac

Requires **Xcode 16 or newer** and **iOS 17 or newer**. The deployment target allows native NavigationStack, accessibility, system sheets and modern SwiftUI forms without third-party dependencies. Typography uses Apple's system font, matching the website's SF/system-font direction; no third-party font redistribution is needed.

1. Open `ios-app/Portfolio.xcodeproj` in Xcode and select the shared **Portfolio** scheme.
2. For a simulator, select an installed iPhone simulator and Run. No signing team or paid account is needed for simulator builds.
3. For your iPhone, select the **Portfolio** target → Signing & Capabilities, choose your Apple development team, and change `com.brampeters.studio` to a bundle identifier you control if needed. Use your own signing identity; none is embedded here. Set the unit-test target's identifier consistently if you change it.
4. Choose the connected device, enable Developer Mode if required, and Run. The app needs no API keys, server, runtime package install, or credentials.

From the repository root, build for a generic simulator without depending on a particular installed device name:

```sh
xcodebuild -project ios-app/Portfolio.xcodeproj -scheme Portfolio \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios-app/DerivedData CODE_SIGNING_ALLOWED=NO build
```

To run unit tests, list the destinations and use a simulator ID available on your Mac:

```sh
xcodebuild -project ios-app/Portfolio.xcodeproj -scheme Portfolio -showdestinations
xcodebuild -project ios-app/Portfolio.xcodeproj -scheme Portfolio \
  -destination 'platform=iOS Simulator,id=YOUR_SIMULATOR_ID' \
  -derivedDataPath ios-app/DerivedData CODE_SIGNING_ALLOWED=NO test
```

The hosted XCTest target covers request validation, preserving long email content, rejecting unsafe link schemes, local draft restoration and deletion, and decoding the actual app bundle with its cover assets. All sources and resources are explicitly referenced by the project. `Resources` is copied as a folder so generated media paths remain stable; the AppIcon asset catalog is compiled separately.

## Content and updates

The repository is authoritative. `scripts/import_content.py` reads `../index.html`, local case-study pages and the existing contact flow. It generates `Portfolio/Resources/portfolio.json` and optimized copies in `Portfolio/Resources/Media/`, preserving homepage order, categories, project descriptions, available case-study narrative, image galleries and external links. Website originals are never changed. Embedded videos, interactive demos and other web-only media remain links to the existing online destinations; the app does not attempt to embed those runtimes.

There is no existing public portfolio feed or submission backend in this site. **The app does not fetch live content.** Offline bundled content changes only when you regenerate it, rebuild and distribute a new app version. External websites, résumé links and online demos require a connection after the user opens them.

From the repository root, with Python 3 and Pillow installed:

```sh
python3 -m pip install -r ios-app/scripts/requirements.txt
python3 ios-app/scripts/import_content.py
python3 ios-app/scripts/import_content.py --check
python3 -m unittest discover -s ios-app/scripts -p 'test_*.py'
```

Regenerate after changing project cards, case studies, contact services, biography, résumé location, portrait or branding. Commit the generated JSON and mobile image/icon assets with the content changes. Read the importer's output for skipped or missing media. No website runtime runs in the app.

`ContentStore` decodes the versioned bundle into typed models and exposes a recoverable error screen if the bundle is missing or invalid. Missing images get labeled placeholders. HTTP/HTTPS links open through the operating system; local and executable URL schemes are rejected.

## Requests and email

The importer obtains `bramapeters@outlook.com` from the existing website contact flow and imports the service choices. The app validates name, email, service selection and message before preparing a plain-text request. An optional portfolio reference carries through from project details.

On a device configured for Apple Mail, **Prepare email** opens `MFMailComposeViewController`. Users review and explicitly send from Mail. The app reports Mail's result accurately: accepting an email for sending does not confirm delivery. It does not claim server-side submission or delivery success.

When Mail is unavailable (including many simulators), the complete prepared email is shown with recipient and subject, plus **Copy email** and the native share sheet. Nothing is sent automatically. Copy/share preserves long requests without relying on URL length limits. Users can paste the request into their chosen email app and send it to the displayed address.

Form drafts are stored locally in the app sandbox using UserDefaults and restored after relaunch. They remain after composing or sharing so cancellations cannot destroy the request. **Discard saved draft** removes the app's stored copy after confirmation. A separate Mail draft, a sent email, clipboard contents or a copy shared to another app is managed by that app or the system and is not deleted by this control. Device backups can contain app data.

## Brand, icon and accessibility

The icon catalog is generated from the website's current homepage icon, fitted to a valid opaque square. It uses existing brand artwork rather than a new identity. The current source, `favicon_portfolio/favicon.png`, is only 237×244 pixels, so replace it with higher-resolution flat artwork before release for a sharper icon. Inspect the generated 1024×1024 icon before App Store submission; replacing the source icon and rerunning the importer updates it. Image provenance and import limitations are recorded in `Portfolio/Resources/asset-provenance.json` and `import-notes.json`.

The UI uses native navigation, toolbars, forms, pickers, sheets and sharing. Semantic text sizes, adaptive light/dark colors, VoiceOver names, minimum 44-point actions, safe-area layouts and selectable body text support accessibility. There are no custom motion effects or animations in the app; native system transitions follow accessibility preferences. Test the largest Dynamic Type sizes, VoiceOver, dark mode, landscape and Reduce Motion on an actual device before release.

## Privacy and release setup

- Browsing bundled content makes no network requests, uses no analytics, and requests no camera, photo library, microphone, tracking, motion or location permission.
- Names, email addresses and messages stay in local app storage until the user chooses Mail, Copy or Share. The privacy manifest declares app-scoped UserDefaults access under `CA92.1` and no tracking or automatic collected-data categories.
- External websites have their own policies. Email is processed by the mail provider and recipient; review how your business retains and responds to enquiries before publishing. Confirm the contact address is still correct by regenerating from the website.
- Before an App Store release, configure your own bundle ID/team, version/build numbers, App Store listing, support URL and public privacy-policy URL. Review the bundled website copy, image rights, icon, accessibility and privacy answers for the final shipped behavior. Shipping the repository is not an App Store submission.

## Verification in this environment

The content importer and its focused Python tests can run on Linux. JSON, image/icon assets, Info.plist, privacy manifest, scheme XML and project resource references can be inspected without Xcode.

**This environment has no Xcode, iOS SDK, Swift compiler, or iPhone simulator. No iOS build, XCTest run, simulator inspection or device test was performed here.** Use the Mac commands above to build and run before distributing the app. In particular, test Mail with a configured account and the copy/share fallback on a device without Mail; simulators cannot establish real mail delivery.
