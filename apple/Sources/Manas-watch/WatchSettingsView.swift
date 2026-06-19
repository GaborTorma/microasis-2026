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
                            // Day wheel over the festival days + a time wheel —
                            // watchOS' combined date picker is unusable here.
                            Picker(L.t("settings.testTime", settings.locale), selection: dayBinding) {
                                ForEach(store.data?.days ?? [], id: \.self) { d in
                                    Text("\(Fmt.mmdd(d)) \(Fmt.weekday(d, settings.locale))").tag(d)
                                }
                            }
                            .labelsHidden()
                            DatePicker(L.t("settings.testTime", settings.locale), selection: timeBinding,
                                       displayedComponents: [.hourAndMinute])
                                .labelsHidden()
                        }
                        Toggle(L.t("settings.testLocation", settings.locale), isOn: debugCoordOn)
                        if settings.debugCoord != nil {
                            // Typing coordinates on a watch is impractical — pick a
                            // stage (or "far") and we use its known coordinate.
                            Picker(L.t("settings.testLocation", settings.locale), selection: coordBinding) {
                                ForEach(store.data?.stages ?? []) { s in
                                    Text(s.name).tag(Geo.coordString(for: s) ?? "")
                                }
                                Text(L.t("settings.testLocationFar", settings.locale)).tag(Geo.farTestCoord)
                            }
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
    private var dayBinding: Binding<String> {
        Binding(get: { Fmt.festivalDay(settings.debugNow ?? defaultDebugDate) },
                set: { recombine(day: $0, time: settings.debugNow ?? defaultDebugDate) })
    }
    private var timeBinding: Binding<Date> {
        Binding(get: { settings.debugNow ?? defaultDebugDate },
                set: { recombine(day: Fmt.festivalDay(settings.debugNow ?? defaultDebugDate), time: $0) })
    }
    private var defaultDebugCoord: String {
        store.data?.stages.first(where: { $0.isDefault }).flatMap(Geo.coordString) ?? Geo.farTestCoord
    }
    private var debugCoordOn: Binding<Bool> {
        Binding(get: { settings.debugCoord != nil },
                set: { settings.debugCoord = $0 ? (settings.debugCoord ?? defaultDebugCoord) : nil })
    }
    private var coordBinding: Binding<String> {
        Binding(get: { settings.debugCoord ?? defaultDebugCoord },
                set: { settings.debugCoord = $0 })
    }
    /// Combine the chosen festival day with the picked wall-clock H:M, read as
    /// Budapest time so it matches the schedule regardless of device zone.
    private func recombine(day: String, time: Date) {
        let parts = day.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return }
        var cal = Calendar(identifier: .gregorian); cal.timeZone = Fmt.budapest
        let t = Calendar.current.dateComponents([.hour, .minute], from: time)
        var c = DateComponents()
        c.year = parts[0]; c.month = parts[1]; c.day = parts[2]
        c.hour = t.hour; c.minute = t.minute
        settings.debugNow = cal.date(from: c)
    }

    private func move(_ index: Int, by delta: Int) {
        let target = index + delta
        guard stages.indices.contains(index), stages.indices.contains(target) else { return }
        stages.swapAt(index, target)
        settings.setOrder(stages)
    }
}
