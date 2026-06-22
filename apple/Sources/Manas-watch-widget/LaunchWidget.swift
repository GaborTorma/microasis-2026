import WidgetKit
import SwiftUI

/// Tiny, static widget whose only job is to open the app — useful as a
/// watch-face complication (circular / inline / corner).
struct ManasLaunchWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ManasLaunch", provider: LaunchProvider()) { _ in
            LaunchWidgetView()
        }
        .configurationDisplayName("Manas")
        .description("Koppints a Manas megnyitásához.")
        .supportedFamilies([.accessoryCircular, .accessoryInline, .accessoryCorner])
    }
}

struct LaunchEntry: TimelineEntry { let date: Date }

struct LaunchProvider: TimelineProvider {
    func placeholder(in context: Context) -> LaunchEntry { LaunchEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (LaunchEntry) -> Void) {
        completion(LaunchEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LaunchEntry>) -> Void) {
        // Static content — never needs to refresh.
        completion(Timeline(entries: [LaunchEntry(date: Date())], policy: .never))
    }
}

struct LaunchWidgetView: View {
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryInline:
            // Inline is a single text line — a detailed logo can't render here.
            Text("Manas")
        case .accessoryCorner:
            Image("ManasIcon")
                .resizable()
                .scaledToFit()
                .widgetLabel("Manas")
        default: // accessoryCircular — the app logo fills the dial.
            Image("ManasIcon")
                .resizable()
                .scaledToFill()
                .clipShape(Circle())
        }
    }
}
