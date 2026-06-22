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

    /// Playable events for a stage, sorted by start time — mirrors
    /// `ScheduleStore.events(forStage:)` (which is MainActor-bound and can't be
    /// reached from a timeline provider).
    static func events(_ data: ScheduleData, stageSlug slug: String) -> [EventDTO] {
        data.events
            .filter { $0.stageSlug == slug && $0.isPlayable }
            .sorted { $0.startsAt < $1.startsAt }
    }

    /// Widget language follows the device (no App Group ⇒ no access to the
    /// app's manual override). Hungarian device ⇒ HU, else EN.
    static var locale: AppLocale {
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
