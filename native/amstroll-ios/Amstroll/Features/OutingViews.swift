import SwiftUI
import PhotosUI
import UIKit
import ImageIO

struct PlanCardView: View {
    @EnvironmentObject private var store: AppStore
    let plan: Plan
    var compact: Bool
    var open: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Button(action: open) {
                VStack(alignment: .leading, spacing: 0) {
                    PlaceImage(photoKey: plan.photoKey, label: "\(plan.area) photograph", height: compact ? 159 : 254)
                        .accessibilityHidden(true)
                    copy.padding(.horizontal, 18).padding(.vertical, 15)
                }.contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityLabel("View \(plan.title), \(plan.total.amstrollDuration), \(plan.status.label)")

            Button {
                store.toggleSaved(plan)
            } label: {
                Image(systemName: store.isSaved(plan.id) ? "bookmark.fill" : "bookmark")
                    .font(.body.weight(.semibold)).frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .amstrollGlass(in: Circle()).padding(12)
            .accessibilityLabel("\(store.isSaved(plan.id) ? "Unsave" : "Save") \(plan.title)")
        }
        .background(AmstrollStyle.card)
        .clipShape(RoundedRectangle(cornerRadius: 25))
        .overlay { RoundedRectangle(cornerRadius: 25).strokeBorder(AmstrollStyle.line, lineWidth: 1).allowsHitTesting(false) }
    }

