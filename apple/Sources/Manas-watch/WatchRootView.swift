import SwiftUI
import WatchKit

/// One stage at a time. Vertical swipe = previous/next act on this stage,
/// horizontal swipe = switch stage keeping the same point in time.
struct WatchRootView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var location: LocationStore
    @EnvironmentObject var favorites: FavoritesStore
    @Environment(\.scenePhase) private var scenePhase

    @State private var stageIndex = 0
    @State private var eventIndex = 0
    @State private var didInit = false
    @State private var showSettings = false
    @State private var showShare = false
    @AppStorage("manas.disclaimerSeen") private var disclaimerSeen = false
    @State private var showDisclaimer = false
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
    /// Screenshot-only (DEBUG/TestFlight): force the empty "nothing on" card for
    /// a marketing capture, anchored on the debug clock — the geofence path
    /// (`resetToNow`) always lands on an act, so the empty state is otherwise
    /// only reachable by hand. Set `manas.startNoProgram`. No-op in App Store
    /// builds; doesn't affect normal browsing.
    private var screenshotEmpty: Bool {
        AppEnv.debugToolsEnabled && UserDefaults.standard.bool(forKey: "manas.startNoProgram")
    }
    /// True when the card shows the "nothing on" state (real, or forced for a shot).
    private var showsNoProgram: Bool { noProgramAtAnchor || screenshotEmpty }
    /// What the card shows — nil when this stage has nothing near the anchor.
    private var displayedEvent: EventDTO? { showsNoProgram ? nil : currentEvent }

    var body: some View {
        NavigationStack {
            ZStack {
                if let stage {
                    card(stage)
                } else {
                    Text(L.t(store.isLoading ? "common.loading" : "common.error", settings.locale))
                        .foregroundStyle(Theme.creamFaint)
                }
            }
            .background(bg.gradient)
            .gesture(swipe)
            // Swipes navigate; a plain tap is free, so it toggles the shown
            // act's favorite state (no-op on breaks / the "nothing on" card).
            .onTapGesture { toggleFavorite() }
            .accessibilityHint(displayedEvent.flatMap { e in
                e.slug.map { L.t(favorites.isFavorite($0) ? "fav.remove" : "fav.add", settings.locale) }
            } ?? "")
            // Settings (leading) + the share QR (trailing) live in the system bottom
            // bar, so they never overlap the card's stage dots or its workshop chip the
            // way a bottom-corner overlay would. One bottomBar item with an HStack +
            // Spacer splits them to the corners; a multi-item ToolbarItemGroup doesn't
            // honour Spacer on watchOS, so both would clump in the middle.
            .toolbar {
                ToolbarItem(placement: .bottomBar) {
                    HStack {
                        toolbarButton("gearshape.fill") { showSettings = true }
                        Spacer()
                        toolbarButton("qrcode") { showShare = true }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .sheet(isPresented: $showSettings) { WatchSettingsView() }
            .sheet(isPresented: $showShare) { WatchShareView().environmentObject(settings) }
            .sheet(isPresented: $showDisclaimer) {
                WatchDisclaimerSheet { disclaimerSeen = true; showDisclaimer = false }
                    .environmentObject(settings)
            }
            .onReceive(tick) { _ in now = Fmt.now }
            .onChange(of: store.data?.events.count ?? 0) { _, _ in initIfNeeded() }
            .onAppear {
                initIfNeeded(); location.refresh(stages: stages)
                // Screenshot-only (DEBUG/TestFlight): open the share sheet for a
                // marketing capture. Set `manas.startShare`. No-op in App Store builds.
                if AppEnv.debugToolsEnabled, UserDefaults.standard.bool(forKey: "manas.startShare") {
                    showShare = true
                } else if !disclaimerSeen {
                    showDisclaimer = true
                }
            }
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
    }

    private var bg: Color {
        guard let stage else { return Theme.ink }
        return Color(hex: stage.color).opacity(0.55)
    }

    /// A bottom-bar glyph button styled like the rest of the watch chrome. The
    /// system's default `.bottomBar` button fills a disc with its own tint and hides
    /// the symbol inside it, so we drop to `.plain` and draw the symbol on a faint
    /// dark disc ourselves — legible on any stage colour.
    private func toolbarButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 15))
                .foregroundStyle(Theme.cream.opacity(0.85))
                .frame(width: 30, height: 30)
                .background(.black.opacity(0.3), in: Circle())
        }
        .buttonStyle(.plain)
    }

    // MARK: Card

    @ViewBuilder
    private func card(_ stage: StageDTO) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            // ── Fixed top block: brand / stage / date / time / icon never move ──
            VStack(alignment: .leading, spacing: 1) {
                // Quiet wordmark so the watch screen says what it is on its own —
                // a stage name alone doesn't reveal whose schedule this is.
                Text(L.t("app.title", settings.locale).uppercased())
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .tracking(1)
                    .foregroundStyle(Theme.cream.opacity(0.5))
                    .lineLimit(1)
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
                    Spacer(minLength: 4)
                    // Language chip, top-right on the stage-name line (solid).
                    if let event = displayedEvent, event.langAvailability != nil {
                        let chip = Theme.chip(event.langAvailability)
                        Text(chip.label).font(.system(size: 11, weight: .bold))
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(chip.bg, in: Capsule()).foregroundStyle(chip.fg)
                    }
                }
            }

            if showsNoProgram, let t = (screenshotEmpty ? Fmt.now : anchorTime) {
                if store.data?.campSceneWindow?.contains(t) == true {
                    // Opening day, before the Mandala ceremony (Jul 8, 12:00–18:30):
                    // the camp is still being set up and this stage has nothing on,
                    // so pitch the tent instead of the empty "nothing on" card. The
                    // brand, stage name and stage dots stay; the tent fills the rest.
                    TentArt()
                        .aspectRatio(220.0 / 150.0, contentMode: .fit)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding(.vertical, 4)
                } else {
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
                }
            } else if let event = displayedEvent {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(Fmt.mmdd(event.day)) · \(Fmt.weekday(event.day, settings.locale))")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Theme.creamDim)
                    HStack(spacing: 4) {
                        Text(Fmt.range(event.startsAt, event.endsAt))
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Theme.cream)
                        // Glowing red "live" dot next to the time when this act is on.
                        let live = event.isLive(at: now)
                        if live {
                            Circle().fill(Theme.now).frame(width: 8, height: 8)
                                .shadow(color: Theme.now, radius: 4)
                                .padding(.leading, 4)   // ~2× the gap from the time
                        }
                        Spacer(minLength: 2)
                        // Favorited: a heart beside the kind icon (tap toggles it).
                        if event.slug.map(favorites.isFavorite) == true {
                            Image(systemName: "heart.fill")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Color(hex: stage.accent))
                        }
                        // Inline kind icon keeps its normal place (top-right of the
                        // time row); the bottom-left watermark is the faint backdrop.
                        KindIcon(event.kind, size: 17, color: Color(hex: stage.accent))
                            .frame(width: 24, height: 20)
                    }
                    .frame(height: 20)
                    // ── Artist + title, kept tight together. The group reserves the
                    //    with-artist height (minHeight) so the kind watermark, anchored
                    //    to its bottom, stays low even without an artist; when there's
                    //    no artist the title simply moves up into the artist's place.
                    //    Watermark only on >30-min events; faint. ──
                    VStack(alignment: .leading, spacing: 0) {
                        if let artist = event.artist {
                            Text(artist)
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundStyle(Theme.creamDim)
                                .lineLimit(1).minimumScaleFactor(0.6)
                        }
                        Text(event.title.text(settings.locale))
                            .font(.system(size: 21, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(2).minimumScaleFactor(0.5)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxWidth: .infinity, minHeight: 67, alignment: .topLeading)
                    .background(alignment: .bottomLeading) {
                        if (event.endsAt ?? event.startsAt).timeIntervalSince(event.startsAt) > 30 * 60 {
                            KindIcon(event.kind, size: 52, color: Color(hex: stage.accent))
                                .opacity(0.10).padding(.leading, 2)
                        }
                    }
                }
                Spacer(minLength: 0)
            } else {
                Text(L.t("watch.noEvents", settings.locale))
                    .font(.footnote).foregroundStyle(Theme.creamDim)
                Spacer(minLength: 0)
            }
            stageDots
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.horizontal, 4)
        .padding(.top, 2)        // ~6% higher than before (was 12)
        .padding(.bottom, -14)   // let the dots drop close to the bottom toolbar
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

    /// Tap: toggle the shown act's favorite state. Breaks never reach the card
    /// (stores filter them), but the slug can be missing on old cached payloads.
    private func toggleFavorite() {
        guard let event = displayedEvent, event.isPlayable, let slug = event.slug else { return }
        favorites.toggle(slug)
        WKInterfaceDevice.current().play(favorites.isFavorite(slug) ? .success : .click)
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
        // Opening-day camp window (Jul 8, 12:00–18:30): a stage with nothing live
        // or starting within the near-window pitches the tent — anchored on now —
        // instead of teasing an act hours away. Mirrors the iOS/web opening-day
        // camp scene, per stage. A vertical swipe still reveals the next act.
        if store.data?.campSceneWindow?.contains(now) == true,
           !stageEvents.contains(where: { $0.isLive(at: now)
               || ($0.startsAt >= now && $0.startsAt.timeIntervalSince(now) <= nearWindow) }) {
            noProgramAtAnchor = true
            anchorTime = now
        }
    }
}

