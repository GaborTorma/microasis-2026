import WidgetKit
import SwiftUI
import AppIntents

/// One moment on the configured stage's timeline.
struct NowEntry: TimelineEntry {
    let date: Date
    /// nil only until the schedule has loaded for the first time.
    let stage: StageDTO?
    /// The act to show at `date`: the one on air, else the next upcoming one.
    let event: EventDTO?
    /// `event` is on air at `date` (vs. an upcoming "next").
    let isLive: Bool
    let locale: AppLocale
}

struct NowProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> NowEntry {
        NowEntry(date: Date(), stage: nil, event: nil, isLive: false, locale: WidgetSchedule.locale)
    }

    func snapshot(for configuration: StageSelectionIntent, in context: Context) async -> NowEntry {
        let data = await WidgetSchedule.load()
        return Self.makeEntry(at: Date(), data: data, slug: configuration.stage?.id)
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
        guard let data, let stage = Self.resolveStage(data, slug: configuration.stage?.id) else {
            // No data yet (first run, offline, never opened): retry in an hour.
            let entry = Self.makeEntry(at: now, data: data, slug: configuration.stage?.id)
            return Timeline(entries: [entry], policy: .after(now.addingTimeInterval(3600)))
        }
        let events = WidgetSchedule.events(data, stageSlug: stage.slug)
        let entries = Self.entries(now: now, stage: stage, events: events, locale: WidgetSchedule.locale)
        // One entry per future act boundary lets WidgetKit roll onto the next
        // act exactly when it changes, with no extra fetch. `.atEnd` then
        // refetches (≤12 h later) to pick up schedule edits. A lone "now" entry
        // (e.g. a long gap before the next act) just retries hourly.
        let policy: TimelineReloadPolicy = entries.count <= 1
            ? .after(now.addingTimeInterval(3600)) : .atEnd
        return Timeline(entries: entries, policy: policy)
    }

    // MARK: - Building

    /// The configured stage, or the festival default when unset/unknown.
    static func resolveStage(_ data: ScheduleData, slug: String?) -> StageDTO? {
        if let slug, let s = data.stages.first(where: { $0.slug == slug }) { return s }
        return data.stages.first(where: { $0.isDefault }) ?? data.stages.first
    }

    /// The act to show at `t`: on air if any, else the next upcoming. nil when
    /// the stage's programme is entirely in the past.
    static func pick(at t: Date, events: [EventDTO]) -> (event: EventDTO?, live: Bool) {
        if let live = events.first(where: { $0.isLive(at: t) }) { return (live, true) }
        if let next = events.first(where: { $0.startsAt > t }) { return (next, false) }
        return (nil, false)
    }

    /// A single entry for `at` — used for the placeholder / snapshot / no-data
    /// paths where we don't build a full timeline.
    static func makeEntry(at: Date, data: ScheduleData?, slug: String?) -> NowEntry {
        let locale = WidgetSchedule.locale
        guard let data, let stage = resolveStage(data, slug: slug) else {
            return NowEntry(date: at, stage: nil, event: nil, isLive: false, locale: locale)
        }
        let events = WidgetSchedule.events(data, stageSlug: stage.slug)
        let p = pick(at: at, events: events)
        return NowEntry(date: at, stage: stage, event: p.event, isLive: p.live, locale: locale)
    }

    /// `now` plus every future act start/end within the next 12 h, each turned
    /// into an entry. Deduplicated, sorted, capped so the timeline stays small.
    static func entries(now: Date, stage: StageDTO, events: [EventDTO], locale: AppLocale) -> [NowEntry] {
        let horizon = now.addingTimeInterval(12 * 3600)
        var times: Set<Date> = [now]
        for e in events {
            if e.startsAt > now, e.startsAt <= horizon { times.insert(e.startsAt) }
            if let end = e.endsAt, end > now, end <= horizon { times.insert(end) }
        }
        return times.sorted().prefix(60).map { t in
            let p = pick(at: t, events: events)
            return NowEntry(date: t, stage: stage, event: p.event, isLive: p.live, locale: locale)
        }
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

/// Stage name (top-left) · time range (top-right) · act name (full-width below).
struct NowWidgetView: View {
    let entry: NowEntry

    private var accent: Color { entry.stage.map { Color(hex: $0.accent) } ?? Theme.sun }
    private var tint: Color { entry.stage.map { Color(hex: $0.color) } ?? Theme.ink3 }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 4) {
                Text(entry.stage?.name.uppercased() ?? "MANAS")
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(accent)
                    .lineLimit(1).minimumScaleFactor(0.7)
                    .widgetAccentable()
                Spacer(minLength: 2)
                if let event = entry.event {
                    if entry.isLive {
                        Circle().fill(Theme.now).frame(width: 6, height: 6)
                    }
                    Text(Fmt.range(event.startsAt, event.endsAt))
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Theme.cream)
                        .lineLimit(1).minimumScaleFactor(0.6)
                }
            }
            Text(actText)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(entry.event == nil ? Theme.creamDim : Theme.cream)
                .lineLimit(2).minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) {
            // Dark base + stage tint, like the watch card. The system desaturates
            // this on tinted watch faces; cream text stays readable either way.
            ZStack {
                Theme.ink
                LinearGradient(colors: [tint.opacity(0.75), tint.opacity(0.35)],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        }
    }

    private var actText: String {
        guard let event = entry.event else {
            return entry.stage == nil
                ? L.t("common.loading", entry.locale)
                : L.t("now.nothing", entry.locale)
        }
        return event.title.text(entry.locale)
    }
}
