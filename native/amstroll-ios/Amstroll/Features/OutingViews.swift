import SwiftUI
import PhotosUI
import UIKit
import ImageIO

struct PlanCardView: View {
    @EnvironmentObject private var store: AppStore
    let plan: Plan
    var compact: Bool
    var open: () -> Void
    @State private var credit = false
    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topTrailing) {
                Button(action: open) {
                    Group {
                        if compact {
                            HStack(alignment: .top, spacing: 12) {
                                PlaceImage(photoKey: plan.photoKey, label: "\(plan.area) area photograph", height: 145).frame(width: 100).clipped()
                                copy.padding(.vertical, 13).padding(.trailing, 42)
                            }
                        } else {
                            VStack(alignment: .leading, spacing: 0) {
                                PlaceImage(photoKey: plan.photoKey, label: "\(plan.area) area photograph", height: 169)
                                copy.padding(17)
                            }
                        }
                    }.contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel("View \(plan.title). \(plan.status.label)")
                Button { store.toggleSaved(plan) } label: { Image(systemName: store.isSaved(plan.id) ? "bookmark.fill" : "bookmark").frame(width: 44, height: 44).background(AmstrollStyle.card, in: Circle()) }
                    .buttonStyle(.plain).padding(10).accessibilityLabel("\(store.isSaved(plan.id) ? "Unsave" : "Save") \(plan.title)")
            }
            if !compact, PhotoMetadata.all[plan.photoKey ?? ""] != nil {
                Divider()
                Button { credit = true } label: { Label("\(PhotoMetadata.all[plan.photoKey ?? ""]?.credit ?? "Photo source") · area context", systemImage: "camera").font(AmstrollStyle.body(10)).frame(maxWidth: .infinity, alignment: .leading).padding(12) }.buttonStyle(.plain)
            }
        }.background(AmstrollStyle.card).clipShape(RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(AmstrollStyle.line, lineWidth: 1))
            .sheet(isPresented: $credit) { if let metadata = PhotoMetadata.all[plan.photoKey ?? ""] { SheetPage(title: "A little photo context") { PhotoCreditView(metadata: metadata) } } }
    }
    private var copy: some View {
        VStack(alignment: .leading, spacing: compact ? 7 : 10) {
            Label(plan.area, systemImage: "mappin").font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted)
            Text(plan.title).font(AmstrollStyle.heading(compact ? 15 : 19)).tracking(-0.6).fixedSize(horizontal: false, vertical: true)
            Text(plan.description).font(AmstrollStyle.body(compact ? 11 : 12)).foregroundStyle(AmstrollStyle.muted).lineLimit(compact ? 2 : 3)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) { stats }
                VStack(alignment: .leading, spacing: 5) { stats }
            }.font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted)
            Label(plan.status == .moreTime ? "Needs \(plan.minimumMinutes.amstrollDuration)" : plan.status.label, systemImage: plan.status.symbol)
                .font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.forest).padding(.top, 3)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    @ViewBuilder private var stats: some View {
        Label(plan.total.amstrollDuration, systemImage: "clock")
        Label(plan.walking.amstrollDuration, systemImage: "figure.walk")
        Text(plan.cost == 0 ? "No purchase planned" : plan.costLabel)
    }
}

