import Foundation
import Combine

@MainActor
final class AppStore: ObservableObject {
    @Published var prefs: Preferences { didSet {
        if oldValue.start != prefs.start { forecast=nil }
        if !restoring { schedulePreferenceWrite() }
    } }
    @Published private(set) var saved: [SavedIdea] { didSet { if !restoring { persist() } } }
    @Published private(set) var active: ActiveOuting? { didSet { if !restoring { persist() } } }
    @Published private(set) var journal: [Memory] { didSet { if !restoring { persist() } } }
    @Published private(set) var customStart: StartArea?
    @Published private(set) var storageError: String?
    /// Provider weather stays in memory, never in the user snapshot.
    @Published var forecast: WeatherContext? = nil { didSet { suggestionCache=nil } }
    let catalog: Catalog
    let engine: PlanningEngine
    let guide: GuidePlanner?
    let demoMode: Bool
    let persistence: LocalPersistence
    private var restoring=false
    private var preferenceWrite: DispatchWorkItem?
    private var preferenceGeneration = 0
    private var guideCache: (prefs: Preferences, minute: Int, start: StartArea, plans: [Plan])?
    private var suggestionCache: (prefs:Preferences, minute:Int, start:StartArea, plans:[Plan])?
    var now: Date { demoMode ? Self.fixtureDate : Date() }
    static let fixtureDate = ISO8601DateFormatter().date(from:"2026-11-03T14:00:00Z")!

    init(catalog:Catalog,demoMode:Bool=false,directory:URL?=nil) throws {
        self.catalog=catalog;self.demoMode=demoMode;self.guide=GuidePlanner.load()
        let engine=PlanningEngine(catalog:catalog);self.engine=engine
        let effectiveDirectory=demoMode && directory == nil ? FileManager.default.temporaryDirectory.appendingPathComponent("AmstrollScreenshot-"+UUID().uuidString,isDirectory:true) : directory
        let persistence=try LocalPersistence(directory:effectiveDirectory);self.persistence=persistence
        var state:UserState
        var recoveryMessage:String?
        do { state=try persistence.load() } catch {
            try persistence.preserveUnreadableState()
            state=UserState()
            recoveryMessage="Saved data could not be read. A local backup was kept; this session starts with empty data."
        }
        if let custom=state.customStart { engine.registerStart(custom) }
        // Invalid persisted input is reported rather than presented as the chosen plan.
        var recoveredPreferences=false
        do { try engine.validate(state.prefs) } catch { state.prefs=Preferences();recoveredPreferences=true }
        if demoMode {
            state=LocalPersistence.freshState()
            state.saved=Array(catalog.experiences.prefix(3)).map { SavedIdea(id:$0.id,prefs:Preferences(),title:$0.title,sourceURL:nil,isLive:false,latitude:nil,longitude:nil) }
            state.journal=[Memory(id:"demo-memory-1",title:"The quieter way through the city",note:"Took a different turn beside the water. Found a little more Amsterdam.",rating:"Loved it",minutes:38,date:Self.fixtureDate.addingTimeInterval(-172800),photoKey:"amsterdam-canals",photoFile:nil,sample:true),Memory(id:"demo-memory-2",title:"A little room in Westerpark",note:"No grand plan. Just green space, a slow lap and enough time to sit for a while.",rating:"Good",minutes:55,date:Self.fixtureDate.addingTimeInterval(-518400),photoKey:"westerpark",photoFile:nil,sample:true)]
        }
        prefs=state.prefs;saved=state.saved;active=state.active;journal=state.journal;customStart=state.customStart
        if recoveredPreferences { storageError="Saved preferences were invalid and were reset. Review time and budget before starting." }
        else { storageError=recoveryMessage }
    }
    var startArea: StartArea { engine.start(prefs.start) ?? catalog.starts[0] }
    var startingAreas: [StartArea] { engine.catalog.starts }
    var planningContext: PlanningContext {
        let rain=forecast.flatMap { $0.precipitation }.map { $0>0.3 }
        return PlanningContext(now:now,rainExpected:rain,weatherSource:forecast?.source)
    }
    var suggestions: [Plan] {
        let context=planningContext,clock=context.now,minute=Int(floor(clock.timeIntervalSince1970/60)),start=startArea
        if let cache=suggestionCache,cache.prefs == prefs,cache.minute == minute,cache.start == start { return cache.plans }
        let plans=engine.suggestions(prefs:prefs,context:context,limit:20)
        suggestionCache=(prefs,minute,start,plans)
        return plans
    }
    var guideSuggestions: [Plan] {
        let date = now
        let minute = Int(floor(date.timeIntervalSince1970 / 60))
        if let cache = guideCache, cache.prefs == prefs, cache.minute == minute, cache.start == startArea { return cache.plans }
        let plans = guidePlans(for: prefs, now: date)
        guideCache = (prefs, minute, startArea, plans)
        return plans
    }

