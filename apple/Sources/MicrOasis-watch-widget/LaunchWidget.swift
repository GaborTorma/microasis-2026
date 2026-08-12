import WidgetKit
import SwiftUI

/// Tiny, static widget whose only job is to open the app — useful as a
/// watch-face complication (circular / inline / corner).
struct MicrOasisLaunchWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MicrOasisLaunch", provider: LaunchProvider()) { _ in
            LaunchWidgetView()
        }
        .configurationDisplayName("MicrOasis")
        .description("Koppints a MicrOasis megnyitásához.")
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
            // Inline is a single text line — a logo can't render here.
            Text("MicrOasis")
        case .accessoryCorner:
            OasisMark()
                .widgetLabel("MicrOasis")
        default: // accessoryCircular — the app logo fills the dial.
            ZStack {
                AccessoryWidgetBackground()
                OasisMark()
            }
        }
    }
}
