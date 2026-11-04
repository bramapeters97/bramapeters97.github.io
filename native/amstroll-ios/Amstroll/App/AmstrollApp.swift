import SwiftUI
import Combine

@MainActor final class AppBootstrap: ObservableObject {
    @Published private(set) var store: AppStore?
    @Published private(set) var failure: String?
    init() { load() }
    func load() {
        do {
            let testHost = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil || NSClassFromString("XCTestCase") != nil
            let demo = testHost || ProcessInfo.processInfo.arguments.contains("--demo") || ProcessInfo.processInfo.arguments.contains("--screenshot-mode")
            store = try AppStore(catalog: Catalog.load(), demoMode: demo)
            failure = nil
        } catch { store = nil; failure = error.localizedDescription }
    }
}

@main @MainActor
struct AmstrollApp: App {
    @StateObject private var bootstrap = AppBootstrap()
    @Environment(\.scenePhase) private var scenePhase
    var body: some Scene {
        WindowGroup {
            Group {
                if let store = bootstrap.store { AmstrollLaunchView().environmentObject(store) }
                else {
                    VStack(spacing: 20) {
                        Image(systemName: "exclamationmark.circle").font(.largeTitle)
                        Text("Amstroll couldn’t open its local data.").font(AmstrollStyle.heading())
                        Text(bootstrap.failure ?? "The app resources could not load.").font(AmstrollStyle.body())
                        Text("Your data has not been deleted. Please retry or contact support.")
                        Button("Try again") { bootstrap.load() }.buttonStyle(AmstrollButton())
                        Link("Contact support", destination: URL(string: "https://bram-peters.com/contact.html")!)
                    }.padding(28)
                }
            }.font(AmstrollStyle.body()).foregroundStyle(AmstrollStyle.ink)
                .tint(AmstrollStyle.forest).preferredColorScheme(.light)
                .onChange(of: scenePhase) { _, phase in if phase != .active { bootstrap.store?.persist() } }
        }
    }
}


private struct AmstrollLaunchView: View {
    @AppStorage("hasSeenAmstrollWelcome") private var hasSeenWelcome = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var welcomeFinished = false

    private var showsWelcome: Bool {
        !hasSeenWelcome && !welcomeFinished
            && !ProcessInfo.processInfo.arguments.contains("--screenshot-mode")
            && !ProcessInfo.processInfo.arguments.contains("--demo")
    }

    var body: some View {
        ZStack {
            if !showsWelcome {
                AmstrollRootView().transition(.opacity)
            }
            if showsWelcome {
                ZStack {
                    AmstrollStyle.paper.ignoresSafeArea()
                    Image("AmstrollWordmark")
                        .resizable().scaledToFit()
                        .frame(maxWidth: 220).padding(40)
                        .accessibilityLabel("Welcome to Amstroll")
                }
                .accessibilityIdentifier("welcome-splash")
                .transition(.opacity)
                .zIndex(1)
            }
        }
        .task {
            guard showsWelcome else { return }
            do { try await Task.sleep(for: .milliseconds(850)) }
            catch { return }
            withAnimation(.easeOut(duration: reduceMotion ? 0.1 : 0.4)) {
                welcomeFinished = true
                hasSeenWelcome = true
            }
        }
    }
}