/// First-launch disclaimer (organizer requirement), shown once per device.
struct WatchDisclaimerSheet: View {
    @EnvironmentObject var settings: Settings
    let onAck: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Same lockup as the PWA / iOS modal, sized for the watch.
                VStack(spacing: 1) {
                    Text(L.t("app.guidefor", settings.locale).uppercased())
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .tracking(1.5)
                        .foregroundStyle(Theme.cream.opacity(0.75))
                    Text(L.t("app.title", settings.locale).uppercased())
                        .font(.system(size: 19, weight: .heavy, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(colors: [Theme.cream, Theme.sun, Theme.teal],
                                           startPoint: .leading, endPoint: .trailing))
                    Text(L.t("disclaimer.title", settings.locale).uppercased())
                        .font(.system(size: 8, weight: .semibold))
                        .tracking(1.5)
                        .foregroundStyle(Theme.cream.opacity(0.5))
                }
                Text(L.t("about.disclaimer", settings.locale))
                    .font(.footnote)
                    .foregroundStyle(Theme.cream.opacity(0.9))
                Button(action: onAck) {
                    Text(L.t("disclaimer.ok", settings.locale))
                        .font(.headline)
                        .foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Theme.sun, in: Capsule())
                }
                .buttonStyle(.plain)
                .padding(.top, 2)
            }
            .multilineTextAlignment(.center)
            .padding(.horizontal, 4)
            .padding(.vertical, 8)
        }
        .interactiveDismissDisabled(true)
    }
}
