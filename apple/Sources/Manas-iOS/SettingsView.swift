import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var store: ScheduleStore
    @EnvironmentObject var settings: Settings
    @Environment(\.dismiss) private var dismiss
    @State private var stages: [StageDTO] = []

    private var localeBinding: Binding<AppLocale> {
        Binding(get: { settings.locale }, set: { settings.locale = $0 })
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
                Section {
                    ForEach(stages) { stage in
                        HStack(spacing: 10) {
                            Circle().fill(Color(hex: stage.color)).frame(width: 12, height: 12)
                            Text(stage.name)
                                .foregroundStyle(settings.hidden.contains(stage.slug) ? Theme.creamFaint : Theme.cream)
                            Spacer()
                            Button {
                                settings.toggleHidden(stage.slug)
                            } label: {
                                Image(systemName: settings.hidden.contains(stage.slug) ? "eye.slash" : "eye")
                                    .foregroundStyle(settings.hidden.contains(stage.slug) ? Theme.creamFaint : Theme.sun)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .onMove { from, to in
                        stages.move(fromOffsets: from, toOffset: to)
                        settings.setOrder(stages)
                    }
                } header: {
                    Text(L.t("settings.stages", settings.locale))
                } footer: {
                    Text(L.t("settings.reorderHint", settings.locale))
                }
            }
            .environment(\.editMode, .constant(.active))
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
}
