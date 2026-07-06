import SwiftUI
import UIKit

private let gutterW: CGFloat = 60
private let headerH: CGFloat = 34
private let hour: TimeInterval = 3600

/// Reports each hour row's top offset in the scroll view, keyed by hour index,
/// so we know which hour sits at the top of the viewport.
private struct HourOffsetKey: PreferenceKey {
    static let defaultValue: [Int: CGFloat] = [:]
    static func reduce(value: inout [Int: CGFloat], nextValue: () -> [Int: CGFloat]) {
        value.merge(nextValue(), uniquingKeysWith: { a, _ in a })
    }
}

struct TimetableView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var location: LocationStore
    @EnvironmentObject var favorites: FavoritesStore
    var isLandscape: Bool = false
    /// Favorites dim-filter (heart button in the header): non-favorited blocks
    /// fade so the favorited ones pop.
    var favFilter: Bool = false
    @Binding var compactHeader: Bool
    @Environment(\.scenePhase) private var scenePhase

    @State private var now = Fmt.now
    @State private var activeDay: String = ""
    @State private var leadingStage: String?
    @State private var didScroll = false
    @State private var topHourIndex = 0   // hour at the viewport top, for zoom restore

    private let tick = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        Group {
            if let data = store.data, !data.events.isEmpty {
                content(data)
            } else if store.isLoading {
                centered(L.t("common.loading", settings.locale))
            } else {
                centered(L.t("common.error", settings.locale))
            }
        }
        .onReceive(tick) { _ in now = Fmt.now }
        .onChange(of: settings.debugNow) { _, _ in now = Fmt.now }
    }

    private func centered(_ s: String) -> some View {
        VStack { Spacer(); Text(s).foregroundStyle(Theme.creamFaint); Spacer() }
            .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func content(_ data: ScheduleData) -> some View {
        let stages = settings.orderedVisible(data.stages)
        let n = stages.count
        let effCols = isLandscape ? max(n, 1) : settings.effectiveColumns(visibleStages: n)
        let fontScale = settings.fontScale   // own setting now, not derived from width

        GeometryReader { geo in
            let colW = max((geo.size.width - gutterW) / CGFloat(max(effCols, 1)), 44)
            // Per-hour height scales with the text size so most acts fit (≈ PWA);
            // landscape is a touch shorter since vertical space is scarce there.
            let pph: CGFloat = isLandscape ? EventBlock.hourHeight(fontScale) * 0.72 : EventBlock.hourHeight(fontScale)
            let g = Grid(events: data.events, pph: pph)
            let leadingIdx = stages.firstIndex { $0.slug == leadingStage } ?? 0

            ScrollViewReader { vproxy in
                VStack(spacing: 0) {
                    if store.offline {
                        Text(L.t("common.offline", settings.locale))
                            .font(.caption2).foregroundStyle(Theme.creamFaint)
                            .frame(maxWidth: .infinity).padding(.vertical, 3).background(Theme.ink2)
                    }
                    daySelector(data, proxy: vproxy)
                    headerArea(stages: stages, leadingIdx: leadingIdx, effCols: effCols, colW: colW)

                    ScrollView(.vertical, showsIndicators: false) {
                        HStack(alignment: .top, spacing: 0) {
                            gutterColumn(g, scale: fontScale)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 0) {
                                    ForEach(stages) { stage in
                                        columnView(stage: stage, g: g, colW: colW, scale: fontScale).id(stage.slug)
                                    }
                                }
                                .scrollTargetLayout()
                            }
                            .scrollTargetBehavior(.viewAligned)
                            .scrollPosition(id: $leadingStage, anchor: .leading)
                            .frame(width: max(geo.size.width - gutterW, 0))
                        }
                        // Behind the columns, so the line sits *under* the act
                        // titles instead of striking through them.
                        .background(alignment: .topLeading) { nowLine(g, width: geo.size.width) }
                    }
                    .coordinateSpace(name: "grid")
                    .onPreferenceChange(HourOffsetKey.self) { offsets in
                        // Restore target: the hour boundary nearest the viewport
                        // top (exact for a round hour, ≤30 min off otherwise).
                        if let nearest = offsets.min(by: { abs($0.value) < abs($1.value) })?.key {
                            topHourIndex = nearest
                        }
                        // Active day = the last hour whose top has passed the top.
                        if let topIdx = offsets.filter({ $0.value <= 1 }).max(by: { $0.value < $1.value })?.key,
                           g.hours.indices.contains(topIdx) {
                            activeDay = Fmt.festivalDay(g.hours[topIdx])
                        } else {
                            activeDay = data.days.first ?? ""
                        }
                        if let y = offsets[0] { compactHeader = isLandscape && y < -24 }
                    }
                    .onAppear {
                        location.refresh(stages: stages)
                        selectNearestColumn(stages)
                        guard !didScroll else { return }
                        didScroll = true
                        jumpToNow(vproxy, g, data)
                    }
                }
                // Returning to the foreground re-jumps to the current time and
                // re-selects the nearest stage as the left column.
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { jumpToNow(vproxy, g, data); location.refresh(stages: stages) }
                }
                // Nearest stage (within 150 m) becomes the left column.
                .onChange(of: location.nearestSlug) { _, _ in selectNearestColumn(stages) }
                .onChange(of: settings.debugCoord) { _, _ in location.refresh(stages: stages) }
                // Re-snap the paged columns when the zoom (column count) changes,
                // so zooming while scrolled never leaves a half-column showing.
                .onChange(of: effCols) { _, _ in
                    guard let target = leadingStage else { return }
                    leadingStage = nil
                    DispatchQueue.main.async { leadingStage = target }
                }
                // Text-size change resizes every row; keep the same hour at the
                // top so the view doesn't jump off the time you were looking at.
                .onChange(of: settings.fontSize) { _, _ in
                    let target = topHourIndex
                    DispatchQueue.main.async { vproxy.scrollTo("t-\(target)", anchor: .top) }
                }
            }
        }
    }

    /// Tap on a block: toggle its favorite state. Breaks are never favoritable,
    /// and events without a slug (old cached payloads) can't be keyed.
    private func toggleFavorite(_ ev: EventDTO) {
        guard ev.isPlayable, let slug = ev.slug else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        favorites.toggle(slug)
    }

    /// Make the stage nearest the device (within 150 m) the left-most column.
    private func selectNearestColumn(_ stages: [StageDTO]) {
        guard let slug = location.nearestSlug, stages.contains(where: { $0.slug == slug }) else { return }
        leadingStage = slug
    }

    /// Scroll so the act on now (earliest-starting if several are live, else the
    /// next act) sits at the top.
    private func jumpToNow(_ proxy: ScrollViewProxy, _ g: Grid, _ data: ScheduleData) {
        now = Fmt.now
        let target = data.events.filter { $0.isLive(at: now) }.map(\.startsAt).min()
            ?? data.events.filter { $0.startsAt > now }.map(\.startsAt).min()
            ?? now
        let idx = g.hours.lastIndex(where: { $0 <= target }) ?? 0
        DispatchQueue.main.async { withAnimation { proxy.scrollTo("t-\(idx)", anchor: .top) } }
    }

    /// The now line: one continuous, evenly bright glowing line at the current
    /// time, from the gutter out to the right edge (trimmed a few px so its glow
    /// doesn't bleed past the columns).
    @ViewBuilder
    private func nowLine(_ g: Grid, width: CGFloat) -> some View {
        if now >= g.start && now <= g.end {
            Rectangle().fill(Theme.now).frame(width: max(width - 6, 0), height: 2)
                .shadow(color: Theme.now, radius: 3)
                .frame(maxWidth: .infinity, alignment: .leading)
                .offset(y: g.y(now) - 1)
        }
    }

    // MARK: Day selector

    private func daySelector(_ data: ScheduleData, proxy: ScrollViewProxy) -> some View {
        HStack(spacing: 4) {
            ForEach(data.days, id: \.self) { d in
                let active = d == activeDay
                Button {
                    withAnimation { proxy.scrollTo("day-\(d)", anchor: .top) }
                } label: {
                    VStack(spacing: 1) {
                        Text(Fmt.mmdd(d)).font(.system(size: 15, weight: .bold, design: .rounded))
                        Text(Fmt.weekday(d, settings.locale))
                            .font(.system(size: 9, weight: .medium)).lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 6)
                    .background(active ? Theme.sun : Theme.ink2.opacity(0.6), in: RoundedRectangle(cornerRadius: 8))
                    .foregroundStyle(active ? Theme.ink : Theme.creamDim)
                }
            }
        }
        .padding(.horizontal, 8).padding(.vertical, 6)
    }

    // MARK: Pinned header (shows the currently-paged stages) + position dots

    private func headerArea(stages: [StageDTO], leadingIdx: Int, effCols: Int, colW: CGFloat) -> some View {
        let end = min(leadingIdx + effCols, stages.count)
        let visible = stages.indices.contains(leadingIdx) ? Array(stages[leadingIdx..<end]) : []
        return VStack(spacing: 3) {
            // Position dots — ABOVE the stage headers, centred over the columns.
            if effCols < stages.count {
                HStack(spacing: 0) {
                    Color.clear.frame(width: gutterW, height: 4)
                    HStack(spacing: 5) {
                        ForEach(stages.indices, id: \.self) { i in
                            let on = i >= leadingIdx && i < leadingIdx + effCols
                            Capsule()
                                .fill(on ? Theme.sun : Theme.creamFaint.opacity(0.4))
                                .frame(width: on ? 10 : 5, height: 4)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            HStack(spacing: 0) {
                Color.clear.frame(width: gutterW, height: headerH)
                ForEach(visible) { stageHeader($0, cw: colW) }
                Spacer(minLength: 0)
            }
        }
        .padding(.bottom, 2)
    }

    private func stageHeader(_ stage: StageDTO, cw: CGFloat) -> some View {
        HStack(spacing: 3) {
            Text(stage.name)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .lineLimit(1).minimumScaleFactor(0.6)
            if location.nearestSlug == stage.slug {
                Image(systemName: "location.fill").font(.system(size: 9, weight: .bold))
            }
        }
            .foregroundStyle(Theme.cream)
            .frame(width: cw - 4, height: headerH - 6)
            .background(
                LinearGradient(colors: [Color(hex: stage.color), Color(hex: stage.color).opacity(0.73)],
                               startPoint: .topLeading, endPoint: .bottomTrailing),
                in: RoundedRectangle(cornerRadius: 8))
            .frame(width: cw)
    }

    // MARK: Gutter — hour labels + day dividers (date above / day below) + anchors

    private func gutterColumn(_ g: Grid, scale: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            Color.clear.frame(width: gutterW, height: g.total)
            anchorTrack(g)
            hourTrack(g)
            ForEach(g.hours, id: \.self) { date in
                // Skip the hour label where a day divider's date sits (midnight,
                // and the very first hour) so they don't overlap in the gutter.
                if !Fmt.isMidnight(date) && date != g.start {
                    // Plain hour labels — the now chip below marks the current time.
                    Text(Fmt.hhmm(date))
                        .font(.system(size: 10 * scale, weight: .regular, design: .monospaced))
                        .foregroundStyle(Theme.creamFaint).fixedSize()
                        .offset(x: 4, y: g.y(date) - 6)
                }
            }
            ForEach(g.dividers, id: \.day) { div in
                Text(Fmt.mmdd(div.day)).font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.sun).fixedSize()
                    .offset(x: 2, y: g.y(div.date) - 12)
                Text(Fmt.weekday(div.day, settings.locale)).font(.system(size: 8, weight: .medium))
                    .foregroundStyle(Theme.creamDim).fixedSize()
                    .offset(x: 2, y: g.y(div.date) + 1)
            }
            // Now: a glowing red chip with the current time in white, sitting on
            // the now line — it covers the hour label it lands on.
            if now >= g.start && now <= g.end {
                Text(Fmt.hhmm(now))
                    .font(.system(size: 10 * scale, weight: .bold, design: .monospaced))
                    .foregroundStyle(.white).fixedSize()
                    .padding(.horizontal, 5).padding(.vertical, 1)
                    .background(Theme.now, in: Capsule())
                    .shadow(color: Theme.now, radius: 3)
                    .offset(x: 0, y: g.y(now) - 9)
            }
        }
        .frame(width: gutterW)
    }

    /// Real-layout segments per day, ids only — targets for the day selector's
    /// `scrollTo("day-…")` jumps.
    private func anchorTrack(_ g: Grid) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(g.dividers.enumerated()), id: \.element.day) { idx, div in
                let nextY = idx + 1 < g.dividers.count ? g.y(g.dividers[idx + 1].date) : g.total
                Color.clear
                    .frame(width: gutterW, height: max(nextY - g.y(div.date), 1))
                    .id("day-\(div.day)")
            }
        }
    }

    /// Real-layout segment per hour: reports its top offset (so we know the top
    /// hour) and carries an id we scroll back to after a text-size change.
    private func hourTrack(_ g: Grid) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(g.hours.enumerated()), id: \.offset) { i, date in
                let nextY = i + 1 < g.hours.count ? g.y(g.hours[i + 1]) : g.total
                Color.clear
                    .frame(width: gutterW, height: max(nextY - g.y(date), 1))
                    .id("t-\(i)")
                    .background(GeometryReader { geo in
                        Color.clear.preference(key: HourOffsetKey.self,
                                               value: [i: geo.frame(in: .named("grid")).minY])
                    })
            }
        }
    }

    // MARK: One self-contained stage column (a horizontal paging unit)

    private func columnView(stage: StageDTO, g: Grid, colW: CGFloat, scale: CGFloat) -> some View {
        let evs = g.events.filter { $0.stageSlug == stage.slug }
        let near = location.nearestSlug == stage.slug
        return ZStack(alignment: .topLeading) {
            Color.clear.frame(width: colW, height: g.total)
            ForEach(g.hours, id: \.self) { date in
                Rectangle().fill(Theme.line.opacity(0.3)).frame(width: colW, height: 0.5)
                    .offset(y: g.y(date))
            }
            ForEach(g.dividers, id: \.day) { div in
                Rectangle().fill(.clear).frame(width: colW, height: 1)
                    .overlay(Rectangle().strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [3, 5]))
                        .foregroundStyle(Theme.sun.opacity(0.5)))
                    .offset(y: g.y(div.date))
            }
            ForEach(Array(evs.enumerated()), id: \.element.id) { i, ev in
                // Grow short acts to fit one title line, but cap at the next act's
                // start so a 15-min slot can never overlap the one below it.
                let avail = i + 1 < evs.count ? g.y(evs[i + 1].startsAt) - g.y(ev.startsAt) : .infinity
                let h = min(max(g.blockHeight(ev), EventBlock.minHeight(scale)), avail)
                let isFav = ev.slug.map(favorites.isFavorite) ?? false
                EventBlock(event: ev, stage: stage, now: now, near: near, locale: settings.locale,
                           scale: scale, height: h, isFav: isFav)
                    .frame(width: colW - 4, height: h)
                    .offset(x: 2, y: g.y(ev.startsAt))
                    // Dim-filter: favorited acts keep full strength, the rest fade.
                    .opacity(favFilter && !isFav ? 0.35 : 1)
                    .onTapGesture { toggleFavorite(ev) }
                    .accessibilityHint(ev.isPlayable && ev.slug != nil
                        ? L.t(isFav ? "fav.remove" : "fav.add", settings.locale) : "")
            }
        }
        .frame(width: colW)
    }
}