    private var copy: some View {
        VStack(alignment: .leading, spacing: 7) {
            Label("\(plan.area) · \(plan.total.amstrollDuration)", systemImage: "mappin")
                .font(.caption.weight(.semibold)).foregroundStyle(AmstrollStyle.forest)
            Text(plan.title)
                .font(AmstrollStyle.editorial(compact ? .title3 : .title))
                .fixedSize(horizontal: false, vertical: true)
                .foregroundStyle(AmstrollStyle.ink)
            Text(plan.description).font(.subheadline)
                .foregroundStyle(AmstrollStyle.muted).lineLimit(3)
            if !plan.feasible {
                Label(plan.status.label, systemImage: plan.status.symbol)
                    .font(.caption).foregroundStyle(AmstrollStyle.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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
                ZStack(alignment: .bottomTrailing) {
                    PlaceImage(photoKey: plan.photoKey, label: "\(plan.area) photograph", height: 292)
                    if PhotoMetadata.all[plan.photoKey ?? ""] != nil {
                        Button { credit = true } label: {
                            Image(systemName: "camera").frame(width: 44, height: 44)
                        }.buttonStyle(.plain).amstrollGlass(in: Circle()).padding(15)
                            .accessibilityLabel("Photograph credits")
                    }
                }
                VStack(alignment: .leading, spacing: 19) {
                    Text(plan.area.uppercased()).font(.caption.weight(.semibold))
                        .tracking(2).foregroundStyle(AmstrollStyle.forest)
                    Text(plan.title).screenHeading().accessibilityAddTraits(.isHeader)
                    Text(plan.description).font(.body).foregroundStyle(AmstrollStyle.muted)
                    routeBreakdown
                    if let details = plan.guideDetails {
                        if let observation = details.observation, !observation.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Look for…").font(AmstrollStyle.editorial(.title3))
                                Text(observation).font(.body)
                                if let link = details.observationURL, let url = URL(string: link) {
                                    Link("Read the source", destination: url).font(.footnote)
                                }
                            }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
                        }
                        if let then = details.thenPhotoKey, let now = details.nowPhotoKey {
                            historicPhotos(then: then, now: now, thenDate: details.thenDate, nowDate: details.nowDate)
                        }
                        if plan.legs.contains(where: { ($0.coords?.count ?? 0) > 1 }) {
                            Text("Map").font(AmstrollStyle.editorial(.title2))
                            RouteSketch(legs: plan.legs)
                        }
                    }
                    if !plan.feasible { SmallNotice(text: plan.reason, symbol: plan.status.symbol) }
                    timeline
                    if plan.prefs != store.prefs {
                        Button("Use this idea’s saved preferences") { store.prefs = plan.prefs; refresh() }
                            .buttonStyle(AmstrollButton(primary: false))
                    }
                    if let link = plan.guideDetails?.handoffURL, let url = URL(string: link), !plan.feasible {
                        Link(destination: url) { Label("Check the route with the planner", systemImage: "arrow.up.right") }
                            .buttonStyle(AmstrollButton(primary: false))
                    }
                    if plan.guideDetails == nil || !plan.feasible {
                        DisclosureGroup("Travel options") {
                            VStack(alignment: .leading, spacing: 13) {
                                Link("Open official GVB planner", destination: TransportLinks.gvb)
                                Link("Open official NS planner", destination: TransportLinks.ns)
                                Text("Check departure times, fares and disruptions with the operator.")
                                    .font(.footnote).foregroundStyle(AmstrollStyle.muted)
                            }.frame(maxWidth: .infinity, alignment: .leading).padding(.top, 9)
                        }.amstrollCard(padding: 14)
                    }
                    if store.active != nil {
                        SmallNotice(text: "An outing is underway. Resume it from Explore.")
                    }
                    if let startError { SmallNotice(text: startError) }
                    Button {
                        if store.start(plan) { onStart() }
                        else { startError = "This outing’s route or time no longer fits. Review your plan from Explore." }
                    } label: {
                        Label(plan.guideDetails == nil ? "Start sample outing" : "Start this outing", systemImage: "arrow.right")
                    }.buttonStyle(AmstrollButton()).disabled(!plan.feasible || plan.prefs != store.prefs || store.active != nil)
                        .accessibilityIdentifier("start-outing")
                    Text(plan.source).font(.footnote).foregroundStyle(AmstrollStyle.muted)
                }.padding(.horizontal, 22).padding(.bottom, 20)
            }
        }
        .background(AmstrollStyle.paper)
        .navigationTitle("Outing").navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("detail-screen")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { store.toggleSaved(plan) } label: {
                    Image(systemName: store.isSaved(plan.id) ? "bookmark.fill" : "bookmark")
                }.accessibilityLabel(store.isSaved(plan.id) ? "Unsave outing" : "Save outing")
            }
        }
        .sheet(isPresented: $credit) {
            if let meta = PhotoMetadata.all[plan.photoKey ?? ""] {
                SheetPage(title: "Photograph credits") { PhotoCreditView(metadata: meta) }
                    .presentationDetents([.medium, .large])
            }
        }
    }

    private var routeBreakdown: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 93))], spacing: 9) {
            metric(plan.total.amstrollDuration, caption: "Total time")
            metric(plan.walking.amstrollDuration, caption: "Walking")
            metric(plan.endpointTravel.amstrollDuration, caption: "To finish")
            metric(plan.safetyBuffer.amstrollDuration, caption: "Buffer")
            metric(plan.cost == 0 ? "Free" : plan.costLabel, caption: "Cost")
        }
    }

    private var timeline: some View {
        VStack(alignment: .leading, spacing: 17) {
            Text("The route").font(AmstrollStyle.editorial(.title2))
            ForEach(Array(plan.stops.enumerated()), id: \.element.id) { index, stop in
                HStack(alignment: .top, spacing: 13) {
                    Text("\(index + 1)").font(.caption.weight(.semibold))
                        .frame(width: 29, height: 29).background(AmstrollStyle.paleSage, in: Circle())
                    VStack(alignment: .leading, spacing: 6) {
                        Text(stop.name).font(.headline)
                        Text("\(stop.travel) min to get here · \(stop.dwell) min at the stop")
                            .font(.footnote).foregroundStyle(AmstrollStyle.muted)
                        Text(stop.description).font(.subheadline).foregroundStyle(AmstrollStyle.muted)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            Label("Finish at \(plan.endpoint)", systemImage: "flag").font(.headline)
            if plan.routeVerified {
                Text("Estimated arrival \(amsterdamTime(plan.finishAt))").font(.footnote)
            }
        }
    }

    private func historicPhotos(then: String, now: String, thenDate: String?, nowDate: String?) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Then & now").font(AmstrollStyle.editorial(.title2))
            Text("Two views of Brouwersgracht from different years.").font(.footnote).foregroundStyle(AmstrollStyle.muted)
            HStack(alignment: .top, spacing: 9) {
                historyFigure(then, caption: thenDate ?? "Historic view")
                historyFigure(now, caption: nowDate ?? "Modern view")
            }
        }
    }

    private func historyFigure(_ key: String, caption: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            PlaceImage(photoKey: key, label: PhotoMetadata.all[key]?.alt ?? caption, height: 110)
                .clipShape(RoundedRectangle(cornerRadius: 11))
            Text(caption).font(.footnote.weight(.semibold))
            if let meta = PhotoMetadata.all[key], let source = meta.source, let url = URL(string: source) {
                Link(meta.credit, destination: url).font(.caption)
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }

    private func refresh() {
        if plan.guideDetails != nil {
            if let updated = store.guideSuggestions.first(where: { $0.id == plan.id }) { plan = updated }
        } else if let updated = try? store.engine.plan(id: plan.id, prefs: store.prefs, context: store.planningContext) {
            plan = updated
        }
    }

    private func metric(_ title: String, caption: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(caption).font(.caption).foregroundStyle(AmstrollStyle.muted)
            Text(title).font(.subheadline.weight(.semibold))
        }
        .frame(maxWidth: .infinity, minHeight: 41, alignment: .leading)
        .padding(10).background(AmstrollStyle.paleSage, in: RoundedRectangle(cornerRadius: 12))
    }
}

