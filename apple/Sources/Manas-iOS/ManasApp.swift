import SwiftUI
import WidgetKit

@main
struct ManasApp: App {
    @StateObject private var store = ScheduleStore()
    @StateObject private var settings = Settings()
    @StateObject private var location = LocationStore()
    @StateObject private var favorites = FavoritesStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            Group {
                if let slugs = widgetPreviewSlugs {
                    WidgetPreviewScreen(slugs: slugs)
                } else {
                    RootView()
                }
            }
            .environmentObject(store)
            .environmentObject(settings)
            .environmentObject(location)
            .environmentObject(favorites)
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

    /// Screenshot-only (DEBUG/TestFlight): render the home-screen widgets
    /// full-screen so the harness can capture a marketing shot of them. Set
    /// `manas.startWidgetPreview` to one or two stage slugs ("bowl,terrace":
    /// medium gets the first, small the second). No-op in App Store builds.
    private var widgetPreviewSlugs: [String]? {
        guard AppEnv.debugToolsEnabled,
              let raw = UserDefaults.standard.string(forKey: "manas.startWidgetPreview"),
              !raw.isEmpty else { return nil }
        return raw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
    }

    @MainActor private func reloadWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}

/// Full-screen render of the medium + small widget cards, driven by the same
/// `Fmt.now` debug clock and `Settings.locale` as the rest of the app — the
/// iOS counterpart of the watch's `WidgetPreviewScreen`.
struct WidgetPreviewScreen: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var favorites: FavoritesStore
    let slugs: [String]

    var body: some View {
        GeometryReader { geo in
            // Home-screen proportions: medium ≈ 329×155pt, small is square
            // with the height of the medium card.
            let w = geo.size.width * 0.86
            let h = w * 155 / 329
            ZStack {
                Theme.ink.ignoresSafeArea()
                VStack(spacing: 24) {
                    HomeWidgetCard(entry: entry(slugs.first), size: .medium)
                        .frame(width: w, height: h)
                    HomeWidgetCard(entry: entry(slugs.count > 1 ? slugs[1] : slugs.first), size: .small)
                        .frame(width: h, height: h)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func entry(_ slug: String?) -> NowEntry {
        NowWidgetBuilder.makeEntry(at: Fmt.now, data: store.data, slug: slug, locale: settings.locale,
                                   favorites: favorites.favorites)
    }
}
