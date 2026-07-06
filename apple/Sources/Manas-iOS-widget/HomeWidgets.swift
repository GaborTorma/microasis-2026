import WidgetKit
import SwiftUI

/// Home-screen renderings of the "now playing" entry. The layouts live in
/// `ManasKit/HomeWidgetCard.swift` so the in-app widget-preview screen renders
/// identically; this file is the WidgetKit glue.
struct NowHomeWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: NowEntry

    var body: some View {
        HomeWidgetContent(entry: entry, size: family == .systemMedium ? .medium : .small)
            .containerBackground(for: .widget) { nowWidgetBackground(entry) }
            // Tap → open the timetable with this widget's stage as the leading
            // column (no stage resolved yet → plain app open).
            .widgetURL(entry.stage.flatMap { AppLinks.stageDeepLink($0.slug) })
    }
}
