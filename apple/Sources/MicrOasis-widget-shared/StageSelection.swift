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

    /// Favorited event slugs the watch app mirrors into the App Group
    /// (`FavoritesStore`). Empty until the app first writes them.
    static var favorites: Set<String> {
        Set(SharedDefaults.suite.stringArray(forKey: SharedDefaults.favoritesKey) ?? [])
    }

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

/// Shared stage-list loading for the per-platform entity queries below.
private enum StageDirectory {
    /// (slug, display name) for every stage, in schedule order.
    static func all() async -> [(slug: String, name: String)] {
        let data = await WidgetSchedule.load()
        return (data?.stages ?? [])
            .sorted { $0.sortOrder < $1.sortOrder }
            .map { ($0.slug, $0.name) }
    }

    /// Never fails: a configured slug must survive resolution even when the
    /// schedule is unreachable, or the widget silently falls back to the
    /// default stage. Slugs are the stable cross-platform key, so an entity
    /// synthesized from the bare identifier is always valid (the display name
    /// only matters in the configuration UI, where the real list is loaded).
    static func resolve(_ identifiers: [String]) async -> [(slug: String, name: String)] {
        let all = await all()
        return identifiers.map { id in
            all.first { $0.slug == id } ?? (id, id.capitalized)
        }
    }
}

/// Per-instance configuration: which stage this widget shows. Leave unset to
/// follow the festival's default stage — so adding the widget without
/// configuring it still shows something useful.
///
/// EVERY AppIntents type NAME below (intent, entity, query) is a bundle-wide
/// AppIntents identifier, and the iOS app bundle carries TWO widget extensions
/// (its own + the embedded watch app's), so the two platforms must not declare
/// ANY AppIntents type with the same name: a duplicate intent name broke
/// configuration persistence (SpringBoard stored empty parameters), and a
/// duplicate entity name broke deserialization in the widget process
/// ("StageEntity is not a registered AppEntity identifier" → stage always
/// nil). watchOS owns the plain `StageSelectionIntent`/`StageEntity`/
/// `StageQuery` names — never rename them, that resets every configured
/// complication — and iOS gets `Home`-prefixed twins, typealiased so shared
/// code compiles against `StageEntity`/`StageIntent` on both platforms.
#if os(watchOS)
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
        await StageDirectory.resolve(identifiers).map { StageEntity(id: $0.slug, name: $0.name) }
    }

    func suggestedEntities() async throws -> [StageEntity] {
        await StageDirectory.all().map { StageEntity(id: $0.slug, name: $0.name) }
    }
}
#else
typealias StageEntity = HomeStageEntity

/// A festival stage the user can pin a widget instance to. `id` is the slug.
struct HomeStageEntity: AppEntity {
    let id: String
    let name: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Színpad"
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }

    static var defaultQuery = HomeStageQuery()
}

/// Supplies the stage list to the widget configuration UI, fetched live from
/// the API (the DB is the source of truth for stages).
struct HomeStageQuery: EntityQuery {
    func entities(for identifiers: [HomeStageEntity.ID]) async throws -> [HomeStageEntity] {
        await StageDirectory.resolve(identifiers).map { HomeStageEntity(id: $0.slug, name: $0.name) }
    }

    func suggestedEntities() async throws -> [HomeStageEntity] {
        await StageDirectory.all().map { HomeStageEntity(id: $0.slug, name: $0.name) }
    }
}
#endif

/// See the identifier-collision note above: intent names must differ per
/// platform too.
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
