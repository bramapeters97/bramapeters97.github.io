# Reference audit

## Source recovery

At implementation time the current portfolio checkout no longer contained amstroll.html or projects/amstroll/portfolio-embed/index.html. Git history still contained the user's Amstroll work. The reference was recovered read-only from revision 27084d4 into References/web-prototype.html; no website page was restored or modified. References/source.json records provenance. The extracted resource manifest records the prototype SHA-256. The original development source also remains separately available in the user's Documents/Codex project, but this app does not depend on that path.

The recovered self-contained export has seven scripts: embed setup, assets, catalogue, planning domain, providers, browser state and interface. The catalogue exports 166 real place entries, 104 authored experiences and 14 Amsterdam starts. All model values, original IDs, source links and planning fixtures derive from those scripts rather than the marketing copy.

## Screens and behaviour

Explore includes photography, glass wordmark/profile header, time slider/presets/exact editor, moods, start/end, walking, budget and transport preferences. Open places is default: target 50 distinct licensed photographs, five shuffled results, then More of these. It is not an open-now assertion. The offline collection retains twenty suggestions with eligibility states. Detail separates time, walking and spending; progress is manual; stop skip, finish early and optional note/photo lead to a local journal. Saved, source/location/preferences sheets, photo credits and local reset complete the journey.

The web fake phone, fake status bar/Dynamic Island/home indicator are presentation furniture. Native views intentionally use actual iPhone safe areas and system chrome.

## Assets and design

Fonts: PlusJakartaSans-Regular and DMSans-9ptRegular, verified from their TrueType name tables. Source files and complete OFL notices are bundled. Logo/wordmark SVGs are original green bridge-like A with detour crossbar/yellow endpoint and vector lettering. No existing raster app icon was present in the inspected export, so a 1024px opaque icon was derived from those vector paths.

Several external photo files were one-byte placeholders. The embedded WebP data was decoded, validated and converted to PNG. Every image/alias has metadata in photos.json and asset-manifest.json, preserving original attribution and noting format conversion. Live-place photos must remain associated with the provider place, not borrowed from these area assets.

Paper #F7F4EF, card #FFFDF9, ink #26342D, forest #31564B, muted #5B6A61, sage #A5B6A1, pale sage #E7EDE2, butter #F1D98A, apricot #E7B7A2, mist #BBCDD7, line #E4E5DD. Approximate radii: cards24, time28, controls15–16, glass header21. Native code implements these tokens; measured native visual comparison remains a Mac task.

## Source boundaries

Authored travel/duration/spending allowances are estimates. Open sources supply candidates, not confirmed prices/openings or itineraries. Municipal TRAMMETRO_PUNTEN_2026 data is stop inventory. GVB/NS buttons open planners. Private Google integration is unconfigured. Native route checks must remain separately attributed and cannot imply live transit or fare verification.

## Verification scope

This environment is Windows without Swift/Xcode. Resource and project preparation checks can run here; native compilation, UI tests, accessibility/device verification, native screenshots and visual overlays remain unperformed. Do not interpret prepared SwiftUI code or screenshot tests as proof of pixel parity or App Store readiness.
