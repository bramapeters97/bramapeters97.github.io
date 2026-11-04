import Foundation
import MapKit

// Provider photographs identify the linked place, never a nearby substitute.
struct ServicePhoto: Codable, Hashable, Sendable {
    var url: String
    var alt: String
    var credit: String
    var license: String
    var sourceURL: String
    var licenseURL: String?
    var identity: String
}

struct ServicePlace: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var title: String
    var lat: Double
    var lng: Double
    var category: String
    var summary: String
    var photo: ServicePhoto?
    var sourceURL: String
    var provider: String
    var costEstimate: Double?
    var wikipedia: String?
    var wikidata: String?
    var commonsImage: String?
    var descriptionSourceURL: String? = nil
    var descriptionLicense: String? = nil
    var walkingVisit: WalkingVisit? = nil
}

struct DiscoveryResult: Sendable {
    var places: [ServicePlace]
    var warnings: [String]
    var retrievedAt: Date
    var requestedCount: Int
    var source = "OpenStreetMap / Wikipedia / Wikidata / Apple Maps"
}

enum ServiceError: LocalizedError {
    case invalidArea, invalidResponse, insecureURL, http(Int), noPlaces(String), noPhotographs, sessionLimit, unsupportedTransport
    var errorDescription: String? {
        switch self {
        case .invalidArea: return "Choose an Amsterdam starting area. Haarlem and Zandvoort are outings from Amsterdam."
        case .invalidResponse: return "The source returned an unsupported response. Please retry or use the Amsterdam collection."
        case .insecureURL: return "This source must use a secure HTTPS connection."
        case .http(let code): return "The source returned HTTP \(code). Retry manually or use the offline collection."
        case .noPlaces(let reason): return "Nearby places could not load. \(reason) No sample places were substituted."
        case .noPhotographs: return "Nearby places were found, but their distinct licensed photographs could not load. Retry or choose the Amsterdam collection."
        case .sessionLimit: return "The source request limit for this session was reached. Please use the Amsterdam collection or try again later."
        case .unsupportedTransport: return "This route mode is not verified here. Open the official planner for current transport information."
        }
    }
}

protocol HTTPDataLoading: Sendable {
    func data(for request: URLRequest, ttl: TimeInterval) async throws -> Data
}

/// In-memory cache only. URLSession follows task cancellation; failures are not cached.
actor NativeHTTPClient: HTTPDataLoading {
    private struct Entry { var data: Data; var expires: Date }
    private var cache: [String: Entry] = [:]
    private var requests: [String: Int] = [:]
    private let session: URLSession
    init(session: URLSession? = nil) {
        if let session { self.session = session }
        else {
            let configuration = URLSessionConfiguration.ephemeral
            configuration.urlCache = nil
            configuration.httpCookieStorage = nil
            configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
            self.session = URLSession(configuration:configuration)
        }
    }

    func data(for request: URLRequest, ttl: TimeInterval = 600) async throws -> Data {
        try Task.checkCancellation()
        guard let url = request.url, url.scheme == "https" else { throw ServiceError.insecureURL }
        let key = (request.httpMethod ?? "GET") + url.absoluteString + (request.httpBody?.base64EncodedString() ?? "")
        if let old = cache[key], old.expires > Date() { return old.data }
        let host = url.host ?? ""
        guard requests[host, default: 0] < 60 else { throw ServiceError.sessionLimit }
        requests[host, default: 0] += 1
        var bounded = request
        bounded.timeoutInterval = host.contains("overpass") ? 8 : 12
        bounded.setValue("Amstroll/1.0 (https://bram-peters.com/amstroll)", forHTTPHeaderField: "User-Agent")
        bounded.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: bounded)
        try Task.checkCancellation()
        guard let response = response as? HTTPURLResponse else { throw ServiceError.invalidResponse }
        guard (200..<300).contains(response.statusCode) else { throw ServiceError.http(response.statusCode) }
        guard data.count <= 8_000_000 else { throw ServiceError.invalidResponse }
        if let expiry = Self.cacheExpiry(response:response,fallbackTTL:ttl),expiry > Date() {
            cache = cache.filter { $0.value.expires > Date() }
            if cache.count >= 64,let oldest = cache.min(by:{$0.value.expires < $1.value.expires})?.key { cache.removeValue(forKey:oldest) }
            cache[key] = Entry(data:data,expires:expiry)
        }
        return data
    }
    static func cacheExpiry(response: HTTPURLResponse,fallbackTTL: TimeInterval,now: Date = Date()) -> Date? {
        guard fallbackTTL > 0 else { return nil }
        let control = response.value(forHTTPHeaderField:"Cache-Control")?.lowercased() ?? ""
        let directives = control.components(separatedBy:",").map{$0.trimmingCharacters(in:.whitespaces)}
        if directives.contains(where:{$0 == "no-store" || $0 == "no-cache" || $0.hasPrefix("no-cache=")}) { return nil }
        if let directive = directives.first(where:{$0.hasPrefix("max-age=")}),let seconds = TimeInterval(directive.dropFirst(8).replacingOccurrences(of:"\"",with:"")),seconds.isFinite {
            let reportedAge = TimeInterval(response.value(forHTTPHeaderField:"Age") ?? "0") ?? 0
            let age = reportedAge.isFinite ? max(0,reportedAge) : 0
            let remaining = seconds-age
            return remaining > 0 ? now.addingTimeInterval(remaining) : nil
        }
        if let raw = response.value(forHTTPHeaderField:"Expires") {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier:"en_US_POSIX")
            formatter.timeZone = TimeZone(secondsFromGMT:0)
            formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
            if let supplied = formatter.date(from:raw) { return supplied > now ? supplied : nil }
        }
        return now.addingTimeInterval(fallbackTTL)
    }
}

