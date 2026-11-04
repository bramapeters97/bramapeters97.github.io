import SwiftUI
import MessageUI
import UIKit

struct RequestView: View {
    let profile: Profile
    let services: [String]
    let projects: [Project]
    @EnvironmentObject private var store: RequestDraftStore
    @State private var errors: [String] = []
    @State private var prepared: PreparedRequest?
    @State private var showingMail = false
    @State private var showingShare = false
    @State private var confirmingDiscard = false
    @State private var feedback: String?
    @State private var didDiscard = false
    @FocusState private var focusedField: Field?
    @AccessibilityFocusState private var validationFocused: Bool

    private enum Field: Hashable { case name, email, message }
    private struct PreparedRequest { let recipient: String; let subject: String; let body: String }
    private var serviceOptions: [String] { services + ["General enquiry"] }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Let's make something that makes sense.").font(.title2.bold()).accessibilityAddTraits(.isHeader)
                    Text("Have an idea, a question, or a project in mind? Tell me about it.").foregroundStyle(.secondary)
                }
                Section("Your details") {
                    TextField("Name", text: $store.draft.name).textContentType(.name).focused($focusedField, equals: .name)
                    TextField("Email", text: $store.draft.email).textContentType(.emailAddress)
                        .keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                        .focused($focusedField, equals: .email)
                }
                Section {
                    Picker("Project type", selection: $store.draft.service) {
                        Text("Choose a type").tag("")
                        ForEach(serviceOptions, id: \.self) { Text($0).tag($0) }
                    }.pickerStyle(.navigationLink)
                    Picker("Portfolio reference", selection: $store.draft.reference) {
                        Text("None selected").tag("")
                        ForEach(projects) { Text($0.title).tag($0.title) }
                    }.pickerStyle(.navigationLink)
                    TextField("Message", text: $store.draft.message, axis: .vertical)
                        .lineLimit(6...16).focused($focusedField, equals: .message)
                } header: {
                    Text("Your project")
                } footer: {
                    Text("Your draft is saved on this device until you discard it. Nothing is sent when you fill in this form.")
                }
                if !errors.isEmpty {
                    Section("Please check your request") {
                        ForEach(errors, id: \.self) { Text($0).foregroundStyle(.red) }
                    }.accessibilityElement(children: .combine).accessibilityFocused($validationFocused)
                }
                Section {
                    Button { prepare() } label: {
                        Label("Prepare email", systemImage: "envelope").font(.headline).frame(maxWidth: .infinity, minHeight: 32)
                    }
                } footer: {
                    Text("Review the email in Apple Mail before tapping Send. If Mail is unavailable, copy or share the prepared message to your preferred email app.")
                }
                if let prepared {
                    Section("Prepared email") {
                        LabeledContent("To", value: prepared.recipient).textSelection(.enabled)
                        Text(prepared.subject).font(.headline)
                        Text(prepared.body).font(.body).textSelection(.enabled)
                        if MFMailComposeViewController.canSendMail() {
                            Button("Open Mail composer", systemImage: "envelope.badge") { showingMail = true }
                        }
                        Button("Copy email", systemImage: "doc.on.doc") {
                            UIPasteboard.general.string = shareText(prepared)
                            feedback = "Prepared email copied. Paste it into your email app and send it to \(prepared.recipient)."
                        }
                        Button("Share prepared email", systemImage: "square.and.arrow.up") { showingShare = true }
                    }
                }
                if let feedback { Section { Text(feedback).foregroundStyle(.secondary).accessibilityLabel(feedback) } }
                Section {
                    Text(profile.email).textSelection(.enabled)
                    Button("Discard saved draft", role: .destructive) { confirmingDiscard = true }.disabled(store.draft.isEmpty)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Let's talk")
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { focusedField = nil } }
            }
            .confirmationDialog("Discard your saved request?", isPresented: $confirmingDiscard, titleVisibility: .visible) {
                Button("Discard draft", role: .destructive) {
                    didDiscard = true
                    store.discard(); prepared = nil; errors = []; feedback = "Saved draft discarded."
                    UIAccessibility.post(notification: .announcement, argument: feedback)
                }
            }
            .sheet(isPresented: $showingMail) {
                if let prepared {
                    MailComposer(recipient: prepared.recipient, subject: prepared.subject, body: prepared.body) { result, failed in
                        showingMail = false
                        if failed || result == .failed { feedback = "Mail could not send this request. Your draft is still here; copy or share it to try another app." }
                        else {
                            switch result {
                            case .sent: feedback = "Mail accepted the request for sending. Delivery is not confirmed. Your saved form is still available."
                            case .saved: feedback = "The email was saved in Mail. Your form draft is still available here."
                            default: feedback = "Email composer closed. Your request draft is still saved here."
                            }
                        }
                    }
                    .ignoresSafeArea()
                }
            }
            .sheet(isPresented: $showingShare) {
                if let prepared { SharePreparedRequest(text: shareText(prepared)) }
            }
            .onChange(of: store.draft) { _, _ in
                prepared = nil
                if didDiscard { didDiscard = false } else { feedback = nil }
            }
        }
    }

    private func prepare() {
        focusedField = nil
        feedback = nil
        errors = store.draft.validationErrors(services: serviceOptions)
        guard errors.isEmpty else {
            validationFocused = true
            UIAccessibility.post(notification: .announcement, argument: errors.joined(separator: " "))
            return
        }
        prepared = PreparedRequest(recipient: profile.email, subject: store.draft.subject, body: store.draft.emailBody(recipient: profile.email))
        if MFMailComposeViewController.canSendMail() { showingMail = true }
        else { feedback = "Apple Mail is unavailable on this device. Your email is prepared below; copy or share it to send with another app. Nothing has been sent." }
    }

    private func shareText(_ prepared: PreparedRequest) -> String {
        "To: \(prepared.recipient)\nSubject: \(prepared.subject)\n\n\(prepared.body)"
    }
}
