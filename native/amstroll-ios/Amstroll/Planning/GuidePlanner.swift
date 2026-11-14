import Foundation

/// The iPhone bundle is generated from the same Valhalla route and photo manifest as the web guide.
struct GuidePlanner: Sendable {
    private struct Photo: Decodable, Sendable {
        let key: String
        let date: String?
    }
    private struct Note: Decodable, Sendable {
        let text: String
        let sourceUrl: String
    }
    private struct Pair: Decodable, Sendable {
        let then: Photo
        let now: Photo
    }
    private struct Destination: Decodable, Sendable {
        let id: String
        let name: String
        let lat: Double
        let lng: Double
        let area: String
        let bank: String
        let category: String
        let dwell: Int
        let cost: Double?
        let access: String
        let moods: [String]
        let photo: Photo
        let sourceUrl: String
        let description: String
        let observation: Note?
        let thenAndNow: Pair?
        let indoor: Bool?
        let openingHours: String?
        let hoursValidUntil: String?
        let accessibility: String?

        var place: Place {
            Place(id: id, name: name, lat: lat, lng: lng, area: area, areaId: area, city: "Amsterdam",
                  region: "Noord-Holland", bank: bank, category: category, photoKey: photo.key,
                  indoor: indoor ?? false, cost: cost, dwell: dwell, access: access, activityWalking: 0,
                  source: sourceUrl, description: description, provenance: nil)
        }
    }
    private struct Outing: Decodable, Sendable {
        let id: String
        let title: String
        let description: String
        let placeIds: [String]
        let theme: String
        let moods: [String]
    }
    private struct Edge: Decodable, Sendable {
        let seconds: Double
        let geometry: [[Double]]
        let ferry: Bool
        let accessibility: String?
    }
    private struct DataSet: Decodable, Sendable {
        let starts: [StartArea]
        let places: [Destination]
        let outings: [Outing]
        let routes: [String: Edge]
    }

    private let data: DataSet
    private let destinations: [String: Destination]
    private let edges: [String: [(String, Edge)]]
    private static let source = "OpenStreetMap · Valhalla pedestrian routes"
    static let gvb = "https://www.gvb.nl/reisinformatie"

    init(data bytes: Data) throws {
        let data = try JSONDecoder().decode(DataSet.self, from: bytes)
        self.data = data
        destinations = Dictionary(uniqueKeysWithValues: data.places.map { ($0.id, $0) })
        var outgoing: [String: [(String, Edge)]] = [:]
        for key in data.routes.keys.sorted() {
            let points = key.components(separatedBy: ">")
            guard points.count == 2, let edge = data.routes[key], !edge.ferry, edge.seconds.isFinite,
                  edge.seconds > 0, edge.geometry.count > 1 else { continue }
            outgoing[points[0], default: []].append((points[1], edge))
        }
        edges = outgoing
    }

    static func load(bundle: Bundle = .main) -> GuidePlanner? {
        guard let url = bundle.url(forResource: "guide-data", withExtension: "json"),
              let bytes = try? Data(contentsOf: url) else { return nil }
        return try? GuidePlanner(data: bytes)
    }

    var photoKeys: Set<String> { Set(data.places.map(\.photo.key)) }

    func route(from: StartArea, to: StartArea, stepFree: Bool = false) -> TravelLeg? {
        var valid = TravelLeg(from: from.name, to: to.name, fromId: from.id, toId: to.id, coords: [])
        if from.id == to.id { return valid }
        var best: [String: (minutes: Int, geometry: [[Double]])] = [from.id: (0, [])]
        var pending: Set<String> = [from.id]
        while let id = pending.min(by: { a, b in
            let first = best[a]?.minutes ?? Int.max, second = best[b]?.minutes ?? Int.max
            return first == second ? a < b : first < second
        }), let current = best[id] {
            pending.remove(id)
            if id == to.id {
                valid.minutes = current.minutes
                valid.walking = current.minutes
                valid.coords = current.geometry
                valid.segments = [TravelSegment(mode: "walk", minutes: current.minutes, walking: current.minutes,
                    waiting: 0, description: "Walk the mapped streets", source: Self.source)]
                return valid
            }
            for (destination, edge) in edges[id, default: []] where !stepFree || edge.accessibility == "yes" {
                let minutes = current.minutes + Int(ceil(edge.seconds / 60))
                if minutes < (best[destination]?.minutes ?? Int.max) {
                    best[destination] = (minutes, current.geometry + edge.geometry)
                    pending.insert(destination)
                }
            }
        }
        return nil
    }

