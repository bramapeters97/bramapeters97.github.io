import XCTest

final class AmstrollScreenshotTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }

    private func capture(_ scene: String, ready identifier: String) {
        let app = XCUIApplication()
        app.launchArguments = ["--screenshot-mode", "--screenshot-scene", scene]
        app.launch()
        let ready = app.descendants(matching: .any)[identifier].firstMatch
        if scene == "results" {
            for _ in 0..<6 {
                if ready.exists && ready.isHittable { break }
                app.swipeUp()
            }
            XCTAssertTrue(ready.exists && ready.isHittable, "Results did not become visible")
            if ready.frame.minY > 180 {
                let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75))
                let target = start.withOffset(CGVector(dx: 0, dy: -(ready.frame.minY - 120)))
                start.press(forDuration: 0.05, thenDragTo: target)
            }
        } else {
            XCTAssertTrue(ready.waitForExistence(timeout: 15), "Missing ready state: \(identifier)")
        }
        let capture = XCTAttachment(screenshot: app.screenshot())
        capture.name = "Amstroll-\(scene)"
        capture.lifetime = .keepAlways
        add(capture)
        app.terminate()
    }
    func test01Explore() { capture("explore", ready: "explore-screen") }
    func test02Preferences() { capture("preferences", ready: "preferences-sheet") }
    func test03Suggestions() { capture("results", ready: "results-heading") }
    func test04OutingDetail() { capture("detail", ready: "detail-screen") }
    func test05ManualProgress() { capture("progress", ready: "progress-screen") }
    func test06SavedIdeas() { capture("saved", ready: "saved-screen") }
    func test07Journal() { capture("journal", ready: "journal-screen") }
}
