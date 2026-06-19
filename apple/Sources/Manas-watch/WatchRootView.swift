import SwiftUI
import WatchKit

/// One stage at a time. Vertical swipe = previous/next act on this stage,
/// horizontal swipe = switch stage keeping the same point in time.
struct WatchRootView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var location: LocationStore
    @Environment(\.scenePhase) private var scenePhase

    @State private var stageIndex = 0
    @State private var eventIndex = 0
    @State private var didInit = false
    @State private var showSettings = false
    @State private var now = Fmt.now
    /// Fixed time the left/right navigation pivots around. Only a vertical
    /// swipe (or init) moves it; horizontal switches keep it, so going back and
    /// forth between stages never drifts off the time you were looking at.
    @State private var anchorTime: Date?
    /// The current stage has no act within `nearWindow` of the anchor.
    @State private var noProgramAtAnchor = false

    private let tick = Timer.publish(every: 30, on: .main, in: .common).autoconnect()
    /// How close an act must be to the anchor to count as "around this time"
    /// (covers short breaks); beyond it we show "nothing on" instead of an act
    /// that ended hours ago or jumping far ahead.
    private let nearWindow: TimeInterval = 3600

    private var stages: [StageDTO] { settings.orderedVisible(store.data?.stages ?? []) }
    /// `stageIndex` clamped into the current visible range — used everywhere so
    /// the card and the dots always agree (e.g. after hiding the active stage).
    private var currentIndex: Int { stages.isEmpty ? 0 : min(max(stageIndex, 0), stages.count - 1) }
    private var stage: StageDTO? { stages.indices.contains(currentIndex) ? stages[currentIndex] : nil }
    private var stageEvents: [EventDTO] { stage.map { store.events(forStage: $0.slug) } ?? [] }
    /// Focused act on the current stage (ignores the no-programme flag).
    private var currentEvent: EventDTO? {
        let e = stageEvents
        guard !e.isEmpty else { return nil }
        return e[min(max(eventIndex, 0), e.count - 1)]
    }
    /// What the card shows — nil when this stage has nothing near the anchor.
    private var displayedEvent: EventDTO? { noProgramAtAnchor ? nil : currentEvent }

    var body: some View {
        ZStack {
            if let stage {
                card(stage)
            } else {
                Text(L.t(store.isLoading ? "common.loading" : "common.error", settings.locale))
                    .foregroundStyle(Theme.creamFaint)
            }
            // Settings gear (top-trailing)
            VStack {
                HStack {
                    Spacer()
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape.fill").font(.system(size: 13))
                            .foregroundStyle(Theme.cream.opacity(0.8))
                            .padding(6).background(.black.opacity(0.35), in: Circle())
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
            .padding(.top, 2)
        }
        .background(bg.gradient)
        .gesture(swipe)
        .sheet(isPresented: $showSettings) { WatchSettingsView() }
        .onReceive(tick) { _ in now = Fmt.now }
        .onChange(of: store.data?.events.count ?? 0) { _, _ in initIfNeeded() }
        .onAppear { initIfNeeded(); location.refresh(stages: stages) }
        // Changing the debug time, or returning to the foreground, re-centres on
        // "now" so the live act and its dot are correct immediately.
        .onChange(of: settings.debugNow) { _, _ in now = Fmt.now; resetToNow() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { now = Fmt.now; resetToNow(); location.refresh(stages: stages) }
        }
        // Nearest stage (within 150 m) becomes the selected stage.
        .onChange(of: location.nearestSlug) { _, _ in resetToNow() }
        .onChange(of: settings.debugCoord) { _, _ in location.refresh(stages: stages) }
    }

    private var bg: Color {
        guard let stage else { return Theme.ink }
        return Color(hex: stage.color).opacity(0.55)
    }

    // MARK: Card

    @ViewBuilder
    private func card(_ stage: StageDTO) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            // ── Fixed top block: stage / date / time / icon never move ──
            HStack(spacing: 4) {
                Text(stage.name.uppercased())
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color(hex: stage.accent))
                    .lineLimit(1).minimumScaleFactor(0.7)
                if location.nearestSlug == stage.slug {
                    Image(systemName: "location.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(hex: stage.accent))
                }
            }

            if noProgramAtAnchor, let t = anchorTime {
                let day = Fmt.festivalDay(t)
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(Fmt.mmdd(day)) · \(Fmt.weekday(day, settings.locale))")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.creamDim)
                    Text(Fmt.hhmm(t))
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Theme.cream)
                        .frame(height: 20)
                }
                Text(L.t("watch.noProgram", settings.locale))
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.creamDim)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            } else if let event = displayedEvent {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 5) {
                        Text("\(Fmt.mmdd(event.day)) · \(Fmt.weekday(event.day, settings.locale))")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Theme.creamDim)
                        // Glowing "live" dot — same red as the iOS now line —
                        // when this act is the one on right now.
                        if event.isLive(at: now) {
                            Circle().fill(Theme.now).frame(width: 8, height: 8)
                                .shadow(color: Theme.now, radius: 4)
                        }
                    }
                    HStack(spacing: 4) {
                        Text(Fmt.range(event.startsAt, event.endsAt))
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Theme.cream)
                        Spacer(minLength: 2)
                        // Live act → the kind icon pulses red (like the iOS now line).
                        let live = event.isLive(at: now)
                        Image(systemName: kindSymbol(event.kind))
                            .font(.system(size: 17))
                            .foregroundStyle(live ? Theme.now : Color(hex: stage.accent))
                            .symbolEffect(.pulse, options: .repeating, isActive: live)
                            .shadow(color: live ? Theme.now : .clear, radius: 4)
                            .frame(width: 24, height: 20)   // fixed box → icon size never shifts the row
                    }
                    .frame(height: 20)
                }
                // ── Act name: fills the remaining space and shrinks to fit it,
                //    so it never pushes the block above. ──
                Text(event.title.text(settings.locale))
                    .font(.system(size: 21, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(6).minimumScaleFactor(0.35)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            } else {
                Text(L.t("watch.noEvents", settings.locale))
                    .font(.footnote).foregroundStyle(Theme.creamDim)
                Spacer(minLength: 0)
            }
            stageDots
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.horizontal, 4)
        .overlay(alignment: .bottomTrailing) {
            if let event = displayedEvent, event.kind == EventKind.workshop {
                let chip = Theme.chip(event.langAvailability)
                Text(chip.label).font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 7).padding(.vertical, 3)
                    .background(chip.bg, in: Capsule()).foregroundStyle(chip.fg)
                    .padding(.trailing, 2).padding(.bottom, 16)
            }
        }
    }

    private var stageDots: some View {
        HStack(spacing: 4) {
            ForEach(stages.indices, id: \.self) { i in
                Circle()
                    .fill(i == currentIndex ? Theme.sun : Theme.creamFaint.opacity(0.5))
                    .frame(width: 5, height: 5)
            }
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    // MARK: Gestures

    private var swipe: some Gesture {
        DragGesture(minimumDistance: 18)
            .onEnded { v in
                let dx = v.translation.width, dy = v.translation.height
                if abs(dx) > abs(dy) {
                    switchStage(dx < 0 ? 1 : -1)   // swipe left → next stage
                } else {
                    step(dy < 0 ? 1 : -1)          // swipe up → next act
                }
                WKInterfaceDevice.current().play(.click)
            }
    }

    /// Vertical swipe: move along this stage's timeline (or reveal the nearest
    /// act if we were showing "nothing on"), then make the shown act the new
    /// anchor for subsequent left/right switches.
    private func step(_ delta: Int) {
        guard !stageEvents.isEmpty else { return }
        if noProgramAtAnchor {
            noProgramAtAnchor = false        // first swipe reveals the nearest act
        } else {
            eventIndex = min(max(eventIndex + delta, 0), stageEvents.count - 1)
        }
        anchorTime = currentEvent?.startsAt
    }

    /// Horizontal swipe: keep the anchor fixed and show that stage's act for the
    /// anchor — so switching back and forth never drifts. We only ever look
    /// forward from the anchor (the act on at it, or the next one within
    /// `nearWindow`); an act that already ended before the anchor is never shown
    /// — it's "nothing on". (When browsing the past, the anchor itself is a past
    /// time, so the act that was on then still counts as "on at" it.)
    private func switchStage(_ delta: Int) {
        guard !stages.isEmpty else { return }
        stageIndex = (currentIndex + delta + stages.count) % stages.count
        let evs = stageEvents
        guard let t = anchorTime else {
            eventIndex = defaultIndex(in: evs)
            noProgramAtAnchor = false
            return
        }
        let r = programIndex(at: t, in: evs)
        eventIndex = r.index
        noProgramAtAnchor = !r.onProgram
    }

    /// The act to show for time `t`: the one on at `t`, else the next one
    /// starting within `nearWindow`. Never an act that already ended before `t`.
    /// Returns a fallback index (for vertical entry) with onProgram == false
    /// when nothing qualifies.
    private func programIndex(at t: Date, in evs: [EventDTO]) -> (index: Int, onProgram: Bool) {
        guard !evs.isEmpty else { return (0, false) }
        if let i = evs.firstIndex(where: { $0.startsAt <= t && t < ($0.endsAt ?? $0.startsAt) }) {
            return (i, true)
        }
        if let i = evs.firstIndex(where: { $0.startsAt >= t }) {
            return (i, evs[i].startsAt.timeIntervalSince(t) <= nearWindow)
        }
        return (evs.count - 1, false)   // everything is in the past → nothing on
    }

    private func defaultIndex(in evs: [EventDTO]) -> Int {
        if let i = evs.firstIndex(where: { $0.isLive(at: now) }) { return i }
        if let i = evs.firstIndex(where: { $0.startsAt > now }) { return i }
        return 0
    }

    private func initIfNeeded() {
        guard !didInit, !stages.isEmpty else { return }
        didInit = true
        resetToNow()
    }

    /// Centre on "now": default stage, its live act (or next), anchored so
    /// switching shows only what's on now.
    private func resetToNow() {
        guard !stages.isEmpty else { return }
        // Nearest stage (within 150 m) wins; otherwise the default stage.
        if let slug = location.nearestSlug, let i = stages.firstIndex(where: { $0.slug == slug }) {
            stageIndex = i
        } else if let def = stages.firstIndex(where: { $0.isDefault }) {
            stageIndex = def
        }
        eventIndex = defaultIndex(in: stageEvents)
        // Live → anchor on "now" (so switching shows only what's on now, never a
        // finished act); otherwise anchor on the shown (upcoming) act's start.
        anchorTime = currentEvent.map { $0.isLive(at: now) ? now : $0.startsAt } ?? now
        noProgramAtAnchor = false
    }
}
