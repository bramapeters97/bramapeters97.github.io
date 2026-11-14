import SwiftUI

struct SheetPage<Content: View>: View {
    let title: String
    var doneTitle = "Done"
    var onDone: (() -> Void)? = nil
    @ViewBuilder var content: () -> Content
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView { VStack(alignment: .leading, spacing: 20, content: content).padding(22).frame(maxWidth: .infinity, alignment: .leading) }
                .background(AmstrollStyle.paper).font(AmstrollStyle.body()).foregroundStyle(AmstrollStyle.ink).tint(AmstrollStyle.forest)
                .navigationTitle(title).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button(doneTitle) { if let onDone { onDone() } else { dismiss() } } } }
        }
    }
}

struct AmstrollSheetView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let sheet: AmstrollSheet
    @Binding var source: SourceMode
    @State private var error: String?
    @State private var stops: MunicipalStopResult?
    @State private var loading = false
    @State private var confirmReset = false
    @State private var document: LegalDocument?
    private let context = ContextService()
    var body: some View {
        SheetPage(title: title) {
            switch sheet {
            case .planner: EmptyView()
            case .sources: sources
            case .profile: profile
            case .credits: credits
            case .transit: transit
            case .rail: rail
            }
            if let error { SmallNotice(text: error, symbol: "exclamationmark.circle") }
        }
            .task { if sheet == .transit { await loadStops() } }
            .amstrollLoading(loading)
            .sheet(item: $document) { value in LegalDocumentView(document: value) }
    }
    private var title: String {
        switch sheet {
        case .planner: "Plan a stroll"
        case .sources: "Where ideas come from."
        case .profile: "Your Amstroll space."
        case .credits: "Real places, credited."
        case .transit: "GVB nearby."
        case .rail: "A little further."
        }
    }
    private var sources: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(SourceMode.allCases, id: \.self) { mode in
                Button { source = mode; dismiss() } label: {
                    HStack(alignment: .top, spacing: 12) { Image(systemName: mode == .open ? "globe.europe.africa" : "square.3.layers.3d"); VStack(alignment: .leading, spacing: 7) { Text(mode.rawValue).font(AmstrollStyle.heading(17)); Text(mode == .open ? "Walking routes from OpenStreetMap and Valhalla, with credited photos bundled on this device." : "Twenty authored ideas, bundled for offline use. Travel and spending use sample estimates.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted) }; Spacer(minLength: 0); if source == mode { Image(systemName: "checkmark.circle.fill") } }.amstrollCard()
                }.buttonStyle(.plain)
            }
            SmallNotice(text: "The guide checks walking time and known access. The Amsterdam collection uses separate sample plans.")
            Text("OpenStreetMap and Valhalla provide the routed walks. Wikimedia Commons provides licensed imagery. The guide and collection are available offline.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
            Button { Task { loading = true; defer { loading = false }; do { let selected = store.startArea; let result = try await context.weather(latitude: selected.lat, longitude: selected.lng); if store.startArea == selected { store.forecast = result } } catch { self.error = error.localizedDescription } } } label: { Label(loading ? "Checking the forecast…" : "Check weather for this start", systemImage: "sun.max") }.buttonStyle(AmstrollButton(primary: false)).disabled(loading)
            if let weather = store.forecast {
                VStack(alignment: .leading, spacing: 9) {
                    Text("\(weather.temperature.map { String(Int($0.rounded())) + "°C" } ?? "Temperature unavailable") · \(weather.summary)").font(AmstrollStyle.label())
                    Text("Forecast \(weather.forecastTime). Retrieved \(weather.retrievedAt.formatted(date: .omitted, time: .shortened)).").font(AmstrollStyle.body(11))
                    Link(weather.source, destination: URL(string: weather.sourceURL)!)
                }.amstrollCard()
            }
            Text("Weather requests send rounded starting coordinates and your network address to MET Norway. Forecasts are guidance.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
        }
    }
    private var profile: some View {
        VStack(alignment: .leading, spacing: 18) {
            Image("AmstrollWordmark").resizable().scaledToFit().frame(height: 40)
            Text(store.demoMode ? "You’re exploring sample adventures." : "Your little corner of Amsterdam.").font(AmstrollStyle.heading(22))
            Text("Amstroll is completely free. No login, subscription or in-app purchases. Saved ideas, notes and optional photos stay on this iPhone.").font(AmstrollStyle.body())
            if store.demoMode { SmallNotice(text: "Demo mode uses isolated sample data. It does not replace your real saved ideas or memories.") }
            Button { document = .privacy } label: { Label("Privacy policy", systemImage: "hand.raised") }.frame(minHeight: 44)
            Button { document = .support } label: { Label("Help & support", systemImage: "questionmark.circle") }.frame(minHeight: 44)
            Button { document = .notices } label: { Label("Photo, font & software notices", systemImage: "doc.text") }.frame(minHeight: 44)
            Link(destination: URL(string: "https://bram-peters.com/contact.html")!) { Label("Contact Bram Peters Studio", systemImage: "envelope") }.frame(minHeight: 44)
            Button(role: .destructive) { confirmReset = true } label: { Label("Reset local Amstroll data", systemImage: "trash") }.frame(minHeight: 44)
            Text("Reset removes this app’s preferences, saved ideas, active outing, memories and photographs on this device.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
        }.confirmationDialog("Remove all local Amstroll data?", isPresented: $confirmReset, titleVisibility: .visible) { Button("Reset Amstroll", role: .destructive) { do { try store.reset(); dismiss() } catch { self.error = error.localizedDescription } } }
    }
    private var credits: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Amsterdam photographs retain their authors’ licences. Area photographs are labelled where they provide context.")
            ForEach(PhotoMetadata.all.keys.sorted(), id: \.self) { key in if let photo = PhotoMetadata.all[key] { PhotoCreditView(metadata: photo).amstrollCard() } }
        }
    }
    private var transit: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Tram and metro stops near \(store.startArea.name).").font(AmstrollStyle.heading(20))
            if loading { ProgressView("Checking the municipal inventory…") }
            if let stops {
                SmallNotice(text: stops.note)
                ForEach(stops.stops) { stop in
                    VStack(alignment: .leading, spacing: 6) { Text(stop.name).font(AmstrollStyle.label()); Text("\(stop.distanceMeters) m away · \(stop.mode)").font(AmstrollStyle.body(12)); if !stop.lines.isEmpty { Text("Source line context: \(stop.lines.joined(separator: ", "))").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted) } }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
                }
                Link(stops.source, destination: URL(string: stops.sourceURL)!).font(AmstrollStyle.body(11))
            }
            if !loading { Button("Refresh nearby stops") { Task { await loadStops() } }.buttonStyle(AmstrollButton(primary: false)) }
            Link(destination: TransportLinks.gvb) { Label("Open official GVB planner", systemImage: "arrow.up.right") }.buttonStyle(AmstrollButton())
        }
    }
    private var rail: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("More time can mean a little further.").screenHeading()
            Text("Haarlem and Zandvoort are optional excursions from Amsterdam, not additional starting cities. Their sample plans include the outward journey, visit and return.")
            SmallNotice(text: "Train allowances are authored estimates. Fares, departures, disruptions and destination access need checking in the official NS planner.")
            ForEach(store.catalog.experiences.filter { $0.excursion != nil }) { experience in Text(experience.title).font(AmstrollStyle.heading(17)).frame(maxWidth: .infinity, alignment: .leading).amstrollCard() }
            Text("Choose Public transport in preferences and browse the Amsterdam collection for these full sample plans.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
            Link(destination: TransportLinks.ns) { Label("Open official NS planner", systemImage: "train.side.front.car") }.buttonStyle(AmstrollButton())
        }
    }
    private func loadStops() async {
        loading = true; error = nil; defer { loading = false }
        do { stops = try await context.nearbyStops(latitude: store.startArea.lat, longitude: store.startArea.lng) } catch { self.error = error.localizedDescription }
    }
    private func moodName(_ value: String) -> String { ["any":"Anything", "coffee":"Good coffee", "culture":"A little culture", "outdoors":"Fresh air", "unexpected":"Unexpected", "food":"Something tasty", "quiet":"Somewhere quiet"][value] ?? value }
    private func moodIcon(_ value: String) -> String { ["any":"sparkle", "coffee":"cup.and.saucer", "culture":"building.columns", "outdoors":"leaf", "unexpected":"paperplane", "food":"fork.knife", "quiet":"sun.haze"][value] ?? "sparkle" }
}