struct PlanDetailView: View {
    @EnvironmentObject private var store: AppStore
    @State var plan: Plan
    var onStart: () -> Void
    @State private var credit = false
    @State private var startError: String?
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 21) {
                PlaceImage(photoKey: plan.photoKey, label: "\(plan.area) area context", height: 220).clipShape(RoundedRectangle(cornerRadius: 24))
                Button { credit = true } label: { Label("Photograph and original source", systemImage: "camera").font(AmstrollStyle.body(10)) }.frame(minHeight: 44)
                Text("\(plan.area) · A little off plan").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
                Text(plan.title).screenHeading()
                Text(plan.description).font(AmstrollStyle.body(14)).foregroundStyle(AmstrollStyle.muted)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 95))], spacing: 9) {
                    metric(plan.total.amstrollDuration, caption: "including buffer")
                    metric(plan.walking.amstrollDuration, caption: "walking effort")
                    metric(plan.cost == 0 ? "No purchase planned" : plan.costLabel, caption: "sample allowance")
                }
                if !plan.rankReasons.isEmpty {
                    VStack(alignment: .leading, spacing: 10) { Text("Why this little detour").font(AmstrollStyle.label()); ForEach(plan.rankReasons, id: \.self) { Text($0).font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted) } }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
                }
                Text("The little plan").font(AmstrollStyle.heading(20))
                ForEach(Array(plan.stops.enumerated()), id: \.element.id) { index, stop in
                    HStack(alignment: .top, spacing: 13) {
                        Text("\(index + 1)").font(AmstrollStyle.label()).frame(width: 26, height: 26).background(AmstrollStyle.paleSage, in: Circle())
                        VStack(alignment: .leading, spacing: 8) {
                            Text(stop.name).font(AmstrollStyle.heading(16))
                            Text(stop.description).font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
                            Text("\(stop.travel) min estimated travel · \(stop.dwell) min here").font(AmstrollStyle.body(11))
                            if let url = URL(string: stop.source) { Link("Place source ↗", destination: url).font(AmstrollStyle.body(11)) }
                        }; Spacer(minLength: 0)
                    }
                }
                Label("\(plan.endpoint) · \(plan.endpointTravel) min endpoint travel", systemImage: "flag").font(AmstrollStyle.label(12))
                SmallNotice(text: plan.reason, symbol: plan.status.symbol)
                if plan.minimumMinutes > store.prefs.minutes && plan.minimumMinutes <= 720 {
                    Button("Use \(plan.minimumMinutes.amstrollDuration) for this idea") {
                        store.prefs.minutes = plan.minimumMinutes; refresh()
                    }.buttonStyle(AmstrollButton(primary: false))
                }
                if plan.prefs != store.prefs {
                    SmallNotice(text: "This saved idea uses its original preferences. Your current time and budget have not changed.")
                    Button("Use this idea’s saved preferences") { store.prefs = plan.prefs; refresh() }.buttonStyle(AmstrollButton(primary: false))
                }
                VStack(alignment: .leading, spacing: 12) {
                    Text("Travel options").font(AmstrollStyle.heading(18))
                    Link(destination: TransportLinks.gvb) { Label("Open official GVB planner", systemImage: "tram") }
                    Link(destination: TransportLinks.ns) { Label("Open official NS planner", systemImage: "train.side.front.car") }
                    Text("Operator planners provide current journey information. These links are not a live departure feed. The times above remain authored planning estimates.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
                }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
                if store.active != nil { SmallNotice(text: "An outing is already underway. Return to Explore and pick up where you left off, or finish it before starting another.") }
                if let startError { SmallNotice(text: startError) }
                HStack(spacing: 9) {
                    Button { store.toggleSaved(plan) } label: { Image(systemName: store.isSaved(plan.id) ? "bookmark.fill" : "bookmark").frame(width: 24) }.buttonStyle(AmstrollButton(primary: false)).frame(width: 60).accessibilityLabel(store.isSaved(plan.id) ? "Unsave outing" : "Save outing")
                    Button { if store.start(plan) { onStart() } else { startError = "An outing may already be underway, or preferences have changed. Return to Explore to resume or refresh the plan." } } label: { Label("Start sample outing", systemImage: "arrow.right") }
                        .buttonStyle(AmstrollButton()).disabled(!plan.feasible || plan.prefs != store.prefs || store.active != nil).accessibilityIdentifier("start-outing")
                }
                Text("Authored Amsterdam catalogue. Travel, visit and spending allowances are estimates; opening and access may change. No reservation or automatic tracking is involved.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
            }.padding(20)
        }.background(AmstrollStyle.paper).navigationTitle("Explore").navigationBarTitleDisplayMode(.inline).toolbar(.visible, for: .navigationBar)
            .accessibilityIdentifier("detail-screen")
            .sheet(isPresented: $credit) { if let meta = PhotoMetadata.all[plan.photoKey ?? ""] { SheetPage(title: "A little photo context") { PhotoCreditView(metadata: meta) } } }
    }
    private func refresh() { if let value = try? store.engine.plan(id: plan.id, prefs: store.prefs, context: store.planningContext) { plan = value } }
    private func metric(_ title: String, caption: String) -> some View {
        VStack(spacing: 7) { Text(title).font(AmstrollStyle.heading(16)).multilineTextAlignment(.center); Text(caption).font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted).multilineTextAlignment(.center) }.frame(maxWidth: .infinity, minHeight: 72).amstrollCard(padding: 12)
    }
}

