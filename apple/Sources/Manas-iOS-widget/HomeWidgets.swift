import WidgetKit
import SwiftUI

/// Home-screen renderings of the "now playing" entry. Small and medium share
/// one layout: the watch card's "now" block (stage · time · artist · act) with
/// the Now tab's "up next" row beneath it — medium is the wide variant where
/// long artist names fit on one line.
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
    let eyebrow: CGFloat, nextArtist: CGFloat, nextTitle: CGFloat, nextTime: CGFloat
    let icon: CGFloat, chip: CGFloat, titleLines: Int
    /// The medium card is wide enough to put the time range beside the stage
    /// name (like the watch); the small square gives it its own line.
    let timeInHeader: Bool

    static let small = Metrics(stage: 12, time: 11, artist: 11, title: 14,
                               eyebrow: 8, nextArtist: 10, nextTitle: 12, nextTime: 11,
                               icon: 38, chip: 8, titleLines: 2, timeInHeader: false)
    static let medium = Metrics(stage: 14, time: 13, artist: 13, title: 18,
                                eyebrow: 9, nextArtist: 12, nextTitle: 14, nextTime: 13,
                                icon: 48, chip: 10, titleLines: 1, timeInHeader: true)
}

/// The shared card: "now" on top (watch style), "up next" below (Now tab style).
private struct NowUpNextView: View {
    let entry: NowEntry
    let m: Metrics

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Kind-icon watermark + language chip of the current act — the same
            // translucent background ornaments as the watch card.
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
                Spacer(minLength: 3)
                if let next = entry.next { nextBlock(next) }
            }
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
            if m.timeInHeader, let event = entry.event { timeRange(event) }
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

    // MARK: "Következik" — the Now tab's up-next row

    private func nextBlock(_ next: EventDTO) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Divider().overlay(Theme.line).padding(.bottom, 2)
            Text(L.t("now.upNext", entry.locale).uppercased())
                .font(.system(size: m.eyebrow, weight: .semibold)).tracking(1.5)
                .foregroundStyle(Theme.creamFaint)
            HStack(alignment: .lastTextBaseline, spacing: 6) {
                VStack(alignment: .leading, spacing: 1) {
                    if let artist = next.artist {
                        Text(artist)
                            .font(.system(size: m.nextArtist, weight: .medium, design: .rounded))
                            .foregroundStyle(Theme.creamFaint)
                            .lineLimit(1).minimumScaleFactor(0.7)
                    }
                    Text(next.title.text(entry.locale))
                        .font(.system(size: m.nextTitle, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.creamDim)
                        .lineLimit(1).minimumScaleFactor(0.6)
                }
                Spacer(minLength: 4)
                VStack(alignment: .trailing, spacing: 1) {
                    Text(Fmt.hhmm(next.startsAt))
                        .font(.system(size: m.nextTime, weight: .semibold, design: .monospaced))
                        .foregroundStyle(entry.accentColor)
                    // Bare HH:mm would mislead across midnight — date it when
                    // the act is on a later festival day than the one shown
                    // above it. (Not compared to entry.date: the QA debug-clock
                    // path pins entries to the real wall clock.)
                    if let current = entry.event, next.day != current.day {
                        Text(Fmt.mmdd(next.day))
                            .font(.system(size: m.eyebrow))
                            .foregroundStyle(Theme.creamFaint)
                    }
                }
            }
        }
    }
}
