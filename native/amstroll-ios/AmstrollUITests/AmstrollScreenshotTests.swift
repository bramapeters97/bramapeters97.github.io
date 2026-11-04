import XCTest

final class AmstrollScreenshotTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }

    private func capture(_ scene: String, ready identifier: String) {
        let app = XCUIApplication()
        app.launchArguments = ["--screenshot-mode", "--screenshot-scene", scene]
        app.launch()
        let ready = app.descendants(matching: .any)[identifier].firstMatch
        if scene == "results" {
            // Results is scheduled to scroll into view after the initial layout.
            // Existence alone can capture the preceding planning card instead.
            let visible = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
                ready.exists && ready.isHittable
            }, object: nil)
            XCTAssertEqual(XCTWaiter.wait(for: [visible], timeout: 15), .completed, "Results did not become visible")
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
