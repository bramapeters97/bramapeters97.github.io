import XCTest
#if canImport(AmstrollCore)
@testable import AmstrollCore
#else
@testable import Amstroll
#endif

final class PlanningTests: XCTestCase {
    struct FixtureFile: Decodable {
        var now:String
        var fixtures:[Fixture]
        var suggestions:[Suggestion]
    }
    struct Fixture: Decodable {
        var name:String;var id:String;var prefs:Preferences;var context:Context;var expected:Expected
    }
    struct Context: Decodable { var demoFerry:Bool?;var demoTransport:Bool?;var demoAvailability:Bool? }
    struct Expected: Decodable { var total:Int;var travelMinutes:Int;var walking:Int;var waiting:Int;var cost:Double?;var knownCost:Double;var status:Eligibility;var minimumMinutes:Int;var endpointTravel:Int;var stopIds:[String] }
    struct Suggestion: Decodable { var prefs:Preferences;var ids:[String] }

    private func resource(_ name:String) throws -> URL {
        #if SWIFT_PACKAGE
        let bundle=Bundle.module
        #else
        let bundle=Bundle(for:PlanningTests.self)
        #endif
        return try XCTUnwrap(bundle.url(forResource:name,withExtension:"json",subdirectory:"Fixtures") ?? bundle.url(forResource:name,withExtension:"json"))
    }
    private func catalogue() throws -> Catalog {
        try JSONDecoder().decode(Catalog.self,from:Data(contentsOf:resource("catalogue")))
    }
    func testJavaScriptPlanningParity() throws {
        let file=try JSONDecoder().decode(FixtureFile.self,from:Data(contentsOf:resource("nativePlanningFixtures")))
        let now=try XCTUnwrap(ISO8601DateFormatter().date(from:file.now)),engine=PlanningEngine(catalog:try catalogue())
        for fixture in file.fixtures {
            let context=PlanningContext(now:now,demoAvailability:fixture.context.demoAvailability ?? false,demoTransport:fixture.context.demoTransport ?? false,demoFerry:fixture.context.demoFerry ?? false)
            let actual=try engine.plan(id:fixture.id,prefs:fixture.prefs,context:context),expected=fixture.expected
            XCTAssertEqual(actual.total,expected.total,fixture.name);XCTAssertEqual(actual.travelMinutes,expected.travelMinutes,fixture.name)
            XCTAssertEqual(actual.walking,expected.walking,fixture.name);XCTAssertEqual(actual.waiting,expected.waiting,fixture.name)
            XCTAssertEqual(actual.cost,expected.cost,fixture.name);XCTAssertEqual(actual.knownCost,expected.knownCost,accuracy:0.001,fixture.name)
            XCTAssertEqual(actual.status,expected.status,fixture.name);XCTAssertEqual(actual.minimumMinutes,expected.minimumMinutes,fixture.name)
            XCTAssertEqual(actual.endpointTravel,expected.endpointTravel,fixture.name);XCTAssertEqual(actual.stops.map(\.id),expected.stopIds,fixture.name)
            XCTAssertEqual(actual.prefs,fixture.prefs,"Planning must not silently alter the person's preferences")
        }
        for fixture in file.suggestions {
            let actual=engine.suggestions(prefs:fixture.prefs,context:PlanningContext(now:now))
            XCTAssertEqual(actual.map(\.id),fixture.ids,"The diversity-aware ranking must match the original planner")
            XCTAssertEqual(Set(actual.map(\.id)).count,20)
        }
    }
    func testZeroMinutesNeverStartsAndPreferencesValidate() throws {
        let engine=PlanningEngine(catalog:try catalogue());var prefs=Preferences();prefs.minutes=0
        let plans=engine.suggestions(prefs:prefs)
        XCTAssertEqual(plans.count,20);XCTAssertTrue(plans.allSatisfy{!$0.feasible})
        prefs.minutes=721;XCTAssertThrowsError(try engine.validate(prefs))
        prefs=Preferences();prefs.start="not-an-amsterdam-area";XCTAssertThrowsError(try engine.validate(prefs))
    }
    func testSkippingDoesNotTeleportAndReturnLegRemains() throws {
        let engine=PlanningEngine(catalog:try catalogue());var prefs=Preferences();prefs.minutes=240;prefs.walking=240;prefs.endpoint="start"
        let plan=try engine.plan(id:"centre-first-light",prefs:prefs)
        let skipped=try engine.remaining(original:plan,completed:[],skipped:[plan.stops[0].id],prefs:prefs)
        XCTAssertEqual(skipped.origin,plan.origin)
        XCTAssertFalse(skipped.stops.contains{$0.id == plan.stops[0].id})
        let finished=try engine.remaining(original:plan,completed:plan.stops.map(\.id),skipped:[],prefs:prefs)
        XCTAssertTrue(finished.stops.isEmpty);XCTAssertGreaterThan(finished.endpointTravel,0)
        XCTAssertEqual(finished.total,finished.endpointTravel+5)
    }
    func testStateAndPhotoPersistenceReset() throws {
        let folder=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:folder) }
        let disk=try LocalPersistence(directory:folder)
        var state=UserState();state.prefs.minutes=12
        state.journal=[Memory(id:"one",title:"A walk",note:"A quiet corner",rating:"Good",minutes:12,date:Date(timeIntervalSince1970:1_700_000_000),photoKey:nil,photoFile:nil)]
        try disk.save(state)
        XCTAssertEqual(try disk.load().prefs.minutes,12);XCTAssertEqual(try disk.load().journal.first?.note,"A quiet corner")
        let file=try disk.putPhoto(Data([0xff,0xd8,0xff,0xd9]));XCTAssertNotNil(disk.photoURL(file));XCTAssertNil(disk.photoURL("../state-v1.json"))
        try disk.preserveUnreadableState()
        XCTAssertTrue(try FileManager.default.contentsOfDirectory(atPath:folder.path).contains{$0.hasPrefix("state-unreadable-")})
        try disk.reset();XCTAssertNil(disk.photoURL(file));XCTAssertTrue(try disk.load().journal.isEmpty)
        XCTAssertFalse(try FileManager.default.contentsOfDirectory(atPath:folder.path).contains{$0.hasPrefix("state-unreadable-")})
        XCTAssertEqual(try disk.load().prefs,Preferences())
    }
}
