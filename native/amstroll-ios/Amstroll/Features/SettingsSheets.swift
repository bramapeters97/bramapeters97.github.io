import SwiftUI

struct SheetPage<Content: View>: View {
    let title: String
    @ViewBuilder var content: () -> Content
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView { VStack(alignment: .leading, spacing: 20, content: content).padding(22).frame(maxWidth: .infinity, alignment: .leading) }
                .background(AmstrollStyle.paper).font(AmstrollStyle.body()).foregroundStyle(AmstrollStyle.ink).tint(AmstrollStyle.forest)
                .navigationTitle(title).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}

struct AmstrollSheetView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let sheet: AmstrollSheet
    @Binding var source: SourceMode
    @StateObject private var location = LocationService()
    @State private var hours = 0
    @State private var minutes = 47
    @State private var draft = Preferences()
    @State private var unlimitedBudget = false
    @State private var budgetText = "20"
    @State private var error: String?
    @State private var stops: MunicipalStopResult?
    @State private var loading = false
    @State private var confirmReset = false
    @State private var document: LegalDocument?
    @State private var locationTask: Task<Void, Never>?
    private let context = ContextService()
    var body: some View {
        SheetPage(title: title) {
            switch sheet {
            case .exact: exactTime
            case .location: locations
            case .moods: moods
            case .preferences: preferences
            case .sources: sources
            case .profile: profile
            case .credits: credits
            case .transit: transit
            case .rail: rail
            }
            if let error { SmallNotice(text: error, symbol: "exclamationmark.circle") }
        }.onAppear { hours = store.prefs.minutes / 60; minutes = store.prefs.minutes % 60; draft = store.prefs; unlimitedBudget = store.prefs.budget == nil; budgetText = store.prefs.budget.map { String($0) } ?? "20" }
            .task { if sheet == .transit { await loadStops() } }
            .onDisappear { locationTask?.cancel() }
            .amstrollLoading(loading)
            .sheet(item: $document) { value in LegalDocumentView(document: value) }
    }
    private var title: String {
        switch sheet {
        case .exact: "Exactly your time."
        case .location: "Where shall we begin?"
        case .moods: "What feels right?"
        case .preferences: "Your kind of little adventure."
        case .sources: "Where ideas come from."
        case .profile: "Your Amstroll space."
        case .credits: "Real places, credited."
        case .transit: "GVB nearby."
        case .rail: "A little further."
        }
    }
    private var exactTime: some View {
        VStack(spacing: 20) {
            Text("Choose anything from zero minutes to twelve hours. Your budget stays where you set it.").font(AmstrollStyle.body())
            HStack {
                Picker("Hours", selection: $hours) { ForEach(0...12, id: \.self) { Text("\($0) hours").tag($0) } }
                Picker("Minutes", selection: $minutes) { ForEach(0...59, id: \.self) { Text("\($0) min").tag($0) } }
            }.pickerStyle(.wheel).frame(height: 170)
            Button("Use this time") {
                guard hours * 60 + minutes <= 720 else { error = "Choose no more than twelve hours."; return }
                store.prefs.minutes = hours * 60 + minutes; dismiss()
            }.buttonStyle(AmstrollButton())
            SmallNotice(text: "Zero minutes still leaves room for inspiration. Starting stays disabled until an outing fits.")
        }
    }
    private var locations: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Starting areas stay in Amsterdam. Choose one below, or share your current location for this start.").font(AmstrollStyle.body())
            Button {
                locationTask?.cancel()
                locationTask = Task {
                    do {
                        let point = try await location.requestLocation()
                        try Task.checkCancellation()
                        let nearest = store.catalog.starts.min { ProviderParsing.distance($0.lat, $0.lng, point.latitude, point.longitude) < ProviderParsing.distance($1.lat, $1.lng, point.latitude, point.longitude) }
                        let start = StartArea(id: "my-location", name: "Your location", lat: point.latitude, lng: point.longitude, area: nearest?.area ?? "Amsterdam", bank: nearest?.bank ?? "south")
                        store.selectStart(start); dismiss()
                    } catch { self.error = error.localizedDescription }
                }
            } label: { Label(location.isRequesting ? "Finding your location…" : "Use my current location", systemImage: "location") }.buttonStyle(AmstrollButton()).disabled(location.isRequesting)
            SmallNotice(text: "Optional foreground location only. Choosing an area manually works without permission. Nearby searches send the selected coordinates to their providers.")
            ForEach(store.startingAreas) { area in
                Button { locationTask?.cancel(); store.selectStart(area); dismiss() } label: {
                    HStack { Image(systemName: "mappin"); VStack(alignment: .leading, spacing: 3) { Text(area.name).font(AmstrollStyle.label()); Text(area.area).font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted) }; Spacer(); if store.prefs.start == area.id { Image(systemName: "checkmark") } }.frame(minHeight: 44).amstrollCard(padding: 12)
                }.buttonStyle(.plain).accessibilityAddTraits(store.prefs.start == area.id ? .isSelected : [])
            }
        }
    }
    private var moods: some View {
        VStack(spacing: 10) {
            ForEach(["any", "coffee", "culture", "outdoors", "unexpected", "food", "quiet"], id: \.self) { mood in
                Button { store.prefs.mood = mood; dismiss() } label: { HStack { Label(moodName(mood), systemImage: moodIcon(mood)); Spacer(); if store.prefs.mood == mood { Image(systemName: "checkmark") } }.frame(minHeight: 44).amstrollCard(padding: 12) }.buttonStyle(.plain)
            }
        }
    }
    private var preferences: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("A little time, a starting point, and whatever you’re in the mood for. We’ll find a few walks that fit.").font(AmstrollStyle.body())
            VStack(alignment: .leading, spacing: 14) {
                Stepper("\(draft.minutes) minutes to explore", value: $draft.minutes, in: 5...720, step: 5)
                Picker("Start from", selection: $draft.start) {
                    ForEach(store.startingAreas) { Text($0.name).tag($0.id) }
                }
                Picker("What sounds good?", selection: $draft.mood) {
                    ForEach(["any", "coffee", "culture", "outdoors", "unexpected", "food", "quiet"], id: \.self) { mood in
                        Text(moodName(mood)).tag(mood)
                    }
                }
                Text("You can also choose your current location from the home screen.")
                    .font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
            }.amstrollCard()
            VStack(alignment: .leading, spacing: 14) {
                Text("How would you like to travel?").font(AmstrollStyle.label())
                Picker("Travel mode", selection: $draft.transport) { Text("On foot").tag("walk"); Text("By bike").tag("cycle"); Text("Public transport").tag("transit") }.pickerStyle(.segmented)
                Text("Walking effort").font(AmstrollStyle.label())
                Stepper("Up to \(draft.walking) minutes walking", value: $draft.walking, in: 0...720, step: 5).font(AmstrollStyle.body())
                Text("Walking effort is separate from the entire outing’s duration.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
            }.amstrollCard()
            VStack(alignment: .leading, spacing: 14) {
                Text("A comfortable spending allowance").font(AmstrollStyle.label())
                Toggle("Any budget", isOn: $unlimitedBudget)
                if !unlimitedBudget { TextField("Amount in euros", text: $budgetText).keyboardType(.decimalPad).textFieldStyle(.roundedBorder).accessibilityLabel("Spending allowance in euros") }
                Toggle("Keep budget strict", isOn: $draft.strictBudget)
                Text("Collection amounts are illustrative allowances, not verified prices.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
            }.amstrollCard()
            VStack(alignment: .leading, spacing: 10) {
                Text("Where would you like to finish?").font(AmstrollStyle.label())
                Picker("Preferred endpoint", selection: $draft.endpoint) {
                    Text("See where I end up").tag("none")
                    Text("Return to my starting point").tag("start")
                    ForEach(store.startingAreas) { Text($0.name).tag($0.id) }
                }.pickerStyle(.menu)
            }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
            Button("Find my little adventure") {
                let number = Double(budgetText.replacingOccurrences(of: ",", with: "."))
                guard unlimitedBudget || (number != nil && number!.isFinite && number! >= 0 && number! <= 10_000) else { error = "Enter a spending allowance between €0 and €10,000, or choose Any budget."; return }
                draft.budget = unlimitedBudget ? nil : number
                store.prefs = draft; dismiss()
            }.buttonStyle(AmstrollButton())
        }.accessibilityIdentifier("preferences-sheet")
    }
    private var sources: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(SourceMode.allCases, id: \.self) { mode in
                Button { source = mode; dismiss() } label: {
                    HStack(alignment: .top, spacing: 12) { Image(systemName: mode == .open ? "globe.europe.africa" : "square.3.layers.3d"); VStack(alignment: .leading, spacing: 7) { Text(mode.rawValue).font(AmstrollStyle.heading(17)); Text(mode == .open ? "Nearby places from Apple Maps, OpenStreetMap, Wikidata and English and Dutch Wikipedia. Licensed photographs appear when available." : "Twenty authored ideas, bundled for offline use. Travel and spending use sample estimates.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted) }; Spacer(minLength: 0); if source == mode { Image(systemName: "checkmark.circle.fill") } }.amstrollCard()
                }.buttonStyle(.plain)
            }
            SmallNotice(text: "Nearby places combines public data and map listings. It does not mean these places are open right now. Sources are never silently replaced with sample results.")
            Text("No subscription or API key is needed. OpenStreetMap and Wikimedia supply open data and licensed pictures; Apple Maps supplies nearby listings and walking routes. Photos are never borrowed from a different venue.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
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
            Text("Amsterdam photographs retain their authors’ licences. Area images establish context; the Nearby places view uses separately linked place photographs.")
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
