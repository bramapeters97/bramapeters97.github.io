import SwiftUI
import UIKit

enum AmstrollStyle {
    static let paper = Color(hex: 0xF5F2E9)
    static let card = Color(hex: 0xFFFDF9)
    static let ink = Color(hex: 0x23322C)
    static let forest = Color(hex: 0x255145)
    static let muted = Color(hex: 0x5B6A61)
    static let sage = Color(hex: 0xA5B6A1)
    static let paleSage = Color(hex: 0xE7EDE2)
    static let butter = Color(hex: 0xF1D98A)
    static let line = Color(hex: 0xE4E5DD)
    static func editorial(_ style: Font.TextStyle) -> Font { .system(style, design: .serif) }
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
    func screenHeading() -> some View { font(AmstrollStyle.editorial(.largeTitle)).tracking(-0.55).foregroundStyle(AmstrollStyle.ink).fixedSize(horizontal: false, vertical: true) }
}
struct AmstrollButton: ButtonStyle {
    var primary = true
    @Environment(\.isEnabled) private var enabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(AmstrollStyle.label(14)).frame(maxWidth: .infinity).padding(.vertical, 16).padding(.horizontal, 14)
            .foregroundStyle(primary ? Color.white : AmstrollStyle.forest)
            .background(primary ? AmstrollStyle.forest : AmstrollStyle.card, in: RoundedRectangle(cornerRadius: 23))
            .overlay(RoundedRectangle(cornerRadius: 23).strokeBorder(primary ? Color.white.opacity(0.14) : AmstrollStyle.line, lineWidth: 1))
            .opacity(!enabled ? 0.45 : configuration.isPressed ? 0.82 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
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
                GeometryReader { proxy in
                    Image(meta.imageName).resizable().scaledToFill()
                        .frame(width: proxy.size.width, height: proxy.size.height)
                        .clipped()
                }
            } else { unavailable }
        }.frame(height: height).frame(maxWidth: .infinity).clipped()
            .accessibilityLabel(label)
    }
    private var unavailable: some View { PlaceImagePlaceholder() }
}

private struct PlaceImagePlaceholder: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [AmstrollStyle.paleSage, AmstrollStyle.paper], startPoint: .topLeading, endPoint: .bottomTrailing)
            Image(systemName: "map").font(.system(size: 100, weight: .ultraLight)).rotationEffect(.degrees(-12)).opacity(0.12)
            VStack(spacing: 10) {
                Image(systemName: "mappin.and.ellipse").font(.system(size: 32, weight: .light))
                Text("A place to discover").font(AmstrollStyle.body(12))
            }
        }.foregroundStyle(AmstrollStyle.forest)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityLabel("Place illustration; photograph unavailable")
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
                PlaceImagePlaceholder()
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


private struct AmstrollLoadingModifier: ViewModifier {
    let isLoading: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    func body(content: Content) -> some View {
        content
            .disabled(isLoading)
            .accessibilityHidden(isLoading)
            .overlay {
                ZStack {
                    if isLoading {
                        ZStack {
                            AmstrollStyle.paper.opacity(reduceTransparency ? 1 : 0.92)
                                .ignoresSafeArea()
                            VStack(spacing: 16) {
                                ProgressView().controlSize(.large)
                                    .tint(AmstrollStyle.forest)
                                    .accessibilityHidden(true)
                                Text("Hold on...").font(AmstrollStyle.body(16))
                                    .foregroundStyle(AmstrollStyle.ink)
                            }
                            .accessibilityElement(children: .ignore)
                            .accessibilityLabel("Hold on. Loading.")
                            .accessibilityAddTraits(.updatesFrequently)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .contentShape(Rectangle())
                        .accessibilityIdentifier("loading-overlay")
                        .transition(.opacity)
                    }
                }
                .animation(.easeInOut(duration: reduceMotion ? 0.1 : 0.25), value: isLoading)
            }
    }
}

extension View {
    func amstrollLoading(_ isLoading: Bool) -> some View {
        modifier(AmstrollLoadingModifier(isLoading: isLoading))
    }
}

let amsterdamTimeZone = TimeZone(identifier: "Europe/Amsterdam")!

func amsterdamTime(_ date: Date) -> String {
    let format = DateFormatter()
    format.locale = Locale(identifier: "en_GB")
    format.timeZone = amsterdamTimeZone
    format.dateFormat = "d MMM, HH:mm"
    return format.string(from: date)
}

extension View {
    func amstrollGlass<S: Shape>(in shape: S) -> some View {
        modifier(GuideGlassMaterial(shape: shape))
    }