    func suggestions(prefs: Preferences, start: StartArea, end: StartArea?, now: Date) -> [Plan] {
        let origin = data.starts.first { $0.id == start.id } ?? start
        let finish = end.map { named in data.starts.first { $0.id == named.id } ?? named }
        let patterns = candidates(around: origin, prefs: prefs, now: now)
        let plans = patterns.compactMap {
            plan($0, prefs: prefs, origin: origin, finish: finish, now: now)
        }.filter { plan in
            !plan.checks.contains("Access closed") && !plan.checks.contains("Budget exceeded")
                && !plan.checks.contains("Walking limit exceeded") && !plan.checks.contains("Step-free route unverified")
        }
        var result: [Plan] = []
        var usedPhotos: Set<String> = []
        for status in [Eligibility.fits, .check, .moreTime] {
            var group = plans.filter { $0.status == status }
            var themes: [String: Int] = [:]
            var areas: [String: Int] = [:]
            func score(_ plan: Plan) -> Double {
                let affinity = prefs.mood != "any" && plan.moods.contains(prefs.mood) ? 28.0 : 0
                let visit = Double(plan.stops.reduce(0) { $0 + $1.dwell })
                let editorial = data.outings.contains { $0.id == plan.id } ? 12.0 : 0
                return affinity + editorial + min(30, visit) * 0.55 + Double(min(10, max(0, plan.buffer - 5))) * 0.5
                    - Double(plan.travelMinutes) * 0.24 - Double(themes[plan.kind, default: 0] * 6 + areas[plan.area, default: 0] * 4)
            }
            while !group.isEmpty {
                group.sort { score($0) == score($1) ? $0.id < $1.id : score($0) > score($1) }
                let next = group.removeFirst()
                guard let key = next.photoKey, usedPhotos.insert(key).inserted else { continue }
                result.append(next)
                themes[next.kind, default: 0] += 1
                areas[next.area, default: 0] += 1
            }
        }
        return result
    }

    private func candidates(around origin: StartArea, prefs: Preferences, now: Date) -> [Outing] {
        let limit = prefs.availableMinutes(at: now)
        var result = data.outings
        var seen = Set(result.map(\.placeIds))
        guard limit >= 35 else { return result }
        let nearby = data.places.sorted {
            let a = PlanningEngine.distance(origin, $0.place.point), b = PlanningEngine.distance(origin, $1.place.point)
            return a == b ? $0.id < $1.id : a < b
        }.filter { $0.access == "public" }
        func add(_ group: [Destination]) {
            let ids = group.map(\.id)
            guard let first = group.first, seen.insert(ids).inserted else { return }
            result.append(Outing(id: "guide-" + ids.joined(separator: "-"),
                title: group.map(\.name).formatted(.list(type: .and)),
                description: first.description, placeIds: ids, theme: first.category,
                moods: Array(Set(group.flatMap(\.moods))).sorted()))
        }
        for candidate in nearby.prefix(8) {
            let neighbours = nearby.filter { $0.id != candidate.id && $0.bank == candidate.bank
                && ($0.area == candidate.area || PlanningEngine.distance(candidate.place.point, $0.place.point) < 900) }
                .sorted { PlanningEngine.distance(candidate.place.point, $0.place.point) < PlanningEngine.distance(candidate.place.point, $1.place.point) }
            guard let second = neighbours.first else { continue }
            add([candidate, second])
            if limit >= 75, let third = neighbours.dropFirst().first(where: {
                PlanningEngine.distance(second.place.point, $0.place.point) < 650
            }) { add([candidate, second, third]) }
        }
        return result
    }

