import Foundation
import AppIntents
import WidgetKit

/// Schedule access for the widget extension. The widget shares the watch
/// app's schedule cache through the App Group container: the app refreshes it
/// on every launch/foreground and reloads the widget timelines, so a recent
/// cache lets the widget skip the network entirely. Its own (ETag-revalidated)
/// fetch covers long stretches when the app isn't opened.
enum WidgetSchedule {
    /// How recent the shared cache must be to be trusted without a fetch.
    /// Half the `.atEnd` worst case (≤12 h), so schedule edits still reach a
    /// never-opened app's widget within a timeline cycle or two.
    private static let cacheMaxAge: TimeInterval = 6 * 3600

    /// Recent shared cache if there is one; otherwise fetch (falling back to
    /// the cache regardless of age when offline). `APIClient` writes the cache
    /// as a side effect of `fetch`.
    static func load() async -> ScheduleData? {
        let api = APIClient()
        if let recent = api.cachedSchedule(maxAge: cacheMaxAge) { return recent }
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
        // Same device-default rule the app uses, so the two never drift.
        return Settings.deviceDefaultLocale
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
    /// Never fails: a configured slug must survive resolution even when the
    /// schedule is unreachable, or the widget silently falls back to the
    /// default stage. Slugs are the stable cross-platform key, so an entity
    /// synthesized from the bare identifier is always valid (the display name
    /// only matters in the configuration UI, where the real list is loaded).
    func entities(for identifiers: [StageEntity.ID]) async throws -> [StageEntity] {
        let all = await Self.allStages()
        #if DEBUG
        NSLog("MANASWIDGET entities(for: %@) -> %d known", identifiers.joined(separator: ","), all.count)
        #endif
        return identifiers.map { id in
            all.first { $0.id == id } ?? StageEntity(id: id, name: id.capitalized)
        }
    }

    func suggestedEntities() async throws -> [StageEntity] {
        let all = await Self.allStages()
        #if DEBUG
        NSLog("MANASWIDGET suggestedEntities -> %d", all.count)
        #endif
        return all
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
///
/// The type NAME is the AppIntents identifier, and the iOS app bundle carries
/// TWO widget extensions (its own + the embedded watch app's), so the two
/// platforms must not declare the same intent name — a duplicate identifier on
/// one device breaks configuration persistence. watchOS keeps the shipped
/// `StageSelectionIntent` name (renaming would reset users' configured
/// complications); iOS gets its own.
#if os(watchOS)
typealias StageIntent = StageSelectionIntent

struct StageSelectionIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Színpad"
    static var description = IntentDescription("Válaszd ki, melyik színpad műsorát mutassa a widget. Több példányt is felvehetsz, színpadonként egyet, és a Smart Stackben lapozhatsz köztük.")

    @Parameter(title: "Színpad")
    var stage: StageEntity?

    init() {}
}
#else
typealias StageIntent = HomeStageSelectionIntent

struct HomeStageSelectionIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Színpad"
    static var description = IntentDescription("Válaszd ki, melyik színpad műsorát mutassa a widget. Több példányt is felvehetsz, színpadonként egyet, és egymásra húzva paklit készíthetsz belőlük.")

    @Parameter(title: "Színpad")
    var stage: StageEntity?

    init() {}
}
#endif
