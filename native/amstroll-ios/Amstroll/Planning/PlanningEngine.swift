import Foundation

/// Faithful port of the authored JavaScript estimates, not a navigation provider.
struct PlanningContext: Sendable {
    var now = Date()
    var demoAvailability = false
    var availability: [String:Bool] = [:]
    var demoTransport = false
    var demoFerry = false
    var rainExpected: Bool? = nil
    var weatherSource: String? = nil
}

enum PlanningError: LocalizedError {
    case invalid(String)
    var errorDescription: String? { if case .invalid(let message)=self { return message }; return nil }
}

final class PlanningEngine {
    private(set) var catalog: Catalog
    private let places: [String:Place]
    private let experiences: [String:Experience]
    init(catalog: Catalog) {
        self.catalog=catalog
        places=Dictionary(uniqueKeysWithValues:catalog.places.map { ($0.id,$0) })
        experiences=Dictionary(uniqueKeysWithValues:catalog.experiences.map { ($0.id,$0) })
    }
    func registerStart(_ value: StartArea) {
        guard value.lat.isFinite, value.lng.isFinite, abs(value.lat)<=90, abs(value.lng)<=180 else { return }
        if let index = catalog.starts.firstIndex(where: { $0.id == value.id }) { catalog.starts[index] = value }
        else { catalog.starts.append(value) }
    }
    func resetRuntimeStarts() { catalog.starts.removeAll { $0.id == "my-location" } }
    func start(_ id: String) -> StartArea? { catalog.starts.first { $0.id == id } }
    func validate(_ prefs: Preferences) throws {
        guard (0...720).contains(prefs.minutes),(0...720).contains(prefs.walking) else { throw PlanningError.invalid("Choose time and walking allowances between zero and twelve hours.") }
        guard start(prefs.start) != nil else { throw PlanningError.invalid("Choose an Amsterdam starting area.") }
        guard ["none","start"].contains(prefs.endpoint) || start(prefs.endpoint) != nil else { throw PlanningError.invalid("Choose a valid endpoint.") }
        guard ["walk","cycle","transit"].contains(prefs.transport),["any","coffee","culture","outdoors","unexpected","food","quiet"].contains(prefs.mood) else { throw PlanningError.invalid("Choose a supported mood and travel mode.") }
        if let budget=prefs.budget, !budget.isFinite || budget<0 || budget>10000 { throw PlanningError.invalid("The spending allowance is invalid.") }
    }
    static func distance(_ a: StartArea,_ b: StartArea) -> Double {
        let r=Double.pi/180,lat1=a.lat*r,lat2=b.lat*r,dlat=(b.lat-a.lat)*r,dlng=(b.lng-a.lng)*r
        let h=pow(sin(dlat/2),2)+cos(lat1)*cos(lat2)*pow(sin(dlng/2),2)
        return 6_371_000*2*atan2(sqrt(max(0,h)),sqrt(max(0,1-h)))
    }
    private struct Connector {
        var id:String; var kind:String; var name:String; var a:StartArea; var b:StartArea
        var ride:Int=0; var wait:Int=0; var length:Double=0; var source:String
    }
    private var connectors: [Connector] { [
        Connector(id:"F3",kind:"ferry",name:"Buiksloterweg ferry · sample crossing",a:StartArea(id:"f3-south",name:"Ferry quay",lat:52.3825,lng:4.9003,bank:"south"),b:StartArea(id:"f3-north",name:"Ferry quay",lat:52.3833,lng:4.9024,bank:"north"),ride:5,wait:8,source:"https://gvb.nl/en/travel-products/ferry-tickets"),
        Connector(id:"F4",kind:"ferry",name:"NDSM ferry · sample crossing",a:StartArea(id:"f4-south",name:"Ferry quay",lat:52.3821,lng:4.8991,bank:"south"),b:StartArea(id:"f4-north",name:"Ferry quay",lat:52.4000,lng:4.8941,bank:"north"),ride:15,wait:10,source:"https://gvb.nl/en/travel-products/ferry-tickets"),
        Connector(id:"F7",kind:"ferry",name:"Pontsteiger–NDSM · sample crossing",a:StartArea(id:"f7-south",name:"Ferry quay",lat:52.3971,lng:4.8846,bank:"south"),b:StartArea(id:"f7-north",name:"Ferry quay",lat:52.4000,lng:4.8941,bank:"north"),ride:9,wait:12,source:"https://gvb.nl/en/travel-products/ferry-tickets"),
        Connector(id:"heerma",kind:"bridge",name:"Enneüs Heerma Bridge · sample approach",a:StartArea(id:"heerma-west",name:"Bridge approach",lat:52.3663,lng:4.9738,bank:"south"),b:StartArea(id:"heerma-east",name:"Bridge approach",lat:52.3654,lng:4.9816,bank:"east"),length:650,source:"https://www.amsterdam.nl/projecten/ijburg/nieuwe-bruggen/"),
        Connector(id:"nescio",kind:"bridge",name:"Nescio Bridge · sample approach",a:StartArea(id:"nescio-west",name:"Bridge approach",lat:52.3501,lng:4.9703,bank:"south"),b:StartArea(id:"nescio-east",name:"Bridge approach",lat:52.3530,lng:4.9804,bank:"east"),length:850,source:"https://www.iamsterdam.com/en/explore/neighbourhoods/ijburg")
    ] }
    private func money(_ value:Double) -> String {
        let formatter=NumberFormatter();formatter.numberStyle = .currency;formatter.currencyCode="EUR";formatter.locale=Locale(identifier:"en_IE")
        formatter.minimumFractionDigits=value.truncatingRemainder(dividingBy:1) == 0 ? 0 : 2;formatter.maximumFractionDigits=formatter.minimumFractionDigits
        return formatter.string(from:NSNumber(value:value)) ?? "EUR \(value)"
    }
    private func ordinary(_ a:StartArea,_ b:StartArea,_ mode:String) -> TravelLeg {
        let metres=Self.distance(a,b)
        if metres<8 { return TravelLeg() }
        let street=ceil(metres*1.28)
        if mode == "cycle" {
            let minutes=Int(ceil(street/210))+3
            return TravelLeg(minutes:minutes,walking:2,segments:[TravelSegment(mode:"cycle",minutes:minutes,walking:2,waiting:0,description:"Sample cycle route + 3 min unlocking/parking; own bicycle assumed")])
        }
        let walk=Int(ceil(street/70))
        if mode != "transit" || metres<650 {
            return TravelLeg(minutes:walk,walking:walk,segments:[TravelSegment(mode:"walk",minutes:walk,walking:walk,waiting:0,description:"Sample street-distance walking estimate")])
        }
        let minutes=Int(ceil(street/330))+8+6
        return TravelLeg(minutes:minutes,walking:6,waiting:8,cost:4,costUnknown:true,needsCheck:true,segments:[TravelSegment(mode:"transit",minutes:minutes,walking:6,waiting:8,description:"Sample transit allowance: ride + 8 min waiting + 6 min stop access; service and fare unverified")])
    }
    private func crossing(_ c:Connector,_ mode:String) -> TravelLeg {
        if c.kind == "bridge" {
            let minutes=mode == "cycle" ? Int(ceil(c.length/210))+1 : Int(ceil(c.length/70))
            let walking=mode == "cycle" ? 1 : minutes
            return TravelLeg(minutes:minutes,walking:walking,segments:[TravelSegment(mode:"bridge",minutes:minutes,walking:walking,waiting:0,description:c.name,source:c.source,connector:c.id)])
        }
        let minutes=c.ride+c.wait+2
        return TravelLeg(minutes:minutes,walking:2,waiting:c.wait,needsCheck:true,segments:[TravelSegment(mode:"ferry",minutes:minutes,walking:2,waiting:c.wait,description:"\(c.name): \(c.ride) min sailing + \(c.wait) min waiting + 2 min boarding",source:c.source,connector:c.id)])
    }
    private func combine(_ legs:[TravelLeg]) -> TravelLeg {
        var result=TravelLeg()
        for leg in legs {
            result.minutes += leg.minutes; result.walking += leg.walking; result.waiting += leg.waiting; result.cost += leg.cost
            result.costUnknown = result.costUnknown || leg.costUnknown; result.needsCheck = result.needsCheck || leg.needsCheck; result.segments += leg.segments
        }
        return result
    }
    func routeLeg(_ a:StartArea,_ b:StartArea,transport:String,context:PlanningContext=PlanningContext(),excursion:Excursion?=nil) throws -> TravelLeg {
        if let ns=excursion,a.city != b.city { return try railLeg(a,b,ns,context) }
        var result:TravelLeg
        if a.bank == b.bank { result=ordinary(a,b,transport) }
        else {
            let cs=connectors,nodes=[a,b]+cs.flatMap { [$0.a,$0.b] },n=nodes.count
            var distances=Array(repeating:Double.infinity,count:n),previous:[(Int,TravelLeg)?]=Array(repeating:nil,count:n),used=Set<Int>()
            distances[0]=0
            for _ in 0..<n {
                guard let u=(0..<n).filter({!used.contains($0)}).min(by:{distances[$0]<distances[$1]}),distances[u].isFinite,u != 1 else { break }
                used.insert(u)
                for v in 0..<n where v != u {
                    var edge:TravelLeg?
                    if nodes[u].bank == nodes[v].bank { edge=ordinary(nodes[u],nodes[v],transport) }
                    else if let c=cs.first(where:{($0.a.id == nodes[u].id && $0.b.id == nodes[v].id)||($0.b.id == nodes[u].id && $0.a.id == nodes[v].id)}) { edge=crossing(c,transport) }
                    if let edge=edge,distances[u]+Double(edge.minutes)<distances[v] { distances[v]=distances[u]+Double(edge.minutes); previous[v]=(u,edge) }
                }
            }
            guard distances[1].isFinite else { throw PlanningError.invalid("No authored connector can establish this route.") }
            var edges:[TravelLeg]=[],v=1
            while v != 0 {
                guard let (u,edge)=previous[v] else { throw PlanningError.invalid("The sample route is incomplete.") }
                edges.insert(edge,at:0);v=u
            }
            result=combine(edges)
        }
        if context.demoTransport { result.needsCheck=false; result.costUnknown=false }
        else if context.demoFerry && !result.segments.contains(where:{$0.mode == "transit"}) { result.needsCheck=false }
        return result
    }
    private func railLeg(_ a:StartArea,_ b:StartArea,_ ns:Excursion,_ context:PlanningContext) throws -> TravelLeg {
        guard let central=start("central") else { throw PlanningError.invalid("Amsterdam Centraal is missing.") }
        let fromAmsterdam=a.city == "Amsterdam"
        let local=try fromAmsterdam ? routeLeg(a,central,transport:"walk",context:context) : routeLeg(central,b,transport:"walk",context:context)
        let destination=fromAmsterdam ? ordinary(ns.destinationStation,b,"walk") : ordinary(a,ns.destinationStation,"walk")
        let railMinutes=ns.railAllowance+ns.waitAllowance+ns.stationBuffer
        let segment=TravelSegment(mode:"rail",minutes:railMinutes,walking:0,waiting:ns.waitAllowance,description:"NS sample allowance: \(ns.railAllowance) min rail + \(ns.waitAllowance) min waiting + \(ns.stationBuffer) min station buffer. Current service and fare are unverified.",source:ns.source)
        var result=combine([local,destination]);result.minutes += railMinutes;result.waiting += ns.waitAllowance;result.costUnknown=true;result.needsCheck=true
        result.segments=fromAmsterdam ? local.segments+[segment]+destination.segments : destination.segments+[segment]+local.segments
        return result
    }
    func plan(id:String,prefs:Preferences,context:PlanningContext=PlanningContext()) throws -> Plan {
        guard let experience=experiences[id] else { throw PlanningError.invalid("This idea is not in the catalogue.") }
        return try plan(experience:experience,prefs:prefs,context:context)
    }
    func plan(experience:Experience,prefs:Preferences,context:PlanningContext=PlanningContext(),origin:StartArea?=nil,originalOrigin:StartArea?=nil) throws -> Plan {
        try validate(prefs)
        guard let selectedStart=start(prefs.start) else { throw PlanningError.invalid("Choose a starting area.") }
        let origin=origin ?? selectedStart,originalOrigin=originalOrigin ?? origin
        let end:StartArea?=prefs.endpoint == "none" ? (experience.excursion != nil ? start("central") : nil) : prefs.endpoint == "start" ? originalOrigin : start(prefs.endpoint)
        var cursor=context.now,previous=origin,travel=0,walking=0,waiting=0,knownCost:Double=0,unknownCost=false,routeCheck=false,checks:[String]=[],stops:[PlanStop]=[],legs:[TravelLeg]=[]
        for id in experience.placeIds {
            guard let place=places[id] else { throw PlanningError.invalid("Unknown place \(id).") }
            var leg=try routeLeg(previous,place.point,transport:prefs.transport,context:context,excursion:experience.excursion)
            leg.from=previous.name;leg.to=place.name;leg.fromId=previous.id;leg.toId=place.id;legs.append(leg)
            travel += leg.minutes;walking += leg.walking;waiting += leg.waiting;knownCost += leg.cost
            unknownCost = unknownCost || leg.costUnknown;routeCheck = routeCheck || leg.needsCheck
            cursor=cursor.addingTimeInterval(Double(leg.minutes)*60);let arrival=cursor
            walking += place.activityWalking
            let rest=experience.restAt == id ? (experience.restMinutes ?? 0) : 0,dwell=place.dwell+rest
            cursor=cursor.addingTimeInterval(Double(dwell)*60)
            var availability="sample-public",opening="Public-space sample · local access unverified"
            if place.access != "public" {
                if context.availability[id] == false { availability="closed";opening="Closed in this explicit demo fixture";checks.append(opening) }
                else if context.demoAvailability || context.availability[id] == true { availability="fixture-open";opening="Open in the explicit demo fixture · not a real opening claim" }
                else { availability="unknown";opening="Opening and visitor access need checking";checks.append(opening) }
            }
            if let cost=place.cost { knownCost += cost } else { unknownCost=true }
            stops.append(PlanStop(place:place,walk:leg.walking,travel:leg.minutes,dwell:dwell,rest:rest,opening:opening,availability:availability,arriveAt:arrival,departAt:cursor,leg:leg.segments))
            previous=place.point
        }
        var endpointTravel=0
        if let end=end {
            var leg=try routeLeg(previous,end,transport:prefs.transport,context:context,excursion:experience.excursion)
            endpointTravel=leg.minutes;travel += leg.minutes;walking += leg.walking;waiting += leg.waiting;knownCost += leg.cost
            unknownCost = unknownCost || leg.costUnknown;routeCheck = routeCheck || leg.needsCheck
            cursor=cursor.addingTimeInterval(Double(leg.minutes)*60);leg.from=previous.name;leg.to=end.name;leg.fromId=previous.id;leg.toId=end.id;leg.endpoint=true;legs.append(leg)
        }
        let withoutBuffer=Int(ceil(cursor.timeIntervalSince(context.now)/60)),total=withoutBuffer+5,minimum=max(total,experience.excursion?.minimumWindow ?? 0),cost:Double?=unknownCost ? nil : (knownCost*100).rounded()/100
        var status=Eligibility.fits,reason="The authored sample includes travel, stops, endpoint and a five-minute buffer."
        if prefs.minutes == 0 || minimum>prefs.minutes { status = .moreTime;reason=prefs.minutes == 0 ? "A little inspiration for later. Choose time before starting." : "Allow at least \(minimum.amstrollDuration) for these stops, travel and buffer." }
        else if walking>prefs.walking { status = .check;reason="The estimated \(walking) minutes walking exceeds your \(prefs.walking)-minute preference. Change transport, walking tolerance or the plan." }
        else if let cost=cost,let budget=prefs.budget,cost>budget { status = .check;reason="The illustrative \(money(cost)) allowance exceeds your \(money(budget)) limit. No budget has been increased." }
        else if unknownCost && prefs.budget != nil && prefs.strictBudget { status = .check;reason="Unknown prices or fares cannot verify a strict spending limit." }
        else if let closed=checks.first(where:{$0.localizedCaseInsensitiveContains("closed") || $0.localizedCaseInsensitiveContains("outside")}) { status = .check;reason=closed }
        else if !checks.isEmpty { status = .check;reason="Check the venue opening and visitor access before starting." }
        else if routeCheck { status = .check;reason="Ferry or public-transport operation needs a current route check. Displayed waits are authored scenario allowances." }
        else if unknownCost { status = .check;reason="A price or fare remains unknown. It has not been treated as free." }
        if experience.excursion != nil && status != .moreTime { status = .check;reason="NS outward and return services, fares and station connections must be checked. Rail minutes are authored half-day allowances, not live train schedules." }
        var rankReasons:[String]=[]
        if prefs.mood != "any" && experience.moods.contains(prefs.mood) { rankReasons.append("A \(prefs.mood == "outdoors" ? "fresh-air" : prefs.mood) idea for this window") }
        if cost == 0 { rankReasons.append("No purchase or paid entry in the sample") }
        else if let cost=cost { rankReasons.append("\(money(cost)) illustrative allowance") }
        else { rankReasons.append("Some prices are unverified") }
        rankReasons.append("\(travel) min estimated \(prefs.transport == "cycle" ? "travel by bicycle" : prefs.transport == "transit" ? "travel" : "walking / transfer travel")")
        if experience.restAt != nil { rankReasons.append("Includes a proper rest or packed-lunch break") }
        if routeCheck { rankReasons.append("Transport schedule still needs checking") }
        if !checks.isEmpty { rankReasons.append("Venue access still needs checking") }
        var result=Plan();result.id=experience.id;result.title=experience.title;result.description=experience.description;result.stops=stops;result.total=total;result.travelMinutes=travel;result.walking=walking;result.waiting=waiting;result.cost=cost;result.knownCost=(knownCost*100).rounded()/100;result.costLabel=cost == nil ? "Price or fare unverified" : cost == 0 ? "No purchase planned" : "\(money(cost!)) illustrative";result.photoKey=experience.photoKey;result.status=status;result.reason=reason;result.minimumMinutes=minimum;result.buffer=prefs.minutes-withoutBuffer;result.endpoint=end?.name ?? "Final stop";result.endpointTravel=endpointTravel;result.legs=legs;result.rankReasons=rankReasons;result.checks=checks;result.moods=experience.moods;result.kind=experience.kind;result.area=stops.first?.area ?? origin.area;result.startedAt=context.now;result.finishAt=cursor;result.origin=origin;result.originalOrigin=originalOrigin;result.prefs=prefs;result.experience=experience;return result
    }
    private func score(_ q:Plan,_ p:Preferences,_ context:PlanningContext) -> Double {
        var result:Double=0
        if p.mood != "any" && q.moods.contains(p.mood) { result += 50 }
        if q.area == start(p.start)?.area { result += 16 }
        result -= Double(q.travelMinutes)*0.25
        if q.status == .moreTime { result -= Double(max(0,q.total-p.minutes))*0.3 }
        result += Double(min(22,q.stops.count*4))
        if q.cost == 0 { result += 8 }
        if let cost=q.cost,let budget=p.budget { result += max(0,8-cost/max(1,budget)*8) }
        if p.minutes>=180 && q.stops.count>=4 { result += 30 }
        if p.minutes>=240 && (q.experience?.meal != nil || q.stops.contains(where:{$0.place.category == "food"})) { result += 20 }
        if context.weatherSource != nil,let rain=context.rainExpected {
            if rain && q.stops.allSatisfy({$0.place.indoor}) { result += 12 }
            else if !rain && q.stops.allSatisfy({!$0.place.indoor}) { result += 3 }
        }
        return result
    }
    func suggestions(prefs:Preferences,context:PlanningContext=PlanningContext(),limit:Int=20) -> [Plan] {
        var plans=catalog.experiences.compactMap { try? plan(experience:$0,prefs:prefs,context:context) }
        if context.rainExpected == true,let source=context.weatherSource {
            for index in plans.indices where plans[index].stops.allSatisfy({$0.place.indoor}) {
                plans[index].rankReasons.insert("Mostly indoors, with rain expected · \(source)",at:0)
            }
        }
        var ordered:[Plan]=[]
        for status in [Eligibility.fits,.check,.moreTime] {
            var pool=plans.filter { $0.status == status },kinds:[String:Int]=[:],areas:[String:Int]=[:],anchors:[String:Int]=[:]
            while !pool.isEmpty {
                var best=0,bestScore = -Double.infinity
                for (i,q) in pool.enumerated() {
                    let adjusted=score(q,prefs,context)-Double(kinds[q.kind,default:0])*9-Double(areas[q.area,default:0])*4-Double(anchors[q.stops.first?.id ?? "",default:0])*22
                    if adjusted>bestScore { best=i;bestScore=adjusted }
                }
                let q=pool.remove(at:best);ordered.append(q);kinds[q.kind,default:0] += 1;areas[q.area,default:0] += 1;anchors[q.stops.first?.id ?? "",default:0] += 1
            }
        }
        return Array(ordered.prefix(max(20,min(ordered.count,limit))))
    }
    func remaining(original:Plan,completed:[String],skipped:[String],prefs:Preferences,context:PlanningContext=PlanningContext()) throws -> Plan {
        guard !original.isLive,var experience=original.experience else { throw PlanningError.invalid("Live routes need a fresh route check after progress changes.") }
        let originalIds=experience.placeIds
        experience.placeIds=originalIds.filter { !completed.contains($0) && !skipped.contains($0) }
        var current=original.origin
        for id in originalIds where completed.contains(id) { if let place=places[id] { current=place.point } }
        if !experience.placeIds.isEmpty { return try plan(experience:experience,prefs:prefs,context:context,origin:current,originalOrigin:original.originalOrigin ?? original.origin) }
        let end:StartArea?=prefs.endpoint == "none" ? (experience.excursion != nil ? start("central") : nil) : prefs.endpoint == "start" ? (original.originalOrigin ?? original.origin) : start(prefs.endpoint)
        let leg:TravelLeg=try end.map { try routeLeg(current,$0,transport:prefs.transport,context:context,excursion:experience.excursion) } ?? TravelLeg()
        var result=original;result.stops=[];result.total=leg.minutes+5;result.minimumMinutes=result.total;result.travelMinutes=leg.minutes;result.walking=leg.walking;result.waiting=leg.waiting;result.cost=leg.costUnknown ? nil : leg.cost;result.knownCost=leg.cost;result.costLabel=leg.costUnknown ? "Fare unverified" : leg.cost == 0 ? "No purchase planned" : "\(money(leg.cost)) sample allowance";result.legs=end != nil ? [leg] : [];result.endpointTravel=leg.minutes;result.buffer=prefs.minutes-leg.minutes;result.prefs=prefs;result.origin=current;result.startedAt=context.now;result.finishAt=context.now.addingTimeInterval(Double(leg.minutes)*60)
        let fits=prefs.minutes>0 && result.total<=prefs.minutes && leg.walking<=prefs.walking && !leg.needsCheck && !leg.costUnknown && (prefs.budget == nil || leg.cost<=prefs.budget!)
        result.status=fits ? .fits : result.total>prefs.minutes ? .moreTime : .check;result.reason=fits ? "All activity stops are complete. Endpoint travel and the five-minute buffer remain." : "Endpoint travel still needs time, budget or service checking."
        return result
    }
}
