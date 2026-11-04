import SwiftUI

struct AboutView: View {
    let profile: Profile
    let request: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 16) {
                        LocalImage(path: profile.image, label: profile.name)
                            .scaledToFill().frame(width: 104, height: 104).clipShape(Circle())
                        Text(profile.name).font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                        Label(profile.location, systemImage: "mappin.and.ellipse").foregroundStyle(.secondary)
                        Text(profile.bio).textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
                        Button(action: request) { Label("Let's work together", systemImage: "envelope") }
                            .buttonStyle(.borderedProminent).controlSize(.large)
                    }.studioPanel()
                    VStack(alignment: .leading, spacing: 14) {
                        SectionHeading(title: "Connect")
                        ForEach(profile.links) { link in
                            if let url = link.destination { Link(destination: url) { Label(link.title, systemImage: "arrow.up.right.square") }.frame(minHeight: 44, alignment: .leading) }
                        }
                        if let url = ContentLink.safeURL(profile.website) { Link("Portfolio website", destination: url).frame(minHeight: 44, alignment: .leading) }
                        if let url = ContentLink.safeURL(profile.resumeURL) { Link(destination: url) { Label("Read résumé", systemImage: "doc.text") }.frame(minHeight: 44, alignment: .leading) }
                    }.studioPanel()
                    if !profile.experience.isEmpty {
                        VStack(alignment: .leading, spacing: 20) {
                            SectionHeading(title: "Experience")
                            ForEach(Array(profile.experience.enumerated()), id: \.offset) { _, role in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(role.title).font(.headline)
                                    if !role.organization.isEmpty { Text(role.organization).font(.subheadline.weight(.medium)) }
                                    Text(role.period).font(.caption).foregroundStyle(.secondary)
                                    Text(role.description).font(.body).foregroundStyle(.secondary)
                                }
                            }
                        }.studioPanel()
                    }
                    if !profile.skills.isEmpty {
                        VStack(alignment: .leading, spacing: 16) {
                            SectionHeading(title: "Skills")
                            ForEach(Array(profile.skills.enumerated()), id: \.offset) { _, skill in
                                DisclosureGroup {
                                    Text(skill.detail).font(.body).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading).padding(.top, 8)
                                } label: { Text(skill.title).font(.headline).foregroundStyle(.primary).padding(.vertical, 6) }
                            }
                        }.studioPanel()
                    }
                    listSection("Education", values: profile.education)
                    listSection("Languages", values: profile.languages)
                    listSection("Certificates", values: profile.certificates)
                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeading(title: "Privacy & offline use")
                        Text("Portfolio content is bundled with this app. Browsing does not contact a server and uses no analytics or advertising trackers. Links open outside the app and are governed by their destinations.")
                        Text("Request drafts stay in this app's local storage until discarded. Preparing an email does not send it. Mail and sharing transfer only the content you choose, using the app or service you select.")
                        Text("You can remove your saved request from the Request tab. Device backups may include app data. External websites and email apps use their own privacy policies.")
                    }.font(.footnote).foregroundStyle(.secondary).studioPanel()
                }.padding(20)
            }
            .background { StudioBackground() }
            .navigationTitle("About Bram")
        }
    }

    @ViewBuilder private func listSection(_ title: String, values: [String]) -> some View {
        if !values.isEmpty {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeading(title: title)
                ForEach(Array(values.enumerated()), id: \.offset) { _, value in Text(value).fixedSize(horizontal: false, vertical: true) }
            }.studioPanel()
        }
    }
}
