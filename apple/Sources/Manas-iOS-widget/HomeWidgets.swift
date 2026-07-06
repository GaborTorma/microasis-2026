import WidgetKit
import SwiftUI

/// Home-screen renderings of the "now playing" entry. Small keeps the watch
/// card's look on a square canvas, medium is the same card with one-line room
/// for long artist names, large mirrors the app's Now view: the act on air
/// plus the next one (or the next two when the stage is between acts).
struct NowHomeWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: NowEntry

    var body: some View {
        switch family {
        case .systemLarge:
            NowLargeView(entry: entry)
                // The Now view's card surface — the stage tint lives in the
                // header band here, like StageNowCard, not in the background.
                .containerBackground(for: .widget) { Theme.ink2 }
        case .systemMedium:
            NowMediumView(entry: entry)
                .containerBackground(for: .widget) { nowWidgetBackground(entry) }
        default:
            NowSmallView(entry: entry)
                .containerBackground(for: .widget) { nowWidgetBackground(entry) }
        }
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

/// Pulsing on-air dot, sized to sit beside a stage-name line — the home-screen
/// counterpart of the watch card's live dot.
private struct WidgetLiveDot: View {
    var size: CGFloat = 8
    var body: some View {
        Image(systemName: "circle.fill")
            .font(.system(size: size))
            .foregroundStyle(Theme.now)
            .shadow(color: Theme.now, radius: size / 2)
            .symbolEffect(.pulse, options: .repeating, isActive: true)
    }
}

/// Stage name in the stage accent + the live dot, as on the watch card.
private struct StageLine: View {
    let entry: NowEntry
    let size: CGFloat
    var body: some View {
        HStack(spacing: 5) {
            Text(entry.stage?.name.uppercased() ?? "MANAS")
                .font(.system(size: size, weight: .heavy, design: .rounded))
                .foregroundStyle(entry.accentColor)
                .lineLimit(1).minimumScaleFactor(0.7)
                .widgetAccentable()
            if entry.isLive { WidgetLiveDot(size: size * 0.6) }
        }
    }
}

/// Kind-icon watermark (bottom-left) + language chip (bottom-right) — the same
/// translucent background ornaments as the watch card; content draws over them.
private struct CardOrnaments: View {
    let entry: NowEntry
    let iconSize: CGFloat
    let chipSize: CGFloat

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            if let event = entry.event {
                KindIcon(event.kind, size: iconSize, color: entry.accentColor)
                    .opacity(0.28)
                    .widgetAccentable()
            }
            if let event = entry.event, event.langAvailability != nil {
                let chip = Theme.chip(event.langAvailability)
                Text(chip.label).font(.system(size: chipSize, weight: .bold))
                    .padding(.horizontal, chipSize * 0.55).padding(.vertical, 2)
                    .background(chip.bg, in: Capsule()).foregroundStyle(chip.fg)
                    .opacity(0.5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
    }
}

// MARK: - Small (2×2) — the watch card on a square canvas

private struct NowSmallView: View {
    let entry: NowEntry

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            CardOrnaments(entry: entry, iconSize: 44, chipSize: 9)
            VStack(alignment: .leading, spacing: 3) {
                StageLine(entry: entry, size: 13)
                if let event = entry.event {
                    // The square is too narrow for a trailing time — own line.
                    Text(Fmt.range(event.startsAt, event.endsAt))
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.cream)
                        .lineLimit(1).minimumScaleFactor(0.6)
                }
                if let artist = entry.event?.artist {
                    Text(artist)
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(Theme.creamDim)
                        .lineLimit(1).minimumScaleFactor(0.7)
                        .padding(.top, 2)
                }
                Text(entry.actText)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(entry.event == nil ? Theme.creamDim : Theme.cream)
                    .lineLimit(3).minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
    }
}

// MARK: - Medium (4×2) — the watch layout with room to breathe

private struct NowMediumView: View {
    let entry: NowEntry

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            CardOrnaments(entry: entry, iconSize: 54, chipSize: 10)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 5) {
                    StageLine(entry: entry, size: 14)
                    Spacer(minLength: 4)
                    if let event = entry.event {
                        Text(Fmt.range(event.startsAt, event.endsAt))
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(Theme.cream)
                            .lineLimit(1).minimumScaleFactor(0.6)
                    }
                }
                if let artist = entry.event?.artist {
                    Text(artist)
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(Theme.creamDim)
                        .lineLimit(1).minimumScaleFactor(0.7)
                        .padding(.top, 2)
                }
                Text(entry.actText)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(entry.event == nil ? Theme.creamDim : Theme.cream)
                    .lineLimit(2).minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
    }
}

// MARK: - Large (4×4) — the Now view's stage card: on air + up next

