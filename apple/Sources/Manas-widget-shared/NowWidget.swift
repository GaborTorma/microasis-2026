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
        return NowWidgetBuilder.makeEntry(at: WidgetSchedule.now, data: data, slug: configuration.stage?.id,
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
        let now = WidgetSchedule.now
        let data = await WidgetSchedule.load()
        guard let data, let stage = NowWidgetBuilder.resolveStage(data, slug: configuration.stage?.id) else {
            // No data yet (first run, offline, never opened): retry in an hour.
            let entry = NowWidgetBuilder.makeEntry(at: now, data: data, slug: configuration.stage?.id,
                                                   locale: WidgetSchedule.locale)
            return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(3600)))
        }
        // QA debug clock: the *content* reflects the frozen debug time, but the
        // entry must be dated to the real wall clock — otherwise the complication
        // has no entry at or before "now" and just renders its empty placeholder.
        // (A debug-dated entry sits in the festival future, so the face skips it.)
        if WidgetSchedule.debugNow != nil {
            let events = NowWidgetBuilder.events(data, stageSlug: stage.slug)
            let p = NowWidgetBuilder.pick(at: now, events: events)
            let entry = NowEntry(date: Date(), stage: stage, event: p.event, next: p.next,
                                 isLive: p.live, locale: WidgetSchedule.locale)
            return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(3600)))
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

/// Per-stage "now playing" widget, shared by both widget extensions: the
/// rectangular Smart Stack card on the watch, the three home-screen sizes on
/// iOS (small ≈ the watch card, medium adds one-line room for long artist
/// names, large mirrors the app's Now view with current + next act).
struct ManasNowWidget: Widget {
    #if os(watchOS)
    private let families: [WidgetFamily] = [.accessoryRectangular]
    #else
    private let families: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge]
    #endif

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "ManasNow", intent: StageSelectionIntent.self, provider: NowProvider()) { entry in
            #if os(watchOS)
            NowWidgetView(entry: entry)
            #else
            NowHomeWidgetView(entry: entry)
            #endif
        }
        .configurationDisplayName("Most játszik")
        .description("Egy színpad épp futó (vagy következő) előadása.")
        .supportedFamilies(families)
    }
}