struct ActiveOutingView: View {
    @EnvironmentObject private var store: AppStore
    @State private var finish = false
    var body: some View {
        ScrollView { VStack(alignment: .leading, spacing: 22) {
            if let outing = store.active, let remaining = store.remainingPlan {
                Text("A little off the usual path.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
                Text(outing.plan.title).screenHeading()
                VStack(alignment: .leading, spacing: 16) {
                    Text(remaining.stops.isEmpty ? "A LITTLE TIME, WELL SPENT" : "RIGHT HERE, RIGHT NOW").font(AmstrollStyle.label(10))
                    Text(remaining.stops.first?.name ?? "A moment worth keeping.").font(AmstrollStyle.heading(25))
                    Text(remaining.stops.isEmpty ? "The stops are done. Keep a thought from the day." : "There’s no rush to make it a perfect little adventure.").font(AmstrollStyle.body())
                    HStack { ForEach(outing.plan.stops) { stop in Capsule().fill(outing.done.contains(stop.id) || outing.skipped.contains(stop.id) ? AmstrollStyle.forest : AmstrollStyle.sage.opacity(0.4)).frame(height: 5) } }.accessibilityLabel("\(outing.done.count + outing.skipped.count) of \(outing.plan.stops.count) stops finished")
                }.frame(maxWidth: .infinity, alignment: .leading).padding(23).background(LinearGradient(colors: [AmstrollStyle.butter.opacity(0.55), AmstrollStyle.paleSage], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 28))
                Text("\(remaining.total.amstrollDuration) remaining in the sample plan").font(AmstrollStyle.heading(17))
                Text("Updated by your manual progress. No GPS or automatic arrival tracking.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
                if let current = remaining.stops.first {
                    VStack(alignment: .leading, spacing: 12) { Text("Now: \(current.name)").font(AmstrollStyle.heading(17)); Text(current.description).font(AmstrollStyle.body(13)); Text("\(current.dwell) minutes to enjoy. Check your surroundings and any access restrictions.").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted) }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
                    if outing.prefs.transport == "walk" {
                        Link(destination: TransportLinks.walkingDirections(latitude: current.lat, longitude: current.lng, name: current.name)) { Label("Open walking directions", systemImage: "location") }.buttonStyle(AmstrollButton(primary: false))
                    } else {
                        Link(destination: TransportLinks.destinationMap(latitude: current.lat, longitude: current.lng, name: current.name)) { Label("Open this stop in Maps", systemImage: "location") }.buttonStyle(AmstrollButton(primary: false))
                        if outing.prefs.transport == "transit" { Link("Check the official GVB planner ↗", destination: TransportLinks.gvb).frame(minHeight: 44) }
                    }
                    Button { store.completeStop() } label: { Label("That was a good little stop", systemImage: "checkmark") }.buttonStyle(AmstrollButton()).accessibilityIdentifier("complete-stop")
                    Button("Skip this stop & update the plan") { store.skipStop() }.font(AmstrollStyle.label(13)).frame(maxWidth: .infinity, minHeight: 44).accessibilityIdentifier("skip-stop")
                } else { Button("Keep a little memory") { finish = true }.buttonStyle(AmstrollButton()) }
                Text("The path so far").font(AmstrollStyle.heading(20))
                ForEach(outing.plan.stops) { stop in
                    HStack { Image(systemName: outing.done.contains(stop.id) ? "checkmark.circle.fill" : outing.skipped.contains(stop.id) ? "arrow.uturn.right.circle" : "circle"); VStack(alignment: .leading, spacing: 4) { Text(stop.name).font(AmstrollStyle.label()); Text(outing.done.contains(stop.id) ? "Enjoyed" : outing.skipped.contains(stop.id) ? "Skipped" : "\(stop.dwell) min to enjoy").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted) }; Spacer() }.padding(.vertical, 8)
                }
                Button("Call this a good little outing") { finish = true }.buttonStyle(AmstrollButton(primary: false))
            } else {
                Text("A little story, kept.").screenHeading(); Text("Your outing is complete. You can revisit the memory in Journal.")
            }
        }.padding(20) }.background(AmstrollStyle.paper).navigationTitle("Your outing").navigationBarTitleDisplayMode(.inline).toolbar(.visible, for: .navigationBar)
            .sheet(isPresented: $finish) { CompleteOutingView() }.accessibilityIdentifier("progress-screen")
    }
}

