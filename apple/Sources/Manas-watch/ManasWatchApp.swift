import SwiftUI
import WidgetKit

@main
struct ManasWatchApp: App {
    @StateObject private var store = ScheduleStore()
    @StateObject private var settings = Settings()
    @StateObject private var location = LocationStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            Group {
                if let slug = widgetPreviewSlug {
                    WidgetPreviewScreen(slug: slug)
                } else {
                    WatchRootView()
                }
            }
            .environmentObject(store)
            .environmentObject(settings)
            .environmentObject(location)
            .tint(Theme.sun)
            .task { await store.load(); reloadWidgets() }
            // Re-fetch whenever the app returns to the foreground, and push
            // the fresh schedule to the widgets so the Smart Stack/complication
            // reflects it without waiting for the widget's own refresh.
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await store.load(); reloadWidgets() } }
            }
        }
    }

    /// Screenshot-only (DEBUG/TestFlight): render one stage's "now playing"
    /// widget full-screen so the harness can capture a marketing shot of it.
    /// Set `manas.startWidgetPreview` to a stage slug. No-op in App Store builds.
    private var widgetPreviewSlug: String? {
        guard AppEnv.debugToolsEnabled,
              let slug = UserDefaults.standard.string(forKey: "manas.startWidgetPreview"),
              !slug.isEmpty else { return nil }
        return slug
    }

    @MainActor private func reloadWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}

/// Full-screen render of a single stage's widget card, driven by the same
/// `Fmt.now` debug clock and `Settings.locale` as the rest of the app — so the
/// shot honours `manas.debugNow` / `manas.locale` without the widget extension
/// needing to read them.
struct WidgetPreviewScreen: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    let slug: String

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width * 0.9
            ZStack {
                Theme.ink.ignoresSafeArea()
                NowWidgetCard(entry: NowWidgetBuilder.makeEntry(
                    at: Fmt.now, data: store.data, slug: slug, locale: settings.locale))
                    .frame(width: w, height: w * 0.46)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}
