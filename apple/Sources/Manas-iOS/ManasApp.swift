import SwiftUI

@main
struct ManasApp: App {
    @StateObject private var store = ScheduleStore()
    @StateObject private var settings = Settings()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .environmentObject(settings)
                .preferredColorScheme(.dark)
                .tint(Theme.sun)
                .task { await store.load() }
        }
    }
}
