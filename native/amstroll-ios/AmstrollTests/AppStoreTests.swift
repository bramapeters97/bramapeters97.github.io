import XCTest
@testable import Amstroll

@MainActor
final class AppStoreTests: XCTestCase {
    private func catalog() throws -> Catalog { try Catalog.load() }
    func testReleaseStartsWithoutFictionalMemoriesAndDemoIsIsolated() throws {
        let directory=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:directory) }
        let release=try AppStore(catalog:catalog(),directory:directory)
        XCTAssertTrue(release.journal.isEmpty);XCTAssertTrue(release.saved.isEmpty)
        let demo=try AppStore(catalog:catalog(),demoMode:true)
        XCTAssertFalse(demo.journal.isEmpty);XCTAssertTrue(demo.journal.allSatisfy(\.sample))
        XCTAssertTrue(try AppStore(catalog:catalog(),directory:directory).journal.isEmpty)
    }
    func testActiveProgressRelaunchAndMemory() throws {
        let directory=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:directory) }
        let store=try AppStore(catalog:catalog(),directory:directory)
        store.prefs.minutes=240;store.prefs.walking=240
        let plan=try XCTUnwrap(store.suggestions.first(where:{$0.feasible}))
        XCTAssertTrue(store.start(plan));store.skipStop()
        let resumed=try AppStore(catalog:catalog(),directory:directory)
        XCTAssertEqual(resumed.active?.skipped.count,1)
        resumed.completeStop();try resumed.finish(note:"A different route home",rating:"Loved it",photoData:nil)
        let restored=try AppStore(catalog:catalog(),directory:directory)
        XCTAssertNil(restored.active);XCTAssertEqual(restored.journal.count,1);XCTAssertEqual(restored.journal[0].note,"A different route home")
    }
    func testPreferenceFlushAndSuggestionCacheInvalidation() throws {
        let directory=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:directory) }
        let store=try AppStore(catalog:catalog(),directory:directory)
        store.prefs.minutes=12;store.prefs.minutes=13;store.persist()
        XCTAssertEqual(try LocalPersistence(directory:directory).load().prefs.minutes,13)
        let first=store.suggestions,second=store.suggestions
        XCTAssertEqual(first.map(\.startedAt),second.map(\.startedAt),"Repeated body reads should reuse the same minute's plans")
        store.prefs.minutes=720
        XCTAssertTrue(store.suggestions.allSatisfy{$0.prefs.minutes == 720})
        store.selectStart(StartArea(id:"my-location",name:"Your location",lat:52.377,lng:4.900,area:"Centrum"))
        XCTAssertTrue(store.suggestions.allSatisfy{$0.origin.lat == 52.377})
        store.selectStart(StartArea(id:"my-location",name:"Your location",lat:52.350,lng:4.850,area:"Oud-West"))
        XCTAssertTrue(store.suggestions.allSatisfy{$0.origin.lat == 52.350},"New coordinates must invalidate a same-ID location")
    }
    func testForecastChangesSuggestionsAndDoesNotPersistOrFollowAnotherStart() throws {
        let directory=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:directory) }
        let store=try AppStore(catalog:catalog(),demoMode:true,directory:directory)
        store.prefs.mood="culture"
        let dry=store.suggestions.map(\.id)
        store.forecast=WeatherContext(temperature:12,precipitation:1,summary:"Rain",forecastTime:"2026-11-03T14:00:00Z",retrievedAt:store.now)
        XCTAssertEqual(store.planningContext.rainExpected,true)
        XCTAssertNotEqual(store.suggestions.map(\.id),dry,"A forecast update must invalidate the dry-weather suggestion cache")
        XCTAssertTrue(store.suggestions.contains{$0.rankReasons.contains(where:{$0.hasPrefix("Mostly indoors")})})
        store.persist()
        XCTAssertNil(try AppStore(catalog:catalog(),directory:directory).forecast,"Provider forecasts must remain ephemeral")
        store.prefs.start="jordaan"
        XCTAssertNil(store.forecast,"Forecast context must not silently follow a different starting area")
    }
    func testStalePlanCannotStartWithDifferentPreferences() throws {
        let store=try AppStore(catalog:catalog(),demoMode:true)
        store.prefs.minutes=240;store.prefs.walking=240
        let plan=try XCTUnwrap(store.suggestions.first(where:{$0.feasible}))
        store.prefs.minutes=0;XCTAssertFalse(store.start(plan))
    }
}
