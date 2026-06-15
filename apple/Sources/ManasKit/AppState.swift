import Foundation
import Combine

/// Hard cap on how many stage columns the iOS timetable shows at once.
public let maxColumns = 4

/// User preferences: stage order, hidden stages, language, and how many stage
/// columns the timetable shows at once. Persisted locally (each device keeps
/// its own — phone and watch are independent apps).
@MainActor
public final class Settings: ObservableObject {
    private let defaults = UserDefaults.standard
    private enum Key {
        static let order = "manas.order", hidden = "manas.hidden", locale = "manas.locale", columns = "manas.columns"
    }

    @Published public var order: [String] { didSet { defaults.set(order, forKey: Key.order) } }
    @Published public var hidden: Set<String> { didSet { defaults.set(Array(hidden), forKey: Key.hidden) } }
    @Published public var locale: AppLocale { didSet { defaults.set(locale.rawValue, forKey: Key.locale) } }
    /// Visible stage columns (the timetable "zoom"): fewer = wider/larger.
    @Published public var columns: Int { didSet { defaults.set(columns, forKey: Key.columns) } }

    public init() {
        order = defaults.stringArray(forKey: Key.order) ?? []
        hidden = Set(defaults.stringArray(forKey: Key.hidden) ?? [])
        locale = AppLocale(rawValue: defaults.string(forKey: Key.locale) ?? "") ?? Settings.deviceDefaultLocale
        columns = (defaults.object(forKey: Key.columns) as? Int) ?? 3
    }

    /// Default language follows the device: Hungarian device ⇒ HU, else EN.
    public static var deviceDefaultLocale: AppLocale {
        let code = Locale.current.language.languageCode?.identifier
            ?? Locale.preferredLanguages.first.map { String($0.prefix(2)) }
            ?? "en"
        return code.hasPrefix("hu") ? .hu : .en
    }

    /// Clamp the stored preference to what's actually available (≤ visible stages).
    public func effectiveColumns(visibleStages n: Int) -> Int {
        min(max(columns, 1), max(1, min(maxColumns, n)))
    }

    /// Step the zoom by `delta` columns (more = +1, fewer = −1), clamped to the
    /// 1…available range. The single owner of the column-count contract.
    public func adjustColumns(by delta: Int, visibleStages n: Int) {
        columns = min(max(effectiveColumns(visibleStages: n) + delta, 1), max(1, min(maxColumns, n)))
    }

    public func toggleHidden(_ slug: String) {
        if hidden.contains(slug) { hidden.remove(slug) } else { hidden.insert(slug) }
    }

    public func toggleLocale() { locale = locale == .hu ? .en : .hu }

    /// All stages in the user's chosen order; unranked stages keep DB sortOrder.
    public func orderedAll(_ stages: [StageDTO]) -> [StageDTO] {
        let bySlug = Dictionary(stages.map { ($0.slug, $0) }, uniquingKeysWith: { a, _ in a })
        var result: [StageDTO] = []
        var seen = Set<String>()
        for slug in order { if let s = bySlug[slug] { result.append(s); seen.insert(slug) } }
        result += stages.filter { !seen.contains($0.slug) }.sorted { $0.sortOrder < $1.sortOrder }
        return result
    }

    public func orderedVisible(_ stages: [StageDTO]) -> [StageDTO] {
        orderedAll(stages).filter { !hidden.contains($0.slug) }
    }

    /// Persist a reordering produced by a drag-to-move list of all stages.
    public func setOrder(_ stages: [StageDTO]) { order = stages.map(\.slug) }
}

/// Loads the schedule: shows cached data instantly, then refreshes from network.
@MainActor
public final class ScheduleStore: ObservableObject {
    @Published public private(set) var data: ScheduleData?
    @Published public private(set) var isLoading = false
    @Published public private(set) var offline = false
    @Published public private(set) var failed = false

    private let api = APIClient()

    public init() {}

    public func load() async {
        guard !isLoading else { return }   // a foreground refresh shouldn't stack a second fetch
        if data == nil, let cached = api.cachedSchedule() {
            data = cached
            offline = true
        }
        isLoading = true
        failed = false
        do {
            let fresh = try await api.fetchSchedule()
            data = fresh
            offline = false
        } catch {
            offline = data != nil
            failed = data == nil
        }
        isLoading = false
    }

    /// Playable events for a stage, sorted by start time (across all days).
    public func events(forStage slug: String) -> [EventDTO] {
        (data?.events ?? [])
            .filter { $0.stageSlug == slug && $0.isPlayable }
            .sorted { $0.startsAt < $1.startsAt }
    }
}
