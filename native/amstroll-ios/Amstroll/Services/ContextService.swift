import Foundation

struct WeatherContext: Sendable {
    var temperature: Double?
    var precipitation: Double?
    var summary: String
    var forecastTime: String
    var retrievedAt: Date
    let source = "MET Norway · CC BY 4.0"
    let sourceURL = "https://docs.api.met.no/doc/License"
}
struct MunicipalStop: Identifiable, Sendable {
    var id: String
    var name: String
    var lat: Double
    var lng: Double
    var mode: String
    var lines: [String]
    var distanceMeters: Int
}
struct MunicipalStopResult: Sendable {
    var stops: [MunicipalStop]
    var retrievedAt: Date
    let source = "Gemeente Amsterdam · Tramhaltes en metrostations 2026"
    let sourceURL = "https://maps.amsterdam.nl/open_geodata/?k=649"
    let note = "Municipal stop locations and source line context, not departures, disruptions or confirmed service. Distances are straight-line estimates."
}
struct PlaceContext: Sendable {
    var title: String
    var text: String
    var source: String
    var sourceURL: String
    var license: String
}

actor ContextService {
    private let client: any HTTPDataLoading
    init(client: any HTTPDataLoading = NativeHTTPClient()) { self.client = client }

    func weather(latitude: Double, longitude: Double) async throws -> WeatherContext {
        guard latitude.isFinite,longitude.isFinite,abs(latitude)<=90,abs(longitude)<=180 else { throw ServiceError.invalidArea }
        let lat = (latitude*1000).rounded()/1000,lng = (longitude*1000).rounded()/1000
        let url = URL(string:"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=\(lat)&lon=\(lng)")!
        let data = try await client.data(for:URLRequest(url:url),ttl:1200)
        let result = try ProviderParsing.json(data),properties = result["properties"] as? [String:Any]
        let series = properties?["timeseries"] as? [[String:Any]] ?? []
        let format = ISO8601DateFormatter()
        guard let next = series.first(where:{ (format.date(from:$0["time"] as? String ?? "") ?? .distantPast) >= Date().addingTimeInterval(-3600) }) ?? series.first else { throw ServiceError.invalidResponse }
        let sample = next["data"] as? [String:Any] ?? [:]
        let instant = sample["instant"] as? [String:Any],details = instant?["details"] as? [String:Any]
        let one = sample["next_1_hours"] as? [String:Any],six = sample["next_6_hours"] as? [String:Any]
        let summary = (one?["summary"] ?? six?["summary"]) as? [String:Any]
        let oneDetails = one?["details"] as? [String:Any]
        return WeatherContext(temperature:ProviderParsing.number(details?["air_temperature"]),precipitation:ProviderParsing.number(oneDetails?["precipitation_amount"]),summary:(summary?["symbol_code"] as? String ?? "Forecast details available").replacingOccurrences(of:"_",with:" "),forecastTime:next["time"] as? String ?? "",retrievedAt:Date())
    }

    func nearbyStops(latitude: Double, longitude: Double) async throws -> MunicipalStopResult {
        guard ProviderParsing.inAmsterdam(lat:latitude,lng:longitude) else { throw ServiceError.invalidArea }
        let url = URL(string:"https://maps.amsterdam.nl/open_geodata/geojson_lnglat.php?KAARTLAAG=TRAMMETRO_PUNTEN_2026&THEMA=trammetro")!
        let result = try ProviderParsing.json(await client.data(for:URLRequest(url:url),ttl:3600))
        guard result["type"] as? String == "FeatureCollection",let features = result["features"] as? [[String:Any]],features.count <= 500 else { throw ServiceError.invalidResponse }
        var stops: [MunicipalStop] = []
        for (index,feature) in features.enumerated() {
            guard let geometry = feature["geometry"] as? [String:Any],geometry["type"] as? String == "Point",let coordinate = geometry["coordinates"] as? [Double],coordinate.count>=2 else { continue }
            let p = feature["properties"] as? [String:Any] ?? [:]
            let name = ProviderParsing.text(p["Naam"] ?? p["naam"] ?? p["Label"] ?? "Unnamed municipal stop")
            let mode = ProviderParsing.text(p["Modaliteit"] ?? p["modaliteit"] ?? "Not supplied")
            let rawLines = String(describing:p["Lijn"] ?? p["Lijn_select"] ?? "").replacingOccurrences(of:"<br[^>]*>",with:",",options:.regularExpression)
            let regex = try NSRegularExpression(pattern:"\\b\\d{1,3}\\b")
            let clean = ProviderParsing.text(rawLines) as NSString
            let lines = Array(Set(regex.matches(in:clean as String,range:NSRange(location:0,length:clean.length)).map { clean.substring(with:$0.range) })).sorted()
            stops.append(MunicipalStop(id:String(describing:feature["id"] ?? p["Id"] ?? "stop-\(index)"),name:name,lat:coordinate[1],lng:coordinate[0],mode:mode,lines:lines,distanceMeters:Int(ProviderParsing.distance(latitude,longitude,coordinate[1],coordinate[0]).rounded())))
        }
        // Some Centraal rows repeat station-wide lines across tram and metro.
        // Do not turn those source rows into an asserted per-mode timetable.
        for index in stops.indices {
            let row = stops[index]
            if !row.lines.isEmpty,stops.contains(where:{$0.name == row.name && $0.lines == row.lines && $0.mode != row.mode}) { stops[index].mode = "Tram / Metro · combined station lines" }
        }
        return MunicipalStopResult(stops:Array(stops.sorted{$0.distanceMeters < $1.distanceMeters}.prefix(12)),retrievedAt:Date())
    }

    func context(for place: ServicePlace) async throws -> PlaceContext {
        if let wikipedia = place.wikipedia {
            let parts = wikipedia.split(separator:":",maxSplits:1).map(String.init)
            if parts.count == 2,parts[0].range(of:"^[a-z]{2,3}$",options:.regularExpression) != nil {
                let request = try ProviderParsing.api("https://\(parts[0]).wikipedia.org/w/api.php",["action":"query","prop":"extracts|info","exintro":"1","explaintext":"1","exchars":"650","inprop":"url","titles":parts[1],"redirects":"1"])
                let result = try ProviderParsing.json(await client.data(for:request,ttl:3600)),query = result["query"] as? [String:Any]
                if let page = (query?["pages"] as? [[String:Any]])?.first(where:{$0["missing"] == nil}),let extract = page["extract"] as? String,!extract.isEmpty {
                    return PlaceContext(title:page["title"] as? String ?? place.title,text:ProviderParsing.text(extract),source:"Wikipedia contributors",sourceURL:ProviderParsing.https(page["fullurl"]) ?? place.sourceURL,license:"CC BY-SA 4.0")
                }
            }
        }
        if let entity = place.wikidata,entity.range(of:"^Q[0-9]+$",options:.regularExpression) != nil {
            let request = try ProviderParsing.api("https://www.wikidata.org/w/api.php",["action":"wbgetentities","ids":entity,"props":"labels|descriptions","languages":"en|nl"])
            let result = try ProviderParsing.json(await client.data(for:request,ttl:3600)),entities = result["entities"] as? [String:[String:Any]]
            let descriptions = entities?[entity]?["descriptions"] as? [String:[String:Any]]
            if let value = descriptions?["en"]?["value"] ?? descriptions?["nl"]?["value"] {
                return PlaceContext(title:place.title,text:ProviderParsing.text(value),source:"Wikidata contributors",sourceURL:"https://www.wikidata.org/wiki/"+entity,license:"CC0 1.0")
            }
        }
        throw ServiceError.noPlaces("No factual description was available for the linked place identity.")
    }
}

enum TransportLinks {
    static func destinationMap(latitude: Double, longitude: Double, name: String) -> URL {
        var components = URLComponents(string: "https://maps.apple.com/")!
        components.queryItems = [URLQueryItem(name: "ll", value: "\(latitude),\(longitude)"), URLQueryItem(name: "q", value: name)]
        return components.url!
    }
    static let gvb = URL(string:"https://www.gvb.nl/reisinformatie")!
    static let ns = URL(string:"https://www.ns.nl/en/journeyplanner/")!
    static func walkingDirections(latitude: Double, longitude: Double, name: String) -> URL {
        var components = URLComponents(string:"https://maps.apple.com/")!
        components.queryItems = [URLQueryItem(name:"daddr",value:"\(latitude),\(longitude)"),URLQueryItem(name:"dirflg",value:"w"),URLQueryItem(name:"q",value:name)]
        return components.url!
    }
}
