import SwiftUI

@main
struct PortfolioApp: App {
    @StateObject private var content = ContentStore()
    @StateObject private var draft = RequestDraftStore()

    var body: some Scene {
        WindowGroup {
            PortfolioRootView()
                .environmentObject(content)
                .environmentObject(draft)
                .tint(StudioTheme.accent)
        }
    }
}
