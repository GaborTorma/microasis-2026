import SwiftUI

struct NowView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var location: LocationStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var now = Fmt.now
    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        Group {
            if let data = store.data {
                let start = data.festival.startsAt, end = data.festival.endsAt
                let opening = data.openingCeremony
                if now < start {
                    Countdown(until: start, now: now)
                } else if let opening, now < opening.startsAt {
                    // Opening day: camp scene from the festival start (12:00) until
                    // the Mandala opening ceremony (18:30) takes over the grid.
                    TentScene(data: data, openingStart: opening.startsAt,
                              now: now, locale: settings.locale,
                              nearestSlug: location.nearestSlug)
                } else if now >= Grounding.start, now < Grounding.end {
                    // Post-festival GROUNDING window overrides the grid and "ended".
                    GroundingView(locale: settings.locale)
                } else if now >= end {
                    EndedView(locale: settings.locale)
                } else {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(liveFirst(data)) { stage in
                                StageNowCard(stage: stage,
                                             events: store.events(forStage: stage.slug),
                                             now: now, locale: settings.locale,
                                             near: location.nearestSlug == stage.slug)
                            }
                        }
                        .padding(12)
                    }
                }
            } else {
                VStack { Spacer()
                    Text(L.t(store.isLoading ? "common.loading" : "common.error", settings.locale))
                        .foregroundStyle(Theme.creamFaint)
                    Spacer() }
            }
        }
        .onReceive(tick) { _ in now = Fmt.now }
        .onChange(of: settings.debugNow) { _, _ in now = Fmt.now }
        // Resolve the nearest stage while in the Now view too (the Timetable
        // view isn't necessarily visited first), so the "you are here" pin and
        // the pulsing event icon show when standing at a stage.
        .onAppear { refreshNearest() }
        .onChange(of: store.data?.stages.count ?? 0) { _, _ in refreshNearest() }
        .onChange(of: settings.debugCoord) { _, _ in refreshNearest() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { refreshNearest() } }
    }

    private func refreshNearest() {
        if let stages = store.data?.stages { location.refresh(stages: stages) }
    }

    /// Stages with something playing right now float to the top; idle stages
    /// sink to the bottom (order preserved within each group).
    private func liveFirst(_ data: ScheduleData) -> [StageDTO] {
        let stages = settings.orderedVisible(data.stages)
        func live(_ s: StageDTO) -> Bool {
            data.events.contains { $0.stageSlug == s.slug && $0.isPlayable && $0.isLive(at: now) }
        }
        return stages.filter(live) + stages.filter { !live($0) }
    }
}

// MARK: - Opening-day camp scene

private struct OpeningRow: Identifiable {
    let event: EventDTO
    let live: Bool
    var id: Int { event.id }
}

private struct OpeningCard: Identifiable {
    let stage: StageDTO
    let rows: [OpeningRow]
    var id: Int { stage.id }
}

private struct TentScene: View {
    let data: ScheduleData
    let openingStart: Date
    let now: Date
    let locale: AppLocale
    let nearestSlug: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                TentArt().frame(width: 220, height: 150)
                VStack(spacing: 8) {
                    Text(L.t("now.tent.title", locale))
                        .font(.title.bold()).foregroundStyle(Theme.cream)
                    Text(L.t("now.tent.body", locale))
                        .font(.subheadline).foregroundStyle(Theme.creamDim)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: 300)
                }
                ForEach(cards()) { card in
                    OpeningStageCard(card: card, near: nearestSlug == card.stage.slug,
                                     now: now, locale: locale)
                }
            }
            .padding(.horizontal, 24).padding(.vertical, 32)
            .frame(maxWidth: .infinity)
        }
    }

    /// Bowl (live set only, or the first set as "up next" before it begins) and
    /// Mandala (the opening ceremony + the ritual before it, dropped once ended).
    private func cards() -> [OpeningCard] {
        var out: [OpeningCard] = []

        if let bowl = data.stages.first(where: { $0.slug == "bowl" }) {
            let sets = data.events
                .filter { $0.stageSlug == "bowl" && $0.isPlayable }
                .sorted { $0.startsAt < $1.startsAt }
            if let live = sets.first(where: { $0.isLive(at: now) }) {
                out.append(OpeningCard(stage: bowl, rows: [OpeningRow(event: live, live: true)]))
            } else if let first = sets.first, first.startsAt > now {
                out.append(OpeningCard(stage: bowl, rows: [OpeningRow(event: first, live: false)]))
            }
        }

        if let mandala = data.stages.first(where: { $0.slug == "mandala" }) {
            let rows = data.events
                .filter { $0.stageSlug == "mandala"
                    && $0.startsAt <= openingStart
                    && ($0.endsAt ?? $0.startsAt) > now }
                .sorted { $0.startsAt < $1.startsAt }
                .suffix(2)
                .map { OpeningRow(event: $0, live: $0.isLive(at: now)) }
            if !rows.isEmpty {
                out.append(OpeningCard(stage: mandala, rows: rows))
            }
        }
        return out
    }
}

