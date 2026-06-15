import SwiftUI
import WatchKit

/// One stage at a time. Vertical swipe = previous/next act on this stage,
/// horizontal swipe = switch stage keeping the same point in time.
struct WatchRootView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings

    @State private var stageIndex = 0
    @State private var eventIndex = 0
    @State private var didInit = false
    @State private var showSettings = false
    @State private var now = Date()

    private let tick = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    private var stages: [StageDTO] { settings.orderedVisible(store.data?.stages ?? []) }
    /// `stageIndex` clamped into the current visible range — used everywhere so
    /// the card and the dots always agree (e.g. after hiding the active stage).
    private var currentIndex: Int { stages.isEmpty ? 0 : min(max(stageIndex, 0), stages.count - 1) }
    private var stage: StageDTO? { stages.indices.contains(currentIndex) ? stages[currentIndex] : nil }
    private var stageEvents: [EventDTO] { stage.map { store.events(forStage: $0.slug) } ?? [] }
    private var event: EventDTO? {
        let e = stageEvents
        guard !e.isEmpty else { return nil }
        return e[min(max(eventIndex, 0), e.count - 1)]
    }

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
        .onReceive(tick) { now = $0 }
        .onChange(of: store.data?.events.count ?? 0) { _, _ in initIfNeeded() }
        .onAppear { initIfNeeded() }
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
            Text(stage.name.uppercased())
                .font(.system(size: 17, weight: .heavy, design: .rounded))
                .foregroundStyle(Color(hex: stage.accent))
                .lineLimit(1).minimumScaleFactor(0.7)

            if let event {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(Fmt.mmdd(event.day)) · \(Fmt.weekday(event.day, settings.locale))")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.creamDim)
                    HStack(spacing: 4) {
                        Text(Fmt.range(event.startsAt, event.endsAt))
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Theme.cream)
                        Spacer(minLength: 2)
                        Image(systemName: kindSymbol(event.kind))
                            .font(.system(size: 17))
                            .foregroundStyle(Color(hex: stage.accent))
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
            if let event, event.kind == EventKind.workshop {
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

    private func step(_ delta: Int) {
        let count = stageEvents.count
        guard count > 0 else { return }
        eventIndex = min(max(eventIndex + delta, 0), count - 1)
    }

    private func switchStage(_ delta: Int) {
        guard !stages.isEmpty else { return }
        let anchor = event?.startsAt
        stageIndex = (currentIndex + delta + stages.count) % stages.count
        let evs = stageEvents
        if let anchor { eventIndex = indexForTime(anchor, in: evs) }
        else { eventIndex = defaultIndex(in: evs) }
    }

    private func indexForTime(_ t: Date, in evs: [EventDTO]) -> Int {
        // The act starting at t, or the next one after it — NEVER an act that
        // started earlier (even if it's still running), so switching stages
        // never jumps back to an earlier programme.
        if let i = evs.firstIndex(where: { $0.startsAt >= t }) { return i }
        // Nothing on or after t on this stage → its last act (no forward option).
        return max(evs.count - 1, 0)
    }

    private func defaultIndex(in evs: [EventDTO]) -> Int {
        if let i = evs.firstIndex(where: { $0.isLive(at: now) }) { return i }
        if let i = evs.firstIndex(where: { $0.startsAt > now }) { return i }
        return 0
    }

    private func initIfNeeded() {
        guard !didInit, !stages.isEmpty else { return }
        didInit = true
        if let def = stages.firstIndex(where: { $0.isDefault }) { stageIndex = def }
        eventIndex = defaultIndex(in: stageEvents)
    }
}
