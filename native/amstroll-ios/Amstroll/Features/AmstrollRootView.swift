import SwiftUI
import Observation

enum SourceMode: String, CaseIterable { case open = "Nearby places", collection = "Amsterdam collection" }
enum AmstrollTab: String, CaseIterable { case explore = "Explore", saved = "Saved", journal = "Journal"
    var icon: String { switch self { case .explore: "paperplane"; case .saved: "bookmark"; case .journal: "book" } }
}
enum AmstrollSheet: String, Identifiable {
    case exact, location, moods, preferences, sources, profile, credits, transit, rail
    var id: String { rawValue }
}

@MainActor @Observable final class DiscoveryModel {
    var source: SourceMode = .open
    private(set) var places: [ServicePlace] = []
    private(set) var loading = false
    private(set) var error: String?
    private(set) var warnings: [String] = []
    private(set) var page = 0
    private(set) var didSearch = false
    private let service = OpenPlaceService()
    private let selection = NearbySelectionService()
    private var request: Task<Void, Never>?
    private var serial = 0
    var visible: [ServicePlace] { Array(places.dropFirst(page).prefix(5)) }
    func invalidate() { serial += 1; request?.cancel(); loading = false; error = nil; places = []; warnings = []; page = 0; didSearch = false }
    func search(start: StartArea, finish: StartArea?, preferences: Preferences) {
        invalidate()
        guard source == .open else { didSearch = true; return }
        loading = true; didSearch = true
        let generation = serial
        request = Task {
            do {
                let radius = min(6000, max(500, preferences.minutes * 65))
                let result = try await service.discover(latitude: start.lat, longitude: start.lng, radius: radius, mood: preferences.mood)
                let picked = try await selection.select(result.places, start: start, finish: finish, preferences: preferences)
                guard !Task.isCancelled, serial == generation else { return }
                places = picked.places; warnings = result.warnings + picked.warnings; loading = false
            } catch {
                guard !Task.isCancelled, serial == generation else { return }
                self.error = error.localizedDescription; loading = false
            }
        }
    }
    func more() { if page + 5 >= places.count { page = 0 } else { page += 5 } }
}

