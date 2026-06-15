import SwiftUI

@main
struct ManasApp: App {
    @StateObject private var store = ScheduleStore()
    @StateObject private var settings = Settings()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .environmentObject(settings)
                .preferredColorScheme(.dark)
                .tint(Theme.sun)
                .task { await store.load() }
                // Re-fetch whenever the app returns to the foreground.
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await store.load() } }
                }
        }
    }
}
