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
        app.buttons["outing-actions"].tap()
        app.buttons["Skip this stop"].tap()
        app.buttons["outing-actions"].tap()
        app.buttons["Finish early"].tap()

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
        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(tabs.buttons["Explore"].waitForExistence(timeout: 5))
        XCTAssertTrue(tabs.buttons["Saved"].exists)
        tabs.buttons["Journal"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["journal-screen"].firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts[memory].waitForExistence(timeout: 5), "The optional note must appear in the local journal")
    }

    func testPlannerAndFeedPreserveTheOpenedCard() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo"]
        app.launch()
        defer { app.terminate() }

        let plan = app.buttons["plan-stroll"]
        XCTAssertTrue(plan.waitForExistence(timeout: 10))
        plan.tap()
        let clock = app.descendants(matching: .any)["stroll-clock"].firstMatch
        XCTAssertTrue(clock.waitForExistence(timeout: 5))
        XCTAssertEqual(clock.value as? String, "47 min")
        let show = app.buttons["find-adventure"]
        XCTAssertTrue(show.waitForExistence(timeout: 5))
        show.tap()

        let heading = app.descendants(matching: .any)["results-heading"].firstMatch
        XCTAssertTrue(heading.waitForExistence(timeout: 10))
        let candidates = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "View "))
        var opened: XCUIElement?
        for _ in 0..<12 {
            let available = candidates.allElementsBoundByIndex
            if available.count > 3, let appended = available.dropFirst(3).first(where: \.isHittable) {
                opened = appended
                break
            }
            app.swipeUp()
        }
        guard let opened else { XCTFail("A fourth result did not append while scrolling"); return }
        let label = opened.label
        opened.tap()
        XCTAssertTrue(app.descendants(matching: .any)["detail-screen"].firstMatch.waitForExistence(timeout: 5))
        app.navigationBars.buttons.firstMatch.tap()
        let returned = app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch
        XCTAssertTrue(returned.waitForExistence(timeout: 5))
        XCTAssertTrue(returned.isHittable)
    }

}
