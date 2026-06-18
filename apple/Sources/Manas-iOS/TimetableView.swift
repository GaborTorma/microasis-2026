import SwiftUI

private let gutterW: CGFloat = 60
private let headerH: CGFloat = 34
private let hour: TimeInterval = 3600

private struct DayOffsetKey: PreferenceKey {
    static let defaultValue: [String: CGFloat] = [:]
    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
        value.merge(nextValue(), uniquingKeysWith: { a, _ in a })
    }
}

struct TimetableView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    var isLandscape: Bool = false
    @Binding var compactHeader: Bool

    @State private var now = Date()
    @State private var activeDay: String = ""
    @State private var leadingStage: String?
    @State private var didScroll = false

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
        .onReceive(tick) { now = $0 }
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
                    }
                    .coordinateSpace(name: "grid")
                    .onPreferenceChange(DayOffsetKey.self) { offsets in
                        let passed = offsets.filter { $0.value <= 1 }
                        activeDay = passed.max(by: { $0.value < $1.value })?.key ?? data.days.first ?? ""
                        if let first = g.dividers.first?.day, let y = offsets[first] {
                            compactHeader = isLandscape && y < -24
                        }
                    }
                    .onAppear {
                        guard !didScroll else { return }
                        didScroll = true
                        let target = data.days.contains(Fmt.festivalDay(now)) ? Fmt.festivalDay(now) : (data.days.first ?? "")
                        DispatchQueue.main.async { withAnimation { vproxy.scrollTo("day-\(target)", anchor: .top) } }
                    }
                }
                // Re-snap the paged columns when the zoom (column count) changes,
                // so zooming while scrolled never leaves a half-column showing.
                .onChange(of: effCols) { _, _ in
                    guard let target = leadingStage else { return }
                    leadingStage = nil
                    DispatchQueue.main.async { leadingStage = target }
                }
            }
        }
    }

    // MARK: Day selector

    private func daySelector(_ data: ScheduleData, proxy: ScrollViewProxy) -> some View {
        let today = Fmt.festivalDay(now)
        return HStack(spacing: 4) {
            ForEach(data.days, id: \.self) { d in
                let active = d == activeDay
                Button {
                    withAnimation { proxy.scrollTo("day-\(d)", anchor: .top) }
                } label: {
                    VStack(spacing: 1) {
                        Text(Fmt.mmdd(d)).font(.system(size: 15, weight: .bold, design: .rounded))
                        Text(Fmt.weekday(d, settings.locale))
                            .font(.system(size: 9, weight: .medium)).lineLimit(1).minimumScaleFactor(0.7)
                        if d == today { Circle().fill(active ? Theme.ink : Theme.sun).frame(width: 4, height: 4) }
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
        Text(stage.name)
            .font(.system(size: 13, weight: .bold, design: .rounded)).foregroundStyle(Theme.cream)
            .lineLimit(1).minimumScaleFactor(0.6)
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
            ForEach(g.hours, id: \.self) { date in
                // Skip the hour label where a day divider's date sits (midnight,
                // and the very first hour) so they don't overlap in the gutter.
                if !Fmt.isMidnight(date) && date != g.start {
                    Text(Fmt.hhmm(date))
                        .font(.system(size: 10 * scale, design: .monospaced))
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
        }
        .frame(width: gutterW)
    }

    private func anchorTrack(_ g: Grid) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(g.dividers.enumerated()), id: \.element.day) { idx, div in
                let nextY = idx + 1 < g.dividers.count ? g.y(g.dividers[idx + 1].date) : g.total
                Color.clear
                    .frame(width: gutterW, height: max(nextY - g.y(div.date), 1))
                    .id("day-\(div.day)")
                    .background(GeometryReader { geo in
                        Color.clear.preference(key: DayOffsetKey.self,
                                               value: [div.day: geo.frame(in: .named("grid")).minY])
                    })
            }
        }
    }

    // MARK: One self-contained stage column (a horizontal paging unit)

    private func columnView(stage: StageDTO, g: Grid, colW: CGFloat, scale: CGFloat) -> some View {
        let showNow = now >= g.start && now <= g.end
        let evs = g.events.filter { $0.stageSlug == stage.slug }
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
                EventBlock(event: ev, stage: stage, now: now, locale: settings.locale, scale: scale, height: h)
                    .frame(width: colW - 4, height: h)
                    .offset(x: 2, y: g.y(ev.startsAt))
            }
            if showNow {
                Rectangle().fill(Theme.now).frame(width: colW, height: 2)
                    .shadow(color: Theme.now, radius: 4)
                    .offset(y: g.y(now))
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
    let locale: AppLocale
    let scale: CGFloat
    let height: CGFloat

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
        let past = end <= now
        let color = Color(hex: stage.color)
        let accent = Color(hex: stage.accent)
        let isWorkshop = event.kind == EventKind.workshop
        // Tall enough for a time row plus a title line? Otherwise it's a single
        // line: just the act name, no from–to time.
        let showTime = height >= 27 * scale + 8
        // Fit as many title lines as the block holds. The language chip is a
        // faint watermark over the text now, so it reserves no space.
        let titleLineH = 12 * scale * 1.22
        let reserved = (showTime ? 9 * scale * 1.3 + 3 : 0) + 5
        let titleLines = max(1, Int((height - reserved) / titleLineH))

        if event.isBreak {
            RoundedRectangle(cornerRadius: 6)
                .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4])).foregroundStyle(Theme.line)
                .overlay(Text(L.t("common.break", locale)).font(.system(size: 9)).foregroundStyle(Theme.creamFaint))
        } else {
            VStack(alignment: .leading, spacing: 1) {
                if showTime {
                    HStack(spacing: 3) {
                        Text(Fmt.range(start, event.endsAt))
                            .font(.system(size: 9 * scale, weight: .semibold, design: .monospaced))
                            .foregroundStyle(accent).lineLimit(1).minimumScaleFactor(0.7)
                        if live { Circle().fill(Theme.sun).frame(width: 4, height: 4) }
                        Spacer(minLength: 2)
                        Image(systemName: kindSymbol(event.kind))
                            .font(.system(size: 9 * scale)).foregroundStyle(accent)
                    }
                }
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    if !showTime, live { Circle().fill(Theme.sun).frame(width: 4, height: 4) }
                    Text(event.title.text(locale))
                        .font(.system(size: 12 * scale, weight: .semibold, design: .rounded))
                        .foregroundStyle(event.kind == EventKind.music ? Theme.cream : Theme.creamDim)
                        .lineLimit(showTime ? titleLines : 1).truncationMode(.tail)
                    // On a single-line block the kind icon sits inline (no room
                    // for a time row); the language watermark floats over (overlay).
                    if !showTime {
                        Spacer(minLength: 2)
                        Image(systemName: kindSymbol(event.kind))
                            .font(.system(size: 9 * scale)).foregroundStyle(accent)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 5).padding(.vertical, showTime ? 2 : 1)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(color.opacity(live ? 0.85 : 0.28), in: RoundedRectangle(cornerRadius: 6))
            .overlay(alignment: .leading) { Rectangle().fill(accent).frame(width: 2) }
            .overlay(alignment: .bottomTrailing) {
                // Faint language watermark over the text bottom-right; it's
                // translucent, so overlapping the title is fine (reserves no space).
                if isWorkshop {
                    langChip().opacity(0.5).padding(.trailing, 3).padding(.bottom, 2)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .opacity(past ? 0.45 : 1)
        }
    }

    @ViewBuilder
    private func langChip() -> some View {
        let chip = Theme.chip(event.langAvailability)
        Text(chip.label).font(.system(size: 8, weight: .bold))
            .padding(.horizontal, 4).padding(.vertical, 1)
            .background(chip.bg, in: Capsule()).foregroundStyle(chip.fg)
    }
}
