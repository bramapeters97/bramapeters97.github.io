import SwiftUI

enum SourceMode: String, CaseIterable {
    case open = "Amsterdam guide"
    case collection = "Amsterdam collection"
}

enum AmstrollTab: String {
    case explore = "Explore", saved = "Saved", journal = "Journal"
}

enum AmstrollSheet: String, Identifiable {
    case planner, sources, profile, credits, transit, rail
    var id: String { rawValue }
}

private enum GuideDestination: Hashable {
    case detail(Plan)
    case active
}

struct AmstrollRootView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AccessibilityFocusState private var focusPlanButton: Bool
    @State private var source = SourceMode.open
    @State private var tab = AmstrollTab.explore
    @State private var sheet: AmstrollSheet?
    @State private var heroCredit = false
    @State private var explorePath: [GuideDestination] = []
    @State private var savedPath: [GuideDestination] = []
    @State private var pool: [Plan] = []
    @State private var revealed = 3
    @State private var arrivalStart = Int.max
    @State private var latestQuery: Preferences?
    @State private var generation = 0
    @State private var shouldScrollToResults = false
    @State private var heroVisible = true
    @State private var initialized = false
    @State private var savedReturnToExplore = false
    @State private var resumeCardID: String?
    private let batch = 3

    init(store: AppStore) {
        _pool = State(initialValue: Self.photographedPlans(store.guideSuggestions))
        _latestQuery = State(initialValue: store.prefs)
    }

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack(path: $explorePath) {
                explore
                    .navigationDestination(for: GuideDestination.self) { destination in
                        destinationView(destination, path: $explorePath)
                    }
            }
            .tabItem { Label("Explore", systemImage: "paperplane") }
            .tag(AmstrollTab.explore)
            NavigationStack(path: $savedPath) {
                saved
                    .navigationDestination(for: GuideDestination.self) { destination in
                        destinationView(destination, path: $savedPath)
                    }
            }
            .tabItem { Label("Saved", systemImage: "bookmark") }
            .tag(AmstrollTab.saved)
            NavigationStack {
                journal
            }
            .tabItem { Label("Journal", systemImage: "book") }
            .tag(AmstrollTab.journal)
        }
        .tint(AmstrollStyle.forest)
        .sheet(item: $sheet, onDismiss: {
            if savedReturnToExplore {
                savedReturnToExplore = false
                focusPlanButton = true
            }
        }) { item in
            if item == .planner {
                StrollPlannerView(initial: store.prefs) { draft, customStart in
                    let changed = draft != store.prefs || customStart != nil
                    store.applyPreferences(draft, customStart: customStart)
                    savedReturnToExplore = false
                    refresh(reset: changed, scroll: true)
                }
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            } else {
                AmstrollSheetView(sheet: item, source: $source)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
        .sheet(isPresented: $heroCredit) {
            if let photo = PhotoMetadata.all[heroPhotoKey] {
                SheetPage(title: "Amsterdam photograph") { PhotoCreditView(metadata: photo) }
                    .presentationDetents([.medium, .large])
            }
        }
        .onChange(of: source) { _, _ in refresh(reset: true, scroll: true) }
        .onChange(of: store.prefs) { _, value in
            if value != latestQuery, sheet != .planner { refresh(reset: true, scroll: false) }
        }
        .onAppear(perform: initialize)
    }

    @ViewBuilder private func destinationView(_ destination: GuideDestination, path: Binding<[GuideDestination]>) -> some View {
        switch destination {
        case .detail(let plan):
            PlanDetailView(plan: plan) { path.wrappedValue.append(.active) }
        case .active:
            ActiveOutingView()
        }
    }

    private func initialize() {
        guard !initialized else { return }
        initialized = true
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--screenshot-scene"), arguments.count > index + 1 else { return }
        let best = pool.first(where: \.feasible) ?? store.suggestions.first(where: \.feasible)
        switch arguments[index + 1] {
        case "preferences", "clock": sheet = .planner
        case "detail": if let best { explorePath.append(.detail(best)) }
        case "progress": if let best, store.start(best) { explorePath.append(.active) }
        case "results": shouldScrollToResults = true
        case "saved": tab = .saved
        case "journal": tab = .journal
        default: break
        }
    }

    private func refresh(reset: Bool, scroll: Bool) {
        if reset || latestQuery == nil {
            latestQuery = store.prefs
            let plans = source == .collection ? store.suggestions : store.guideSuggestions
            pool = Self.photographedPlans(plans)
            revealed = batch
            arrivalStart = Int.max
            resumeCardID = nil
            generation += 1
        }
        if scroll { shouldScrollToResults = true }
    }

    private static func photographedPlans(_ plans: [Plan]) -> [Plan] {
        var ids = Set<String>()
        return plans.filter { plan in
            guard let photo = plan.photoKey, PhotoMetadata.all[photo] != nil else { return false }
            return ids.insert(plan.id).inserted
        }
    }

    private func append(_ expectedGeneration: Int) {
        guard expectedGeneration == generation, revealed < pool.count else { return }
        arrivalStart = revealed
        if reduceMotion { revealed = min(pool.count, revealed + batch) }
        else { withAnimation(.easeOut(duration: 0.23)) { revealed = min(pool.count, revealed + batch) } }
    }

    private var explore: some View {
        GeometryReader { geometry in
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 0) {
                        hero(height: max(370, geometry.size.height * 0.74))
                        LazyVStack(alignment: .leading, spacing: 20) {
                            feed
                        }.padding(.horizontal, 22).padding(.top, 28).padding(.bottom, 24)
                    }
                }
                .accessibilityIdentifier("explore-screen")
                .coordinateSpace(name: "explore-scroll")
                .onPreferenceChange(HeroPosition.self) { bottom in
                    heroVisible = bottom > 75
                }
                .onChange(of: shouldScrollToResults, initial: true) { _, change in
                    guard change else { return }
                    Task { @MainActor in
                        await Task.yield()
                        if reduceMotion { proxy.scrollTo("results", anchor: .top) }
                        else { withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo("results", anchor: .top) } }
                        shouldScrollToResults = false
                    }
                }
                .onChange(of: explorePath) { old, path in
                    guard !old.isEmpty, path.isEmpty, let id = resumeCardID else { return }
                    Task { @MainActor in
                        await Task.yield()
                        proxy.scrollTo(id, anchor: .center)
                    }
                }
            }
        }
        .background(AmstrollStyle.paper.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar {
            if !heroVisible {
                ToolbarItem(placement: .principal) {
                    Button { savedReturnToExplore = false; sheet = .planner } label: {
                        HStack(spacing: 7) {
                            Text("\(store.prefs.availableMinutes(at: store.now).amstrollDuration) from \(store.startArea.name)")
                                .lineLimit(1)
                            Image(systemName: "slider.horizontal.3")
                        }
                        .font(.subheadline.weight(.semibold))
                    }
                    .accessibilityLabel("Edit your stroll")
                }
            }
        }
    }

    private var heroPhotoKey: String {
        PhotoMetadata.all["guide-hero"] == nil ? "amsterdam-canals" : "guide-hero"
    }

    private func hero(height: CGFloat) -> some View {
        ZStack(alignment: .bottomLeading) {
            PlaceImage(photoKey: heroPhotoKey, label: PhotoMetadata.all[heroPhotoKey]?.alt ?? "Amsterdam canal houses", height: height)
                .overlay {
                    LinearGradient(stops: [
                        .init(color: .clear, location: 0.27),
                        .init(color: Color(hex: 0x122A23).opacity(0.38), location: 0.58),
                        .init(color: Color(hex: 0x122A23).opacity(0.92), location: 1),
                    ], startPoint: .top, endPoint: .bottom)
                    .allowsHitTesting(false)
                }
            VStack(alignment: .leading) {
                HStack {
                    Image("AmstrollWordmark").resizable().scaledToFit().frame(width: 128, height: 29)
                        .padding(.horizontal, 13).padding(.vertical, 8)
                        .background(AmstrollStyle.card, in: Capsule())
                        .accessibilityLabel("Amstroll")
                    Spacer()
                    Button { heroCredit = true } label: {
                        Image(systemName: "camera").frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(AmstrollStyle.ink)
                    .amstrollGlass(in: Circle())
                    .accessibilityLabel("Photo credits")
                }
                Spacer(minLength: 22)
                VStack(alignment: .leading, spacing: 13) {
                    Text("A little more Amsterdam.")
                        .font(.system(.largeTitle, design: .serif, weight: .regular))
                        .accessibilityAddTraits(.isHeader)
                        .fixedSize(horizontal: false, vertical: true)
                    Button { savedReturnToExplore = true; sheet = .planner } label: {
                        Label("Plan a stroll", systemImage: "arrow.right")
                            .font(.headline)
                            .padding(.horizontal, 12).frame(minHeight: 44)
                    }
                    .amstrollGlassButton()
                    .accessibilityFocused($focusPlanButton)
                    .accessibilityIdentifier("plan-stroll")
                }
                .foregroundStyle(.white)
            }
            .padding(.horizontal, 24).padding(.top, 20).padding(.bottom, 32)
        }
        .frame(minHeight: height)
        .background(Color(hex: 0x1B342B))
        .background {
            GeometryReader { proxy in
                Color.clear.preference(key: HeroPosition.self, value: proxy.frame(in: .named("explore-scroll")).maxY)
            }
        }
    }

    @ViewBuilder private var feed: some View {
            if store.active != nil {
                Button { explorePath.append(.active) } label: {
                    Label("Resume your outing", systemImage: "paperplane")
                }
                .buttonStyle(AmstrollButton(primary: false))
            }
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(source == .open ? "Your next stroll" : "Amsterdam collection")
                        .font(AmstrollStyle.editorial(.title))
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityIdentifier("results-heading")
                    Text("\(store.startArea.name) · \(store.prefs.availableMinutes(at: store.now).amstrollDuration) · \(finishLabel)")
                        .font(.footnote).foregroundStyle(AmstrollStyle.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 7)
                Menu {
                    Button("Edit plan", systemImage: "slider.horizontal.3") { sheet = .planner }
                    Button("Sources", systemImage: "globe.europe.africa") { sheet = .sources }
                    Button("Settings", systemImage: "gear") { sheet = .profile }
                } label: {
                    Image(systemName: "ellipsis").font(.headline).frame(width: 44, height: 44)
                }.accessibilityLabel("Stroll options")
            }
            .id("results")

            if pool.isEmpty || (!pool.contains(where: \.feasible) && store.prefs.availableMinutes(at: store.now) > 0) {
                ContentUnavailableView("No checked walk fits this plan", systemImage: "map", description: Text("Try a longer window or an Amsterdam starting point with checked walking routes."))
                Button("Edit plan") { sheet = .planner }.buttonStyle(AmstrollButton())
                if source == .open {
                    Button("Browse the Amsterdam collection") { source = .collection }
                        .buttonStyle(AmstrollButton(primary: false))
                }
            }
            if source == .collection {
                Text("The original Amsterdam collection uses authored sample estimates.")
                    .font(.footnote).foregroundStyle(AmstrollStyle.muted)
            }
            ForEach(Array(pool.prefix(revealed).enumerated()), id: \.element.id) { index, plan in
                if index == 0 || pool[index - 1].feasible {
                    if !plan.feasible { Text("Ideas to check").font(AmstrollStyle.editorial(.title2)).accessibilityAddTraits(.isHeader) }
                }
                PlanCardView(plan: plan, compact: index > 0 && index % 3 == 1) {
                    resumeCardID = plan.id
                    explorePath.append(.detail(plan))
                }
                .id(plan.id)
                .accessibilityIdentifier("outing-card-\(plan.id)")
                .transition(index >= arrivalStart && !reduceMotion ? .opacity.combined(with: .offset(y: 7)).combined(with: .scale(scale: 0.985, anchor: .top)) : .identity)
            }
            if pool.count > revealed {
                let request = generation
                let expectedCount = revealed
                Button("Load more ideas") { append(request) }
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .accessibilityIdentifier("load-more-outings")
                    .modifier(AppendWhenVisible {
                        guard revealed == expectedCount else { return }
                        append(request)
                    })
                    .id(revealed)
            } else if !pool.isEmpty {
                Text("You’ve seen all the ideas for this plan.")
                    .font(.footnote).foregroundStyle(AmstrollStyle.muted)
                    .frame(maxWidth: .infinity).padding(.vertical, 12)
            }
            if let error = store.storageError { SmallNotice(text: error, symbol: "externaldrive.badge.exclamationmark") }
    }

    private var finishLabel: String {
        switch store.prefs.endpoint {
        case "start": return "return here"
        case "none": return "finish at the last stop"
        default: return "finish at \(store.engine.start(store.prefs.endpoint)?.name ?? store.prefs.endpoint)"
        }
    }

    private var saved: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                if store.saved.isEmpty {
                    ContentUnavailableView("No saved outings", systemImage: "bookmark", description: Text("Bookmark a stroll to find it here."))
                }
                ForEach(store.savedPlans) { plan in
                    PlanCardView(plan: plan, compact: false) { savedPath.append(.detail(plan)) }
                }
                ForEach(store.saved.filter(\.isLive)) { idea in
                    VStack(alignment: .leading, spacing: 12) {
                        Text(idea.title).font(AmstrollStyle.editorial(.title3))
                        if let source = idea.sourceURL, let url = URL(string: source) {
                            Link("Open the original place listing", destination: url)
                        }
                        Button("Remove saved idea", role: .destructive) { store.removeSaved(idea.id) }
                    }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
                }
            }.padding(22)
        }
        .background(AmstrollStyle.paper.ignoresSafeArea())
        .navigationTitle("Saved")
        .accessibilityIdentifier("saved-screen")
    }

    private var journal: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                if store.journal.isEmpty {
                    ContentUnavailableView("No memories yet", systemImage: "book", description: Text("Finish a stroll to save an optional note or photo."))
                }
                ForEach(store.journal) { MemoryCardView(memory: $0) }
            }.padding(22)
        }
        .background(AmstrollStyle.paper.ignoresSafeArea())
        .navigationTitle("Journal")
        .accessibilityIdentifier("journal-screen")
    }
}

private struct HeroPosition: PreferenceKey {
    static let defaultValue: CGFloat = .infinity
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = min(value, nextValue()) }
}

private struct AppendWhenVisible: ViewModifier {
    var append: () -> Void
    func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.onScrollVisibilityChange(threshold: 0.65) { visible in
                if visible { append() }
            }
        } else {
            content.onAppear(perform: append)
        }
    }
}
