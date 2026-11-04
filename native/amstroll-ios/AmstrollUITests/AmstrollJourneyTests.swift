import XCTest

final class AmstrollJourneyTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }

    private func revealAndTap(_ element: XCUIElement, in app: XCUIApplication, maximumSwipes: Int = 12) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), "Expected control is missing")
        for _ in 0..<maximumSwipes {
            if element.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable, "Control could not be revealed by scrolling")
        element.tap()
    }

    func testStartSkipFinishAndReadJournalMemory() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo", "--screenshot-scene", "detail"]
        app.launch()
        defer { app.terminate() }

        XCTAssertTrue(app.descendants(matching: .any)["detail-screen"].firstMatch.waitForExistence(timeout: 15))
        let start = app.buttons["start-outing"]
        XCTAssertTrue(start.waitForExistence(timeout: 5))
        XCTAssertTrue(start.isEnabled, "The deterministic demo should open a fitting authored outing")
        revealAndTap(start, in: app)

        XCTAssertTrue(app.descendants(matching: .any)["progress-screen"].firstMatch.waitForExistence(timeout: 10))
        revealAndTap(app.buttons["skip-stop"], in: app)
        revealAndTap(app.buttons["Call this a good little outing"], in: app)

        let note = app.textViews["Optional memory note"]
        XCTAssertTrue(note.waitForExistence(timeout: 10))
        revealAndTap(note, in: app)
        let memory = "A different route home and a little more Amsterdam."
        note.typeText(memory)
        let hideKeyboard = app.buttons["dismiss-memory-keyboard"]
        if hideKeyboard.waitForExistence(timeout: 3) { hideKeyboard.tap() }
        revealAndTap(app.buttons["Keep it in my journal"], in: app)
        XCTAssertTrue(app.staticTexts["A little story, kept."].waitForExistence(timeout: 10), "Finishing should clear the active outing and keep a memory")

        // The only navigation-bar button on the ended outing is system Back.
        let back = app.navigationBars.buttons.firstMatch
        XCTAssertTrue(back.waitForExistence(timeout: 5))
        back.tap()
        XCTAssertTrue(app.buttons["tab-explore"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["tab-saved"].exists)
        app.buttons["tab-journal"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["journal-screen"].firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts[memory].waitForExistence(timeout: 5), "The optional note must appear in the local journal")
    }
}