enum ProviderParsing {
    static func json(_ data: Data) throws -> [String: Any] {
        guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any], object["error"] == nil else { throw ServiceError.invalidResponse }
        return object
    }
    static func text(_ value: Any?) -> String {
        let raw = value as? String ?? ""
        return raw.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
            .replacingOccurrences(of: "&amp;", with: "&").replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&#39;", with: "'").replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">").trimmingCharacters(in: .whitespacesAndNewlines)
    }
    static func https(_ value: Any?) -> String? {
        guard let string = value as? String, let url = URL(string: string), url.scheme == "https", url.host != nil else { return nil }
        return url.absoluteString
    }
    static func key(_ value: String) -> String { value.replacingOccurrences(of: "_", with: " ").trimmingCharacters(in: .whitespacesAndNewlines).precomposedStringWithCanonicalMapping }
    static func number(_ value: Any?) -> Double? { (value as? NSNumber)?.doubleValue }
    static func inAmsterdam(lat: Double, lng: Double) -> Bool { lat.isFinite && lng.isFinite && (52.28...52.43).contains(lat) && (4.73...5.10).contains(lng) }
    static func distance(_ a: ServicePlace, _ b: ServicePlace) -> Double { distance(a.lat, a.lng, b.lat, b.lng) }
    static func distance(_ lat1: Double, _ lng1: Double, _ lat2: Double, _ lng2: Double) -> Double {
        let r = Double.pi / 180, dLat = (lat2-lat1)*r, dLng = (lng2-lng1)*r
        let q = pow(sin(dLat/2),2) + cos(lat1*r)*cos(lat2*r)*pow(sin(dLng/2),2)
        return 6_371_000 * 2 * atan2(sqrt(max(0,q)), sqrt(max(0,1-q)))
    }
    static func chunks<T>(_ values: [T], size: Int = 50) -> [[T]] { stride(from: 0, to: values.count, by: size).map { Array(values[$0..<min($0+size,values.count)]) } }
    static func api(_ endpoint: String, _ params: [String: String]) throws -> URLRequest {
        guard var components = URLComponents(string: endpoint) else { throw ServiceError.invalidResponse }
        var values = ["format":"json", "formatversion":"2"]
        values.merge(params) { _, new in new }
        components.queryItems = values.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }
        guard let url = components.url else { throw ServiceError.invalidResponse }
        return URLRequest(url: url)
    }
}