private struct OpeningStageCard: View {
    let card: OpeningCard
    var near: Bool = false
    let now: Date
    let locale: AppLocale

    var body: some View {
        let stage = card.stage
        let color = Color(hex: stage.color)
        let accent = Color(hex: stage.accent)
        let hasLive = card.rows.contains { $0.live }
        let headerKind = card.rows.first?.event.kind ?? EventKind.music

        VStack(spacing: 0) {
            HStack(spacing: 8) {
                if hasLive { LiveDot(locale: locale) }
                Text(stage.name).font(.title3.bold()).foregroundStyle(Theme.cream)
                if near {
                    Image(systemName: "location.fill")
                        .font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.cream)
                }
                Spacer()
                KindIcon(headerKind, size: 18, color: Theme.cream.opacity(0.9))
                    .shadow(color: near ? Theme.cream : .clear, radius: near ? 4 : 0)
            }
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(LinearGradient(colors: [color, color.opacity(0.73)],
                                       startPoint: .topLeading, endPoint: .bottomTrailing))

            ForEach(Array(card.rows.enumerated()), id: \.element.id) { idx, row in
                if idx > 0 { Divider().overlay(Theme.line).padding(.leading, 14) }
                OpeningRowView(row: row, accent: accent, now: now, locale: locale)
            }
        }
        .background(Theme.ink2.opacity(0.85))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.line, lineWidth: 1))
        .frame(maxWidth: 360)
    }
}

private struct OpeningRowView: View {
    @EnvironmentObject var favorites: FavoritesStore
    let row: OpeningRow
    let accent: Color
    let now: Date
    let locale: AppLocale

