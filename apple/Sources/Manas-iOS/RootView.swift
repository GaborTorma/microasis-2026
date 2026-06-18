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
                                  showControls: tab == 0,
                                  landscape: landscape,
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
            .sheet(isPresented: $showSettings) {
                SettingsView()
                    .environmentObject(store)
                    .environmentObject(settings)
            }
        }
    }
}

struct HeaderBar: View {
    @EnvironmentObject var settings: Settings
    @Binding var showSettings: Bool
    var showControls: Bool = false
    var landscape: Bool = false
    var stageCount: Int = 0

    private var maxCols: Int { max(1, min(maxColumns, stageCount)) }
    private var eff: Int { settings.effectiveColumns(visibleStages: stageCount) }

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            VStack(alignment: .leading, spacing: 1) {
                Text(L.t("app.title", settings.locale))
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(colors: [Theme.cream, Theme.sun, Theme.teal],
                                       startPoint: .leading, endPoint: .trailing)
                    )
                    .lineLimit(1).minimumScaleFactor(0.6)
                Text(L.t("app.unofficial", settings.locale).uppercased())
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(2)
                    .foregroundStyle(Theme.sun.opacity(0.8))
                    .lineLimit(1)
            }
            Spacer(minLength: 4)

            if showControls {
                // Text size: − T + (both orientations)
                stepper(icon: "textformat.size",
                        minusEnabled: settings.fontSize > 1, minus: { settings.adjustFontSize(by: -1) },
                        plusEnabled: settings.fontSize < 5, plus: { settings.adjustFontSize(by: 1) })
                // Columns: − ▦ + — portrait only (landscape always shows all stages)
                if !landscape {
                    stepper(icon: "rectangle.split.3x1",
                            minusEnabled: eff > 1, minus: { settings.adjustColumns(by: -1, visibleStages: stageCount) },
                            plusEnabled: eff < maxCols, plus: { settings.adjustColumns(by: 1, visibleStages: stageCount) })
                }
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
        .padding(.horizontal, 12).padding(.vertical, 10)
    }

    /// A `− [icon] +` pill: minus on the left, the control's glyph in the
    /// middle, plus on the right.
    private func stepper(icon: String,
                         minusEnabled: Bool, minus: @escaping () -> Void,
                         plusEnabled: Bool, plus: @escaping () -> Void) -> some View {
        HStack(spacing: 0) {
            stepButton("minus", enabled: minusEnabled, action: minus)
            Image(systemName: icon)
                .font(.system(size: 12, weight: .semibold)).foregroundStyle(Theme.cream)
                .frame(width: 22)
            stepButton("plus", enabled: plusEnabled, action: plus)
        }
        .pillBar()
    }

    private func stepButton(_ icon: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .semibold))
                .frame(width: 24, height: 26)
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