struct AmstrollRootView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var discovery = DiscoveryModel()
    @State private var tab = AmstrollTab.explore
    @State private var sheet: AmstrollSheet?
    @State private var selectedPlan: Plan?
    @State private var selectedPlace: ServicePlace?
    @State private var progress = false
    @State private var initialized = false
    var body: some View {
        NavigationStack {
            Group {
                switch tab {
                case .explore: explore
                case .saved: saved
                case .journal: journal
                }
            }.background(AmstrollStyle.paper.ignoresSafeArea())
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(item: $selectedPlan) { plan in
                    PlanDetailView(plan: plan, onStart: { selectedPlan = nil; DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { progress = true } })
                }
                .navigationDestination(item: $selectedPlace) { place in LivePlaceView(place: place) }
                .navigationDestination(isPresented: $progress) { ActiveOutingView() }
                .sheet(item: $sheet, onDismiss: { if !discovery.didSearch { search() } }) { item in
                    AmstrollSheetView(sheet: item, source: $discovery.source)
                        .presentationDetents(item == .preferences ? [.large] : [.medium, .large])
                        .presentationDragIndicator(.visible).presentationCornerRadius(28)
                }
                .onChange(of: discovery.source) { _, _ in search() }
                .onChange(of: store.prefs) { _, _ in discovery.invalidate() }
                .onChange(of: store.startArea) { _, _ in discovery.invalidate() }
                .task { initialize() }
        }.safeAreaInset(edge: .bottom, spacing: 0) { bottomBar }
            .amstrollLoading(discovery.loading)
    }
    private func search() {
        let finish = store.prefs.endpoint == "start" ? store.startArea : store.engine.start(store.prefs.endpoint)
        discovery.search(start: store.startArea, finish: finish, preferences: store.prefs)
    }
    private func initialize() {
        guard !initialized else { return }; initialized = true
        if store.demoMode { discovery.source = .collection }
        else { sheet = .preferences }
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--screenshot-scene"), arguments.count > index + 1 else { return }
        switch arguments[index + 1] {
        case "preferences": sheet = .preferences
        case "detail": selectedPlan = store.suggestions.first(where: \.feasible) ?? store.suggestions.first
        case "progress": if let plan = store.suggestions.first(where: \.feasible), store.start(plan) { progress = true }
        case "saved": tab = .saved
        case "journal": tab = .journal
        default: break
        }
    }
    private var explore: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 18) {
                    brandHeader.padding(.top, 8)
                    hero
                    Group {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Label("\(store.startArea.name.uppercased()) · AMSTERDAM", systemImage: "mappin.and.ellipse")
                                    .font(AmstrollStyle.label(10)).lineLimit(2)
                                Spacer()
                                Button { sheet = .credits } label: { Image(systemName: "camera").frame(width: 44, height: 44) }
                                    .accessibilityLabel("Banner photograph credits")
                            }
                            Text(store.demoMode ? "A little room in your day, Alex." : "A little room in your day.").font(AmstrollStyle.label(13))
                            Text("Where shall we go?").font(AmstrollStyle.heading(26.4)).tracking(-1)
                            Text("Your free time. A little Amsterdam adventure.").font(AmstrollStyle.body(12))
                            if let forecast = store.forecast { Button { sheet = .sources } label: { Label(forecast.temperature.map { String(Int($0.rounded())) + "° · " + forecast.summary } ?? forecast.summary, systemImage: "cloud.sun").font(AmstrollStyle.body(11)) }.buttonStyle(.plain).frame(minHeight: 44) }
                        }.foregroundStyle(AmstrollStyle.ink).padding(.horizontal, 8).padding(.top, 6).padding(.bottom, 14)
                        if store.active != nil {
                            Button { progress = true } label: { Label("Pick up where you left off", systemImage: "paperplane") }.buttonStyle(AmstrollButton(primary: false))
                        }
                        timeCard
                        ScrollView(.horizontal, showsIndicators: false) { HStack(spacing: 8) {
                            moodButton("Anything", id: "any", icon: "sparkle")
                            moodButton("Coffee", id: "coffee", icon: "cup.and.saucer")
                            moodButton("Fresh air", id: "outdoors", icon: "leaf")
                            Button { sheet = .moods } label: { Image(systemName: "slider.horizontal.3").frame(minWidth: 44, minHeight: 44) }
                                .background(AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 15)).accessibilityLabel("More moods")
                        } }
                        Button { search() } label: {
                            HStack { Text(discovery.loading ? "Gathering a few good ideas…" : "Find my little adventure"); Image(systemName: discovery.loading ? "clock" : "arrow.right") }
                        }.buttonStyle(AmstrollButton()).disabled(discovery.loading).accessibilityIdentifier("find-adventure")
                        HStack(alignment: .top) {
                            Button { sheet = .preferences } label: { Label("\(spending(store.prefs.budget)) · \(transportName)", systemImage: "slider.horizontal.3") }
                            Spacer(minLength: 8)
                            Button { sheet = .sources } label: { Label(discovery.source == .open ? "Nearby places" : "Collection", systemImage: "square.3.layers.3d") }
                        }.font(AmstrollStyle.body(11)).buttonStyle(.plain).frame(minHeight: 44)
                        HStack(spacing: 9) {
                            Button { sheet = .transit } label: { connectionLabel("GVB nearby", subtitle: "Tram & metro stops", icon: "tram") }
                            Button { sheet = .rail } label: { connectionLabel("A little further", subtitle: "NS from Amsterdam", icon: "paperplane") }
                        }.buttonStyle(.plain)
                        VStack(alignment: .leading, spacing: 14) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(discovery.source == .collection ? "A little off the usual path." : "A few places for you.").font(AmstrollStyle.heading(19))
                                Spacer()
                                Text(discovery.source == .collection ? "20 ideas" : "\(discovery.places.count) picks").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
                            }.id("results").accessibilityIdentifier("results-heading")
                            results
                        }
                        if let error = store.storageError { SmallNotice(text: error, symbol: "externaldrive.badge.exclamationmark") }
                    }
                }.padding(.horizontal, 22).padding(.bottom, 20)
            }
                .accessibilityIdentifier("explore-screen")
                .onChange(of: discovery.loading) { wasLoading, isLoading in
                    guard wasLoading, !isLoading, discovery.didSearch else { return }
                    if reduceMotion {
                        proxy.scrollTo("results", anchor: .top)
                    } else {
                        withAnimation(.easeInOut(duration: 0.35)) { proxy.scrollTo("results", anchor: .top) }
                    }
                }
                .onAppear {
                    let arguments = ProcessInfo.processInfo.arguments
                    if let index = arguments.firstIndex(of: "--screenshot-scene"), arguments.count > index + 1, arguments[index + 1] == "results" {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { proxy.scrollTo("results", anchor: .top) }
                    }
                }
        }
    }
    private var transportName: String { store.prefs.transport == "walk" ? "On foot" : store.prefs.transport == "cycle" ? "By bike" : "Public transport" }
    private var hero: some View {
        PlaceImage(photoKey: areaPhotoKey(store.startArea.area), label: "Amstroll starting area: \(store.startArea.name)", height: 220)
            .overlay(LinearGradient(colors: [.black.opacity(0.15), AmstrollStyle.forest.opacity(0.55), AmstrollStyle.paper], startPoint: .top, endPoint: .bottom))
            .overlay { DetourPath().stroke(.white.opacity(0.4), style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [3, 7])).padding(.top, 30).padding(.bottom, 60) }
            .padding(.horizontal, -22).accessibilityHidden(true)
    }
    private var brandHeader: some View {
        HStack(spacing: 16) {
            Image("AmstrollWordmark")
                .resizable().scaledToFit().frame(width: 125, height: 34)
                .accessibilityLabel("Amstroll")
            Spacer(minLength: 0)
            Button { sheet = .profile } label: {
                HStack(spacing: 8) {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 27, weight: .light))
                        .foregroundStyle(AmstrollStyle.forest)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Your space").font(AmstrollStyle.label(11))
                        Text("No account").font(AmstrollStyle.body(9))
                            .foregroundStyle(AmstrollStyle.muted)
                    }
                }
                .padding(.horizontal, 12).padding(.vertical, 9)
                .frame(minHeight: 54)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 19))
                .overlay(RoundedRectangle(cornerRadius: 19).stroke(AmstrollStyle.line, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Anonymous profile. Open Amstroll settings")
            .accessibilityIdentifier("anonymous-profile")
        }
    }
    private var timeCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("How much time is yours?", systemImage: "clock").font(AmstrollStyle.label(12))
            Button { sheet = .exact } label: {
                ViewThatFits(in: .horizontal) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(store.prefs.minutes < 60 ? "\(store.prefs.minutes)" : store.prefs.minutes.amstrollDuration).font(AmstrollStyle.heading(46)).tracking(-2).fixedSize()
                        if store.prefs.minutes < 60 { Text("minutes").font(AmstrollStyle.body()) }
                        Text("Set exactly").font(AmstrollStyle.label(10)); Image(systemName: "pencil").font(.caption)
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        Text(store.prefs.minutes < 60 ? "\(store.prefs.minutes)" : store.prefs.minutes.amstrollDuration).font(AmstrollStyle.heading(46)).tracking(-2)
                        if store.prefs.minutes < 60 { Text("minutes").font(AmstrollStyle.body()) }
                        Label("Set exactly", systemImage: "pencil").font(AmstrollStyle.label(12))
                    }
                }
            }.buttonStyle(.plain).accessibilityLabel("Edit available time, \(store.prefs.minutes) minutes")
            Slider(value: Binding(get: { Double(store.prefs.minutes) }, set: { store.prefs.minutes = Int($0) }), in: 0...720, step: 1)
                .accessibilityLabel("Available time").accessibilityValue("\(store.prefs.minutes) minutes")
            HStack { ForEach(["Now", "3h", "6h", "9h", "12h"], id: \.self) { value in Text(value); if value != "12h" { Spacer() } } }
                .font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted).accessibilityHidden(true)
            ViewThatFits(in: .horizontal) { presets; ScrollView(.horizontal, showsIndicators: false) { presets } }
            Divider()
            Button { sheet = .location } label: {
                HStack {
                    Image(systemName: "mappin.circle")
                    VStack(alignment: .leading, spacing: 3) {
                        Text(store.startArea.name).font(AmstrollStyle.label(13))
                        Text(store.prefs.endpoint == "none" ? "See where you end up" : "Your finish is included in the plan").font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted)
                    }; Spacer(); Image(systemName: "chevron.right").font(.caption)
                }.frame(minHeight: 44)
            }.buttonStyle(.plain)
        }.padding(.horizontal, 19).padding(.top, 15).padding(.bottom, 11).background(LinearGradient(colors: [Color(hex: 0xF7E4B6), Color(hex: 0xEAE7CA), Color(hex: 0xE2E9D7)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 28))
    }
    private var presets: some View {
        HStack(spacing: 6) {
            ForEach([15, 30, 60, 120, 360], id: \.self) { minutes in
                Button { store.prefs.minutes = minutes } label: { Text(minutes == 360 ? "Half a day" : minutes == 120 ? "2 hours" : minutes == 60 ? "1 hour" : "\(minutes) min").font(AmstrollStyle.label(10)).padding(.horizontal, 9).frame(minHeight: 44) }
                    .buttonStyle(.plain).background(store.prefs.minutes == minutes ? Color.white : .white.opacity(0.4), in: RoundedRectangle(cornerRadius: 12))
                    .accessibilityAddTraits(store.prefs.minutes == minutes ? .isSelected : [])
            }
        }
    }
    private func moodButton(_ title: String, id: String, icon: String) -> some View {
        Button { store.prefs.mood = id } label: { Label(title, systemImage: icon).font(AmstrollStyle.label(11)).padding(.horizontal, 9).frame(minHeight: 44) }
            .buttonStyle(.plain).background(store.prefs.mood == id ? AmstrollStyle.paleSage : AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 15))
            .accessibilityAddTraits(store.prefs.mood == id ? .isSelected : [])
    }
    private func connectionLabel(_ title: String, subtitle: String, icon: String) -> some View {
        HStack(spacing: 8) { Image(systemName: icon); VStack(alignment: .leading, spacing: 3) { Text(title).font(AmstrollStyle.label(11)); Text(subtitle).font(AmstrollStyle.body(9)).foregroundStyle(AmstrollStyle.muted) }; Spacer(minLength: 0) }
            .frame(maxWidth: .infinity, minHeight: 48).padding(10).background(AmstrollStyle.card.opacity(0.65), in: RoundedRectangle(cornerRadius: 16))
    }
    @ViewBuilder private var results: some View {
        if discovery.source == .collection {
            Text("Real places. Sample plans. Travel and spending are estimates.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
            if store.prefs.minutes == 0 { SmallNotice(text: "A little inspiration for later. Starting stays off until a plan fits.") }
            ForEach(Array(store.suggestions.enumerated()), id: \.element.id) { index, plan in
                PlanCardView(plan: plan, compact: index % 5 != 0, open: { selectedPlan = plan })
            }
        } else if discovery.loading {
            ProgressView("A little looking around. No rush.").frame(maxWidth: .infinity).padding(30)
        } else {
            if let error = discovery.error { SmallNotice(text: error, symbol: "wifi.exclamationmark") }
            if !discovery.warnings.isEmpty {
                DisclosureGroup("About these suggestions") {
                    ForEach(discovery.warnings, id: \.self) { SmallNotice(text: $0) }
                }.font(AmstrollStyle.body(12))
            }
            if !discovery.places.isEmpty {
                Text("Selected for your time and starting point. Walking routes checked from your start. Visit times are estimates.")
                    .font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted).accessibilityIdentifier("page-status")
                ForEach(Array(discovery.visible.enumerated()), id: \.element.id) { index, place in
                    LivePlaceCard(place: place, compact: index != 0, open: { selectedPlace = place })
                }
                if discovery.places.count > 5 { Button { discovery.more() } label: { Label("More of these", systemImage: "arrow.right") }.buttonStyle(AmstrollButton(primary: false)) }
            } else if !discovery.loading {
                Text(discovery.didSearch ? "No nearby places could be loaded right now." : "Choose your preferences, then find a little possibility nearby.").font(AmstrollStyle.body())
            }
            if discovery.error != nil || (discovery.places.isEmpty) {
                Button("Explore the Amsterdam collection") { discovery.source = .collection }.buttonStyle(AmstrollButton(primary: false))
            }
        }
    }
    private var bottomBar: some View {
        HStack(spacing: 4) {
            ForEach(AmstrollTab.allCases, id: \.self) { item in
                Button { selectedPlan = nil; selectedPlace = nil; progress = false; tab = item } label: {
                    VStack(spacing: 6) { Image(systemName: item.icon).font(.system(size: 18)); Text(item.rawValue).font(AmstrollStyle.label(10)) }
                        .frame(maxWidth: .infinity, minHeight: 53).background(tab == item ? AmstrollStyle.paleSage : .clear, in: RoundedRectangle(cornerRadius: 17))
                }.buttonStyle(.plain).accessibilityIdentifier("tab-" + item.rawValue.lowercased()).accessibilityAddTraits(tab == item ? .isSelected : [])
            }
        }.padding(7).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 25)).padding(.horizontal, 13).padding(.bottom, 3)
    }
    private var saved: some View {
        ScrollView { LazyVStack(alignment: .leading, spacing: 18) {
            brandHeader; Text("Good ideas keep.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
            Text("Your next Amsterdam detour.").screenHeading()
            Text("Good ideas for another day in the city.").foregroundStyle(AmstrollStyle.muted)
            if store.saved.isEmpty { SmallNotice(text: "Save an idea while you explore. It will be waiting here.", symbol: "bookmark") }
            ForEach(store.savedPlans) { plan in PlanCardView(plan: plan, compact: false, open: { selectedPlan = plan }) }
            ForEach(store.saved.filter(\.isLive)) { idea in
                VStack(alignment: .leading, spacing: 12) {
                    Text(idea.title).font(AmstrollStyle.heading(18))
                    Text("Saved place identity. Open its source to check current details; provider photos are not stored in your journal.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
                    if let source = idea.sourceURL, let url = URL(string: source) { Link("View the place’s source ↗", destination: url) }
                    Button("Remove saved idea", role: .destructive) { store.removeSaved(idea.id) }
                }.amstrollCard()
            }
        }.padding(20) }.accessibilityIdentifier("saved-screen")
    }
    private var journal: some View {
        ScrollView { LazyVStack(alignment: .leading, spacing: 18) {
            brandHeader; Text("The little things add up.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
            Text("Little Amsterdam memories.").screenHeading()
            Text("A small record of the paths you took.").foregroundStyle(AmstrollStyle.muted)
            if store.journal.isEmpty { SmallNotice(text: "Finish an outing and keep a thought from it here. The journal is entirely optional.", symbol: "book") }
            ForEach(store.journal) { memory in MemoryCardView(memory: memory) }
            Text("Your notes and photographs stay on this iPhone. \(store.demoMode ? "These are fictional demo memories." : "No account or cloud backup is involved.")").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
        }.padding(20) }.accessibilityIdentifier("journal-screen")
    }
}

private struct DetourPath: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path(); p.move(to: CGPoint(x: -20, y: rect.height * 0.8)); p.addCurve(to: CGPoint(x: rect.width * 0.34, y: rect.height * 0.4), control1: CGPoint(x: rect.width * 0.18, y: rect.height), control2: CGPoint(x: rect.width * 0.1, y: rect.height * 0.2)); p.addCurve(to: CGPoint(x: rect.width + 20, y: rect.height * 0.25), control1: CGPoint(x: rect.width * 0.78, y: rect.height * 0.95), control2: CGPoint(x: rect.width * 0.8, y: 0)); return p
    }
}