    @ViewBuilder
    func amstrollGlassButton() -> some View {
        if #available(iOS 26.0, *) {
            buttonStyle(.glass).tint(.white).foregroundStyle(AmstrollStyle.ink)
        } else {
            buttonStyle(.borderedProminent).tint(AmstrollStyle.card).foregroundStyle(AmstrollStyle.ink)
                .buttonBorderShape(.capsule)
        }
    }
}

private struct GuideGlassMaterial<Surface: Shape>: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var opaque
    @Environment(\.colorSchemeContrast) private var contrast
    let shape: Surface

    @ViewBuilder func body(content: Content) -> some View {
        if opaque || contrast == .increased {
            content.background(AmstrollStyle.card, in: shape)
                .overlay(shape.stroke(AmstrollStyle.line, lineWidth: 1).allowsHitTesting(false))
        } else if #available(iOS 26.0, *) {
            content.glassEffect(.regular.interactive(), in: shape)
        } else {
            content.background(.regularMaterial, in: shape)
        }
    }
}

struct StrollClock: View {
    @Binding var minutes: Int
    var editable: Bool
    @Environment(\.accessibilityReduceTransparency) private var opaque
    @Environment(\.colorSchemeContrast) private var contrast
    @State private var lastMinute: Int?
    @State private var dragValue: Int?
    @State private var feedback = 0

    var body: some View {
        dial
            .aspectRatio(1, contentMode: .fit)
            .frame(maxWidth: 228)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Time available")
            .accessibilityValue(minutes.amstrollDuration)
            .accessibilityHint(editable ? "Swipe up or down to adjust by one minute." : "")
            .accessibilityAdjustableAction { direction in
                guard editable else { return }
                switch direction {
                case .increment: select(minutes + 1, pulse: true)
                case .decrement: select(minutes - 1, pulse: true)
                @unknown default: break
                }
            }
            .accessibilityIdentifier("stroll-clock")
            .sensoryFeedback(.selection, trigger: feedback)
    }

    private var dial: some View {
        GeometryReader { proxy in
            let size = min(proxy.size.width, proxy.size.height)
            ZStack {
                clockFace
                    .allowsHitTesting(false)
                VStack(spacing: 3) {
                    Text(minutes < 60 ? "\(minutes)" : "\(minutes / 60)h \(String(format: "%02d", minutes % 60))")
                        .font(.system(size: size * (minutes < 60 ? 0.22 : 0.132), weight: .bold, design: .rounded))
                        .monospacedDigit().lineLimit(1).minimumScaleFactor(0.65)
                    Text(minutes < 60 ? "MINUTES" : "HRS / MIN")
                        .font(.system(size: size * 0.052, weight: .semibold))
                        .tracking(1.25)
                }.foregroundStyle(AmstrollStyle.ink).allowsHitTesting(false)
                if editable {
                    Circle().strokeBorder(.black.opacity(0.001), lineWidth: 42)
                        .gesture(DragGesture(minimumDistance: 0)
                            .onChanged { update(at: $0.location, size: size) }
                            .onEnded { _ in lastMinute = nil; dragValue = nil })
                        .accessibilityHidden(true)
                }
            }
            .frame(width: size, height: size)
            .position(x: proxy.size.width / 2, y: proxy.size.height / 2)
        }
    }

