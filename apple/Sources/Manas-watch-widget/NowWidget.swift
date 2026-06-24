import WidgetKit
import SwiftUI
import AppIntents

/// "Now playing" timeline for the configured stage. `NowEntry`, the entry
/// builder, and the views live in `ManasKit/NowWidgetCard.swift` so the in-app
/// widget-preview screen renders identically; this file is the WidgetKit glue.
struct NowProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> NowEntry {
        NowEntry(date: Date(), stage: nil, event: nil, isLive: false, locale: WidgetSchedule.locale)
    }

    func snapshot(for configuration: StageSelectionIntent, in context: Context) async -> NowEntry {
        let data = await WidgetSchedule.load()
        return NowWidgetBuilder.makeEntry(at: Date(), data: data, slug: configuration.stage?.id,
                                          locale: WidgetSchedule.locale)
    }

    /// Smart Stack suggestions: one pre-configured "now playing" per stage, so
    /// the gallery offers each stage directly. Synchronous, so it reads the
    /// cached schedule (empty until the first fetch — then the widget is still
    /// addable and configurable by hand).
    func recommendations() -> [AppIntentRecommendation<StageSelectionIntent>] {
        let stages = (APIClient().cachedSchedule()?.stages ?? []).sorted { $0.sortOrder < $1.sortOrder }
        return stages.map { s in
            let intent = StageSelectionIntent()
            intent.stage = StageEntity(id: s.slug, name: s.name)
            return AppIntentRecommendation(intent: intent, description: Text(s.name))
        }
    }

    func timeline(for configuration: StageSelectionIntent, in context: Context) async -> Timeline<NowEntry> {
        let now = Date()
        let data = await WidgetSchedule.load()
        guard let data, let stage = NowWidgetBuilder.resolveStage(data, slug: configuration.stage?.id) else {
            // No data yet (first run, offline, never opened): retry in an hour.
            let entry = NowWidgetBuilder.makeEntry(at: now, data: data, slug: configuration.stage?.id,
                                                   locale: WidgetSchedule.locale)
            return Timeline(entries: [entry], policy: .after(now.addingTimeInterval(3600)))
        }
        let events = NowWidgetBuilder.events(data, stageSlug: stage.slug)
        let entries = NowWidgetBuilder.entries(now: now, stage: stage, events: events, locale: WidgetSchedule.locale)
        // One entry per future act boundary lets WidgetKit roll onto the next
        // act exactly when it changes, with no extra fetch. `.atEnd` then
        // refetches (≤12 h later) to pick up schedule edits. A lone "now" entry
        // (e.g. a long gap before the next act) just retries hourly.
        let policy: TimelineReloadPolicy = entries.count <= 1
            ? .after(now.addingTimeInterval(3600)) : .atEnd
        return Timeline(entries: entries, policy: policy)
    }
}

/// 3×1 "now playing" widget — pin one per stage and scroll the Smart Stack.
struct ManasNowWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "ManasNow", intent: StageSelectionIntent.self, provider: NowProvider()) { entry in
            NowWidgetView(entry: entry)
        }
        .configurationDisplayName("Most játszik")
        .description("Egy színpad épp futó (vagy következő) előadása.")
        .supportedFamilies([.accessoryRectangular])
    }
}