private struct RouteSketch: View {
    let legs: [TravelLeg]

    private var lines: [[CGPoint]] {
        legs.compactMap { leg in
            guard let coords = leg.coords, coords.count > 1 else { return nil }
            return coords.compactMap { value in
                value.count == 2 ? CGPoint(x: value[0] * 0.61, y: -value[1]) : nil
            }
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Canvas { context, size in
                let points = lines.flatMap { $0 }
                guard
                    let minX = points.map(\.x).min(), let maxX = points.map(\.x).max(),
                    let minY = points.map(\.y).min(), let maxY = points.map(\.y).max()
                else { return }
                let spanX = max(maxX - minX, 0.0001)
                let spanY = max(maxY - minY, 0.0001)
                let scale = min((size.width - 36) / spanX, (size.height - 36) / spanY)
                let offset = CGPoint(x: (size.width - spanX * scale) / 2, y: (size.height - spanY * scale) / 2)
                func project(_ p: CGPoint) -> CGPoint {
                    CGPoint(x: offset.x + (p.x - minX) * scale, y: offset.y + (p.y - minY) * scale)
                }
                for x in stride(from: 0.0, to: size.width, by: 18) {
                    var grid = Path()
                    grid.move(to: CGPoint(x: x, y: 0)); grid.addLine(to: CGPoint(x: x, y: size.height))
                    context.stroke(grid, with: .color(AmstrollStyle.sage.opacity(0.25)), lineWidth: 1)
                }
                for line in lines {
                    guard let first = line.first, let last = line.last else { continue }
                    var linePath = Path()
                    linePath.move(to: project(first))
                    for coordinate in line.dropFirst() { linePath.addLine(to: project(coordinate)) }
                    context.stroke(linePath, with: .color(AmstrollStyle.forest), style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
                    let end = project(last)
                    let marker = Path(ellipseIn: CGRect(x: end.x - 4, y: end.y - 4, width: 8, height: 8))
                    context.fill(marker, with: .color(AmstrollStyle.forest))
                    context.stroke(marker, with: .color(.white), lineWidth: 1.5)
                }
            }
            .frame(height: 164)
            .background(AmstrollStyle.paleSage, in: RoundedRectangle(cornerRadius: 14))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .accessibilityLabel("Walking route shape. The steps below list the stops in order.")
            HStack {
                Text("Valhalla")
                Link("© OpenStreetMap", destination: URL(string: "https://www.openstreetmap.org/copyright")!)
            }.font(.caption)
        }
    }
}

struct ActiveOutingView: View {
    @EnvironmentObject private var store: AppStore
    @State private var finish = false
    @State private var headingBack = false
    @State private var notice: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let outing = store.active, let remaining = store.remainingPlan {
                    Text(outing.plan.title).screenHeading()
                    VStack(alignment: .leading, spacing: 7) {
                        Label("Finish at \(outing.plan.endpoint)", systemImage: "flag").font(.headline)
                        if let deadline = store.activeDeadline { Text("Back by \(amsterdamTime(deadline))").font(.subheadline) }
                    }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
                    if !remaining.feasible { SmallNotice(text: remaining.reason) }
                    if let notice { SmallNotice(text: notice) }
                    if let current = remaining.stops.first {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("NEXT STOP").font(.caption2.weight(.semibold)).tracking(2)
                            Text(current.name).font(AmstrollStyle.editorial(.title2))
                            Text(current.description).font(.subheadline).foregroundStyle(AmstrollStyle.muted)
                        }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
                        Button { store.completeStop(); notice = nil } label: { Label("Mark stop complete", systemImage: "checkmark") }
                            .buttonStyle(AmstrollButton()).accessibilityIdentifier("complete-stop")
                    } else {
                        Button("Keep a little memory") { finish = true }.buttonStyle(AmstrollButton())
                    }
                    Text("Your stops").font(AmstrollStyle.editorial(.title2))
                    ForEach(outing.plan.stops) { stop in
                        let done = outing.done.contains(stop.id)
                        let skipped = outing.skipped.contains(stop.id)
                        Label(stop.name, systemImage: done ? "checkmark.circle.fill" : skipped ? "arrow.uturn.right.circle" : "circle")
                            .foregroundStyle(done || skipped ? AmstrollStyle.muted : AmstrollStyle.ink)
                    }
                } else {
                    Text("A little story, kept.").screenHeading()
                    Text("Find your memory in Journal.")
                }
            }.padding(22)
        }
        .background(AmstrollStyle.paper)
        .navigationTitle("Your outing").navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("progress-screen")
        .toolbar {
            if store.active != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if store.remainingPlan?.stops.isEmpty == false {
                            Button("Skip this stop", systemImage: "forward.end") { store.skipStop(); notice = nil }
                                .accessibilityIdentifier("skip-stop")
                            Button("Swap this stop", systemImage: "arrow.trianglehead.swap") {
                                notice = store.swapStop() ? "The next stop was updated. Your finish point and deadline are unchanged." : "No other checked stop fits the current deadline."
                            }
                        }
                        Button("Head back", systemImage: "arrow.uturn.backward") { headingBack = true }
                        Button("Finish early", systemImage: "flag") { finish = true }
                    } label: { Image(systemName: "ellipsis") }
                        .accessibilityLabel("Outing actions")
                        .accessibilityIdentifier("outing-actions")
                }
            }
        }
        .sheet(isPresented: $finish) { CompleteOutingView() }
        .sheet(isPresented: $headingBack) { ReturnToFinishView().presentationDetents([.medium, .large]) }
    }
}

private struct ReturnToFinishView: View {
    @EnvironmentObject private var store: AppStore
    @State private var origin: String?

    var body: some View {
        SheetPage(title: "Head back") {
            if let plan = store.active?.plan {
                Text(plan.endpoint).font(AmstrollStyle.editorial(.largeTitle))
                if let deadline = store.activeDeadline { Text("Original deadline · \(amsterdamTime(deadline))") }
                Picker("I’m at", selection: $origin) {
                    Text("Last confirmed stop").tag(nil as String?)
                    ForEach(store.returnOriginChoices) { point in Text(point.name).tag(Optional(point.id)) }
                }
                let selected = store.returnOriginChoices.first { $0.id == origin }
                if let leg = store.returnRoute(from: selected) {
                    Text("\(leg.minutes.amstrollDuration) to finish").font(.headline)
                    if (leg.coords?.count ?? 0) > 1 { RouteSketch(legs: [leg]) }
                } else {
                    SmallNotice(text: "A checked walk is unavailable from this point.")
                    Link("Check the route with GVB", destination: TransportLinks.gvb)
                }
            }
        }
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
