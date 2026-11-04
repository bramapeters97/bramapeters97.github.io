import Foundation
import MapKit

struct NativeRoute: Codable, Hashable, Sendable {
    var durationMinutes: Int
    var walkingMinutes: Int
    var distanceMeters: Double
    var calculatedAt: Date
    var coordinates: [ServiceCoordinate] = []
    let source = "Apple Maps · calculated walking route"
    let note = "Route calculation does not verify opening hours, access, fares or venue prices."
}

enum NativeRouteService {
    /// Walking is the only mode claimed as checked. Cycling and transit stay
    /// explicit planner handoffs; a driving route never stands in for either.
    static func walkingRoute(from: ServiceCoordinate,to: ServiceCoordinate) async throws -> NativeRoute {
        guard abs(from.latitude)<=90,abs(to.latitude)<=90,abs(from.longitude)<=180,abs(to.longitude)<=180 else { throw ServiceError.invalidArea }
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark:MKPlacemark(coordinate:CLLocationCoordinate2D(latitude:from.latitude,longitude:from.longitude)))
        request.destination = MKMapItem(placemark:MKPlacemark(coordinate:CLLocationCoordinate2D(latitude:to.latitude,longitude:to.longitude)))
        request.transportType = .walking
        request.requestsAlternateRoutes = false
        let directions = MKDirections(request:request)
        let response = try await withTaskCancellationHandler {
            try await directions.calculate()
        } onCancel: { directions.cancel() }
        try Task.checkCancellation()
        guard let route = response.routes.first else { throw ServiceError.invalidResponse }
        let minutes = max(1,Int(ceil(route.expectedTravelTime/60)))
        var points = Array(repeating: CLLocationCoordinate2D(), count: route.polyline.pointCount)
        route.polyline.getCoordinates(&points, range: NSRange(location: 0, length: points.count))
        return NativeRoute(durationMinutes: minutes, walkingMinutes: minutes, distanceMeters: route.distance, calculatedAt: Date(), coordinates: points.map { ServiceCoordinate(latitude: $0.latitude, longitude: $0.longitude) })
    }
}


struct WalkingVisit: Codable, Hashable, Sendable {
    let origin: ServiceCoordinate
    let originName: String
    let outward: NativeRoute
    let returnLeg: NativeRoute?
    let visitMinutes: Int
    let reason: String
    var walkingMinutes: Int { outward.durationMinutes + (returnLeg?.durationMinutes ?? 0) }
    var totalMinutes: Int { walkingMinutes + visitMinutes + 5 }
}

protocol WalkingRouting: Sendable {
    func route(from: ServiceCoordinate, to: ServiceCoordinate) async throws -> NativeRoute
}

struct AppleWalkingRouter: WalkingRouting {
    func route(from: ServiceCoordinate, to: ServiceCoordinate) async throws -> NativeRoute {
        try await NativeRouteService.walkingRoute(from: from, to: to)
    }
}

/// Ranking uses straight-line distance only to shortlist candidates. Feasibility always uses routed walking legs.
enum PlaceSelection {
    static func kind(_ place: ServicePlace) -> String {
        let text = (place.category + " " + place.title + " " + place.summary).lowercased()
        if ["cafe", "café", "coffee", "bakery"].contains(where: text.contains) { return "coffee" }
        if ["restaurant", "food", "market", "bistro"].contains(where: text.contains) { return "food" }
        if ["park", "garden", "beach", "botanic"].contains(where: text.contains) { return "outdoors" }
        if ["museum", "gallery", "theater", "theatre", "library"].contains(where: text.contains) { return "culture" }
        return "discovery"
    }

    static func matching(_ places: [ServicePlace], mood: String) -> [ServicePlace] {
        let venues = places.filter { place in
            let title = place.title.lowercased()
            return !["stationseiland", "station amsterdam", "amsterdam centraal", "railway station", "metro station"].contains(where: title.contains)
        }
        guard mood != "any" && mood != "unexpected" else { return venues }
        return venues.filter {
            let category = kind($0)
            return mood == "quiet" ? category == "outdoors" || $0.category.lowercased().contains("library") : category == mood
        }
    }

    static func invitation(for category: String, name: String) -> String {
        let text = category.lowercased()
        if text.contains("cafe") || text.contains("bakery") { return "Make time for a coffee or a small treat at \(name). Check the venue’s current menu and opening hours before setting off." }
        if text.contains("park") || text.contains("garden") { return "Take a green detour through \(name), with a little time to wander or pause along the way." }
        if text.contains("museum") { return "Set aside a little time to explore \(name). Check current exhibitions, tickets and entry times before your visit." }
        if text.contains("library") { return "A quieter stop at \(name). Check today’s visitor access and opening hours before heading over." }
        if text.contains("restaurant") { return "Make \(name) your stop for something to eat. Check the current menu, prices and availability before you go." }
        return "Take a closer look at \(name) on your next Amsterdam wander. Check the original listing for visitor details."
    }

    static func visitMinutes(_ place: ServicePlace) -> Int {
        switch kind(place) {
        case "coffee": 20
        case "food": 40
        case "culture": 35
        case "outdoors": 20
        default: 10
        }
    }

