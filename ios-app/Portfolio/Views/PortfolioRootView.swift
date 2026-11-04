import SwiftUI

struct PortfolioRootView: View {
    @EnvironmentObject private var store: ContentStore
    @EnvironmentObject private var draft: RequestDraftStore
    @State private var selectedTab = 0

    var body: some View {
        if let content = store.content {
            TabView(selection: $selectedTab) {
                PortfolioBrowser(content: content) { project in
                    if let project { draft.draft.reference = project.title }
                    selectedTab = 2
                }
                .tabItem { Label("Portfolio", systemImage: "square.grid.2x2") }.tag(0)
                AboutView(profile: content.profile) { selectedTab = 2 }
                    .tabItem { Label("About", systemImage: "person.crop.circle") }.tag(1)
                RequestView(profile: content.profile, services: content.services, projects: content.projects)
                    .tabItem { Label("Request", systemImage: "envelope") }.tag(2)
            }
        } else {
            NavigationStack {
                ContentUnavailableView {
                    Label("Portfolio unavailable", systemImage: "exclamationmark.triangle")
                } description: { Text(store.errorMessage ?? "The bundled portfolio could not be loaded.") }
                actions: {
                    Button("Try again") { store.reload() }
                    Link("Visit website", destination: URL(string: "https://bram-peters.com")!)
                }
            }
        }
    }
}

private struct PortfolioBrowser: View {
    let content: PortfolioContent
    let request: (Project?) -> Void
    @State private var category = ""
    @State private var query = ""

    private var filtered: [Project] {
        content.projects.filter { project in
            (category.isEmpty || project.categories.contains(category)) &&
            (query.isEmpty || (project.title + " " + project.summary + " " + project.categories.joined(separator: " ")).localizedCaseInsensitiveContains(query))
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("BRAM PETERS | STUDIO").font(.caption.weight(.bold)).tracking(2).foregroundStyle(StudioTheme.accent)
                        Text(content.profile.tagline).font(.largeTitle.bold()).fixedSize(horizontal: false, vertical: true)
                        Text("Design, development, and data. Explore the work behind the ideas.").font(.body).foregroundStyle(.secondary)
                        Button { request(nil) } label: { Label("Have a project in mind?", systemImage: "arrow.up.right") }
                            .buttonStyle(.bordered).controlSize(.large)
                    }.padding(.top, 8)
                    HStack(alignment: .firstTextBaseline) {
                        Text("Selected work").font(.title2.bold()).accessibilityAddTraits(.isHeader)
                        Spacer()
                        Menu {
                            Picker("Category", selection: $category) {
                                Text("All work").tag("")
                                ForEach(content.categories, id: \.self) { Text($0).tag($0) }
                            }
                        } label: {
                            Label(category.isEmpty ? "Filter" : category, systemImage: "line.3.horizontal.decrease.circle")
                                .font(.subheadline).padding(.vertical, 8)
                        }.accessibilityLabel(category.isEmpty ? "Filter projects by category" : "Category: \(category)")
                    }
                    if filtered.isEmpty {
                        ContentUnavailableView.search(text: query.isEmpty ? category : query)
                        Button("Show all projects") { query = ""; category = "" }.frame(maxWidth: .infinity)
                    }
                    ForEach(filtered) { project in
                        NavigationLink(value: project.id) { ProjectCard(project: project) }.buttonStyle(.plain)
                    }
                    Text("Available offline · Content bundled with this app release").font(.footnote).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity).padding(.bottom, 12)
                }.padding(.horizontal, 20).padding(.vertical, 12)
            }
            .background { StudioBackground() }
            .navigationTitle("Studio")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, prompt: "Search projects or skills")
            .navigationDestination(for: String.self) { id in
                if let project = content.projects.first(where: { $0.id == id }) {
                    ProjectDetailView(project: project) { request(project) }
                }
            }
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { request(nil) } label: { Label("Request", systemImage: "envelope") } } }
        }
    }
}

private struct ProjectCard: View {
    let project: Project
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            LocalImage(path: project.image, label: project.imageAlt)
                .scaledToFill().frame(height: 210).clipped()
            VStack(alignment: .leading, spacing: 12) {
                if let category = project.categories.first { Text(category.uppercased()).font(.caption.weight(.semibold)).foregroundStyle(StudioTheme.accent) }
                Text(project.title).font(.title3.bold()).fixedSize(horizontal: false, vertical: true)
                Text(project.summary).font(.body).foregroundStyle(.secondary).lineLimit(4)
                HStack {
                    Text(project.status ?? "Explore project").font(.subheadline.weight(.semibold))
                    Spacer()
                    Image(systemName: "arrow.up.right").accessibilityHidden(true)
                }.foregroundStyle(StudioTheme.accent)
            }.padding(20)
        }
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: StudioTheme.corner))
        .clipShape(RoundedRectangle(cornerRadius: StudioTheme.corner))
        .overlay { RoundedRectangle(cornerRadius: StudioTheme.corner).strokeBorder(.primary.opacity(0.07), lineWidth: 1) }
        .accessibilityElement(children: .combine)
        .accessibilityHint("Open project details")
    }
}