// MARK: - Grid geometry (continuous, across all days)

private struct Grid {
    let start: Date
    let end: Date
    let total: CGFloat
    let pph: CGFloat
    let events: [EventDTO]
    let hours: [Date]
    let dividers: [(day: String, date: Date)]

    init(events: [EventDTO], pph: CGFloat) {
        self.pph = pph
        let starts = events.map(\.startsAt)
        let ends = events.map { $0.endsAt ?? $0.startsAt.addingTimeInterval(hour) }
        let minS = starts.min() ?? Date()
        let maxE = ends.max() ?? minS.addingTimeInterval(hour)
        func floorH(_ d: Date) -> Date { Date(timeIntervalSince1970: (d.timeIntervalSince1970 / hour).rounded(.down) * hour) }
        func ceilH(_ d: Date) -> Date { Date(timeIntervalSince1970: (d.timeIntervalSince1970 / hour).rounded(.up) * hour) }
        self.start = floorH(minS)
        self.end = ceilH(max(maxE, minS.addingTimeInterval(hour)))
        self.total = CGFloat(end.timeIntervalSince(start) / hour) * pph
        self.events = events

        var h: [Date] = []; var t = start
        while t <= end { h.append(t); t = t.addingTimeInterval(hour) }
        self.hours = h

        var divs: [(String, Date)] = [(Fmt.festivalDay(start), start)]
        for m in h where Fmt.isMidnight(m) { divs.append((Fmt.festivalDay(m), m)) }
        self.dividers = divs
    }

