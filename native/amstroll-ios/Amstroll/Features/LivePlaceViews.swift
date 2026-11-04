import SwiftUI
import MapKit

struct LivePlaceCard: View {
    @EnvironmentObject private var store: AppStore
    let place: ServicePlace
    var compact: Bool
    var open: () -> Void
    @State private var credit = false
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                Button(action: open) {
                    Group {
                        if place.photo == nil {
                            copy.padding(18).padding(.trailing, 35)
                        } else if compact {
                            HStack(alignment: .top, spacing: 12) {
                                PlaceImage(remote: place.photo.flatMap { URL(string: $0.url) }, label: place.photo?.alt ?? "Photograph unavailable", height: 145).frame(width: 100).clipped()
                                copy.padding(.vertical, 13).padding(.trailing, 42)
                            }
                        } else {
                            VStack(alignment: .leading, spacing: 0) {
                                PlaceImage(remote: place.photo.flatMap { URL(string: $0.url) }, label: place.photo?.alt ?? "Photograph unavailable", height: 169)
                                copy.padding(17)
                            }
                        }
                    }.contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel("View \(place.title). Route, price and access need checking.")
                Button { save() } label: { Image(systemName: store.isSaved(place.id) ? "bookmark.fill" : "bookmark").frame(width: 44, height: 44).background(AmstrollStyle.card, in: Circle()) }.buttonStyle(.plain).padding(9).accessibilityLabel("\(store.isSaved(place.id) ? "Unsave" : "Save") \(place.title)")
            }
            if let photo = place.photo {
                Divider()
                Button { credit = true } label: { Label("\(photo.credit) · place photo", systemImage: "camera").font(AmstrollStyle.body(10)).padding(12).frame(maxWidth: .infinity, alignment: .leading) }.buttonStyle(.plain)
            }
        }.background(AmstrollStyle.card).clipShape(RoundedRectangle(cornerRadius: 24)).overlay(RoundedRectangle(cornerRadius: 24).stroke(AmstrollStyle.line, lineWidth: 1))
            .sheet(isPresented: $credit) { if let photo = place.photo { ServicePhotoCredit(photo: photo) } }
    }
    private var copy: some View {
        VStack(alignment: .leading, spacing: 9) {
            Label("Amsterdam · \(place.provider)", systemImage: "mappin").font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted)
            Text(place.title).font(AmstrollStyle.heading(compact ? 15 : 19)).tracking(-0.5)
            Text(place.summary).font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted).lineLimit(compact ? 2 : 3)
            if let visit = place.walkingVisit {
                Text(visit.reason).font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.forest)
                Label("\(visit.outward.durationMinutes) min walk · about \(visit.totalMinutes) min outing", systemImage: "figure.walk")
                    .font(AmstrollStyle.label(11))
                Text("Visit time estimated · price and opening hours unverified")
                    .font(AmstrollStyle.body(10)).foregroundStyle(AmstrollStyle.muted)
            }
            if let source = place.descriptionSourceURL, let url = URL(string: source) {
                Text(place.descriptionLicense ?? "Source description").font(AmstrollStyle.body(9)).foregroundStyle(AmstrollStyle.muted)
                    .accessibilityHint(url.absoluteString)
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private func save() { store.saveLive(id: place.id, title: place.title, lat: place.lat, lng: place.lng, sourceURL: place.sourceURL) }
}