    private var clockFace: some View {
        let face = opaque || contrast == .increased ? [Color(hex: 0xF5F8FA), Color(hex: 0xDCE5EA)] :
            [Color.white, Color(hex: 0xDCE6ED), Color(hex: 0xF4F9FB), Color(hex: 0xCAD6E0)]
        return ZStack {
            Circle().fill(LinearGradient(colors: [Color(hex: 0x8697A2), .white, Color(hex: 0xA2B1BD), .white, Color(hex: 0x5D7381)],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
            Circle().inset(by: 5).fill(LinearGradient(colors: face, startPoint: .topLeading, endPoint: .bottomTrailing))
            Circle().inset(by: 5).strokeBorder(.white, lineWidth: 1)
            Canvas { context, dimensions in
                let size = min(dimensions.height, dimensions.width)
                let centre = CGPoint(x: size / 2, y: size / 2)
                if !opaque && contrast != .increased {
                    var reflection = Path()
                    reflection.move(to: point(50, radius: size * 0.44, centre: centre))
                    reflection.addQuadCurve(to: point(9, radius: size * 0.44, centre: centre),
                                            control: CGPoint(x: size * 0.45, y: -size * 0.12))
                    reflection.addQuadCurve(to: point(50, radius: size * 0.44, centre: centre),
                                            control: CGPoint(x: size * 0.53, y: size * 0.29))
                    context.fill(reflection, with: .linearGradient(Gradient(colors: [.white.opacity(0.85), .white.opacity(0)]),
                                                                   startPoint: .zero, endPoint: CGPoint(x: size, y: size * 0.44)))
                }
                for minute in 0..<60 {
                    let major = minute.isMultiple(of: 5)
                    var tick = Path()
                    tick.move(to: point(minute, radius: size * (major ? 0.378 : 0.408), centre: centre))
                    tick.addLine(to: point(minute, radius: size * 0.445, centre: centre))
                    context.stroke(tick, with: .color(AmstrollStyle.ink.opacity(major ? 0.95 : 0.68)), lineWidth: major ? 2 : 1)
                }
                for minute in [0, 15, 30, 45] {
                    let label = Text(minute == 0 ? "00" : "\(minute)")
                        .font(.system(size: size * 0.058, weight: .semibold, design: .monospaced))
                        .foregroundStyle(AmstrollStyle.ink)
                    context.draw(label, at: point(minute, radius: size * 0.325, centre: centre))
                }
                let shown = minutes % 60
                let outer = point(shown, radius: size * 0.435, centre: centre)
                let accent = Color(hex: 0x9E452E)
                var hand = Path()
                hand.move(to: point(shown, radius: size * 0.22, centre: centre))
                hand.addLine(to: outer)
                context.stroke(hand, with: .color(accent), style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                let dot = Path(ellipseIn: CGRect(x: outer.x - 5, y: outer.y - 5, width: 10, height: 10))
                context.fill(dot, with: .color(accent))
                context.stroke(dot, with: .color(.white), lineWidth: 1.2)
                let hub = Path(ellipseIn: CGRect(x: size * 0.28, y: size * 0.28, width: size * 0.44, height: size * 0.44))
                context.fill(hub, with: .linearGradient(Gradient(colors: [.white, Color(hex: 0xDAE5EB)]),
                                                       startPoint: CGPoint(x: 0, y: size * 0.26), endPoint: CGPoint(x: size, y: size * 0.73)))
                context.stroke(hub, with: .color(.white), lineWidth: 1.5)
            }
        }.shadow(color: AmstrollStyle.ink.opacity(opaque ? 0 : 0.18), radius: 9, y: 7)
    }

    private func point(_ minute: Int, radius: CGFloat, centre: CGPoint) -> CGPoint {
        let angle = Double(minute) * .pi / 30
        return CGPoint(x: centre.x + sin(angle) * radius, y: centre.y - cos(angle) * radius)
    }

    private func update(at location: CGPoint, size: CGFloat) {
        let angle = atan2(location.x - size / 2, size / 2 - location.y)
        let destination = (Int((angle * 30 / .pi).rounded()) + 60) % 60
        let old = minutes
        let value: Int
        if let lastMinute, let dragValue {
            let delta = (destination - lastMinute + 90) % 60 - 30
            value = dragValue + delta
        } else {
            value = minutes / 60 * 60 + destination
        }
        lastMinute = destination
        let clamped = max(0, min(value, 720))
        dragValue = clamped
        select(clamped, pulse: old / 5 != clamped / 5 || old / 60 != clamped / 60)
    }

    private func select(_ target: Int, pulse: Bool) {
        let value = max(0, min(target, 720))
        guard minutes != value else { return }
        minutes = value
        if pulse { feedback += 1 }
    }
}