actor OpenPlaceService {
    private let client: any HTTPDataLoading
    private let nativeSearch: any NativePlaceSearching
    init(client: any HTTPDataLoading = NativeHTTPClient(), nativeSearch: any NativePlaceSearching = ApplePlaceSearch()) {
        self.client = client
        self.nativeSearch = nativeSearch
    }

    /// Network discovery is intentionally independent of the authored planning engine.
    func discover(latitude: Double, longitude: Double, radius: Int = 2500, limit: Int = 50, mood: String = "any") async throws -> DiscoveryResult {
        guard ProviderParsing.inAmsterdam(lat: latitude, lng: longitude) else { throw ServiceError.invalidArea }
        let radius = min(6000,max(250,radius)), requested = min(50,max(1,limit))
        let sources = await withTaskGroup(of: SourceOutcome.self, returning: [SourceOutcome].self) { group in
            group.addTask { await self.sourceOutcome(name: "Wikipedia") { try await self.wikipedia(latitude, longitude, radius, language: "en") } }
            group.addTask { await self.sourceOutcome(name: "Dutch Wikipedia") { try await self.wikipedia(latitude, longitude, radius, language: "nl") } }
            group.addTask { await self.sourceOutcome(name: "Wikidata") { try await self.wikidata(latitude, longitude, radius) } }
            group.addTask { await self.sourceOutcome(name: "Apple Maps") { try await self.nativeSearch.search(latitude: latitude, longitude: longitude, radius: radius, mood: mood) } }
            group.addTask { await self.sourceOutcome(name: "OpenStreetMap") { try await self.overpass(latitude, longitude, radius) } }
            var results: [SourceOutcome] = []
            for await result in group { results.append(result) }
            return results
        }
        try Task.checkCancellation()
        var warnings = sources.compactMap(\.warning)
        // Stable priority ensures response completion order never changes identity/photo selection.
        let raw = sources.flatMap(\.places).sorted { $0.id < $1.id }
        var distinct: [ServicePlace] = [], seen = Set<String>()
        for place in raw {
            if seen.contains(place.id) { continue }
            let duplicate = distinct.firstIndex { old in
                (old.wikipedia != nil && old.wikipedia == place.wikipedia) || (old.wikidata != nil && old.wikidata == place.wikidata) ||
                (old.title.folding(options: [.caseInsensitive,.diacriticInsensitive], locale: .current) == place.title.folding(options: [.caseInsensitive,.diacriticInsensitive], locale: .current) && ProviderParsing.distance(old,place) < 70)
            }
            if let index = duplicate {
                distinct[index].wikipedia = distinct[index].wikipedia ?? place.wikipedia
                distinct[index].wikidata = distinct[index].wikidata ?? place.wikidata
                distinct[index].commonsImage = distinct[index].commonsImage ?? place.commonsImage
                if distinct[index].category == "Nearby place" { distinct[index].category = place.category }
            } else { distinct.append(place); seen.insert(place.id) }
        }
        distinct.sort { ProviderParsing.distance(latitude,longitude,$0.lat,$0.lng) < ProviderParsing.distance(latitude,longitude,$1.lat,$1.lng) }
        distinct = PlaceSelection.matching(distinct, mood: mood)
        guard !distinct.isEmpty else { throw ServiceError.noPlaces(warnings.joined(separator: " ")) }
        let photographed = try await photographs(for: Array(distinct.prefix(requested)), limit: requested)
        try Task.checkCancellation()
        warnings.append(contentsOf: photographed.warnings)
        return DiscoveryResult(places: photographed.places, warnings: Array(Set(warnings)).sorted(), retrievedAt: Date(), requestedCount: requested, source: Array(Set(photographed.places.map(\.provider))).sorted().joined(separator: " + "))
    }

    private struct SourceOutcome: Sendable { var places: [ServicePlace]; var warning: String? }
    private func sourceOutcome(name: String, _ operation: () async throws -> [ServicePlace]) async -> SourceOutcome {
        do { return SourceOutcome(places: try await operation(), warning: nil) }
        catch { return SourceOutcome(places: [], warning: "\(name) is temporarily unavailable. Other sources may still have ideas.") }
    }

    private func request(_ endpoint: String, _ parameters: [String:String], ttl: TimeInterval = 600) async throws -> [String:Any] {
        let data = try await client.data(for: ProviderParsing.api(endpoint,parameters), ttl: ttl)
        try Task.checkCancellation()
        return try ProviderParsing.json(data)
    }
    private func wikipedia(_ lat: Double, _ lng: Double, _ radius: Int, language: String) async throws -> [ServicePlace] {
        let response = try await request("https://\(language).wikipedia.org/w/api.php", ["action":"query","list":"geosearch","gscoord":"\(lat)|\(lng)","gsradius":"\(radius)","gslimit":"100","gsnamespace":"0","gsprop":"type|dim","gsmaxdim":"5000"])
        let query = response["query"] as? [String:Any]
        return (query?["geosearch"] as? [[String:Any]] ?? []).prefix(100).compactMap { row in
            guard let lat = ProviderParsing.number(row["lat"]), let lng = ProviderParsing.number(row["lon"]), ProviderParsing.inAmsterdam(lat:lat,lng:lng), let id = row["pageid"] as? Int, let title = row["title"] as? String else { return nil }
            guard !["city","country","state","adm1st","adm2nd","event"].contains(row["type"] as? String ?? ""), (ProviderParsing.number(row["dim"]) ?? 0) <= 5000 else { return nil }
            if title.range(of: "(?:fire|bombing|massacre|disaster|attack|battle|siege|shooting|riot|collapse|earthquake)$", options: [.regularExpression,.caseInsensitive]) != nil { return nil }
            let encoded = title.replacingOccurrences(of:" ",with:"_").addingPercentEncoding(withAllowedCharacters:.urlPathAllowed) ?? ""
            return ServicePlace(id:"wiki-\(language)-\(id)", title:title, lat:lat,lng:lng,category:"Cultural place",summary:"A geotagged Wikipedia place. Route, price and access still need checking.",photo:nil,sourceURL:"https://\(language).wikipedia.org/wiki/"+encoded,provider:language == "en" ? "Wikipedia" : "Wikipedia (NL)",costEstimate:nil,wikipedia:language+":"+title,wikidata:nil,commonsImage:nil)
        }
    }
    private func overpass(_ lat: Double, _ lng: Double, _ radius: Int) async throws -> [ServicePlace] {
        let startLat = lat,startLng = lng
        let query = "[out:json][timeout:10][maxsize:2097152];nwr(around:\(radius),\(lat),\(lng))[name][~\"^(tourism|leisure|amenity|shop)$\"~\"^(museum|gallery|viewpoint|attraction|artwork|park|garden|cafe|restaurant|library|marketplace|books|bakery)$\"];out body center 140;"
        var components = URLComponents(); components.queryItems = [URLQueryItem(name:"data",value:query)]
        var request = URLRequest(url:URL(string:"https://overpass.private.coffee/api/interpreter")!)
        request.httpMethod = "POST"; request.httpBody = components.percentEncodedQuery?.data(using:.utf8)
        request.setValue("application/x-www-form-urlencoded",forHTTPHeaderField:"Content-Type")
        let response = try ProviderParsing.json(await client.data(for:request,ttl:600))
        guard response["remark"] == nil else { throw ServiceError.invalidResponse }
        return (response["elements"] as? [[String:Any]] ?? []).prefix(140).compactMap { row in
            let tags = row["tags"] as? [String:String] ?? [:], point = row["center"] as? [String:Any] ?? row
            guard let title = tags["name"],let lat = ProviderParsing.number(point["lat"]),let lng = ProviderParsing.number(point["lon"]),ProviderParsing.inAmsterdam(lat:lat,lng:lng),!["private","no"].contains(tags["access"] ?? ""),let id = row["id"] as? Int,let type = row["type"] as? String else { return nil }
            guard ProviderParsing.distance(startLat,startLng,lat,lng) <= Double(radius+150) else { return nil }
            let category = tags["tourism"] ?? tags["leisure"] ?? tags["amenity"] ?? tags["shop"] ?? "Place"
            let free = tags["fee"] == "no" && ["park","garden","artwork","viewpoint"].contains(category)
            let image = tags["wikimedia_commons"] ?? tags["image"]
            return ServicePlace(id:"osm-\(type)-\(id)",title:title,lat:lat,lng:lng,category:category,summary:tags["description:en"] ?? tags["description"] ?? "An OpenStreetMap place. Route, price and availability need checking.",photo:nil,sourceURL:"https://www.openstreetmap.org/\(type)/\(id)",provider:"OpenStreetMap",costEstimate:free ? 0 : nil,wikipedia:tags["wikipedia"],wikidata:tags["wikidata"],commonsImage:image?.hasPrefix("File:") == true ? image : nil)
        }
    }

    private func wikidata(_ lat: Double, _ lng: Double, _ radius: Int) async throws -> [ServicePlace] {
        // Restrict to visitable categories; geotagged historical events are not outing suggestions.
        let query = """
        SELECT DISTINCT ?item ?itemLabel ?itemDescription ?location ?image WHERE {
          SERVICE wikibase:around {
            ?item wdt:P625 ?location .
            bd:serviceParam wikibase:center "Point(\(lng) \(lat))"^^geo:wktLiteral ;
              wikibase:radius "\(Double(radius) / 1000)" .
          }
          VALUES ?kind { wd:Q33506 wd:Q22698 wd:Q570116 wd:Q40080 wd:Q23413 wd:Q7075 wd:Q11315 }
          ?item wdt:P31/wdt:P279* ?kind .
          FILTER NOT EXISTS { ?item wdt:P576 ?demolished }
          OPTIONAL { ?item wdt:P18 ?image }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,nl" }
        } LIMIT 60
        """
        var components = URLComponents(string: "https://query.wikidata.org/sparql")
        components?.queryItems = [URLQueryItem(name: "query", value: query), URLQueryItem(name: "format", value: "json")]
        guard let url = components?.url else { throw ServiceError.invalidResponse }
        let response = try ProviderParsing.json(await client.data(for: URLRequest(url: url), ttl: 600))
        let results = response["results"] as? [String: Any]
        return (results?["bindings"] as? [[String: [String: String]]] ?? []).compactMap { row in
            guard let uri = row["item"]?["value"], let id = uri.split(separator: "/").last.map(String.init),
                  id.range(of: "^Q[0-9]+$", options: .regularExpression) != nil,
                  let title = row["itemLabel"]?["value"], title != id,
                  let point = row["location"]?["value"] else { return nil }
            let coordinates = point.replacingOccurrences(of: "Point(", with: "").replacingOccurrences(of: ")", with: "").split(separator: " ")
            guard coordinates.count == 2, let lng = Double(coordinates[0]), let lat = Double(coordinates[1]),
                  ProviderParsing.inAmsterdam(lat: lat, lng: lng) else { return nil }
            let image = row["image"]?["value"].flatMap { URL(string: $0)?.lastPathComponent.removingPercentEncoding }
            return ServicePlace(id: "wikidata-" + id, title: title, lat: lat, lng: lng, category: "Cultural place", summary: row["itemDescription"]?["value"] ?? "A nearby cultural place listed by Wikidata contributors.", photo: nil, sourceURL: "https://www.wikidata.org/wiki/" + id, provider: "Wikidata", costEstimate: nil, wikipedia: nil, wikidata: id, commonsImage: image)
        }
    }

    private func photographs(for places: [ServicePlace], limit: Int) async throws -> (places:[ServicePlace],warnings:[String]) {
        var files: [String:String] = [:], warnings: [String] = []
        var descriptions: [String: (text: String, url: String)] = [:]
        var articleGroups: [String:[String:[String]]] = [:], entities: [String:[String]] = [:]
        func add(_ id: String, _ file: String) {
            guard !file.isEmpty,file.count <= 250,!file.lowercased().hasSuffix(".svg"),files[id] == nil else { return }
            files[id] = file.hasPrefix("File:") ? file : "File:"+file
        }
        for place in places {
            if let file = place.commonsImage { add(place.id,file) }
            if let article = place.wikipedia {
                let parts = article.split(separator:":",maxSplits:1).map(String.init)
                if parts.count == 2, parts[0].range(of:"^[a-z]{2,3}$",options:.regularExpression) != nil {
                    articleGroups[parts[0],default:[:]][ProviderParsing.key(parts[1]),default:[]].append(place.id)
                }
            }
            if let entity = place.wikidata, entity.range(of:"^Q[0-9]+$",options:.regularExpression) != nil { entities[entity,default:[]].append(place.id) }
        }
        for language in articleGroups.keys.sorted().prefix(3) {
            let articles = articleGroups[language] ?? [:]
            for batch in ProviderParsing.chunks(Array(articles.keys).sorted().prefix(150).map { $0 }) {
                do {
                    let result = try await request("https://\(language).wikipedia.org/w/api.php",["action":"query","prop":"pageimages|extracts|info","exintro":"1","explaintext":"1","exchars":"450","inprop":"url","piprop":"name","titles":batch.joined(separator:"|"),"redirects":"1"],ttl:3600)
                    let q = result["query"] as? [String:Any] ?? [:], aliases = Self.aliases(q)
                    let rows = q["pages"] as? [[String:Any]] ?? []
                    for title in batch {
                        let canonical = Self.canonical(title,aliases:aliases)
                        if let page = rows.first(where: { ProviderParsing.key($0["title"] as? String ?? "") == canonical }) {
                            for id in articles[title] ?? [] {
                                if let file = page["pageimage"] as? String { add(id, file) }
                                let extract = ProviderParsing.text(page["extract"])
                                if !extract.isEmpty, let url = ProviderParsing.https(page["fullurl"]) {
                                    descriptions[id] = (extract, url)
                                }
                            }
                        }
                    }
                } catch { try Task.checkCancellation();warnings.append("Wikipedia photo metadata: "+error.localizedDescription) }
            }
        }
        for batch in ProviderParsing.chunks(Array(entities.keys).sorted().prefix(150).map { $0 }) {
            do {
                let response = try await request("https://www.wikidata.org/w/api.php",["action":"wbgetentities","ids":batch.joined(separator:"|"),"props":"claims"],ttl:3600)
                let rows = response["entities"] as? [String:[String:Any]] ?? [:]
                for entity in batch {
                    let claims = rows[entity]?["claims"] as? [String:[[String:Any]]] ?? [:]
                    let image = claims["P18"]?.first { $0["rank"] as? String != "deprecated" }
                    let snak = image?["mainsnak"] as? [String:Any], value = snak?["datavalue"] as? [String:Any]
                    if let file = value?["value"] as? String { for id in entities[entity] ?? [] { add(id,file) } }
                }
            } catch { try Task.checkCancellation();warnings.append("Wikidata photo metadata: "+error.localizedDescription) }
        }
        var photos: [String:ServicePhoto] = [:]
        for batch in ProviderParsing.chunks(Array(Set(files.values)).sorted().prefix(200).map { $0 }) {
            do {
                let response = try await request("https://commons.wikimedia.org/w/api.php",["action":"query","prop":"imageinfo","titles":batch.joined(separator:"|"),"iiprop":"url|extmetadata|mediatype","iiurlwidth":"900","redirects":"1"],ttl:3600)
                let q = response["query"] as? [String:Any] ?? [:], aliases = Self.aliases(q)
                for row in q["pages"] as? [[String:Any]] ?? [] {
                    guard let title = row["title"] as? String,let info = (row["imageinfo"] as? [[String:Any]])?.first,let meta = info["extmetadata"] as? [String:[String:Any]],let src = ProviderParsing.https(info["thumburl"] ?? info["url"]),let source = ProviderParsing.https(info["descriptionurl"]) else { continue }
                    let license = ProviderParsing.text(meta["LicenseShortName"]?["value"])
                    guard Self.allowedLicense(license), info["mediatype"] == nil || info["mediatype"] as? String == "BITMAP" else { continue }
                    let name = ProviderParsing.key(title),photo = ServicePhoto(url:src,alt:ProviderParsing.text(meta["ObjectName"]?["value"] ?? title),credit:ProviderParsing.text(meta["Artist"]?["value"] ?? meta["Credit"]?["value"] ?? "Wikimedia Commons contributor"),license:license,sourceURL:source,licenseURL:ProviderParsing.https(meta["LicenseUrl"]?["value"]),identity:name)
                    photos[name] = photo
                    for from in aliases.keys where Self.canonical(from,aliases:aliases) == name { photos[from] = photo }
                }
            } catch { try Task.checkCancellation();warnings.append("Commons photographs: "+error.localizedDescription) }
        }
        var used = Set<String>(), output: [ServicePlace] = []
        for var place in places {
            if let description = descriptions[place.id] {
                place.summary = description.text
                place.descriptionSourceURL = description.url
                place.descriptionLicense = "Wikipedia · CC BY-SA 4.0"
            }
            if let file = files[place.id], let photo = photos[ProviderParsing.key(file)], !used.contains(photo.identity) {
                place.photo = photo
                used.insert(photo.identity)
            }
            output.append(place)
            if output.count == limit { break }
        }
        return (output,warnings)
    }
    static func allowedLicense(_ license: String) -> Bool { license.range(of:"^(?:CC BY(?:-SA)? [1-4]\\.[0-9]|CC0(?: 1\\.0)?|Public domain)$",options:[.regularExpression,.caseInsensitive]) != nil }
    private static func aliases(_ query: [String:Any]) -> [String:String] {
        var result: [String:String] = [:]
        for row in (query["normalized"] as? [[String:Any]] ?? []) + (query["redirects"] as? [[String:Any]] ?? []) {
            if let from = row["from"] as? String,let to = row["to"] as? String { result[ProviderParsing.key(from)] = ProviderParsing.key(to) }
        }
        return result
    }
    private static func canonical(_ title: String,aliases: [String:String]) -> String {
        var key = ProviderParsing.key(title),seen = Set<String>()
        while let next = aliases[key],!seen.contains(key) { seen.insert(key);key = next }
        return key
    }
}


