import XCTest
@testable import Amstroll

private actor FixtureHTTPClient: HTTPDataLoading {
    var count: Int
    var failPhotos: Bool
    var delay: Bool
    var requests = 0
    init(count: Int = 80,failPhotos: Bool = false,delay: Bool = false) {
        self.count = count;self.failPhotos = failPhotos;self.delay = delay
    }
    func data(for request: URLRequest,ttl: TimeInterval) async throws -> Data {
        requests += 1
        if delay { try await Task.sleep(nanoseconds:2_000_000_000) }
        try Task.checkCancellation()
        let url = request.url!, query = URLComponents(url:url,resolvingAgainstBaseURL:false)?.queryItems ?? []
        func value(_ name: String) -> String? { query.first{$0.name == name}?.value }
        let titles = value("titles")?.components(separatedBy:"|") ?? []
        XCTAssertLessThanOrEqual(titles.count,50,"Metadata must use bounded batches")
        let object: [String:Any]
        if url.host?.contains("overpass") == true {
            object = ["elements":[["type":"node","id":1,"lat":52.37801,"lon":4.899,"tags":["name":"Test place 1","tourism":"museum","wikipedia":"en:Test place 1"]]]]
        } else if value("list") == "geosearch" {
            let places: [[String:Any]] = (1...count).map { ["pageid":$0,"title":"Test place \($0)","lat":52.378+Double($0)*0.00001,"lon":4.899,"type":"landmark"] }
            object = ["query":["geosearch":places]]
        } else if value("prop") == "pageimages" {
            let pages: [[String:Any]] = titles.map { title in
                let index = title.components(separatedBy:" ").last!
                return ["title":title,"pageimage":"Test place \(index == "2" ? "1" : index).jpg"]
            }
            object = ["query":["pages":pages]]
        } else if value("prop") == "imageinfo" {
            if failPhotos { throw URLError(.cannotConnectToHost) }
            let pages: [[String:Any]] = titles.map { title in
                let name = title.addingPercentEncoding(withAllowedCharacters:.urlPathAllowed)!
                let photo: [String:Any] = ["thumburl":"https://example.test/photos/"+name,"descriptionurl":"https://commons.wikimedia.org/wiki/"+name,"mediatype":"BITMAP","extmetadata":["LicenseShortName":["value":title == "File:Test place 3.jpg" ? "Fair use" : "CC BY-SA 4.0"],"Artist":["value":"<b>Fixture photographer</b>"],"ObjectName":["value":title],"LicenseUrl":["value":"https://creativecommons.org/licenses/by-sa/4.0/"]]]
                return ["title":title,"imageinfo":[photo]]
            }
            object = ["query":["pages":pages]]
        } else {
            throw ServiceError.invalidResponse
        }
        return try JSONSerialization.data(withJSONObject:object)
    }
}

final class ProviderTests: XCTestCase {
    func testFiftyPhotographsAreUniqueLicensedAndBatched() async throws {
        let http = FixtureHTTPClient(), service = OpenPlaceService(client:http)
        let result = try await service.discover(latitude:52.378,longitude:4.899)
        XCTAssertEqual(result.places.count,50)
        XCTAssertEqual(Set(result.places.compactMap{$0.photo?.identity}).count,50)
        XCTAssertTrue(result.places.allSatisfy{$0.photo?.license == "CC BY-SA 4.0"})
        XCTAssertTrue(result.places.allSatisfy{$0.photo?.credit == "Fixture photographer"})
        XCTAssertTrue(result.places.allSatisfy{$0.photo?.sourceURL.hasPrefix("https://commons.wikimedia.org/") == true})
        XCTAssertEqual(result.places.filter{$0.wikipedia == "en:Test place 1"}.count,1)
        XCTAssertFalse(result.places.contains{$0.photo?.identity == "File:Test place 3.jpg"})
        let requests = await http.requests
        XCTAssertLessThanOrEqual(requests,6)
    }
    func testPartialPoolIsReportedInsteadOfFilledWithFakePlaces() async throws {
        let result = try await OpenPlaceService(client:FixtureHTTPClient(count:8)).discover(latitude:52.378,longitude:4.899)
        XCTAssertEqual(result.places.count,6)
        XCTAssertTrue(result.warnings.contains{$0.contains("Found 6 places")})
    }
    func testPhotoFailureDoesNotSubstituteAreaImagery() async throws {
        do {
            _ = try await OpenPlaceService(client:FixtureHTTPClient(count:8,failPhotos:true)).discover(latitude:52.378,longitude:4.899)
            XCTFail("Photo failure must remain explicit")
        } catch ServiceError.noPhotographs { } catch { XCTFail("Unexpected error: \(error)") }
    }
    func testCancellationRemainsCancellation() async throws {
        let service = OpenPlaceService(client:FixtureHTTPClient(delay:true))
        let task = Task { try await service.discover(latitude:52.378,longitude:4.899) }
        task.cancel()
        do { _ = try await task.value;XCTFail("A cancelled search completed") }
        catch is CancellationError { } catch { XCTFail("Unexpected error: \(error)") }
    }
    func testDiscoveryRejectsNonAmsterdamStart() async throws {
        do {
            _ = try await OpenPlaceService(client:FixtureHTTPClient()).discover(latitude:52.09,longitude:5.12)
            XCTFail("Non-Amsterdam start accepted")
        } catch ServiceError.invalidArea { } catch { XCTFail("Unexpected error: \(error)") }
    }
    func testLicenseWhitelistAndSanitisation() {
        XCTAssertTrue(OpenPlaceService.allowedLicense("Public domain"))
        XCTAssertTrue(OpenPlaceService.allowedLicense("CC0 1.0"))
        XCTAssertFalse(OpenPlaceService.allowedLicense("Fair use"))
        XCTAssertEqual(ProviderParsing.text("<a>A &amp; B</a>"),"A & B")
        XCTAssertNil(ProviderParsing.https("javascript:alert(1)"))
    }
    func testProviderCachePolicyOverridesLocalTTL() {
        let now = Date(timeIntervalSince1970:1_700_000_000),url = URL(string:"https://example.test")!
        let noStore = HTTPURLResponse(url:url,statusCode:200,httpVersion:nil,headerFields:["Cache-Control":"private, no-store"])!
        XCTAssertNil(NativeHTTPClient.cacheExpiry(response:noStore,fallbackTTL:3600,now:now))
        let maxAge = HTTPURLResponse(url:url,statusCode:200,httpVersion:nil,headerFields:["Cache-Control":"public, max-age=60"])!
        XCTAssertEqual(NativeHTTPClient.cacheExpiry(response:maxAge,fallbackTTL:3600,now:now),now.addingTimeInterval(60))
        let aged = HTTPURLResponse(url:url,statusCode:200,httpVersion:nil,headerFields:["Cache-Control":"max-age=60","Age":"45"])!
        XCTAssertEqual(NativeHTTPClient.cacheExpiry(response:aged,fallbackTTL:3600,now:now),now.addingTimeInterval(15))
        let expires = HTTPURLResponse(url:url,statusCode:200,httpVersion:nil,headerFields:["Expires":"Tue, 14 Nov 2023 22:14:20 GMT"])!
        XCTAssertEqual(NativeHTTPClient.cacheExpiry(response:expires,fallbackTTL:3600,now:now),now.addingTimeInterval(60))
    }
}
