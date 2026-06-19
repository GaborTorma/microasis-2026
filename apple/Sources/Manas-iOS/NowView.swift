import SwiftUI

struct NowView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
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
                                             now: now, locale: settings.locale)
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
    }
}

private struct StageNowCard: View {
    let stage: StageDTO
    let events: [EventDTO]
    let now: Date
    let locale: AppLocale

    var body: some View {
        let live = events.first { $0.isLive(at: now) }
        let next = events.first { $0.startsAt > now }
        let color = Color(hex: stage.color)
        let accent = Color(hex: stage.accent)

        VStack(spacing: 0) {
            HStack {
                Text(stage.name).font(.title3.bold()).foregroundStyle(Theme.cream)
                Spacer()
                if live != nil {
                    Text(L.t("now.live", locale).uppercased())
                        .font(.system(size: 10, weight: .bold)).tracking(1)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Theme.sun, in: Capsule()).foregroundStyle(Theme.ink)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(LinearGradient(colors: [color, color.opacity(0.73)],
                                       startPoint: .topLeading, endPoint: .bottomTrailing))

            VStack(alignment: .leading, spacing: 6) {
                if let live {
                    Text(L.t("now.playingNow", locale).uppercased())
                        .font(.system(size: 10, weight: .semibold)).tracking(2)
                        .foregroundStyle(Theme.creamFaint)
                    Text(live.title.text(locale)).font(.title2.bold()).foregroundStyle(Theme.cream)
                    if let end = live.endsAt {
                        Text("\(L.t("now.until", locale)) \(Fmt.hhmm(end))")
                            .font(.caption).foregroundStyle(Theme.creamDim)
                    }
                } else {
                    Text(L.t("now.nothing", locale)).font(.subheadline).foregroundStyle(Theme.creamFaint)
                }
                if let next {
                    Divider().overlay(Theme.line).padding(.vertical, 2)
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(L.t("now.upNext", locale).uppercased())
                                .font(.system(size: 9, weight: .semibold)).tracking(2)
                                .foregroundStyle(Theme.creamFaint)
                            Text(next.title.text(locale)).font(.headline).foregroundStyle(Theme.creamDim)
                        }
                        Spacer()
                        Text(Fmt.hhmm(next.startsAt))
                            .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                            .foregroundStyle(accent)
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