    func y(_ date: Date) -> CGFloat { CGFloat(date.timeIntervalSince(start) / hour) * pph }
    func blockHeight(_ ev: EventDTO) -> CGFloat {
        let end = ev.endsAt ?? ev.startsAt.addingTimeInterval(hour)
        return max(y(end) - y(ev.startsAt), 14)
    }
}

private struct EventBlock: View {
    let event: EventDTO
    let stage: StageDTO
    let now: Date
    /// The device is standing at this event's stage (within `Geo.nearThreshold`).
    let near: Bool
    let locale: AppLocale
    let scale: CGFloat
    let height: CGFloat
    /// Favorited (by slug) — shows the heart badge + a stronger accent border.
    let isFav: Bool

    /// Minimum block height: one title line at the current text size fits with
    /// no clipping, so even a 30-minute act shows its name in full.
    static func minHeight(_ scale: CGFloat) -> CGFloat { 12 * scale * 1.35 + 6 }
    /// Height one hour occupies — tall enough for the from–to row plus ~2 title
    /// lines, so most acts fit their name (≈ the PWA's density).
    static func hourHeight(_ scale: CGFloat) -> CGFloat { 42 * scale + 8 }

    var body: some View {
        let start = event.startsAt
        let end = event.endsAt ?? start.addingTimeInterval(hour)
        let live = start <= now && end > now
        // On now AND standing at this stage → the kind icon glows red and pulses.
        let hot = live && near
        let past = end <= now
        let color = Color(hex: stage.color)
        let accent = Color(hex: stage.accent)
        let hasLang = event.langAvailability != nil
        let hasArtist = event.artist != nil
        // Kind-icon watermark only on events longer than 30 min (matches the PWA).
        let longEnough = end.timeIntervalSince(start) > 30 * 60
        // Tall enough for a time row plus a title line? Otherwise it's a single
        // line: just the act name, no from–to time.
        let showTime = height >= 27 * scale + 8
        // Fit as many title lines as the block holds. The language chip is a
        // faint watermark over the text (reserves no space); the artist line does.
        let titleLineH = 12 * scale * 1.22
        let reserved = (showTime ? 9 * scale * 1.3 + 3 : 0)
            + (showTime && hasArtist ? 9 * scale * 1.22 : 0) + 5
        let titleLines = max(1, Int((height - reserved) / titleLineH))

        if event.isBreak {
            RoundedRectangle(cornerRadius: 6)
                .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4])).foregroundStyle(Theme.line)
                .overlay(Text(L.t("common.break", locale)).font(.system(size: 9)).foregroundStyle(Theme.creamFaint))
        } else {
            VStack(alignment: .leading, spacing: 1) {
                if showTime {
                    HStack(spacing: 3) {
                        let timeFont = Font.system(size: 9 * scale, weight: .semibold, design: .monospaced)
                        // Richest time label that fits: full range + live dot →
                        // start + dot → start alone. The dot is dropped before the
                        // time shrinks, so a narrow column keeps the time legible.
                        ViewThatFits(in: .horizontal) {
                            timeLabel(Fmt.range(start, event.endsAt), font: timeFont, accent: accent, dot: live, shrink: false)
                            timeLabel(Fmt.hhmm(start), font: timeFont, accent: accent, dot: live, shrink: false)
                            timeLabel(Fmt.hhmm(start), font: timeFont, accent: accent, dot: false, shrink: true)
                        }
                        Spacer(minLength: 2)
                        kindIcon(accent, hot: hot)
                    }
                }
                if showTime, let artist = event.artist {
                    Text(artist)
                        .font(.system(size: 9 * scale, weight: .medium, design: .rounded))
                        .foregroundStyle(Theme.creamFaint)
                        .lineLimit(1).truncationMode(.tail)
                }
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    titleText
                        .lineLimit(showTime ? titleLines : 1).truncationMode(.tail)
                    // On a single-line block the kind icon sits inline (no room
                    // for a time row); the language watermark floats over (overlay).
                    if !showTime {
                        Spacer(minLength: 2)
                        kindIcon(accent, hot: hot)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 5).padding(.vertical, showTime ? 2 : 1)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(alignment: .bottomLeading) {
                // Large faint kind-icon watermark (>30-min events), in front of the
                // colour fill but behind the text. Mirrors the PWA.
                if longEnough {
                    KindIcon(event.kind, size: 34 * scale, color: accent)
                        .opacity(0.08).padding(.leading, 3).padding(.bottom, 2)
                }
            }
            .background(alignment: .bottomTrailing) {
                // Language chip behind the text (z-index:-1 equivalent), faint at 50%;
                // its font scales with the text size. Only when a language is set.
                if hasLang {
                    langChip().opacity(0.5).padding(.trailing, 3).padding(.bottom, 2)
                }
            }
            .background(color.opacity(live ? 0.85 : 0.28), in: RoundedRectangle(cornerRadius: 6))
            .overlay(alignment: .leading) { Rectangle().fill(accent).frame(width: 2) }
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .opacity(past ? 0.45 : 1)
        }
    }

    /// A time label with an optional glowing red "live" dot. Used as the
    /// `ViewThatFits` candidates so the dot is shed (then the end time) as the
    /// column narrows, rather than truncating the time.
    private func timeLabel(_ text: String, font: Font, accent: Color, dot: Bool, shrink: Bool) -> some View {
        HStack(spacing: 3) {
            Text(text).font(font).foregroundStyle(accent)
                .lineLimit(1).minimumScaleFactor(shrink ? 0.7 : 1)
            if dot {
                Circle().fill(Theme.now).frame(width: 5 * scale, height: 5 * scale)
                    .shadow(color: Theme.now, radius: 2)
                    .padding(.leading, 3 * scale)   // ~2× the gap from the time
            }
        }
    }

    /// The act title, with the always-red favorite heart inlined before the
    /// first word as part of the same text run (like the web timetable and the
    /// watch widget's act line) — it wraps with the text and, at 0.8× the title
    /// size, never grows the line.
    private var titleText: Text {
        let title = Text(event.title.text(locale))
            .font(.system(size: 12 * scale, weight: .semibold, design: .rounded))
            .foregroundStyle(event.kind == EventKind.music ? Theme.cream : Theme.creamDim)
        guard isFav else { return title }
        return Text("\(Image(systemName: "heart.fill")) ")
            .font(.system(size: 12 * scale * 0.8, weight: .bold))
            .foregroundStyle(.red) + title
    }

    /// The act's kind glyph. Keeps its own (stage accent) colour; when `hot`
    /// (on now AND standing at this stage) it pulses and softly glows in that
    /// same colour — never turning red.
    private func kindIcon(_ accent: Color, hot: Bool) -> some View {
        KindIcon(event.kind, size: 11 * scale, color: accent)
            .shadow(color: hot ? accent : .clear, radius: hot ? 3 : 0)
    }

    @ViewBuilder
    private func langChip() -> some View {
        let chip = Theme.chip(event.langAvailability)
        Text(chip.label).font(.system(size: 8 * scale, weight: .bold))
            .padding(.horizontal, 4).padding(.vertical, 1)
            .background(chip.bg, in: Capsule()).foregroundStyle(chip.fg)
    }
}