    private func guidePlans(for preferences: Preferences, now date: Date) -> [Plan] {
        guard let start = engine.start(preferences.start) else { return [] }
        let end = preferences.endpoint == "start" ? start : engine.start(preferences.endpoint)
        return guide?.suggestions(prefs: preferences, start: start, end: end, now: date) ?? []
    }

    var savedPlans: [Plan] {
        saved.filter { !$0.isLive }.compactMap { item in
            if let guideDetails = item.guidePlan, let refreshed = guide?.refresh(guideDetails, prefs: item.prefs, now: now) {
                return refreshed
            }
            if item.id.hasPrefix("guide-") {
                return guidePlans(for: item.prefs, now: now).first { $0.id == item.id }
            }
            return try? engine.plan(id: item.id, prefs: item.prefs, context: planningContext)
        }
    }

    var activeDeadline: Date? {
        guard let active else { return nil }
        return active.plan.guideDetails?.deadline ?? active.prefs.deadline ??
            active.startedAt.addingTimeInterval(Double(active.prefs.minutes) * 60)
    }

    var returnOriginChoices: [StartArea] {
        guard let active else { return [] }
        return [active.plan.origin] + active.plan.stops.map(\.place.point)
    }

    func returnRoute(from point: StartArea? = nil) -> TravelLeg? {
        guard let active, let detail = active.plan.guideDetails else { return nil }
        let last = active.done.last.flatMap { id in active.plan.stops.first { $0.id == id }?.place.point }
        return guide?.route(from: point ?? last ?? active.plan.origin, to: detail.finishPoint,
                            stepFree: active.prefs.requiresStepFree == true)
    }

    @discardableResult func swapStop() -> Bool {
        guard let active, let replacement = guide?.swap(active, now: now) else { return false }
        self.active = replacement
        return true
    }

