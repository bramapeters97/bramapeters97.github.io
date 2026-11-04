import SwiftUI

struct ProjectDetailView: View {
    let project: Project
    let request: () -> Void
    @State private var preview: ProjectImage?

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24) {
                if !project.image.isEmpty {
                    imageButton(ProjectImage(path: project.image, alt: project.imageAlt))
                }
                VStack(alignment: .leading, spacing: 16) {
                    Text(project.title).font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                    if let status = project.status { Label(status, systemImage: "clock").font(.subheadline).foregroundStyle(.secondary) }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack { ForEach(project.categories, id: \.self) { CategoryLabel(text: $0) } }
                    }
                    Text(project.summary).font(.body).textSelection(.enabled)
                    if let url = project.websiteURL { Link(destination: url) { Label("Open project website", systemImage: "arrow.up.right.square") }.font(.headline) }
                }
                ForEach(project.sections) { section in
                    VStack(alignment: .leading, spacing: 16) {
                        if !section.title.isEmpty { SectionHeading(title: section.title) }
                        ForEach(Array(section.paragraphs.enumerated()), id: \.offset) { _, paragraph in
                            Text(paragraph).font(.body).textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
                        }
                        ForEach(Array(section.images.enumerated()), id: \.offset) { _, image in imageButton(image) }
                        ForEach(Array(section.links.enumerated()), id: \.offset) { _, link in
                            if let url = link.destination {
                                Link(destination: url) { Label(link.title.isEmpty ? "Open link" : link.title, systemImage: "arrow.up.right.square") }
                                    .frame(minHeight: 44, alignment: .leading)
                            }
                        }
                    }.studioPanel()
                }
                VStack(alignment: .leading, spacing: 12) {
                    Text("Something like this?").font(.title2.bold())
                    Text("Use this project as a starting point for your own idea.").foregroundStyle(.secondary)
                    Button(action: request) { Label("Tell me about your project", systemImage: "envelope") }
                        .buttonStyle(.borderedProminent).controlSize(.large)
                }.studioPanel()
            }.padding(20)
        }
        .background { StudioBackground() }
        .navigationTitle("Project")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let url = project.websiteURL {
                ToolbarItem(placement: .topBarTrailing) { ShareLink(item: url) { Label("Share project", systemImage: "square.and.arrow.up") } }
            }
        }
        .fullScreenCover(item: $preview) { image in FullImagePreview(image: image) }
    }

    private func imageButton(_ image: ProjectImage) -> some View {
        Button { preview = image } label: {
            LocalImage(path: image.path, label: image.alt).scaledToFit()
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain).accessibilityLabel(image.alt.isEmpty ? "Project image" : image.alt)
        .accessibilityHint("Open full-screen image")
    }
}