    func refresh(_ original: Plan, prefs: Preferences, now: Date) -> Plan? {
        let ids = original.experience?.placeIds ?? original.stops.map(\.id)
        let outing = Outing(id: original.id, title: original.title, description: original.description,
            placeIds: ids, theme: original.kind, moods: original.moods)
        return plan(outing, prefs: prefs, origin: original.origin, finish: original.guideDetails?.finishPoint, now: now)
    }

    func remaining(_ active: ActiveOuting, now: Date, replacingWith replacement: String? = nil) -> Plan? {
        let base = active.plan
        guard let details = base.guideDetails else { return nil }
        let originalIDs = base.experience?.placeIds ?? base.stops.map(\.id)
        var ids = originalIDs.filter { !active.done.contains($0) && !active.skipped.contains($0) }
        if let replacement, !ids.isEmpty { ids[0] = replacement }
        let current = active.done.last.flatMap { destinations[$0]?.place.point } ?? base.origin
        var prefs = active.prefs
        prefs.deadline = details.deadline
        prefs.walking = max(0, prefs.walking - active.walkedMinutes)
        prefs.budget = prefs.budget.map { max(0, $0 - active.spentCost) }
        let elapsed = max(now, active.startedAt.addingTimeInterval(Double(active.elapsedMinutes) * 60))
        let outing = Outing(id: base.id, title: base.title, description: base.description,
            placeIds: ids, theme: base.kind, moods: base.moods)
        return plan(outing, prefs: prefs, origin: current, finish: details.finishPoint,
                    now: elapsed, primaryFallback: base.stops.first?.id ?? active.done.last)
    }

    func swap(_ active: ActiveOuting, now: Date) -> ActiveOuting? {
        guard let current = remaining(active, now: now)?.stops.first else { return nil }
        let unavailable = Set((active.plan.experience?.placeIds ?? []) + active.done + active.skipped + [current.id])
        let choices = data.places.filter { !unavailable.contains($0.id) }.sorted { a, b in
            let matchA = a.category == current.place.category, matchB = b.category == current.place.category
            if matchA != matchB { return matchA }
            return PlanningEngine.distance(current.place.point, a.place.point) < PlanningEngine.distance(current.place.point, b.place.point)
        }
        for replacement in choices {
            guard let alternative = remaining(active, now: now, replacingWith: replacement.id), alternative.feasible,
                  var experience = active.plan.experience,
                  let index = experience.placeIds.firstIndex(of: current.id) else { continue }
            experience.placeIds[index] = replacement.id
            var next = active
            next.plan.experience = experience
            if let place = destinations[replacement.id]?.place,
               let stop = alternative.stops.first {
                next.plan.stops = next.plan.stops.map { $0.id == current.id ? stop : $0 }
                if next.plan.photoKey == current.place.photoKey { next.plan.photoKey = place.photoKey }
            }
            return next
        }
        return nil
    }

