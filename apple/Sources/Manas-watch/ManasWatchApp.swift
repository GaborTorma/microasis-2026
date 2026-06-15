import SwiftUI

@main
struct ManasWatchApp: App {
    @StateObject private var store = ScheduleStore()
    @StateObject private var settings = Settings()

    var body: some Scene {
        WindowGroup {
            WatchRootView()
                .environmentObject(store)
                .environmentObject(settings)
                .tint(Theme.sun)
                .task { await store.load() }
        }
    }
}
