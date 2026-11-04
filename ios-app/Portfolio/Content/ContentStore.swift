import Foundation
import Combine
import UIKit

@MainActor
final class ContentStore: ObservableObject {
    @Published private(set) var content: PortfolioContent?
    @Published private(set) var errorMessage: String?

    init() { reload() }

    func reload() {
        do {
            guard let url = Bundle.main.url(forResource: "portfolio", withExtension: "json", subdirectory: "Resources") else {
                throw ContentError.missingBundle
            }
            let content = try JSONDecoder().decode(PortfolioContent.self, from: Data(contentsOf: url))
            guard content.schemaVersion == 1 else { throw ContentError.unsupportedVersion }
            self.content = content
            errorMessage = nil
        } catch {
            content = nil
            errorMessage = "The bundled portfolio could not be opened. Please reinstall the app or visit the website."
        }
    }

    private enum ContentError: Error { case missingBundle, unsupportedVersion }
}

enum BundledMedia {
    static func url(_ path: String) -> URL? {
        guard !path.isEmpty, !path.hasPrefix("/"), !path.split(separator: "/").contains(".."),
              let root = Bundle.main.resourceURL?.appendingPathComponent("Resources", isDirectory: true) else { return nil }
        let url = root.appendingPathComponent(path).standardizedFileURL
        guard url.path.hasPrefix(root.path + "/"), FileManager.default.fileExists(atPath: url.path) else { return nil }
        return url
    }

    static func image(_ path: String) -> UIImage? {
        guard let url = url(path) else { return nil }
        return UIImage(contentsOfFile: url.path)
    }
}