    private func plan(_ outing: Outing, prefs: Preferences, origin: StartArea, finish: StartArea?,
                      now: Date, primaryFallback: String? = nil) -> Plan? {
        let selected = outing.placeIds.compactMap { destinations[$0] }
        guard selected.count == outing.placeIds.count,
              let primary = selected.first ?? primaryFallback.flatMap({ destinations[$0] }),
              let end = finish ?? selected.last?.place.point else { return nil }
        let deadline = prefs.deadline ?? now.addingTimeInterval(Double(prefs.minutes) * 60)
        let stepFree = prefs.requiresStepFree == true
        var current = origin
        var cursor = now
        var legs: [TravelLeg] = []
        var stops: [PlanStop] = []
        var checks: [String] = []
        var missing = false
        var handoff: String?
        var cost = 0.0
        var unknownCost = false

        func travel(to point: StartArea, endpoint: Bool) -> TravelLeg? {
            guard prefs.transport == "walk", var segment = route(from: current, to: point, stepFree: stepFree) else {
                missing = true
                if current.bank != point.bank && [current.bank, point.bank].contains("north") || prefs.transport == "transit" {
                    handoff = Self.gvb
                    checks.append("Check the crossing or transit service with GVB")
                } else if stepFree {
                    checks.append("Step-free route unverified")
                } else {
                    handoff = "https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&route=\(current.lat)%2C\(current.lng)%3B\(point.lat)%2C\(point.lng)"
                    checks.append("Walking route needs checking")
                }
                current = point
                return nil
            }
            segment.endpoint = endpoint
            if segment.minutes > 0 { legs.append(segment) }
            cursor = cursor.addingTimeInterval(Double(segment.minutes) * 60)
            current = point
            return segment
        }

        for destination in selected {
            let place = destination.place
            let leg = travel(to: place.point, endpoint: false)
            let arrival = cursor
            cursor = cursor.addingTimeInterval(Double(place.dwell) * 60)
            let opening = missing ? Opening.unknown : openingState(destination, arrival: arrival, departure: cursor)
            if opening == .closed { checks.append("Access closed") }
            if opening == .unknown && !missing { checks.append("Opening hours need checking") }
            if stepFree && destination.accessibility != "yes" { checks.append("Step-free route unverified") }
            if let price = place.cost { cost += price } else { unknownCost = true }
            stops.append(PlanStop(place: place, walk: leg?.walking ?? 0, travel: leg?.minutes ?? 0,
                dwell: place.dwell, rest: 0, opening: opening.label, availability: opening.rawValue,
                arriveAt: arrival, departAt: cursor, leg: leg?.segments ?? []))
        }
        let final = travel(to: end, endpoint: true)
        let walking = legs.reduce(0) { $0 + $1.walking }
        let total = Int(ceil(cursor.timeIntervalSince(now) / 60)) + 5
        let minutes = prefs.availableMinutes(at: now)
        if walking > prefs.walking { checks.append("Walking limit exceeded") }
        if let budget = prefs.budget, cost > budget || (unknownCost && (prefs.strictBudget || budget == 0)) {
            checks.append("Budget exceeded")
        } else if unknownCost { checks.append("Required cost needs checking") }
        let status: Eligibility = checks.isEmpty ? (minutes > 0 && total <= minutes ? .fits : .moreTime) : .check
        let dwell = selected.reduce(0) { $0 + $1.dwell }
        let finishMinutes = final?.minutes ?? 0
        let reason = status == .fits
            ? "\(walking - finishMinutes) min to and between stops, \(dwell) min to explore, \(finishMinutes) min to finish, and \(max(0, minutes - total)) min spare after the buffer."
            : status == .moreTime ? "Allow \(total) minutes including the finish and buffer." : (checks.first ?? "Check this outing before going.")
        let experience = Experience(id: outing.id, title: outing.title, description: outing.description,
            placeIds: outing.placeIds, moods: outing.moods, photoKey: primary.photo.key, city: "Amsterdam",
            region: "Noord-Holland", kind: outing.theme)
        return Plan(id: outing.id, title: outing.title, description: outing.description, stops: stops,
            total: missing ? 0 : total, travelMinutes: walking, walking: walking, cost: unknownCost ? nil : cost,
            knownCost: cost, costLabel: unknownCost ? "Cost needs checking" : cost == 0 ? "No purchase needed" : cost.formatted(.currency(code: "EUR")),
            photoKey: primary.photo.key, status: status, reason: reason, minimumMinutes: missing ? 0 : total,
            buffer: missing ? 0 : minutes - total + 5, endpoint: end.name, endpointTravel: finishMinutes,
            legs: legs, source: Self.source, sourceURL: primary.sourceUrl, rankReasons: [reason],
            checks: Array(Set(checks)).sorted(), moods: outing.moods, kind: outing.theme, area: primary.area,
            routeVerified: !missing, startedAt: now, finishAt: cursor, origin: origin,
            prefs: prefs, experience: experience, guideDetails: GuideDetails(observation: primary.observation?.text,
                observationURL: primary.observation?.sourceUrl, thenPhotoKey: primary.thenAndNow?.then.key,
                nowPhotoKey: primary.thenAndNow?.now.key, thenDate: primary.thenAndNow?.then.date,
                nowDate: primary.thenAndNow?.now.date, finishPoint: end, deadline: deadline, handoffURL: handoff))
    }

