import Foundation

struct StartArea: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var name: String
    var lat: Double
    var lng: Double
    var area: String
    var bank: String
    var city: String
    var region: String
    init(id: String, name: String, lat: Double, lng: Double, area: String = "Amsterdam", bank: String = "south", city: String = "Amsterdam", region: String = "Noord-Holland") {
        self.id=id; self.name=name; self.lat=lat; self.lng=lng; self.area=area; self.bank=bank; self.city=city; self.region=region
    }
    enum CodingKeys: String, CodingKey { case id,name,lat,lng,area,bank,city,region }
    init(from decoder: Decoder) throws {
        let c=try decoder.container(keyedBy: CodingKeys.self)
        id=try c.decode(String.self,forKey:.id); name=try c.decodeIfPresent(String.self,forKey:.name) ?? id
        lat=try c.decode(Double.self,forKey:.lat); lng=try c.decode(Double.self,forKey:.lng)
        area=try c.decodeIfPresent(String.self,forKey:.area) ?? "Amsterdam"; bank=try c.decodeIfPresent(String.self,forKey:.bank) ?? "south"
        city=try c.decodeIfPresent(String.self,forKey:.city) ?? "Amsterdam"; region=try c.decodeIfPresent(String.self,forKey:.region) ?? "Noord-Holland"
    }
}

struct Place: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var name: String
    var lat: Double
    var lng: Double
    var area: String
    var areaId: String
    var city: String
    var region: String
    var bank: String
    var category: String
    var photoKey: String
    var indoor: Bool
    var cost: Double?
    var dwell: Int
    var access: String
    var activityWalking: Int
    var source: String
    var description: String
    var provenance: [String:String]?
    var point: StartArea { StartArea(id:id,name:name,lat:lat,lng:lng,area:area,bank:bank,city:city,region:region) }
}

struct Excursion: Codable, Hashable, Sendable {
    var `operator`: String
    var destination: String
    var origin: String
    var minimumWindow: Int
    var railAllowance: Int
    var waitAllowance: Int
    var stationBuffer: Int
    var destinationStation: StartArea
    var source: String
    var planner: String
    var outboundURL: String?
    var returnURL: String?
}

struct Experience: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var title: String
    var description: String
    var placeIds: [String]
    var moods: [String]
    var photoKey: String
    var city: String
    var region: String
    var kind: String
    var restAt: String?
    var restMinutes: Int?
    var meal: String?
    var excursion: Excursion?
    var `operator`: String?
}

struct Catalog: Codable, Sendable {
    var version: Int
    var places: [Place]
    var experiences: [Experience]
    var starts: [StartArea]
    var attribution: String
    static func load(bundle: Bundle = .main) throws -> Catalog {
        guard let url=bundle.url(forResource:"catalogue",withExtension:"json") else { throw CocoaError(.fileNoSuchFile) }
        return try JSONDecoder().decode(Catalog.self,from:Data(contentsOf:url))
    }
}

struct Preferences: Codable, Hashable, Sendable {
    var minutes = 47
    var start = "central"
    var endpoint = "none"
    var mood = "any"
    var transport = "walk"
    var budget: Double? = 20
    var walking = 45
    var strictBudget = false
}

enum Eligibility: String, Codable, Hashable, Sendable {
    case fits, check
    case moreTime = "more-time"
    var label: String { switch self { case .fits: return "Fits your window · sample plan"; case .check: return "Price, access or route needs checking"; case .moreTime: return "Needs a little more time" } }
    var symbol: String { switch self { case .fits: return "checkmark"; case .check: return "info.circle"; case .moreTime: return "clock" } }
}

struct PlacePhoto: Codable, Hashable, Sendable {
    var url: String
    var alt: String
    var credit: String
    var license: String
    var sourceURL: String
    var licenseURL: String?
}

struct TravelSegment: Codable, Hashable, Sendable {
    var mode: String
    var minutes: Int
    var walking: Int
    var waiting: Int
    var description: String
    var source: String?
    var connector: String?
    var estimated = true
}

struct TravelLeg: Codable, Hashable, Sendable {
    var minutes = 0
    var walking = 0
    var waiting = 0
    var cost: Double = 0
    var costUnknown = false
    var needsCheck = false
    var segments: [TravelSegment] = []
    var from = ""
    var to = ""
    var fromId: String?
    var toId: String?
    var endpoint = false
}

struct PlanStop: Codable, Hashable, Identifiable, Sendable {
    var place: Place
    var walk: Int
    var travel: Int
    var dwell: Int
    var rest: Int
    var opening: String
    var availability: String
    var arriveAt: Date
    var departAt: Date
    var leg: [TravelSegment]
    var id: String { place.id }
    var name: String { place.name }
    var description: String { place.description }
    var lat: Double { place.lat }
    var lng: Double { place.lng }
    var cost: Double? { place.cost }
    var activityWalking: Int { place.activityWalking }
    var source: String { place.source }
    var area: String { place.area }
}

struct Plan: Codable, Hashable, Identifiable, Sendable {
    var id = ""
    var title = ""
    var description = ""
    var stops: [PlanStop] = []
    var total = 0
    var travelMinutes = 0
    var walking = 0
    var waiting = 0
    var cost: Double? = nil
    var knownCost: Double = 0
    var costLabel = "Price or fare unverified"
    var photoKey: String? = nil
    var photo: PlacePhoto? = nil
    var status = Eligibility.check
    var reason = "Route, price and access need checking."
    var minimumMinutes = 0
    var buffer = 0
    var safetyBuffer = 5
    var endpoint = "Final stop"
    var endpointTravel = 0
    var legs: [TravelLeg] = []
    var source = "Curated Amsterdam catalogue · estimated travel"
    var sourceURL: String? = nil
    var rankReasons: [String] = []
    var checks: [String] = []
    var moods: [String] = []
    var kind = ""
    var area = "Amsterdam"
    var isLive = false
    var routeVerified = false
    var startedAt = Date()
    var finishAt = Date()
    var origin = StartArea(id:"central",name:"Amsterdam Centraal",lat:52.3791,lng:4.9003,area:"Centrum")
    var originalOrigin: StartArea? = nil
    var prefs = Preferences()
    var experience: Experience? = nil
    var feasible: Bool { status == .fits && prefs.minutes > 0 }
}

struct SavedIdea: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var prefs: Preferences
    var title: String
    var sourceURL: String?
    var isLive: Bool
    var latitude: Double?
    var longitude: Double?
}

struct ActiveOuting: Codable, Hashable, Sendable {
    var plan: Plan
    var prefs: Preferences
    var done: [String] = []
    var skipped: [String] = []
    var elapsedMinutes = 0
    var walkedMinutes = 0
    var spentCost: Double = 0
    var startedAt = Date()
}

struct Memory: Codable, Hashable, Identifiable, Sendable {
    var id: String
    var title: String
    var note: String
    var rating: String
    var minutes: Int
    var date: Date
    var photoKey: String?
    var photoFile: String?
    var sample = false
}

struct UserState: Codable, Sendable {
    var version = 1
    var prefs = Preferences()
    var saved: [SavedIdea] = []
    var active: ActiveOuting?
    var journal: [Memory] = []
    var customStart: StartArea?
}

extension Int {
    var amstrollDuration: String {
        let value = Swift.max(0, self)
        let hours = value / 60
        let minutes = value % 60
        if hours == 0 { return "\(minutes) min" }
        return minutes == 0 ? "\(hours)h" : "\(hours)h \(minutes)m"
    }
}