    static func discoveryPool(_ places: [ServicePlace], latitude: Double, longitude: Double, limit: Int) -> [ServicePlace] {
        // Keep options beyond the dense cluster immediately beside a station or starting point.
        var bands = Array(repeating: [ServicePlace](), count: 4)
        for place in places {
            let distance = ProviderParsing.distance(latitude, longitude, place.lat, place.lng)
            let band = distance < 150 ? 0 : distance < 400 ? 1 : distance < 1000 ? 2 : 3
            bands[band].append(place)
        }
        var result: [ServicePlace] = []
        while result.count < limit {
            var added = false
            for index in bands.indices where result.count < limit && !bands[index].isEmpty {
                result.append(bands[index].removeFirst()); added = true
            }
            if !added { break }
        }
        return result
    }

    static func shortlist(_ places: [ServicePlace], mood: String, limit: Int = 12, origin: ServiceCoordinate? = nil, minutes: Int = 47) -> [ServicePlace] {
        let targetDistance = min(1000, max(150, Double(minutes - 20) * 25))
        func score(_ place: ServicePlace) -> Double {
            let distance = origin.map { ProviderParsing.distance($0.latitude, $0.longitude, place.lat, place.lng) } ?? targetDistance
            return abs(distance - targetDistance) + (place.photo == nil ? 500 : 0)
        }
        let candidates = matching(places, mood: mood).sorted { score($0) < score($1) }
        var groups: [String: [ServicePlace]] = [:]
        var order: [String] = []
        for place in candidates {
            let key = kind(place)
            if groups[key] == nil { order.append(key) }
            groups[key, default: []].append(place)
        }
        var selected: [ServicePlace] = []
        while selected.count < limit {
            var added = false
            for key in order where selected.count < limit {
                if var group = groups[key], !group.isEmpty {
                    selected.append(group.removeFirst()); groups[key] = group; added = true
                }
            }
            if !added { break }
        }
        return selected
    }
}

actor NearbySelectionService {
    private let router: any WalkingRouting
    init(router: any WalkingRouting = AppleWalkingRouter()) { self.router = router }

    func select(_ places: [ServicePlace], start: StartArea, finish: StartArea?, preferences: Preferences) async throws -> (places: [ServicePlace], warnings: [String]) {
        guard preferences.minutes > 0 else { return ([], ["Choose some available time to find a walk that fits."]) }
        let origin = ServiceCoordinate(latitude: start.lat, longitude: start.lng)
        let endpoint = finish.map { ServiceCoordinate(latitude: $0.lat, longitude: $0.lng) }
        let candidates = PlaceSelection.shortlist(places, mood: preferences.mood, origin: origin, minutes: preferences.minutes)
        var selected: [ServicePlace] = []
        var routeFailures = 0
        // Two requests at a time avoids flooding the routing service with all nearby venues.
        for batch in ProviderParsing.chunks(candidates, size: 2) {
            let outcomes = await withTaskGroup(of: (Int, ServicePlace?, Bool).self) { group in
                for (index, candidate) in batch.enumerated() {
                    group.addTask {
                        if preferences.strictBudget, let budget = preferences.budget,
                           candidate.costEstimate == nil || (candidate.costEstimate ?? 0) > budget { return (index, nil, false) }
                        do {
                            let destination = ServiceCoordinate(latitude: candidate.lat, longitude: candidate.lng)
                            let outward = try await self.router.route(from: origin, to: destination)
                            let back = try await endpoint.asyncMap { try await self.router.route(from: destination, to: $0) }
                            let reason = preferences.mood == "any" ? "A little \(PlaceSelection.kind(candidate) == "discovery" ? "discovery" : PlaceSelection.kind(candidate)) in your day" : "Picked for your \(preferences.mood == "quiet" ? "quieter" : preferences.mood) mood"
                            let visit = WalkingVisit(origin: origin, originName: start.name, outward: outward, returnLeg: back, visitMinutes: PlaceSelection.visitMinutes(candidate), reason: reason)
                            guard visit.totalMinutes <= preferences.minutes, visit.walkingMinutes <= preferences.walking else { return (index, nil, false) }
                            var place = candidate
                            place.walkingVisit = visit
                            return (index, place, false)
                        } catch { return (index, nil, true) }
                    }
                }
                var results: [(Int, ServicePlace?, Bool)] = []
                for await result in group { results.append(result) }
                return results.sorted { $0.0 < $1.0 }
            }
            try Task.checkCancellation()
            selected.append(contentsOf: outcomes.compactMap { $0.1 })
            routeFailures += outcomes.filter { $0.2 }.count
            if selected.count >= 5 { break }
        }
        var warnings: [String] = []
        if routeFailures > 0 { warnings.append("Some walking routes could not be checked, so those places were left out.") }
        if selected.isEmpty { warnings.append("No checked walking outing fits these choices yet. Try more time, a different mood or a more flexible budget.") }
        if preferences.transport != "walk" { warnings.append("These nearby picks use checked walking routes. For cycling or public transport, use the official planner or the Amsterdam collection.") }
        return (Array(selected.prefix(5)), warnings)
    }
}

private extension Optional where Wrapped: Sendable {
    func asyncMap<T>(_ transform: (Wrapped) async throws -> T) async rethrows -> T? {
        guard let value = self else { return nil }
        return try await transform(value)
    }
}
