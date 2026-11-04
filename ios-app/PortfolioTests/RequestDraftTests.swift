import XCTest
@testable import Portfolio

final class RequestDraftTests: XCTestCase {
    private let services = ["Web Design & Development", "General enquiry"]

    func testValidRequestAndFullMessageSurvivePreparation() {
        var draft = RequestDraft()
        draft.name = "Ada Example"
        draft.email = "ada+portfolio@example.com"
        draft.service = services[0]
        draft.message = String(repeating: "A detailed brief with line breaks.\n", count: 200)
        XCTAssertTrue(draft.validationErrors(services: services).isEmpty)
        let body = draft.emailBody(recipient: "bramapeters@outlook.com")
        XCTAssertTrue(body.contains(draft.message.trimmingCharacters(in: .whitespacesAndNewlines)))
        XCTAssertTrue(body.contains("ada+portfolio@example.com"))
    }

    func testMissingAndInvalidFieldsAreReported() {
        var draft = RequestDraft()
        XCTAssertEqual(draft.validationErrors(services: services).count, 4)
        draft.name = "Ada\nInjected"
        draft.email = "bad@example.com\nBcc: victim@example.com"
        draft.service = "Not an offered service"
        draft.message = "  \n "
        XCTAssertEqual(draft.validationErrors(services: services).count, 4)
    }

    func testExternalLinksRejectLocalAndExecutableSchemes() {
        for value in ["javascript:alert(1)", "file:///private/file", "data:text/html,test", "//example.com", "relative.html"] {
            XCTAssertNil(ContentLink.safeURL(value))
        }
        XCTAssertNotNil(ContentLink.safeURL("https://bram-peters.com/project.html"))
    }

    @MainActor func testDraftPersistsAndDiscardRemovesIt() throws {
        let suite = "PortfolioTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = RequestDraftStore(defaults: defaults)
        store.draft.name = "Persisted name"
        XCTAssertEqual(RequestDraftStore(defaults: defaults).draft.name, "Persisted name")
        store.discard()
        XCTAssertTrue(RequestDraftStore(defaults: defaults).draft.isEmpty)
    }

    @MainActor func testBundledContentDecodesAndCoverAssetsExist() throws {
        // Hosted by Portfolio.app, so Bundle.main is the app's resource bundle.
        let content = try XCTUnwrap(ContentStore().content)
        XCTAssertFalse(content.projects.isEmpty)
        XCTAssertEqual(Set(content.projects.map(\.id)).count, content.projects.count)
        for project in content.projects where !project.image.isEmpty {
            XCTAssertNotNil(BundledMedia.url(project.image), project.id)
        }
    }
}