struct CompleteOutingView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var note = ""
    @FocusState private var noteFocused: Bool
    @State private var rating = "Loved it"
    @State private var pickerItem: PhotosPickerItem?
    @State private var photo: Data?
    @State private var photoLoading = false
    @State private var photoTask: Task<Void, Never>?
    @State private var error: String?
    var body: some View {
        SheetPage(title: "A little story to keep") {
            Image(systemName: "checkmark").font(.system(size: 30)).frame(width: 88, height: 88).background(AmstrollStyle.paleSage, in: Circle()).frame(maxWidth: .infinity)
            Text("That time became\na little story.").screenHeading().multilineTextAlignment(.center).frame(maxWidth: .infinity)
            Text(store.active?.plan.title ?? "A little time, well spent.").font(AmstrollStyle.body()).foregroundStyle(AmstrollStyle.muted)
            Text("What stayed with you?").font(AmstrollStyle.label())
            TextEditor(text: $note).focused($noteFocused).toolbar { ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { noteFocused = false }.accessibilityIdentifier("dismiss-memory-keyboard") } }.frame(minHeight: 110).padding(10).scrollContentBackground(.hidden).background(AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 16)).accessibilityLabel("Optional memory note").onChange(of: note) { _, value in if value.count > 1200 { note = String(value.prefix(1200)) } }
            Text("How did it feel?").font(AmstrollStyle.label())
            Picker("Enjoyment", selection: $rating) { ForEach(["Loved it", "Good", "Not my thing"], id: \.self) { Text($0).tag($0) } }.pickerStyle(.segmented)
            PhotosPicker(selection: $pickerItem, matching: .images) { Label(photoLoading ? "Preparing photo…" : "Choose a photograph, if you like", systemImage: "camera") }.buttonStyle(AmstrollButton(primary: false)).disabled(photoLoading)
            if let photo, let image = UIImage(data: photo) { Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 200).clipShape(RoundedRectangle(cornerRadius: 16)); Button("Remove photograph") { self.photo = nil; pickerItem = nil } }
            Text("Notes and photos stay on this iPhone. No photo-library-wide permission or upload is required.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
            if let error { SmallNotice(text: error) }
            Button { do { try store.finish(note: note, rating: rating, photoData: photo); dismiss() } catch { self.error = error.localizedDescription } } label: { Label("Keep it in my journal", systemImage: "book") }.buttonStyle(AmstrollButton()).disabled(photoLoading)
        }.onDisappear { photoTask?.cancel() }.onChange(of: pickerItem) { _, item in
            photoTask?.cancel()
            guard let item else { photoLoading = false; return }
            photoLoading = true; error = nil
            photoTask = Task {
                defer { if pickerItem == item { photoLoading = false } }
                do {
                    guard let bytes = try await item.loadTransferable(type: Data.self), bytes.count <= 8 * 1024 * 1024, let source = CGImageSourceCreateWithData(bytes as CFData, nil) else { if !Task.isCancelled { error = "Choose a valid image smaller than 8 MB." }; return }
                    try Task.checkCancellation()
                    let options: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: 2048, kCGImageSourceCreateThumbnailWithTransform: true]
                    guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { error = "This photograph could not be prepared. You can still save a note."; return }
                    let image = UIImage(cgImage: thumbnail)
                    let format = UIGraphicsImageRendererFormat(); format.opaque = true; format.scale = 1
                    let normalized = UIGraphicsImageRenderer(size: image.size, format: format).image { context in
                        UIColor.white.setFill(); context.cgContext.fill(CGRect(origin: .zero, size: image.size)); image.draw(in: CGRect(origin: .zero, size: image.size))
                    }
                    photo = normalized.jpegData(compressionQuality: 0.85)
                } catch { if !Task.isCancelled { self.error = "The photograph could not be opened. You can still save a note." } }
            }
        }
    }
}

struct MemoryCardView: View {
    @EnvironmentObject private var store: AppStore
    let memory: Memory
    @State private var confirmDelete = false
    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack { Text(memory.date.formatted(date: .abbreviated, time: .omitted) + " · " + (memory.minutes > 0 ? memory.minutes.amstrollDuration : "Time not recorded")); Spacer(); Text(memory.rating) }.font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted)
            if let url = store.photoURL(forMemory: memory), let image = UIImage(contentsOfFile: url.path) { Image(uiImage: image).resizable().scaledToFill().frame(height: 160).frame(maxWidth: .infinity).clipped().clipShape(RoundedRectangle(cornerRadius: 15)).accessibilityLabel("Your photograph from \(memory.title)") }
            else if memory.photoFile != nil { SmallNotice(text: "This memory’s photograph is unavailable. Your note is still here.") }
            else { PlaceImage(photoKey: memory.photoKey, label: "Area context for \(memory.title)", height: 150).clipShape(RoundedRectangle(cornerRadius: 15)) }
            Text(memory.title).font(AmstrollStyle.heading(19))
            Text(memory.note.isEmpty ? "A little time, well spent." : memory.note).font(AmstrollStyle.body(13)).foregroundStyle(AmstrollStyle.muted)
            if memory.sample { Text("Fictional sample memory").font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted) }
            Button(role: .destructive) { confirmDelete = true } label: { Label("Delete memory", systemImage: "trash").font(AmstrollStyle.body(11)) }.frame(minHeight: 44)
        }.amstrollCard().confirmationDialog("Delete this memory and its local photograph?", isPresented: $confirmDelete, titleVisibility: .visible) { Button("Delete memory", role: .destructive) { store.deleteMemory(memory.id) } }
    }
}