struct ServicePhotoCredit: View {
    let photo: ServicePhoto
    var body: some View {
        SheetPage(title: "A little photo context") {
            PlaceImage(remote: URL(string: photo.url), label: photo.alt, height: 220).clipShape(RoundedRectangle(cornerRadius: 20))
            Text(photo.alt).font(AmstrollStyle.heading(18))
            Text("Photo: \(photo.credit) · \(photo.license)")
            if let url = URL(string: photo.sourceURL) { Link("Original photograph ↗", destination: url) }
            if let source = photo.licenseURL, let url = URL(string: source) { Link("Photograph licence ↗", destination: url) }
            Text("\(photo.identity). Displayed crops may vary. The image is loaded for this view; saved places retain stable identity, not the photograph.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
        }
    }
}

struct LivePlaceView: View {
    @EnvironmentObject private var store: AppStore
    let place: ServicePlace
    @State private var context: PlaceContext?
    @State private var outward: NativeRoute?
    @State private var returnRoute: NativeRoute?
    @State private var loading = false
    @State private var error: String?
    @State private var credit = false
    private let contextService = ContextService()
    var body: some View {
        ScrollView { VStack(alignment: .leading, spacing: 21) {
            if let photo = place.photo {
                PlaceImage(remote: URL(string: photo.url), label: photo.alt, height: 220).clipShape(RoundedRectangle(cornerRadius: 24))
            }
            if place.photo != nil { Button { credit = true } label: { Label("Photograph and licence", systemImage: "camera") }.font(AmstrollStyle.body(11)).frame(minHeight: 44) }
            Text("Amsterdam · A closer look").font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted)
            Text(place.title).screenHeading()
            Text(place.summary).foregroundStyle(AmstrollStyle.muted)
            if let source = place.descriptionSourceURL, let url = URL(string: source) {
                Link(place.descriptionLicense ?? "Description source", destination: url).font(AmstrollStyle.body(11))
            }
            if let visit = place.walkingVisit {
                Text("About \(visit.totalMinutes) minutes, including a \(visit.visitMinutes)-minute visit and a 5-minute buffer.")
                    .font(AmstrollStyle.label(13))
                Text("Visit time is an allowance. Walking is routed from \(visit.originName).")
                    .font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
            }
            SmallNotice(text: "This place comes from the source linked below. Its current availability, price and access have not been verified. No authored route is substituted.")
            if let outward {
                if !outward.coordinates.isEmpty {
                    WalkingRouteMap(route: outward, returnRoute: returnRoute, destinationName: place.title)
                }
                VStack(alignment: .leading, spacing: 12) {
                    Text("\(outward.durationMinutes.amstrollDuration) walking to this place").font(AmstrollStyle.heading(19))
                    Text("\(Int(outward.distanceMeters.rounded())) m · \(outward.source)").font(AmstrollStyle.body(12))
                    if let returnRoute { Text("\(returnRoute.durationMinutes.amstrollDuration) walking to your selected finish").font(AmstrollStyle.label()) }
                    Text("Calculated \(outward.calculatedAt.formatted(date: .omitted, time: .shortened)). Walking legs only; visit time, prices and access remain separate checks.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
                }.frame(maxWidth: .infinity, alignment: .leading).amstrollCard()
            }
            Button { Task { await checkWalking() } } label: { Label(loading ? "Checking walking routes…" : "Check walking travel", systemImage: "figure.walk") }.buttonStyle(AmstrollButton(primary: false)).disabled(loading)
            if store.prefs.transport != "walk" { SmallNotice(text: "The native check calculates walking only. It does not substitute a driving route for cycling or a GVB/NS journey. Use the official planner for your selected mode.") }
            Button { Task { loading = true; defer { loading = false }; do { context = try await contextService.context(for: place) } catch { self.error = error.localizedDescription } } } label: { Label("About this place", systemImage: "building.columns") }.buttonStyle(AmstrollButton(primary: false)).disabled(loading)
            if let context {
                VStack(alignment: .leading, spacing: 12) {
                    Text("A little context").font(AmstrollStyle.heading(18))
                    Text(context.text).font(AmstrollStyle.body(13))
                    if let url = URL(string: context.sourceURL) { Link("\(context.source) · \(context.license) ↗", destination: url).font(AmstrollStyle.body(11)) }
                }.amstrollCard()
            }
            if let error { SmallNotice(text: error, symbol: "exclamationmark.circle") }
            if let url = URL(string: place.sourceURL) { Link("Check the original place source ↗", destination: url).frame(minHeight: 44) }
            Link(destination: TransportLinks.walkingDirections(latitude: place.lat, longitude: place.lng, name: place.title, origin: place.walkingVisit?.origin)) { Label("Open walking directions", systemImage: "location") }.buttonStyle(AmstrollButton(primary: false))
            HStack { Link("GVB planner ↗", destination: TransportLinks.gvb); Spacer(); Link("NS planner ↗", destination: TransportLinks.ns) }.font(AmstrollStyle.label(12)).frame(minHeight: 44)
            Button {
                store.saveLive(id: place.id, title: place.title, lat: place.lat, lng: place.lng, sourceURL: place.sourceURL)
            } label: { Label(store.isSaved(place.id) ? "Remove saved idea" : "Save this place for later", systemImage: store.isSaved(place.id) ? "bookmark.fill" : "bookmark") }.buttonStyle(AmstrollButton())
            SmallNotice(text: "A live place is inspiration until all required plan checks fit. To try the complete start → progress → journal journey now, choose a fitting sample in the Amsterdam collection. Saving this place does not commit you to an outing.")
        }.padding(20) }.background(AmstrollStyle.paper).navigationTitle("Explore").navigationBarTitleDisplayMode(.inline).toolbar(.visible, for: .navigationBar)
            .sheet(isPresented: $credit) { if let photo = place.photo { ServicePhotoCredit(photo: photo) } }
            .amstrollLoading(loading)
            .onAppear {
                if outward == nil, let visit = place.walkingVisit {
                    outward = visit.outward
                    returnRoute = visit.returnLeg
                }
            }
    }
    private func checkWalking() async {
        loading = true; error = nil; defer { loading = false }
        do {
            let origin = store.startArea
            let destination = ServiceCoordinate(latitude: place.lat, longitude: place.lng)
            let leg = try await NativeRouteService.walkingRoute(from: ServiceCoordinate(latitude: origin.lat, longitude: origin.lng), to: destination)
            var last: NativeRoute?
            let end = store.prefs.endpoint == "start" ? origin : store.engine.start(store.prefs.endpoint)
            if let end { last = try await NativeRouteService.walkingRoute(from: destination, to: ServiceCoordinate(latitude: end.lat, longitude: end.lng)) }
            outward = leg; returnRoute = last
        } catch { self.error = error.localizedDescription }
    }
}



private struct WalkingRouteMap: View {
    let route: NativeRoute
    let returnRoute: NativeRoute?
    let destinationName: String

    var body: some View {
        Map(initialPosition: .automatic) {
            MapPolyline(coordinates: route.coordinates.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) })
                .stroke(AmstrollStyle.forest, lineWidth: 5)
            if let returnRoute {
                MapPolyline(coordinates: returnRoute.coordinates.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) })
                    .stroke(AmstrollStyle.muted, lineWidth: 4)
            }
            if let start = route.coordinates.first {
                Marker("Start", systemImage: "figure.walk", coordinate: CLLocationCoordinate2D(latitude: start.latitude, longitude: start.longitude))
            }
            if let finish = route.coordinates.last {
                Marker(destinationName, coordinate: CLLocationCoordinate2D(latitude: finish.latitude, longitude: finish.longitude))
            }
        }
        .frame(height: 260)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .accessibilityLabel("Apple Maps walking route to \(destinationName)")
    }
}
