import WidgetKit
import SwiftUI

/// Home-screen renderings of the "now playing" entry. Small and medium share
/// one layout: the watch card's "now" block (stage · time · artist · act), a
/// divider right under the act name, then as many up-next rows as fit —
/// medium is the wide variant where long names fit on one line.
struct NowHomeWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: NowEntry

    var body: some View {
        NowUpNextView(entry: entry, m: family == .systemMedium ? .medium : .small)
            .containerBackground(for: .widget) { nowWidgetBackground(entry) }
    }
}

private extension NowEntry {
    var accentColor: Color { stage.map { Color(hex: $0.accent) } ?? Theme.sun }

    /// Act title, or the loading / idle placeholder — same rule as the watch card.
    var actText: String {
        guard let event else {
            return stage == nil ? L.t("common.loading", locale) : L.t("now.nothing", locale)
        }
        return event.title.text(locale)
    }
}

/// Per-family type scale; the two families render the same content.
private struct Metrics {
    let stage: CGFloat, time: CGFloat, artist: CGFloat, title: CGFloat
    let nextTitle: CGFloat, nextTime: CGFloat
    let icon: CGFloat, chip: CGFloat, titleLines: Int
    /// The medium card is wide enough to put the time range beside the stage
    /// name (like the watch); the small square gives it its own line.
    let timeInHeader: Bool

    static let small = Metrics(stage: 12, time: 11, artist: 11, title: 14,
                               nextTitle: 12, nextTime: 11,
                               icon: 38, chip: 8, titleLines: 2, timeInHeader: false)
    static let medium = Metrics(stage: 14, time: 13, artist: 13, title: 18,
                                nextTitle: 14, nextTime: 13,
                                icon: 48, chip: 10, titleLines: 1, timeInHeader: true)
}

/// The shared card: "now" on top (watch style), a divider under the act name,
/// then the upcoming acts — as many rows as the leftover space fits.
private struct NowUpNextView: View {
    let entry: NowEntry
    let m: Metrics

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Kind-icon watermark (top-right) + language chip (bottom-right) of
            // the current act — translucent background ornaments, like the
            // watch card; content may run over them.
            if let event = entry.event {
                KindIcon(event.kind, size: m.icon, color: entry.accentColor)
                    .opacity(0.26)
                    .widgetAccentable()
            }
            if let event = entry.event, event.langAvailability != nil {
                let chip = Theme.chip(event.langAvailability)
                Text(chip.label).font(.system(size: m.chip, weight: .bold))
                    .padding(.horizontal, m.chip * 0.55).padding(.vertical, 2)
                    .background(chip.bg, in: Capsule()).foregroundStyle(chip.fg)
                    .opacity(0.5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            }
            VStack(alignment: .leading, spacing: 2) {
                nowBlock
                if !entry.upcoming.isEmpty {
                    Divider().overlay(Theme.line).padding(.vertical, 3)
                    upcomingList
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: "Most" — the watch card's content

    @ViewBuilder private var nowBlock: some View {
        HStack(spacing: 5) {
            Text(entry.stage?.name.uppercased() ?? "MANAS")
                .font(.system(size: m.stage, weight: .heavy, design: .rounded))
                .foregroundStyle(entry.accentColor)
                .lineLimit(1).minimumScaleFactor(0.7)
                .widgetAccentable()
            if entry.isLive {
                Image(systemName: "circle.fill")
                    .font(.system(size: m.stage * 0.6))
                    .foregroundStyle(Theme.now)
                    .shadow(color: Theme.now, radius: m.stage * 0.3)
                    .symbolEffect(.pulse, options: .repeating, isActive: true)
            }
            Spacer(minLength: 4)
            // Inset from the trailing edge so the time doesn't sit on the
            // watermark that now lives in the top-right corner.
            if m.timeInHeader, let event = entry.event {
                timeRange(event).padding(.trailing, m.icon * 0.75)
            }
        }
        if !m.timeInHeader, let event = entry.event { timeRange(event) }
        if let artist = entry.event?.artist {
            Text(artist)
                .font(.system(size: m.artist, weight: .medium, design: .rounded))
                .foregroundStyle(Theme.creamDim)
                .lineLimit(1).minimumScaleFactor(0.7)
                .padding(.top, 1)
        }
        Text(entry.actText)
            .font(.system(size: m.title, weight: .bold, design: .rounded))
            .foregroundStyle(entry.event == nil ? Theme.creamDim : Theme.cream)
            .lineLimit(m.titleLines).minimumScaleFactor(0.6)
    }

    private func timeRange(_ event: EventDTO) -> some View {
        Text(Fmt.range(event.startsAt, event.endsAt))
            .font(.system(size: m.time, weight: .semibold, design: .rounded))
            .foregroundStyle(Theme.cream)
            .lineLimit(1).minimumScaleFactor(0.6)
    }

    // MARK: "Következik" — as many rows as fit below the divider

    /// Largest row count whose rows all fit the leftover vertical space; rows
    /// are fixed-height so ViewThatFits measures honestly. (Candidates with
    /// more rows than available acts just repeat the full list — harmless.)
    private var upcomingList: some View {
        ViewThatFits(in: .vertical) {
            rows(4)
            rows(3)
            rows(2)
            rows(1)
        }
    }

    private func rows(_ count: Int) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            ForEach(entry.upcoming.prefix(count)) { act in
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(act.title.text(entry.locale))
                        .font(.system(size: m.nextTitle, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.creamDim)
                        .lineLimit(1).minimumScaleFactor(0.7)
                    Spacer(minLength: 4)
                    Text(Fmt.hhmm(act.startsAt))
                        .font(.system(size: m.nextTime, weight: .semibold, design: .monospaced))
                        .foregroundStyle(entry.accentColor)
                }
                .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
