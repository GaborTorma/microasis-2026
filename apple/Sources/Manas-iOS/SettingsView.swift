import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @Environment(\.dismiss) private var dismiss
    @State private var stages: [StageDTO] = []

    private var localeBinding: Binding<AppLocale> {
        Binding(get: { settings.locale }, set: { settings.locale = $0 })
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
    private var defaultDebugCoord: String {
        store.data?.stages.first(where: { $0.isDefault }).flatMap(Geo.coordString) ?? Geo.farTestCoord
    }
    private var debugCoordOn: Binding<Bool> {
        Binding(get: { settings.debugCoord != nil },
                set: { settings.debugCoord = $0 ? (settings.debugCoord ?? defaultDebugCoord) : nil })
    }
    private var coordText: Binding<String> {
        Binding(get: { settings.debugCoord ?? "" },
                set: { settings.debugCoord = $0.isEmpty ? nil : $0 })
    }

    private func coordChip(_ label: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label).font(.system(size: 12, weight: .semibold))
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Theme.ink2, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    var body: some View {
        NavigationStack {
            List {
                Section(L.t("settings.language", settings.locale)) {
                    Picker(L.t("settings.language", settings.locale), selection: localeBinding) {
                        ForEach(AppLocale.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }

                // Reorder with up/down chevrons (no editMode — keeping the list
                // out of edit mode lets the controls below stay interactive).
                Section(L.t("settings.stages", settings.locale)) {
                    ForEach(Array(stages.enumerated()), id: \.element.id) { index, stage in
                        HStack(spacing: 10) {
                            Circle().fill(Color(hex: stage.color)).frame(width: 12, height: 12)
                            Text(stage.name)
                                .foregroundStyle(settings.hidden.contains(stage.slug) ? Theme.creamFaint : Theme.cream)
                            Spacer()
                            Button { move(index, by: -1) } label: { Image(systemName: "chevron.up") }
                                .buttonStyle(.plain).disabled(index == 0)
                            Button { move(index, by: 1) } label: { Image(systemName: "chevron.down") }
                                .buttonStyle(.plain).disabled(index == stages.count - 1)
                            Button { settings.toggleHidden(stage.slug) } label: {
                                Image(systemName: settings.hidden.contains(stage.slug) ? "eye.slash" : "eye")
                                    .foregroundStyle(settings.hidden.contains(stage.slug) ? Theme.creamFaint : Theme.sun)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                if AppEnv.debugToolsEnabled {
                    Section(L.t("settings.testing", settings.locale)) {
                        Toggle(L.t("settings.testTime", settings.locale), isOn: debugOn)
                        if settings.debugNow != nil {
                            // Picker edits in the device's time zone (Budapest on
                            // a HU device); the simctl string method is TZ-pinned.
                            DatePicker("", selection: debugDate, displayedComponents: [.date, .hourAndMinute])
                                .labelsHidden()
                        }
                        Toggle(L.t("settings.testLocation", settings.locale), isOn: debugCoordOn)
                        if settings.debugCoord != nil {
                            TextField("lat,lng", text: coordText)
                                .keyboardType(.numbersAndPunctuation)
                                .autocorrectionDisabled().textInputAutocapitalization(.never)
                            // Quick-jump to a stage's coordinate (or far away).
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(stages) { stage in
                                        coordChip(stage.name) { settings.debugCoord = Geo.coordString(for: stage) }
                                    }
                                    coordChip(L.t("settings.testLocationFar", settings.locale)) {
                                        settings.debugCoord = Geo.farTestCoord
                                    }
                                }
                            }
                        }
                    }
                }

                Section(L.t("settings.about", settings.locale)) {
                    Text(L.t("about.disclaimer", settings.locale))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(L.t("settings.title", settings.locale))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(L.t("settings.done", settings.locale)) { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear { stages = settings.orderedAll(store.data?.stages ?? []) }
    }

    private func move(_ index: Int, by delta: Int) {
        let target = index + delta
        guard stages.indices.contains(index), stages.indices.contains(target) else { return }
        stages.swapAt(index, target)
        settings.setOrder(stages)
    }
}
