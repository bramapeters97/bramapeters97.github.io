import Foundation

struct PortfolioContent: Decodable {
    let schemaVersion: Int
    let source: String
    let profile: Profile
    let projects: [Project]
    let services: [String]

    var categories: [String] {
        var seen = Set<String>()
        return projects.flatMap(\.categories).filter { seen.insert($0).inserted }
    }
}

struct Profile: Decodable {
    let name: String
    let tagline: String
    let bio: String
    let image: String
    let location: String
    let website: String
    let email: String
    let links: [ContentLink]
    let skills: [Skill]
    let experience: [Experience]
    let education: [String]
    let languages: [String]
    let certificates: [String]
    let resumeURL: String?
}

struct Project: Decodable, Identifiable {
    let id: String
    let title: String
    let summary: String
    let categories: [String]
    let image: String
    let imageAlt: String
    let status: String?
    let url: String?
    let sections: [ProjectSection]

    var websiteURL: URL? { ContentLink.safeURL(url) }
}

struct ProjectSection: Decodable, Identifiable {
    let id: String
    let title: String
    let paragraphs: [String]
    let images: [ProjectImage]
    let links: [ContentLink]
}

struct ProjectImage: Decodable, Identifiable {
    let path: String
    let alt: String
    var id: String { path }
}

struct ContentLink: Decodable, Identifiable {
    let title: String
    let url: String
    var id: String { url + title }
    var destination: URL? { Self.safeURL(url) }

    static func safeURL(_ value: String?) -> URL? {
        guard let value, let url = URL(string: value),
              ["http", "https"].contains(url.scheme?.lowercased() ?? ""),
              url.host != nil else { return nil }
        return url
    }
}

struct Skill: Decodable {
    let title: String
    let detail: String
}

struct Experience: Decodable {
    let title: String
    let organization: String
    let period: String
    let description: String
}
