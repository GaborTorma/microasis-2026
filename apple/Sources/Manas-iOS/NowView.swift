import SwiftUI

struct NowView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var location: LocationStore
    @State private var now = Fmt.now
    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        Group {
            if let data = store.data {
                let start = data.festival.startsAt, end = data.festival.endsAt
                if now < start {
                    Countdown(until: start, now: now)
                } else if now >= end {
                    VStack { Spacer()
                        Text(L.t("now.ended", settings.locale))
                            .font(.title2.bold()).foregroundStyle(Theme.sun)
                        Spacer() }
                } else {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(settings.orderedVisible(data.stages)) { stage in
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
    }
}

private struct StageNowCard: View {
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
            // Stage header — no "now" badge; the whole screen is the now view.
            HStack(spacing: 5) {
                Text(stage.name).font(.title3.bold()).foregroundStyle(Theme.cream)
                if near {
                    Image(systemName: "location.fill")
                        .font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.cream)
                }
                Spacer()
                if let live {
                    // On now AND standing at this stage → the icon pulses (own colour).
                    Image(systemName: kindSymbol(live.kind))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.cream.opacity(0.9))
                        .shadow(color: near ? Theme.cream : .clear, radius: near ? 4 : 0)
                        .symbolEffect(.pulse, options: .repeating, isActive: near)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(LinearGradient(colors: [color, color.opacity(0.73)],
                                       startPoint: .topLeading, endPoint: .bottomTrailing))

            VStack(alignment: .leading, spacing: 6) {
                if let live {
                    HStack(alignment: .top, spacing: 8) {
                        Text(live.title.text(locale)).font(.title2.bold()).foregroundStyle(Theme.cream)
                            .lineLimit(3).minimumScaleFactor(0.55)
                        Spacer(minLength: 8)
                        if let end = live.endsAt {
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(remaining(to: end))   // counts down to the end
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
                            Text(next.title.text(locale)).font(.headline).foregroundStyle(Theme.creamDim)
                                .lineLimit(2).minimumScaleFactor(0.7)
                        }
                        Spacer(minLength: 8)
                        VStack(alignment: .trailing, spacing: 3) {
                            Text(Fmt.hhmm(next.startsAt))
                                .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                                .foregroundStyle(accent)
                            Image(systemName: kindSymbol(next.kind))
                                .font(.system(size: 12)).foregroundStyle(accent)
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

    /// Time left until the act ends, "H:MM:SS" (or "M:SS" under an hour).
    private func remaining(to end: Date) -> String {
        let s = max(0, Int(end.timeIntervalSince(now)))
        let h = s / 3600, m = (s % 3600) / 60, sec = s % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
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