    var body: some View {
        let e = row.event
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                if !row.live {
                    Text(L.t("now.upNext", locale).uppercased())
                        .font(.system(size: 9, weight: .semibold)).tracking(2)
                        .foregroundStyle(Theme.creamFaint)
                }
                if let artist = e.artist {
                    Text(artist).font(.subheadline.weight(.medium)).foregroundStyle(Theme.creamDim)
                        .lineLimit(1).minimumScaleFactor(0.7)
                }
                favTitle(e.slug, Text(e.title.text(locale)).font(.headline).foregroundStyle(Theme.cream),
                         heartSize: 11, favorites)
                    .lineLimit(2).minimumScaleFactor(0.7)
            }
            Spacer(minLength: 8)
            if row.live, let end = e.endsAt {
                // Live: countdown to the end (sun) + the "until" clock.
                VStack(alignment: .trailing, spacing: 2) {
                    Text(remaining(end, now))
                        .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                        .foregroundStyle(Theme.sun)
                    Text("\(L.t("now.until", locale)) \(Fmt.hhmm(end))")
                        .font(.caption).foregroundStyle(Theme.creamDim)
                }
                .fixedSize()
            } else {
                // Upcoming: just the start time, like the normal now grid.
                Text(Fmt.hhmm(e.startsAt))
                    .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                    .foregroundStyle(accent)
                    .fixedSize()
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Post-festival GROUNDING link

private struct GroundingView: View {
    let locale: AppLocale

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)
            VStack(spacing: 0) {
                HStack(spacing: 6) {
                    Image(systemName: "water.waves").font(.system(size: 14, weight: .semibold))
                    Text(L.t("now.grounding.eyebrow", locale).uppercased())
                        .font(.system(size: 11, weight: .semibold)).tracking(3)
                }
                .foregroundStyle(Theme.teal)

                Text(L.t("now.grounding.title", locale))
                    .font(.system(.largeTitle, design: .rounded).weight(.heavy))
                    .foregroundStyle(Theme.cream).padding(.top, 12)

                Text(L.t("now.grounding.when", locale))
                    .font(.subheadline.weight(.medium)).foregroundStyle(Theme.creamDim)
                    .padding(.top, 8)

                Text(L.t("now.grounding.body", locale))
                    .font(.callout).foregroundStyle(Theme.creamDim)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 20)

                Link(destination: Grounding.url) {
                    HStack(spacing: 8) {
                        Text(L.t("now.grounding.cta", locale)).font(.subheadline.bold())
                        Image(systemName: "arrow.up.right").font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 24).padding(.vertical, 14)
                    .background(Theme.sun, in: Capsule())
                }
                .padding(.top, 28)

                Text("grounding.manasfestival.eu")
                    .font(.caption).foregroundStyle(Theme.creamFaint).padding(.top, 12)
            }
            .padding(.horizontal, 28)
            .frame(maxWidth: 420)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Ended

private struct EndedView: View {
    let locale: AppLocale

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            HStack(spacing: 6) {
                Image(systemName: "sunset.fill").font(.system(size: 14, weight: .semibold))
                Text(L.t("now.endedEyebrow", locale).uppercased())
                    .font(.system(size: 11, weight: .semibold)).tracking(3)
            }
            .foregroundStyle(Theme.sun.opacity(0.75))
            Text(L.t("now.ended", locale))
                .font(.title2.bold()).foregroundStyle(Theme.sun).padding(.top, 12)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Live indicator

/// Pulsing red dot marking a stage that has something on right now (static
/// under Reduce Motion). Mirrors the web `.pulse-dot`.
private struct LiveDot: View {
    let locale: AppLocale
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var on = false
    private var still: Bool { reduceMotion || AppEnv.hideTestUI }

    var body: some View {
        Circle().fill(Theme.now).frame(width: 9, height: 9)
            .opacity(still ? 1 : (on ? 0.45 : 1))
            .scaleEffect(still ? 1 : (on ? 0.8 : 1))
            .animation(still ? nil : .easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: on)
            .onAppear { if !still { on = true } }
            .accessibilityLabel(L.t("now.playingNow", locale))
    }
}

// MARK: - Normal grid card

private struct StageNowCard: View {
    @EnvironmentObject var favorites: FavoritesStore
    let stage: StageDTO
    let events: [EventDTO]
    let now: Date
    let locale: AppLocale
    var near: Bool = false