protocol NativePlaceSearching: Sendable {
    func search(latitude: Double, longitude: Double, radius: Int, mood: String) async throws -> [ServicePlace]
}

struct ApplePlaceSearch: NativePlaceSearching {
    func search(latitude: Double, longitude: Double, radius: Int, mood: String) async throws -> [ServicePlace] {
        let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        let request = MKLocalPointsOfInterestRequest(center: coordinate, radius: Double(radius))
        let categories: [MKPointOfInterestCategory]
        switch mood {
        case "coffee": categories = [.cafe, .bakery]
        case "food": categories = [.restaurant, .bakery, .foodMarket]
        case "outdoors", "quiet": categories = [.park, .nationalPark, .beach]
        case "culture": categories = [.museum, .library, .theater]
        default: categories = [.cafe, .museum, .park, .bakery, .restaurant, .library, .theater]
        }
        request.pointOfInterestFilter = MKPointOfInterestFilter(including: categories)
        let search = MKLocalSearch(request: request)
        let response = try await withTaskCancellationHandler {
            try await search.start()
        } onCancel: { search.cancel() }
        try Task.checkCancellation()
        return response.mapItems.compactMap { item in
            let point = item.placemark.coordinate
            guard let name = item.name, ProviderParsing.inAmsterdam(lat: point.latitude, lng: point.longitude),
                  ProviderParsing.distance(latitude, longitude, point.latitude, point.longitude) <= Double(radius) else { return nil }
            var components = URLComponents(string: "https://maps.apple.com/")
            components?.queryItems = [URLQueryItem(name: "ll", value: "\(point.latitude),\(point.longitude)"), URLQueryItem(name: "q", value: name)]
            guard let url = components?.url else { return nil }
            let id = "apple-\(point.latitude)-\(point.longitude)-\(name)"
            return ServicePlace(id: id, title: name, lat: point.latitude, lng: point.longitude, category: item.pointOfInterestCategory?.rawValue ?? "Nearby place", summary: PlaceSelection.invitation(for: item.pointOfInterestCategory?.rawValue ?? "place", name: name), photo: nil, sourceURL: url.absoluteString, provider: "Apple Maps", costEstimate: nil, wikipedia: nil, wikidata: nil, commonsImage: nil)
        }
    }
}

