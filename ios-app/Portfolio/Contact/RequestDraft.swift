import Foundation
import Combine

struct RequestDraft: Codable, Equatable {
    var name = ""
    var email = ""
    var service = ""
    var reference = ""
    var message = ""

    var isEmpty: Bool { [name, email, service, reference, message].allSatisfy(\.isEmpty) }
    var subject: String { "Portfolio request: " + (service.isEmpty ? "Let's talk" : service) }

    func validationErrors(services: [String]) -> [String] {
        var errors: [String] = []
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedName.isEmpty || trimmedName.contains(where: \.isNewline) {
            errors.append("Enter your name on one line.")
        }
        let emailPattern = #"^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$"#
        if trimmedEmail.count > 254 || trimmedEmail.range(of: emailPattern, options: [.regularExpression, .caseInsensitive]) == nil {
            errors.append("Enter a valid email address, such as name@example.com.")
        }
        if !services.contains(service) { errors.append("Choose a project type.") }
        if message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { errors.append("Tell me a little about your project.") }
        return errors
    }

    func emailBody(recipient: String) -> String {
        """
        Hello Bram,

        \(message.trimmingCharacters(in: .whitespacesAndNewlines))

        Project type: \(service)
        Portfolio reference: \(reference.isEmpty ? "None selected" : reference)

        From: \(name.trimmingCharacters(in: .whitespacesAndNewlines))
        Reply email: \(email.trimmingCharacters(in: .whitespacesAndNewlines))

        Prepared with Bram Peters Studio for \(recipient).
        """
    }
}

@MainActor
final class RequestDraftStore: ObservableObject {
    private static let storageKey = "studio.request-draft.v1"
    private let defaults: UserDefaults
    @Published var draft: RequestDraft {
        didSet {
            if let data = try? JSONEncoder().encode(draft) { defaults.set(data, forKey: Self.storageKey) }
        }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let data = defaults.data(forKey: Self.storageKey), let saved = try? JSONDecoder().decode(RequestDraft.self, from: data) {
            draft = saved
        } else { draft = RequestDraft() }
    }

    func discard() {
        draft = RequestDraft()
        defaults.removeObject(forKey: Self.storageKey)
    }
}