enum LegalDocument: String, Identifiable { case privacy = "PrivacyPolicy", support = "Support", notices = "ThirdPartyNotices"
    var id: String { rawValue }
    var title: String { switch self { case .privacy: "Privacy policy"; case .support: "Help & support"; case .notices: "Licences & notices" } }
}
struct LegalDocumentView: View {
    let document: LegalDocument
    var body: some View {
        SheetPage(title: document.title) {
            if let url = Bundle.main.url(forResource: document.rawValue, withExtension: "md"), let text = try? String(contentsOf: url, encoding: .utf8) {
                Text(text).font(AmstrollStyle.body(13)).textSelection(.enabled)
            } else { SmallNotice(text: "This document could not load. Please contact support.") }
            if document == .notices {
                ForEach(["DMSans-OFL", "PlusJakartaSans-OFL"], id: \.self) { name in
                    if let url = Bundle.main.url(forResource: name, withExtension: "txt"), let licence = try? String(contentsOf: url, encoding: .utf8) {
                        DisclosureGroup(name == "DMSans-OFL" ? "DM Sans — complete font licence" : "Plus Jakarta Sans — complete font licence") { Text(licence).font(AmstrollStyle.body(12)).textSelection(.enabled).padding(.top, 12) }
                    }
                }
                Text("Original photograph credits").font(AmstrollStyle.heading(20))
                ForEach(PhotoMetadata.all.keys.sorted(), id: \.self) { key in
                    if let photo = PhotoMetadata.all[key] { PhotoCreditView(metadata: photo).amstrollCard() }
                }
            }
        }
    }
}

