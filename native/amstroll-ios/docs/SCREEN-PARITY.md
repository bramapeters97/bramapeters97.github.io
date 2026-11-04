# Screen parity and native verification

The native target copies inner application content; the web phone bezel and hardware simulation are excluded. The implementation is not a WebView wrapper.

| Reference state | Native state / screenshot scene | Verification status |
|---|---|---|
| Explore, Centraal,47min | Explore / explore | SwiftUI implemented; Simulator comparison pending |
| Exact time, starts, preferences | Native sheets / preferences | Native sheet interaction and large text pending |
| Five suggestions with eligibility | Results / results | Deterministic fixture; native screenshot pending |
| Outing detail, metrics, timeline | Detail / detail | Native screenshot and route actions pending |
| Manual completion/skip/finish | Progress / progress | Native UI and remaining-plan tests pending |
| Saved ideas | Saved / saved | Persistence/UI test execution pending |
| Optional note/photo/journal | Journal / journal | PhotosPicker, file persistence/device checks pending |
| Sources, credits, privacy/reset | Native sheets/settings | VoiceOver and permission-flow checks pending |

## Repeatable capture

Use the supplied Mac capture script and an installed Simulator matching Apple's accepted medium Dynamic Island screenshot class. The UITests launch each scene with `--screenshot-mode --screenshot-scene SCENE`, using fictional deterministic local data. This mode is isolated from the user's release data. The screenshot pipeline captures XCUIApplication screenshots and strips PNG alpha without changing dimensions or drawing mock device hardware. Raw native captures go under AppStore/Screenshots/date-time/.

Do not replace missing captures with the existing web screenshots, fabricated UI images or a marketing montage. No actual native captures exist in this Windows delivery. The results capture waits for its heading to be both present and hittable after the scheduled scroll, rather than capturing the preceding planning card.

## Visual acceptance on a Mac

1. Run References/web-prototype.html locally. Compare the **inner screen**, excluding the fake hardware; use the same time, start, preferences and corresponding collection idea.
2. Capture native scenes and note iPhone logical dimensions, scale, OS and text size. Align content coordinate systems; do not stretch images to hide spacing differences.
3. Place captures side by side, then make a 50% overlay with a normal image tool. Inspect typography, header/image fade, spacing, card metrics, radii, shadows, time slider and tab geometry.
4. Fix meaningful differences and repeat. Real status-bar/home-indicator dimensions and system sheet/keyboard behaviour are deliberate native adaptations.
5. Test 320/375/393pt-class and large iPhones where supported, then larger Dynamic Type. Accessibility reflow takes precedence over one-size pixel matching.
6. Record evidence and remaining differences here. Until this is done, visual parity is an implementation objective, not a verified result.

## Prepared interaction coverage

AmstrollJourneyTests performs a real demo tap-through: open a fitting detail, start, skip a stop, finish early, type an optional note, save it and open Journal to assert that the note appears. It uses stable control identifiers and scrolls controls into view. The seven screenshot tests remain a separate test class so the capture script exports only the intended screenshot scenes. Both suites still require execution on a Mac; their source is not a claim of passing UI behaviour.

## Reference inspection performed on Windows

The recovered web app was served locally and inspected in a browser at 430×932 CSS px. Real inner-screen reference captures are in References/Screenshots/; see that folder’s README for crop measurements. Planning, preferences, detail, start, skip, early completion, a saved QA note, Saved and Journal were exercised. These files document the original web interface, not a rendering of the native SwiftUI code. Native overlays remain pending.