    func applyPreferences(_ draft: Preferences, customStart: StartArea? = nil) {
        if let customStart {
            self.customStart = customStart
            engine.registerStart(customStart)
        }
        guard (try? engine.validate(draft)) != nil else { return }
        prefs = draft
        persist()
    }
    var remainingPlan: Plan? {
        guard let active=active else { return nil }
        if active.plan.guideDetails != nil { return guide?.remaining(active, now: now) }
        if active.plan.isLive {
            var remaining=active.plan
            remaining.stops=remaining.stops.filter{!active.done.contains($0.id) && !active.skipped.contains($0.id)}
            if !active.done.isEmpty || !active.skipped.isEmpty { remaining.status = .check;remaining.routeVerified=false;remaining.reason="Remaining travel needs a fresh route check after progress changes." }
            return remaining
        }
        var p=active.prefs;p.minutes=max(0,min(p.availableMinutes(at:now),p.minutes-active.elapsedMinutes));p.walking=max(0,p.walking-active.walkedMinutes)
        if let budget=p.budget { p.budget=max(0,budget-active.spentCost) }
        return try? engine.remaining(original:active.plan,completed:active.done,skipped:active.skipped,prefs:p,context:planningContext)
    }
    private func schedulePreferenceWrite() {
        preferenceWrite?.cancel()
        preferenceGeneration += 1
        let generation=preferenceGeneration
        let item=DispatchWorkItem { [weak self] in
            MainActor.assumeIsolated {
                guard let self=self,self.preferenceGeneration == generation else { return }
                self.persist()
            }
        }
        preferenceWrite=item
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(150), execute: item)
    }
    /// Flush pending preference changes when leaving the foreground. Progress, saved
    /// ideas and journal mutations call this immediately rather than being debounced.
    func persist() {
        preferenceWrite?.cancel();preferenceWrite=nil;preferenceGeneration += 1
        let state=UserState(version:1,prefs:prefs,saved:saved,active:active,journal:journal,customStart:customStart)
        do { try persistence.save(state);storageError=nil } catch { storageError="Your changes could not be saved on this device. Keep the app open and try again. \(error.localizedDescription)" }
    }
    func selectStart(_ value:StartArea) {
        let previous=startArea
        if previous.id != value.id || previous.lat != value.lat || previous.lng != value.lng { forecast=nil }
        engine.registerStart(value)
        if value.id == "my-location" { customStart=value }
        prefs.start=value.id
        persist()
    }
    func isSaved(_ id:String) -> Bool { saved.contains{$0.id == id} }
    func toggleSaved(_ plan:Plan) {
        if isSaved(plan.id) { saved.removeAll{$0.id == plan.id};return }
        // Only stable identity, original source and user preferences are retained for
        // live places. Third-party photos/descriptions are refreshed, not persisted.
        saved.append(SavedIdea(id:plan.id,prefs:plan.prefs,title:plan.title,sourceURL:plan.sourceURL,isLive:plan.isLive,latitude:plan.stops.first?.lat,longitude:plan.stops.first?.lng,guidePlan:plan.guideDetails == nil ? nil : plan))
    }
    func saveLive(id:String,title:String,lat:Double,lng:Double,sourceURL:String) {
        if isSaved(id) { saved.removeAll{$0.id == id};return }
        saved.append(SavedIdea(id:id,prefs:prefs,title:title,sourceURL:sourceURL,isLive:true,latitude:lat,longitude:lng))
    }
    func removeSaved(_ id:String) { saved.removeAll{$0.id == id} }
    @discardableResult func start(_ plan:Plan) -> Bool {
        guard active == nil, plan.feasible else { return false }
        let date = now
        if plan.guideDetails != nil {
            guard let fresh = guide?.refresh(plan, prefs: plan.prefs, now: date), fresh.feasible else { return false }
            active = ActiveOuting(plan: fresh, prefs: plan.prefs, startedAt: date)
            return true
        }
        guard prefs.availableMinutes(at: date) > 0, plan.prefs == prefs else { return false }
        active=ActiveOuting(plan:plan,prefs:prefs,startedAt:date);return true
    }
    func completeStop() {
        guard var outing=active,let current=remainingPlan?.stops.first else { return }
        outing.done.append(current.id);outing.elapsedMinutes += current.travel+current.dwell
        outing.walkedMinutes += current.walk+current.activityWalking;outing.spentCost += current.cost ?? 0
        active=outing
    }
    func skipStop() {
        guard var outing=active,let current=remainingPlan?.stops.first else { return }
        outing.skipped.append(current.id);active=outing
    }
    func photoURL(forMemory memory:Memory) -> URL? { persistence.photoURL(memory.photoFile) }
    func finish(note:String,rating:String,photoData:Data?) throws {
        guard let outing=active else { throw PlanningError.invalid("There is no active outing to finish.") }
        let filename=try photoData.map { try persistence.putPhoto($0) }
        let boundedNote=String(note.prefix(1200))
        let entry=Memory(id:UUID().uuidString,title:outing.plan.title,note:boundedNote,rating:["Loved it","Good","Not my thing"].contains(rating) ? rating : "Good",minutes:outing.elapsedMinutes,date:now,photoKey:outing.plan.photoKey,photoFile:filename,sample:demoMode)
        // Commit the entire next snapshot before changing visible state. A failed
        // write leaves the active outing intact and lets the person retry safely.
        let nextJournal=[entry]+journal
        let state=UserState(version:1,prefs:prefs,saved:saved,active:nil,journal:nextJournal,customStart:customStart)
        preferenceWrite?.cancel();preferenceWrite=nil;preferenceGeneration += 1
        do { try persistence.save(state) } catch {
            persistence.removePhoto(filename)
            storageError="This memory could not be saved. Your outing is still active; try again. \(error.localizedDescription)"
            throw PlanningError.invalid(storageError!)
        }
        restoring=true;journal=nextJournal;active=nil;restoring=false
        storageError=nil
    }
    func deleteMemory(_ id:String) {
        if let memory=journal.first(where:{$0.id == id}) { persistence.removePhoto(memory.photoFile) }
        journal.removeAll{$0.id == id}
    }
    func reset() throws {
        try persistence.reset()
        engine.resetRuntimeStarts()
        suggestionCache=nil;forecast=nil
        restoring=true;prefs=LocalPersistence.freshState().prefs;saved=[];active=nil;journal=[];customStart=nil;restoring=false
        storageError=nil;persist()
    }
}