private struct NowLargeView: View {
    let entry: NowEntry

    var body: some View {
        if let stage = entry.stage {
            ZStack(alignment: .bottomLeading) {
                // Kind-icon watermark fills the spare space under the two rows,
                // like the compact families' background ornament.
                if let event = entry.event {
                    KindIcon(event.kind, size: 64, color: entry.accentColor)
                        .opacity(0.22)
                        .widgetAccentable()
                }
                VStack(alignment: .leading, spacing: 12) {
                    header(stage)
                    if entry.isLive, let live = entry.event {
                        liveRow(live)
                        if let next = entry.next {
                            Divider().overlay(Theme.line)
                            upcomingRow(next, eyebrow: true, dim: false)
                        }
                    } else if let first = entry.event {
                        // Between acts: the next two, the nearer one brighter.
                        upcomingRow(first, eyebrow: true, dim: false)
                        if let second = entry.next {
                            Divider().overlay(Theme.line)
                            upcomingRow(second, eyebrow: false, dim: true)
                        }
                    } else {
                        Text(L.t("now.nothing", entry.locale))
                            .font(.subheadline).foregroundStyle(Theme.creamFaint)
                            .padding(.horizontal, 2)
                    }
                    Spacer(minLength: 0)
                }
            }
        } else {
            VStack {
                Spacer()
                Text(L.t("common.loading", entry.locale)).foregroundStyle(Theme.creamFaint)
                Spacer()
            }
            .frame(maxWidth: .infinity)
        }
    }

    /// Stage-color gradient band with the name — StageNowCard's header, rounded
    /// to live inside the widget's content margins.
    private func header(_ stage: StageDTO) -> some View {
        let color = Color(hex: stage.color)
        return HStack(spacing: 8) {
            if entry.isLive { WidgetLiveDot(size: 9) }
            Text(stage.name).font(.title3.bold()).foregroundStyle(Theme.cream)
                .lineLimit(1).minimumScaleFactor(0.7)
            Spacer()
            if entry.isLive, let live = entry.event {
                KindIcon(live.kind, size: 18, color: Theme.cream.opacity(0.9))
            }
        }
        .padding(.horizontal, 13).padding(.vertical, 9)
        .background(LinearGradient(colors: [color, color.opacity(0.73)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    /// The act on air: artist + title, with a self-updating countdown to its
    /// end on the trailing side (Text(timerInterval:) keeps ticking without
    /// timeline entries — the entry at the act's end swaps the content).
    private func liveRow(_ e: EventDTO) -> some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                if let artist = e.artist {
                    Text(artist).font(.subheadline.weight(.medium)).foregroundStyle(Theme.creamDim)
                        .lineLimit(1).minimumScaleFactor(0.7)
                }
                Text(e.title.text(entry.locale)).font(.title3.bold()).foregroundStyle(Theme.cream)
                    .lineLimit(2).minimumScaleFactor(0.6)
            }
            Spacer(minLength: 8)
            if let end = e.endsAt, end > entry.date {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(timerInterval: entry.date...end, countsDown: true)
                        .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                        .foregroundStyle(Theme.sun)
                        .multilineTextAlignment(.trailing)
                    Text("\(L.t("now.until", entry.locale)) \(Fmt.hhmm(end))")
                        .font(.caption).foregroundStyle(Theme.creamDim)
                }
            }
        }
        .padding(.horizontal, 2)
    }

    private func upcomingRow(_ e: EventDTO, eyebrow: Bool, dim: Bool) -> some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                if eyebrow {
                    Text(L.t("now.upNext", entry.locale).uppercased())
                        .font(.system(size: 9, weight: .semibold)).tracking(2)
                        .foregroundStyle(Theme.creamFaint)
                }
                if let artist = e.artist {
                    Text(artist).font(.subheadline.weight(.medium))
                        .foregroundStyle(dim ? Theme.creamFaint : Theme.creamDim)
                        .lineLimit(1).minimumScaleFactor(0.7)
                }
                Text(e.title.text(entry.locale)).font(.headline)
                    .foregroundStyle(dim ? Theme.creamDim : Theme.cream)
                    .lineLimit(2).minimumScaleFactor(0.7)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 3) {
                Text(Fmt.hhmm(e.startsAt))
                    .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                    .foregroundStyle(entry.accentColor)
                // Bare HH:mm would mislead across midnight — date it when the
                // act is on a later festival day than the entry.
                if e.day != Fmt.festivalDay(entry.date) {
                    Text(Fmt.mmdd(e.day))
                        .font(.caption2).foregroundStyle(Theme.creamFaint)
                }
                KindIcon(e.kind, size: 14, color: entry.accentColor)
            }
        }
        .padding(.horizontal, 2)
    }
}
