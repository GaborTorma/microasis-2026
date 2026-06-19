import SwiftUI

struct WatchSettingsView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @Environment(\.dismiss) private var dismiss
    @State private var stages: [StageDTO] = []

    var body: some View {
        NavigationStack {
            List {
                Section(L.t("settings.language", settings.locale)) {
                    ForEach(AppLocale.allCases, id: \.self) { loc in
                        Button {
                            settings.locale = loc
                        } label: {
                            HStack {
                                Text(loc.label).font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(settings.locale == loc ? Theme.sun : Theme.cream)
                                Spacer()
                                if settings.locale == loc {
                                    Image(systemName: "checkmark").foregroundStyle(Theme.sun)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                Section(L.t("settings.stages", settings.locale)) {
                    ForEach(Array(stages.enumerated()), id: \.element.id) { index, stage in
                        HStack(spacing: 6) {
                            Circle().fill(Color(hex: stage.color)).frame(width: 10, height: 10)
                            Text(stage.name)
                                .font(.footnote).lineLimit(1)
                                .foregroundStyle(settings.hidden.contains(stage.slug) ? Theme.creamFaint : Theme.cream)
                            Spacer(minLength: 2)
                            Button {
                                move(index, by: -1)
                            } label: { Image(systemName: "chevron.up") }
                                .disabled(index == 0)
                            Button {
                                move(index, by: 1)
                            } label: { Image(systemName: "chevron.down") }
                                .disabled(index == stages.count - 1)
                            Button {
                                settings.toggleHidden(stage.slug)
                            } label: {
                                Image(systemName: settings.hidden.contains(stage.slug) ? "eye.slash" : "eye")
                                    .foregroundStyle(settings.hidden.contains(stage.slug) ? Theme.creamFaint : Theme.sun)
                            }
                        }
                        .buttonStyle(.plain)
                        .font(.system(size: 13))
                    }
                }
                if AppEnv.debugToolsEnabled {
                    Section(L.t("settings.testing", settings.locale)) {
                        Toggle(L.t("settings.testTime", settings.locale), isOn: debugOn)
                        if settings.debugNow != nil {
                            DatePicker(L.t("settings.testTime", settings.locale), selection: debugDate,
                                       displayedComponents: [.date, .hourAndMinute])
                                .labelsHidden()
                        }
                    }
                }
            }
            .navigationTitle(L.t("settings.title", settings.locale))
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(L.t("settings.done", settings.locale)) { dismiss() }
                }
            }
        }
        .onAppear { stages = settings.orderedAll(store.data?.stages ?? []) }
    }

    private var defaultDebugDate: Date { store.data?.festival.startsAt ?? Fmt.now }
    private var debugOn: Binding<Bool> {
        Binding(get: { settings.debugNow != nil },
                set: { settings.debugNow = $0 ? (settings.debugNow ?? defaultDebugDate) : nil })
    }
    private var debugDate: Binding<Date> {
        Binding(get: { settings.debugNow ?? defaultDebugDate },
                set: { settings.debugNow = $0 })
    }

    private func move(_ index: Int, by delta: Int) {
        let target = index + delta
        guard stages.indices.contains(index), stages.indices.contains(target) else { return }
        stages.swapAt(index, target)
        settings.setOrder(stages)
    }
}
