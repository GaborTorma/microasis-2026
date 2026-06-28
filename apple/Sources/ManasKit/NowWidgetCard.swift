import WidgetKit
import SwiftUI

/// One moment on a stage's timeline. Shared by the watch widget's
/// `TimelineProvider` and the in-app widget-preview screen used for marketing
/// screenshots (so both render byte-identically).
public struct NowEntry: TimelineEntry {
    public let date: Date
    /// nil only until the schedule has loaded for the first time.
    public let stage: StageDTO?
    /// The act to show at `date`: the one on air, else the next upcoming one.
    public let event: EventDTO?
    /// `event` is on air at `date` (vs. an upcoming "next").
    public let isLive: Bool
    public let locale: AppLocale

    public init(date: Date, stage: StageDTO?, event: EventDTO?, isLive: Bool, locale: AppLocale) {
        self.date = date; self.stage = stage; self.event = event; self.isLive = isLive; self.locale = locale
    }
}

/// Builds `NowEntry`s from a schedule. Pure — no `Date()`, `UserDefaults`, or
/// `@MainActor` — so the widget's timeline provider and the app's preview screen
/// share one source of truth. `locale` is passed in (the widget reads it from
/// the App Group, the app from its `Settings`).
public enum NowWidgetBuilder {
    /// Playable events for a stage, sorted by start — mirrors
    /// `ScheduleStore.events(forStage:)` (which is MainActor-bound).
    public static func events(_ data: ScheduleData, stageSlug slug: String) -> [EventDTO] {
        data.events
            .filter { $0.stageSlug == slug && $0.isPlayable }
            .sorted { $0.startsAt < $1.startsAt }
    }

    /// The configured stage, or the festival default when unset/unknown.
    public static func resolveStage(_ data: ScheduleData, slug: String?) -> StageDTO? {
        if let slug, let s = data.stages.first(where: { $0.slug == slug }) { return s }
        return data.stages.first(where: { $0.isDefault }) ?? data.stages.first
    }

    /// The act to show at `t`: on air if any, else the next upcoming. nil when
    /// the stage's programme is entirely in the past.
    public static func pick(at t: Date, events: [EventDTO]) -> (event: EventDTO?, live: Bool) {
        if let live = events.first(where: { $0.isLive(at: t) }) { return (live, true) }
        if let next = events.first(where: { $0.startsAt > t }) { return (next, false) }
        return (nil, false)
    }

    /// A single entry for `at` — the placeholder / snapshot / preview path.
    public static func makeEntry(at: Date, data: ScheduleData?, slug: String?, locale: AppLocale) -> NowEntry {
        guard let data, let stage = resolveStage(data, slug: slug) else {
            return NowEntry(date: at, stage: nil, event: nil, isLive: false, locale: locale)
        }
        let evs = events(data, stageSlug: stage.slug)
        let p = pick(at: at, events: evs)
        return NowEntry(date: at, stage: stage, event: p.event, isLive: p.live, locale: locale)
    }

    /// `now` plus every future act start/end within the next 12 h as entries.
    public static func entries(now: Date, stage: StageDTO, events evs: [EventDTO], locale: AppLocale) -> [NowEntry] {
        let horizon = now.addingTimeInterval(12 * 3600)
        var times: Set<Date> = [now]
        for e in evs {
            if e.startsAt > now, e.startsAt <= horizon { times.insert(e.startsAt) }
            if let end = e.endsAt, end > now, end <= horizon { times.insert(end) }
        }
        return times.sorted().prefix(60).map { t in
            let p = pick(at: t, events: evs)
            return NowEntry(date: t, stage: stage, event: p.event, isLive: p.live, locale: locale)
        }
    }
}

/// The widget's foreground: stage name (top-left) · time range (top-right) · act
/// name (full-width below). The background is applied separately so the same
/// content works inside a real widget (`.containerBackground`) and in the
/// in-app preview card.
public struct NowWidgetContent: View {
    let entry: NowEntry
    public init(entry: NowEntry) { self.entry = entry }

    private var accent: Color { entry.stage.map { Color(hex: $0.accent) } ?? Theme.sun }

    public var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Kind icon watermark — kept in the CONTENT layer, not the container
            // background: the system desaturates a widget's background on tinted
            // watch faces, which all but erased a faint background icon. Here it
            // survives, picks up the accent tint, and the act text overlaps it.
            if let event = entry.event {
                KindIcon(event.kind, size: 40, color: accent)
                    .opacity(0.28)
                    .widgetAccentable()
                    .offset(x: -1, y: 3)
            }
            content
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 4) {
                Text(entry.stage?.name.uppercased() ?? "MANAS")
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(accent)
                    .lineLimit(1).minimumScaleFactor(0.7)
                    .widgetAccentable()
                // Live dot sits beside the stage name; pulses while on air.
                if entry.isLive {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 6))
                        .foregroundStyle(Theme.now)
                        .symbolEffect(.pulse, options: .repeating, isActive: true)
                }
                Spacer(minLength: 2)
                if let event = entry.event {
                    Text(Fmt.range(event.startsAt, event.endsAt))
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.cream)
                        .lineLimit(1).minimumScaleFactor(0.6)
                }
            }
            if let event = entry.event, let artist = event.artist {
                Text(artist)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.creamDim)
                    .lineLimit(1).minimumScaleFactor(0.6)
            }
            Text(actText)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(entry.event == nil ? Theme.creamDim : Theme.cream)
                .lineLimit(2).minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        // Language chip (EN / HU / EN+HU), shown whenever a language is set.
        .overlay(alignment: .bottomTrailing) {
            if let event = entry.event, event.langAvailability != nil {
                let chip = Theme.chip(event.langAvailability)
                Text(chip.label).font(.system(size: 9, weight: .bold))
                    .padding(.horizontal, 5).padding(.vertical, 2)
                    .background(chip.bg, in: Capsule()).foregroundStyle(chip.fg)
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

/// The widget's dark base + stage tint, like the watch card. The system
/// desaturates this on tinted watch faces; cream text stays readable either way.
/// (The kind-icon watermark lives in the content layer, not here — see
/// `NowWidgetContent`, where it survives the background desaturation.)
@ViewBuilder
public func nowWidgetBackground(_ entry: NowEntry) -> some View {
    let tint = entry.stage.map { Color(hex: $0.color) } ?? Theme.ink3
    ZStack {
        Theme.ink
        LinearGradient(colors: [tint.opacity(0.75), tint.opacity(0.35)],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

/// The WidgetKit body: content + the widget container background.
public struct NowWidgetView: View {
    let entry: NowEntry
    public init(entry: NowEntry) { self.entry = entry }
    public var body: some View {
        NowWidgetContent(entry: entry)
            .containerBackground(for: .widget) { nowWidgetBackground(entry) }
    }
}

/// A standalone widget-shaped card (content + background + rounded clip) for the
/// in-app preview screen the screenshot harness captures. `.containerBackground`
/// paints only inside a real widget, so the preview supplies its own background.
public struct NowWidgetCard: View {
    let entry: NowEntry
    public init(entry: NowEntry) { self.entry = entry }
    public var body: some View {
        NowWidgetContent(entry: entry)
            .padding(.horizontal, 11).padding(.vertical, 9)
            .background(nowWidgetBackground(entry))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