struct StrollPlannerView: View {
    private enum Step: String, Hashable {
        case time = "Plan a stroll", locations = "Start & finish", refine = "Refine"
    }

    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @StateObject private var location = LocationService()
    @State private var draft: Preferences
    @State private var directLocation: StartArea?
    @State private var path: [Step] = []
    @State private var exact = false
    @State private var budgetText: String
    @State private var message: String?
    @State private var locationTask: Task<Void, Never>?
    private let onApply: (Preferences, StartArea?) -> Void

    init(initial: Preferences, onApply: @escaping (Preferences, StartArea?) -> Void) {
        _draft = State(initialValue: initial)
        _budgetText = State(initialValue: initial.budget.map { $0.formatted(.number.grouping(.never)) } ?? "")
        self.onApply = onApply
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 15) {
                    timeControls
                    entryRow("Start & finish", detail: locationSummary, icon: "point.topleft.down.to.point.bottomright.curvepath") { path.append(.locations) }
                    entryRow("Refine", detail: refinementSummary, icon: "slider.horizontal.3") { path.append(.refine) }
                    if let message { SmallNotice(text: message, symbol: "exclamationmark.circle") }
                }
                .padding(22)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .accessibilityIdentifier("preferences-sheet")
            .background(AmstrollStyle.paper.ignoresSafeArea())
            .navigationTitle(Step.time.rawValue)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button("Show strolls", action: apply)
                    .buttonStyle(AmstrollButton())
                    .accessibilityIdentifier("find-adventure")
                    .padding(.horizontal, 22).padding(.vertical, 8)
                    .frame(maxWidth: 560)
                    .frame(maxWidth: .infinity)
                    .background(.bar)
            }
            .navigationDestination(for: Step.self) { step in
                switch step {
                case .time: EmptyView()
                case .locations: locations
                case .refine: refinements
                }
            }
        }
        .onDisappear { locationTask?.cancel() }
    }

    private var timeControls: some View {
        VStack(alignment: .leading, spacing: 15) {
            Picker("Available time mode", selection: deadlineMode) {
                Text("Duration").tag(false)
                Text("Back by").tag(true)
            }
            .pickerStyle(.segmented)
            if draft.deadline != nil {
                VStack(alignment: .leading, spacing: 8) {
                    DatePicker("Amsterdam time", selection: deadlineBinding, in: store.now...store.now.addingTimeInterval(43_200), displayedComponents: [.date, .hourAndMinute])
                        .environment(\.timeZone, amsterdamTimeZone)
                    Text("Finish by \(amsterdamTime(draft.deadline ?? store.now))")
                        .font(.footnote).foregroundStyle(AmstrollStyle.muted)
                }
                .padding(16).background(AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 20))
            }
            StrollClock(minutes: clockBinding, editable: draft.deadline == nil)
                .frame(maxWidth: .infinity)
            if draft.deadline == nil {
                DisclosureGroup("Presets & exact time", isExpanded: $exact) {
                    VStack(alignment: .leading, spacing: 12) {
                        Picker("Preset", selection: preset) {
                            Text("Custom").tag(-1)
                            ForEach([15, 30, 60, 120], id: \.self) { Text($0.amstrollDuration).tag($0) }
                        }
                        .pickerStyle(.menu)
                        HStack {
                            Picker("Hours", selection: hours) {
                                ForEach(0...12, id: \.self) { Text("\($0) h").tag($0) }
                            }
                            Picker("Minutes", selection: minutes) {
                                ForEach(0...(draft.minutes / 60 == 12 ? 0 : 59), id: \.self) { Text("\($0) min").tag($0) }
                            }
                        }
                        .pickerStyle(.wheel)
                        .frame(height: 112)
                        .clipped()
                        .accessibilityIdentifier("exact-duration")
                    }.padding(.top, 5)
                }
                .frame(minHeight: 44)
                .padding(.horizontal, 13)
                .background(AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 15))
            }
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: draft.deadline != nil)
    }

    private var locations: some View {
        Form {
            Section("Start from") {
                Picker("Starting point", selection: $draft.start) {
                    ForEach(availableStarts) { Text($0.name).tag($0.id) }
                }.accessibilityIdentifier("stroll-start")
                Button {
                    locationTask?.cancel()
                    locationTask = Task {
                        do {
                            let point = try await location.requestLocation()
                            try Task.checkCancellation()
                            let nearest = store.catalog.starts.min {
                                ProviderParsing.distance($0.lat, $0.lng, point.latitude, point.longitude)
                                < ProviderParsing.distance($1.lat, $1.lng, point.latitude, point.longitude)
                            }
                            directLocation = StartArea(id: "my-location", name: "Your location", lat: point.latitude, lng: point.longitude,
                                                       area: nearest?.area ?? "Amsterdam", bank: nearest?.bank ?? "south")
                            draft.start = "my-location"
                            message = nil
                        } catch is CancellationError {
                        } catch { message = error.localizedDescription }
                    }
                } label: {
                    Label(location.isRequesting ? "Finding your location…" : "Use current location", systemImage: "location")
                }.disabled(location.isRequesting)
                if let message { Text(message).font(.footnote).foregroundStyle(AmstrollStyle.muted) }
            }
            Section("Finish at") {
                Picker("Finish", selection: $draft.endpoint) {
                    Text("Back at the start").tag("start")
                    Text("Last stop").tag("none")
                    ForEach(availableStarts.filter { $0.id != "my-location" }) { Text($0.name).tag($0.id) }
                }.accessibilityIdentifier("stroll-finish")
            }
        }.navigationTitle(Step.locations.rawValue).navigationBarTitleDisplayMode(.inline)
    }

    private var refinements: some View {
        Form {
            Section("Mood") {
                Picker("What sounds good?", selection: $draft.mood) {
                    ForEach(["any", "outdoors", "rain", "quiet", "culture", "coffee", "food", "unexpected"], id: \.self) {
                        Text(moodLabel($0)).tag($0)
                    }
                }
            }
            Section("Walking") {
                Stepper("Up to \(draft.walking.amstrollDuration)", value: $draft.walking, in: 0...720, step: 5)
                Toggle("Require step-free access", isOn: Binding(get: { draft.requiresStepFree ?? false }, set: { draft.requiresStepFree = $0 }))
                Picker("Travel", selection: $draft.transport) {
                    Text("On foot").tag("walk")
                    Text("By bike").tag("cycle")
                    Text("Public transport").tag("transit")
                }
            }
            Section("Budget") {
                Toggle("Any budget", isOn: Binding(get: { draft.budget == nil }, set: {
                    draft.budget = $0 ? nil : 20
                    if !$0, budgetText.isEmpty { budgetText = "20" }
                }))
                if draft.budget != nil {
                    TextField("Amount in euros", text: $budgetText)
                        .keyboardType(.decimalPad)
                        .accessibilityLabel("Spending allowance in euros")
                    Toggle("Keep budget strict", isOn: $draft.strictBudget)
                }
            }
        }.navigationTitle(Step.refine.rawValue).navigationBarTitleDisplayMode(.inline)
    }

    private var availableStarts: [StartArea] {
        if let directLocation { return [directLocation] + store.startingAreas.filter { $0.id != directLocation.id } }
        return store.startingAreas
    }

    private var locationSummary: String {
        let start = availableStarts.first(where: { $0.id == draft.start })?.name ?? store.startArea.name
        let finish = switch draft.endpoint {
        case "start": "return here"
        case "none": "finish at the last stop"
        default: "finish at \(availableStarts.first { $0.id == draft.endpoint }?.name ?? draft.endpoint)"
        }
        return "\(start) · \(finish)"
    }

    private var refinementSummary: String { "\(moodLabel(draft.mood)) · \(draft.budget == nil ? "Any budget" : "€\(budgetText)")" }

    private func entryRow(_ title: String, detail: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon).font(.body).frame(width: 25)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.subheadline.weight(.semibold))
                    Text(detail).font(.footnote).foregroundStyle(AmstrollStyle.muted)
                }.frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(AmstrollStyle.muted)
            }.padding(11).frame(minHeight: 52)
        }.buttonStyle(.plain).background(AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 16))
    }

    private var deadlineMode: Binding<Bool> {
        Binding(get: { draft.deadline != nil }, set: { fixed in
            if fixed { draft.deadline = store.now.addingTimeInterval(Double(max(1, draft.minutes) * 60)) }
            else { draft.deadline = nil }
        })
    }

    private var deadlineBinding: Binding<Date> {
        Binding(get: { draft.deadline ?? store.now }, set: { draft.deadline = $0 })
    }

    private var clockBinding: Binding<Int> {
        Binding(get: {
            draft.deadline.map { max(0, min(720, Int($0.timeIntervalSince(store.now) / 60))) } ?? draft.minutes
        }, set: { draft.minutes = $0 })
    }

    private var preset: Binding<Int> {
        Binding(get: { [15, 30, 60, 120].contains(draft.minutes) ? draft.minutes : -1 },
                set: { if $0 >= 0 { draft.minutes = $0 } })
    }

    private var hours: Binding<Int> {
        Binding(get: { draft.minutes / 60 }, set: { draft.minutes = min(720, $0 * 60 + draft.minutes % 60) })
    }

    private var minutes: Binding<Int> {
        Binding(get: { draft.minutes % 60 }, set: { draft.minutes = min(720, draft.minutes / 60 * 60 + $0) })
    }

    private func apply() {
        if draft.budget != nil {
            let number = Double(budgetText.replacingOccurrences(of: ",", with: "."))
            guard let number, (0...10_000).contains(number) else {
                message = "Enter a budget from €0 to €10,000 in Refine."
                return
            }
            draft.budget = number
        }
        if let deadline = draft.deadline {
            let minutes = Int(deadline.timeIntervalSince(store.now) / 60)
            guard (0...720).contains(minutes), deadline > store.now else {
                message = "Choose a finish time in the next 12 hours."
                return
            }
            draft.minutes = minutes
        }
        onApply(draft, directLocation)
        dismiss()
    }

    private func moodLabel(_ mood: String) -> String {
        ["any": "Anything", "outdoors": "Fresh air", "rain": "Rainy day", "quiet": "Somewhere quiet",
         "culture": "Culture", "coffee": "Coffee", "food": "Food", "unexpected": "Surprise me"][mood] ?? mood
    }
}
