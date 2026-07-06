import SwiftUI
import WidgetKit

@main
struct ManasApp: App {
    @StateObject private var store = ScheduleStore()
    @StateObject private var settings = Settings()
    @StateObject private var location = LocationStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .environmentObject(settings)
                .environmentObject(location)
                .preferredColorScheme(.dark)
                .tint(Theme.sun)
                .task { await store.load(); reloadWidgets() }
                // Re-fetch whenever the app returns to the foreground, and push
                // the fresh schedule to the home-screen widgets so they reflect
                // it without waiting for the widget's own refresh.
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await store.load(); reloadWidgets() } }
                }
        }
    }

    @MainActor private func reloadWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