    var body: some View {
        let live = events.first { $0.isLive(at: now) }
        let next = events.first { $0.startsAt > now }
        let color = Color(hex: stage.color)
        let accent = Color(hex: stage.accent)
        // The whole view is "now", so only show what's next when it's soon.
        let showNext = (next?.startsAt.timeIntervalSince(now) ?? .infinity) <= 6 * 3600

        VStack(spacing: 0) {
            // Stage header — a pulsing red dot precedes the name when something's on.
            HStack(spacing: 6) {
                if live != nil { LiveDot(locale: locale) }
                Text(stage.name).font(.title3.bold()).foregroundStyle(Theme.cream)
                if near {
                    Image(systemName: "location.fill")
                        .font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.cream)
                }
                Spacer()
                if let live {
                    KindIcon(live.kind, size: 18, color: Theme.cream.opacity(0.9))
                        .shadow(color: near ? Theme.cream : .clear, radius: near ? 4 : 0)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(LinearGradient(colors: [color, color.opacity(0.73)],
                                       startPoint: .topLeading, endPoint: .bottomTrailing))

            VStack(alignment: .leading, spacing: 6) {
                if let live {
                    HStack(alignment: .top, spacing: 8) {
                        VStack(alignment: .leading, spacing: 2) {
                            if let artist = live.artist {
                                Text(artist).font(.subheadline.weight(.medium)).foregroundStyle(Theme.creamDim)
                                    .lineLimit(1).minimumScaleFactor(0.7)
                            }
                            favTitle(live.slug, Text(live.title.text(locale)).font(.title3.bold()).foregroundStyle(Theme.cream),
                                     heartSize: 13, favorites)
                                .lineLimit(2).minimumScaleFactor(0.6)
                        }
                        Spacer(minLength: 8)
                        if let end = live.endsAt {
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(remaining(end, now))   // counts down to the end
                                    .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                                    .foregroundStyle(Theme.sun)
                                Text("\(L.t("now.until", locale)) \(Fmt.hhmm(end))")
                                    .font(.caption).foregroundStyle(Theme.creamDim)
                            }
                            .fixedSize()
                        }
                    }
                } else {
                    Text(L.t("now.nothing", locale)).font(.subheadline).foregroundStyle(Theme.creamFaint)
                }
                if let next, showNext {
                    Divider().overlay(Theme.line).padding(.top, 8).padding(.bottom, 10)
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(L.t("now.upNext", locale).uppercased())
                                .font(.system(size: 9, weight: .semibold)).tracking(2)
                                .foregroundStyle(Theme.creamFaint)
                            if let artist = next.artist {
                                Text(artist).font(.subheadline.weight(.medium)).foregroundStyle(Theme.creamFaint)
                                    .lineLimit(1).minimumScaleFactor(0.7)
                            }
                            favTitle(next.slug, Text(next.title.text(locale)).font(.headline).foregroundStyle(Theme.creamDim),
                                     heartSize: 11, favorites)
                                .lineLimit(2).minimumScaleFactor(0.7)
                        }
                        Spacer(minLength: 8)
                        VStack(alignment: .trailing, spacing: 3) {
                            Text(Fmt.hhmm(next.startsAt))
                                .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                                .foregroundStyle(accent)
                            KindIcon(next.kind, size: 14, color: accent)
                        }
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Theme.ink2.opacity(0.85))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.line, lineWidth: 1))
    }
}

private struct Countdown: View {
    let until: Date
    let now: Date
    @EnvironmentObject var settings: Settings

    var body: some View {
        let total = max(0, Int(until.timeIntervalSince(now)))
        let cells: [(Int, String)] = [
            (total / 86400, L.t("time.days", settings.locale)),
            (total % 86400 / 3600, L.t("time.hours", settings.locale)),
            (total % 3600 / 60, L.t("time.minutes", settings.locale)),
            (total % 60, L.t("time.seconds", settings.locale)),
        ]
        VStack(spacing: 24) {
            Text(L.t("now.countdown", settings.locale).uppercased())
                .font(.system(size: 12, weight: .semibold)).tracking(4)
                .foregroundStyle(Theme.sun.opacity(0.8))
            HStack(spacing: 10) {
                ForEach(cells, id: \.1) { value, label in
                    VStack(spacing: 4) {
                        Text(String(format: "%02d", value))
                            .font(.system(size: 30, weight: .heavy, design: .rounded))
                            .foregroundStyle(Theme.cream)
                        Text(label.uppercased()).font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Theme.creamFaint)
                    }
                    .frame(width: 70).padding(.vertical, 14)
                    .background(Theme.ink2.opacity(0.85), in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.line))
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Time left until `target`, "H:MM:SS" (or "M:SS" under an hour).
private func remaining(_ target: Date, _ now: Date) -> String {
    let s = max(0, Int(target.timeIntervalSince(now)))
    let h = s / 3600, m = (s % 3600) / 60, sec = s % 60
    return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
}

/// Prepends the always-red favorite heart to a title's text run (before the
/// first word, wrapping with the text — same as the timetable and the web).
private func favTitle(_ slug: String?, _ title: Text, heartSize: CGFloat,
                      _ favorites: FavoritesStore) -> Text {
    guard slug.map(favorites.isFavorite) == true else { return title }
    return Text("\(Image(systemName: "heart.fill")) ")
        .font(.system(size: heartSize, weight: .bold))
        .foregroundStyle(.red) + title
}
