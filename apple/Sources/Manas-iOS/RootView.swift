import SwiftUI

struct RootView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @State private var tab = 0
    @State private var showSettings = false
    @State private var compactHeader = false   // landscape: hide app header on scroll

    var body: some View {
        GeometryReader { geo in
            let landscape = geo.size.width > geo.size.height
            let stageCount = settings.orderedVisible(store.data?.stages ?? []).count
            let hideHeader = landscape && compactHeader && tab == 0

            ZStack {
                Theme.ink.ignoresSafeArea()
                VStack(spacing: 0) {
                    if !hideHeader {
                        HeaderBar(showSettings: $showSettings,
                                  showZoom: tab == 0 && !landscape,
                                  stageCount: stageCount)
                            .transition(.move(edge: .top).combined(with: .opacity))
                        Divider().overlay(Theme.line)
                    }

                    TabView(selection: $tab) {
                        TimetableView(isLandscape: landscape, compactHeader: $compactHeader)
                            .tabItem { Label(L.t("nav.timetable", settings.locale), systemImage: "calendar") }
                            .tag(0)
                        NowView()
                            .tabItem { Label(L.t("nav.now", settings.locale), systemImage: "dot.radiowaves.left.and.right") }
                            .tag(1)
                    }
                }
                .animation(.easeInOut(duration: 0.2), value: hideHeader)
            }
            .onChange(of: tab) { _, t in if t != 0 { compactHeader = false } }
        }
    }
}

struct HeaderBar: View {
    @EnvironmentObject var settings: Settings
    @Binding var showSettings: Bool
    var showZoom: Bool = false
    var stageCount: Int = 0

    private var maxCols: Int { max(1, min(maxColumns, stageCount)) }
    private var eff: Int { settings.effectiveColumns(visibleStages: stageCount) }

    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 1) {
                Text(L.t("app.title", settings.locale))
                    .font(.system(size: 24, weight: .heavy, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(colors: [Theme.cream, Theme.sun, Theme.teal],
                                       startPoint: .leading, endPoint: .trailing)
                    )
                Text(L.t("app.unofficial", settings.locale).uppercased())
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(2)
                    .foregroundStyle(Theme.sun.opacity(0.8))
            }
            Spacer()
            // Language toggle
            HStack(spacing: 0) {
                ForEach(AppLocale.allCases, id: \.self) { loc in
                    Button { settings.locale = loc } label: {
                        Text(loc.label)
                            .font(.system(size: 12, weight: .bold))
                            .padding(.horizontal, 10).padding(.vertical, 5)
                            .background(settings.locale == loc ? Theme.sun : .clear)
                            .foregroundStyle(settings.locale == loc ? Theme.ink : Theme.creamDim)
                            .clipShape(Capsule())
                    }
                }
            }
            .pillBar()

            // Zoom = how many stage columns are shown at once (− more, + fewer).
            if showZoom {
                HStack(spacing: 0) {
                    zoomButton("minus", enabled: eff < maxCols) { settings.adjustColumns(by: 1, visibleStages: stageCount) }
                    zoomButton("plus", enabled: eff > 1) { settings.adjustColumns(by: -1, visibleStages: stageCount) }
                }
                .pillBar()
            }

            Button { showSettings = true } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.creamDim)
                    .frame(width: 34, height: 34)
                    .background(Theme.ink2.opacity(0.7), in: Circle())
                    .overlay(Circle().stroke(Theme.line))
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
    }

    private func zoomButton(_ icon: String, enabled: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .frame(width: 26, height: 26)
                .foregroundStyle(Theme.creamDim)
                .opacity(enabled ? 1 : 0.3)
        }
        .disabled(!enabled)
    }
}

private extension View {
    /// The rounded "pill bar" container shared by the header's segmented controls.
    func pillBar() -> some View {
        padding(2)
            .background(Theme.ink2.opacity(0.7), in: Capsule())
            .overlay(Capsule().stroke(Theme.line))
    }
}
