import SwiftUI
import UIKit

enum AmstrollStyle {
    static let paper = Color(hex: 0xF7F4EF)
    static let card = Color(hex: 0xFFFDF9)
    static let ink = Color(hex: 0x26342D)
    static let forest = Color(hex: 0x31564B)
    static let muted = Color(hex: 0x5B6A61)
    static let sage = Color(hex: 0xA5B6A1)
    static let paleSage = Color(hex: 0xE7EDE2)
    static let butter = Color(hex: 0xF1D98A)
    static let line = Color(hex: 0xE4E5DD)
    static func heading(_ size: CGFloat = 24) -> Font { .custom("PlusJakartaSans-Regular", size: size, relativeTo: .title2).weight(.semibold) }
    static func body(_ size: CGFloat = 14) -> Font { .custom("DMSans-9ptRegular", size: size, relativeTo: .body) }
    static func label(_ size: CGFloat = 13) -> Font { .custom("DMSans-9ptRegular", size: size, relativeTo: .subheadline).weight(.medium) }
}

extension Color {
    init(hex: UInt32) { self.init(.sRGB, red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255, opacity: 1) }
}

struct AmstrollCard: ViewModifier {
    var padding: CGFloat = 18
    func body(content: Content) -> some View {
        content.padding(padding).background(AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(AmstrollStyle.line.opacity(0.8), lineWidth: 1))
            .shadow(color: AmstrollStyle.forest.opacity(0.035), radius: 12, y: 4)
    }
}
extension View {
    func amstrollCard(padding: CGFloat = 18) -> some View { modifier(AmstrollCard(padding: padding)) }
    func screenHeading() -> some View { font(AmstrollStyle.heading(27)).tracking(-1).foregroundStyle(AmstrollStyle.ink).fixedSize(horizontal: false, vertical: true) }
}
struct AmstrollButton: ButtonStyle {
    var primary = true
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(AmstrollStyle.label(14)).frame(maxWidth: .infinity).padding(.vertical, 16).padding(.horizontal, 14)
            .foregroundStyle(primary ? Color.white : AmstrollStyle.forest)
            .background(primary ? AmstrollStyle.forest : AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(primary ? .clear : AmstrollStyle.line, lineWidth: 1))
            .opacity(!enabled ? 0.45 : configuration.isPressed ? 0.8 : 1)
    }
}

struct PhotoMetadata: Decodable, Identifiable {
    var id: String { imageName }
    let imageName: String
    let alt: String
    let credit: String
    let source: String?
    let license: String?
    let licenseUrl: String?
    static let all: [String:PhotoMetadata] = {
        guard let url = Bundle.main.url(forResource: "photos", withExtension: "json"), let data = try? Data(contentsOf: url) else { return [:] }
        return (try? JSONDecoder().decode([String:PhotoMetadata].self, from: data)) ?? [:]
    }()
}

struct PlaceImage: View {
    var photoKey: String?
    var remote: URL? = nil
    var label = "Amstroll place photograph"
    var height: CGFloat = 205
    var body: some View {
        Group {
            if let remote {
                RemotePlaceImage(url: remote)
            } else if let key = photoKey, let meta = PhotoMetadata.all[key] {
                Image(meta.imageName).resizable().scaledToFill()
            } else { unavailable }
        }.frame(height: height).frame(maxWidth: .infinity).clipped()
            .accessibilityLabel(label)
    }
    private var unavailable: some View {
        VStack(spacing: 8) { Image(systemName: "photo"); Text("Photograph unavailable").font(AmstrollStyle.body(12)) }
            .frame(maxWidth: .infinity, maxHeight: .infinity).foregroundStyle(AmstrollStyle.muted).background(AmstrollStyle.paleSage)
    }
}

private struct RemotePlaceImage: View {
    let url: URL
    @State private var image: UIImage?
    @State private var failed = false
    var body: some View {
        Group {
            if let image { Image(uiImage: image).resizable().scaledToFill() }
            else if failed {
                VStack(spacing: 8) { Image(systemName: "photo"); Text("Photograph unavailable").font(AmstrollStyle.body(12)) }
                    .frame(maxWidth: .infinity, maxHeight: .infinity).foregroundStyle(AmstrollStyle.muted).background(AmstrollStyle.paleSage)
            } else { ZStack { AmstrollStyle.paleSage; ProgressView().tint(AmstrollStyle.forest) } }
        }.task(id: url) {
            image = nil; failed = false
            guard url.scheme == "https" else { failed = true; return }
            let configuration = URLSessionConfiguration.ephemeral
            configuration.urlCache = nil; configuration.httpCookieStorage = nil
            configuration.timeoutIntervalForRequest = 15; configuration.timeoutIntervalForResource = 20
            let session = URLSession(configuration: configuration)
            defer { session.invalidateAndCancel() }
            do {
                let (bytes, response) = try await session.data(from: url)
                try Task.checkCancellation()
                guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode), bytes.count <= 8 * 1024 * 1024, let decoded = UIImage(data: bytes) else { failed = true; return }
                image = decoded
            } catch {
                if !Task.isCancelled { failed = true }
            }
        }
    }
}

struct SmallNotice: View {
    var text: String
    var symbol = "info.circle"
    var body: some View {
        Label { Text(text).fixedSize(horizontal: false, vertical: true) } icon: { Image(systemName: symbol) }
            .font(AmstrollStyle.body(12)).foregroundStyle(AmstrollStyle.muted).padding(14)
            .frame(maxWidth: .infinity, alignment: .leading).background(AmstrollStyle.paleSage.opacity(0.7), in: RoundedRectangle(cornerRadius: 16))
    }
}

struct PhotoCreditView: View {
    let metadata: PhotoMetadata
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(metadata.alt).font(AmstrollStyle.label())
            Text("Photo: \(metadata.credit) · \(metadata.license ?? "See source licence")").font(AmstrollStyle.body(12))
            if let source = metadata.source, let url = URL(string: source) { Link("Original photograph ↗", destination: url) }
            if let source = metadata.licenseUrl, let url = URL(string: source) { Link("Photo licence ↗", destination: url) }
            Text("Area photographs provide context; they do not claim to show every stop or venue interior.").font(AmstrollStyle.body(11)).foregroundStyle(AmstrollStyle.muted)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

func areaPhotoKey(_ area: String) -> String {
    let value = area.lowercased()
    if value.contains("jordaan") { return "jordaan-coffee" }
    if value.contains("pijp") { return "depijp" }
    if value.contains("museum") { return "museumplein" }
    if value.contains("wester") { return "westerpark" }
    if value.contains("oud-west") { return "oud-west" }
    if value.contains("sloterdijk") { return "sloterdijk" }
    if value.contains("ndsm") { return "ndsm" }
    if value.contains("noord") { return "noord" }
    if value.contains("ijburg") { return "ijburg" }
    if value.contains("zuid") { return "zuid" }
    if value.contains("oost") || value.contains("plantage") { return "oosterpark" }
    return "central"
}

func spending(_ value: Double?) -> String {
    guard let value else { return "Any budget" }
    return value.formatted(.currency(code: "EUR").precision(.fractionLength(0...2)))
}
