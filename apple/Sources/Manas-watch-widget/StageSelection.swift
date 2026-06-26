import Foundation
import AppIntents
import WidgetKit

/// Schedule access for the widget extension. The extension has its own
/// sandbox container, so this cache is populated by the widget's *own* fetches
/// — independent of the app (we deliberately don't share an App Group).
enum WidgetSchedule {
    /// Fresh schedule from the API, falling back to the last cached copy when
    /// offline. `APIClient` writes the cache as a side effect of `fetch`.
    static func load() async -> ScheduleData? {
        let api = APIClient()
        if let fresh = try? await api.fetchSchedule() { return fresh }
        return api.cachedSchedule()
    }

    /// The QA debug clock the app shares via the App Group, or nil for real
    /// time. Gated to DEBUG/TestFlight, like `Fmt.now` in the app.
    static var debugNow: Date? {
        guard AppEnv.debugToolsEnabled,
              let s = SharedDefaults.suite.string(forKey: SharedDefaults.debugNowKey)
        else { return nil }
        return Fmt.parseDateTime(s)
    }

    /// "Now" for the widget — the shared debug clock when set, else the real time.
    static var now: Date { debugNow ?? Date() }

    /// Widget language follows the watch app's setting, shared via the App Group.
    /// If the app hasn't written one yet, fall back to the device language (which
    /// is exactly the app's own device default). Hungarian ⇒ HU, else EN.
    static var locale: AppLocale {
        if let raw = SharedDefaults.suite.string(forKey: SharedDefaults.localeKey),
           let chosen = AppLocale(rawValue: raw) {
            return chosen
        }
        let code = Locale.current.language.languageCode?.identifier
            ?? Locale.preferredLanguages.first.map { String($0.prefix(2)) }
            ?? "en"
        return code.hasPrefix("hu") ? .hu : .en
    }
}

/// A festival stage the user can pin a widget instance to. `id` is the slug.
struct StageEntity: AppEntity {
    let id: String
    let name: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Színpad"
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }

    static var defaultQuery = StageQuery()
}

/// Supplies the stage list to the widget configuration UI, fetched live from
/// the API (the DB is the source of truth for stages).
struct StageQuery: EntityQuery {
    func entities(for identifiers: [StageEntity.ID]) async throws -> [StageEntity] {
        let all = await Self.allStages()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [StageEntity] {
        await Self.allStages()
    }

    private static func allStages() async -> [StageEntity] {
        let data = await WidgetSchedule.load()
        return (data?.stages ?? [])
            .sorted { $0.sortOrder < $1.sortOrder }
            .map { StageEntity(id: $0.slug, name: $0.name) }
    }
}

/// Per-instance configuration: which stage this widget shows. Leave unset to
/// follow the festival's default stage — so adding the widget without
/// configuring it still shows something useful.
struct StageSelectionIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Színpad"
    static var description = IntentDescription("Válaszd ki, melyik színpad műsorát mutassa a widget. Több példányt is felvehetsz, színpadonként egyet, és a Smart Stackben lapozhatsz köztük.")

    @Parameter(title: "Színpad")
    var stage: StageEntity?

    init() {}
}
