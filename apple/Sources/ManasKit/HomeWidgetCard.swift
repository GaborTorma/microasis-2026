#if os(iOS)
import WidgetKit
import SwiftUI

/// The iOS home-screen widget's content, shared by the widget extension and
/// the in-app widget-preview screen the screenshot harness captures (so both
/// render identically — same pattern as the watch's `NowWidgetCard`).
///
/// Small and medium show the same content: the watch card's "now" block
/// (stage · time · artist · act), then a bottom-anchored up-next list (act ·
/// start time; as many rows as fit, last row flush with the bottom) with a
/// thin rule centered in the gap above it — medium is the wide variant where
/// long names fit on one line.
public enum HomeWidgetSize {
    case small, medium
}

/// Per-size type scale; the two sizes render the same content. `icon` is the
/// top-right kind-icon watermark.
private struct Metrics {
    let stage: CGFloat, time: CGFloat, artist: CGFloat, title: CGFloat
    let nextTitle: CGFloat, nextTime: CGFloat
    let icon: CGFloat, chip: CGFloat, titleLines: Int
    /// The medium card is wide enough to put the time range beside the stage
    /// name (like the watch) and the chip on the title's line; the small
    /// square stacks them instead (time under the header, chip in the header).
    let timeInHeader: Bool

    static let small = Metrics(stage: 12, time: 11, artist: 11, title: 14,
                               nextTitle: 12, nextTime: 11,
                               icon: 34, chip: 8, titleLines: 2, timeInHeader: false)
    static let medium = Metrics(stage: 14, time: 13, artist: 13, title: 18,
                                nextTitle: 14, nextTime: 13,
                                icon: 43, chip: 10, titleLines: 1, timeInHeader: true)
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

public struct HomeWidgetContent: View {
    let entry: NowEntry
    private let m: Metrics

    public init(entry: NowEntry, size: HomeWidgetSize) {
        self.entry = entry
        self.m = size == .medium ? .medium : .small
    }

    public var body: some View {
        ZStack(alignment: .topTrailing) {
            // Kind-icon watermark (top-right) of the current act — a
            // translucent background ornament, like the watch card; content
            // may run over it.
            if let event = entry.event {
                KindIcon(event.kind, size: m.icon, color: entry.accentColor)
                    .opacity(0.26)
                    .widgetAccentable()
            }
            VStack(alignment: .leading, spacing: 2) {
                nowBlock
                if !entry.upcoming.isEmpty {
                    // The up-next list is bottom-anchored (last row flush with
                    // the card bottom) and gets the leftover space proposed
                    // first (layoutPriority) so it fits as many rows as it
                    // can; the two equal spacers then split what remains,
                    // centering the rule in the gap between the title line
                    // and the list.
                    Spacer(minLength: 3)
                    Rectangle().fill(Theme.line).frame(height: 1)
                    Spacer(minLength: 3)
                    upcomingList.layoutPriority(1)
                } else {
                    Spacer(minLength: 0)
                }
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
            if m.timeInHeader {
                // Medium: time range flush with the trailing edge.
                if let event = entry.event { timeRange(event) }
            } else {
                // Small: language chip in the top-right corner.
                langChip
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
        // The language chip on medium sits right-aligned on the title's last
        // line (small has it in the header) — zero extra height so the 4-row
        // up-next list still fits. The kind icon is the top-right watermark.
        HStack(alignment: .bottom, spacing: 6) {
            titleText
            if m.timeInHeader {
                Spacer(minLength: 4)
                langChip
            }
        }
    }

    private var titleText: some View {
        Text(entry.actText)
            .font(.system(size: m.title, weight: .bold, design: .rounded))
            .foregroundStyle(entry.event == nil ? Theme.creamDim : Theme.cream)
            .lineLimit(m.titleLines).minimumScaleFactor(0.6)
    }

    @ViewBuilder private var langChip: some View {
        if let event = entry.event, event.langAvailability != nil {
            let chip = Theme.chip(event.langAvailability)
            Text(chip.label).font(.system(size: m.chip, weight: .bold))
                .padding(.horizontal, m.chip * 0.55).padding(.vertical, 2)
                .background(chip.bg, in: Capsule()).foregroundStyle(chip.fg)
        }
    }

    private func timeRange(_ event: EventDTO) -> some View {
        Text(Fmt.range(event.startsAt, event.endsAt))
            .font(.system(size: m.time, weight: .semibold, design: .rounded))
            .foregroundStyle(Theme.cream)
            .lineLimit(1).minimumScaleFactor(0.6)
    }

    // MARK: "Következik" — as many rows as fit above the card bottom

    /// Largest row count whose rows all fit the proposed vertical space; rows
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

/// A standalone widget-shaped card (content + background + rounded clip) for
/// the in-app preview screen the screenshot harness captures.
/// `.containerBackground` paints only inside a real widget, so the preview
/// supplies its own background — same pattern as the watch's `NowWidgetCard`.
public struct HomeWidgetCard: View {
    let entry: NowEntry
    let size: HomeWidgetSize
    public init(entry: NowEntry, size: HomeWidgetSize) {
        self.entry = entry; self.size = size
    }
    public var body: some View {
        HomeWidgetContent(entry: entry, size: size)
            .padding(16)
            .background(nowWidgetBackground(entry))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}
#endif