    private enum Opening: String {
        case open, closed, unknown
        var label: String {
            switch self {
            case .open: return "Published hours allow this visit"
            case .closed: return "Closed during this visit"
            case .unknown: return "Opening hours need checking"
            }
        }
    }

    private func openingState(_ place: Destination, arrival: Date, departure: Date) -> Opening {
        if ["private", "no"].contains(place.access) { return .closed }
        guard let rules = place.openingHours else { return place.access == "public" ? .open : .unknown }
        if let expires = place.hoursValidUntil,
           ISO8601DateFormatter().date(from: expires).map({ departure > $0 }) != false { return .unknown }
        if rules == "24/7" { return .open }
        var local = Calendar(identifier: .gregorian)
        local.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        let days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
        var hours: [Int: [Range<Int>]] = [:]
        func minute(_ stamp: Substring) -> Int? {
            let parts = stamp.split(separator: ":").compactMap { Int($0) }
            guard parts.count == 2, (0...24).contains(parts[0]), (0...59).contains(parts[1]),
                  parts[0] < 24 || parts[1] == 0 else { return nil }
            return parts[0] * 60 + parts[1]
        }
        for rule in rules.split(separator: ";") {
            let parts = rule.split(whereSeparator: \.isWhitespace)
            guard parts.count == 2 else { return .unknown }
            for day in parts[0].split(separator: ",") {
                let span = day.split(separator: "-")
                guard let firstName = span.first, let lastName = span.last,
                      let first = days.firstIndex(of: String(firstName)), let last = days.firstIndex(of: String(lastName)) else { return .unknown }
                for offset in 0...((last - first + 7) % 7) {
                    let index = (first + offset) % 7
                    if parts[1] == "off" { hours[index] = []; continue }
                    for range in parts[1].split(separator: ",") {
                        let split = range.split(separator: "-")
                        guard split.count == 2, let lo = minute(split[0]), let hi = minute(split[1]), lo != hi, lo < 1440 else { return .unknown }
                        if lo < hi { hours[index, default: []].append(lo..<hi) }
                        else {
                            hours[index, default: []].append(lo..<1440)
                            hours[(index + 1) % 7, default: []].append(0..<hi)
                        }
                    }
                }
            }
        }
        let year = local.component(.year, from: arrival)
        let a = year % 19, b = year / 100, c = year % 100
        let d = b / 4, f = (b + 8) / 25
        let g = (b - f + 1) / 3
        let h = (19 * a + b - d - g + 15) % 30
        let l = (32 + 2 * (b % 4) + 2 * (c / 4) - h - c % 4) % 7
        let m = (a + 11 * h + 22 * l) / 451
        let easter = h + l - 7 * m + 114
        let easterSunday = local.date(from: DateComponents(year: year, month: easter / 31, day: easter % 31 + 1))
        var check = arrival
        while check < departure {
            let value = local.dateComponents([.weekday, .hour, .minute, .month, .day], from: check)
            guard let month = value.month, let day = value.day, let weekday = value.weekday,
                  let hour = value.hour, let minute = value.minute else { return .unknown }
            let fixedHoliday = [(1, 1), (4, 27), (5, 5), (12, 25), (12, 26)].contains { $0 == (month, day) }
                || (weekday == 7 && month == 4 && day == 26)
            let offset = easterSunday.flatMap { local.dateComponents([.day], from: $0, to: local.startOfDay(for: check)).day }
            if fixedHoliday || offset.map({ [-2, 0, 1, 39, 49, 50].contains($0) }) == true { return .unknown }
            let slot = hour * 60 + minute
            if !(hours[weekday - 1]?.contains { $0.contains(slot) } ?? false) { return .closed }
            check = Date(timeIntervalSince1970: (floor(check.timeIntervalSince1970 / 60) + 1) * 60)
        }
        return .open
    }
}
