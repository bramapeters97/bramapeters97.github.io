import SwiftUI
import UIKit

enum StudioTheme {
    static let accent = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.56, green: 0.71, blue: 0.96, alpha: 1)
            : UIColor(red: 0.24, green: 0.38, blue: 0.61, alpha: 1)
    })
    static let corner: CGFloat = 24
}

struct StudioBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        LinearGradient(colors: colorScheme == .dark
                       ? [Color(.systemBackground), StudioTheme.accent.opacity(0.15), Color(.secondarySystemBackground)]
                       : [Color(red: 0.96, green: 0.98, blue: 1), StudioTheme.accent.opacity(0.12), Color(.systemBackground)],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
        .ignoresSafeArea()
    }
}

struct LocalImage: View {
    let path: String
    let label: String
    var body: some View {
        if let image = BundledMedia.image(path) {
            Image(uiImage: image).resizable().accessibilityLabel(label)
        } else {
            Rectangle().fill(.quaternary)
                .overlay { Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary) }
                .accessibilityLabel(label.isEmpty ? "Image unavailable" : label + ", image unavailable")
        }
    }
}

struct CategoryLabel: View {
    let text: String
    var body: some View {
        Text(text).font(.caption.weight(.medium)).padding(.horizontal, 10).padding(.vertical, 6)
            .background(StudioTheme.accent.opacity(0.12), in: Capsule())
            .foregroundStyle(.primary)
    }
}

struct SectionHeading: View {
    let title: String
    var body: some View {
        Text(title).font(.title2.bold()).frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }
}

extension View {
    func studioPanel() -> some View {
        self.padding(20).background(.regularMaterial, in: RoundedRectangle(cornerRadius: StudioTheme.corner))
            .overlay { RoundedRectangle(cornerRadius: StudioTheme.corner).strokeBorder(.primary.opacity(0.07), lineWidth: 1) }
    }
}

struct FullImagePreview: View {
    let image: ProjectImage
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            LocalImage(path: image.path, label: image.alt).scaledToFit().padding(.vertical, 56)
        }
        .safeAreaInset(edge: .top, alignment: .trailing) {
            Button { dismiss() } label: {
                Label("Close", systemImage: "xmark").font(.body.weight(.semibold))
                    .padding(.horizontal, 16).frame(minHeight: 44)
                    .background(.regularMaterial, in: Capsule())
            }
            .padding().tint(.white).accessibilityLabel("Close image preview")
        }
        .preferredColorScheme(.dark)
    }
}
