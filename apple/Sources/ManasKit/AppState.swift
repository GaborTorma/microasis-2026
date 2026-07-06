import Foundation
import Combine
import CoreGraphics

/// Hard cap on how many stage columns the iOS timetable shows at once.
public let maxColumns = 5

/// Shared storage so the watch widget (a separate process) can read the watch
/// app's chosen language. Backed by an App Group on the watch app + widget;
/// falls back to `.standard` on targets without the entitlement (e.g. iOS).
public enum SharedDefaults {
    public static let appGroupID = "group.ai.torma.manas.2026"
    public static let suite = UserDefaults(suiteName: appGroupID) ?? .standard
    public static let localeKey = "manas.locale"
    /// QA debug clock, mirrored here so the watch widget (its own process) sees
    /// the same overridden "now" as the app. nil/absent ⇒ real time.
    public static let debugNowKey = "manas.debugNow"
}

/// Canonical outbound links. The native share sheet hands out `share` (the `/app`
/// showcase page); the QR encodes `qr` (`/get`), which routes the scanner: iPhone →
/// App Store, anything else → the web app. Apple ID matches `apple/CLAUDE.md`.
public enum AppLinks {
    public static let appStore = URL(string: "https://apps.apple.com/app/id6782099675")!
    public static let share = URL(string: "https://manas.torma.ai/app")!
    // Baked into the watch share asset (Sources/Manas-watch/Assets.xcassets/ShareQR…)
    // since watchOS has no CoreImage. Change this → re-run apple/scripts/build_share_qr.py.
    public static let qr = URL(string: "https://manas.torma.ai/get")!
    public static let privacy = URL(string: "https://manas.torma.ai/privacy")!
    public static let support = URL(string: "https://manas.torma.ai/support")!
    /// The app maker's site, linked from the "Made by" credit in settings.
    public static let maker = URL(string: "https://torma.ai")!

    /// Custom scheme for widget → app deep links (registered in `project.yml`
    /// on the iOS app target).
    public static let scheme = "manas"
    /// `manas://stage/<slug>` — tapping a home widget opens the timetable with
    /// that stage as the leading column (`RootView.onOpenURL`).
    public static func stageDeepLink(_ slug: String) -> URL? {
        URL(string: "\(scheme)://stage/\(slug)")
    }
}

/// Post-festival GROUNDING Days window + link. Web-only NowView parity (mirrors
/// `pwa/lib/grounding.ts`); not part of the wire contract. Budapest +02:00
/// literals — the window starts as the last acts end (12 Jul 19:00) and runs to
/// 15 Jul 12:00, overriding both the live grid and the "ended" screen.
public enum Grounding {
    public static let url = URL(string: "https://grounding.manasfestival.eu")!
    public static let start = Fmt.parseDateTime("2026-07-12T19:00:00+02:00")!
    public static let end = Fmt.parseDateTime("2026-07-15T12:00:00+02:00")!
}

/// User preferences: stage order, hidden stages, language, and how many stage
/// columns the timetable shows at once. Persisted locally (each device keeps
/// its own — phone and watch are independent apps).
@MainActor
public final class Settings: ObservableObject {
    private let defaults = UserDefaults.standard
    private enum Key {
        static let order = "manas.order", hidden = "manas.hidden", locale = SharedDefaults.localeKey
        static let columns = "manas.columns", fontSize = "manas.fontSize", debugNow = "manas.debugNow"
        static let debugCoord = "manas.debugCoord"
    }

    @Published public var order: [String] { didSet { defaults.set(order, forKey: Key.order) } }
    @Published public var hidden: Set<String> { didSet { defaults.set(Array(hidden), forKey: Key.hidden) } }
    @Published public var locale: AppLocale { didSet { defaults.set(locale.rawValue, forKey: Key.locale); syncSharedLocale() } }
    /// How many stage columns are shown at once (1…maxColumns).
    @Published public var columns: Int { didSet { defaults.set(columns, forKey: Key.columns) } }
    /// Text-size step 1…5 — drives both the font scale and the block heights.
    @Published public var fontSize: Int { didSet { defaults.set(fontSize, forKey: Key.fontSize) } }
    /// QA-only override for "now" (TestFlight/DEBUG); nil = real time. Shares
    /// the `manas.debugNow` defaults key with `Fmt.now`.
    @Published public var debugNow: Date? {
        didSet {
            if let d = debugNow {
                let iso = Self.isoOut.string(from: d)
                defaults.set(iso, forKey: Key.debugNow)
                // Mirror to the App Group so the watch widget shares the clock.
                SharedDefaults.suite.set(iso, forKey: SharedDefaults.debugNowKey)
            } else {
                defaults.removeObject(forKey: Key.debugNow)
                SharedDefaults.suite.removeObject(forKey: SharedDefaults.debugNowKey)
            }
        }
    }
    /// QA-only override for the device coordinate ("lat,lng"); nil = real
    /// CoreLocation. Shares the `manas.debugCoord` key with `Geo.debugCoordinate`.
    @Published public var debugCoord: String? {
        didSet {
            if let c = debugCoord { defaults.set(c, forKey: Key.debugCoord) }
            else { defaults.removeObject(forKey: Key.debugCoord) }
        }
    }

    public init() {
        order = defaults.stringArray(forKey: Key.order) ?? []
        // No stages hidden by default; users can hide any stage in settings.
        hidden = Set(defaults.stringArray(forKey: Key.hidden) ?? [])
        locale = AppLocale(rawValue: defaults.string(forKey: Key.locale) ?? "") ?? Settings.deviceDefaultLocale
        // `integer(forKey:)` (not `object as? Int`) so a value injected via the
        // launch-argument domain — a string, e.g. the screenshot harness's
        // `-manas.columns 3` — is parsed too; absence still falls back to 3.
        columns = defaults.object(forKey: Key.columns) != nil ? defaults.integer(forKey: Key.columns) : 3
        fontSize = defaults.object(forKey: Key.fontSize) != nil ? defaults.integer(forKey: Key.fontSize) : 3
        debugNow = defaults.string(forKey: Key.debugNow).flatMap(Fmt.parseDateTime)
        debugCoord = defaults.string(forKey: Key.debugCoord)
        syncSharedLocale()
        syncSharedDebugNow()   // didSet doesn't fire on the init assignment above
    }

    /// Mirror the resolved locale into the shared App Group so the watch widget
    /// follows the same language as the app (explicit toggle or device default).
    private func syncSharedLocale() {
        SharedDefaults.suite.set(locale.rawValue, forKey: Key.locale)
    }

    /// Mirror the QA debug clock into the App Group so the watch widget shares it.
    private func syncSharedDebugNow() {
        if let d = debugNow {
            SharedDefaults.suite.set(Self.isoOut.string(from: d), forKey: SharedDefaults.debugNowKey)
        } else {
            SharedDefaults.suite.removeObject(forKey: SharedDefaults.debugNowKey)
        }
    }

    /// Reused formatter for writing the QA debug clock to defaults / the App Group.
    private static let isoOut = ISO8601DateFormatter()

    /// Font scale for the chosen text size: 1…5 → 0.9…1.7 (step 0.2).
    public var fontScale: CGFloat { 0.7 + CGFloat(min(max(fontSize, 1), 5)) * 0.2 }

    public func adjustFontSize(by delta: Int) {
        fontSize = min(max(fontSize + delta, 1), 5)
    }

    /// Default language follows the device: Hungarian device ⇒ HU, else EN.
    /// `nonisolated` so the watch widget (a separate, non-MainActor process) can
    /// reuse the exact same rule instead of re-deriving it.
    public nonisolated static var deviceDefaultLocale: AppLocale {
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

    private let api = APIClient()

    public init() {}

    public func load() async {
        guard !isLoading else { return }   // a foreground refresh shouldn't stack a second fetch
        if data == nil, let cached = api.cachedSchedule() {
            data = cached
            offline = true
        }
        isLoading = true
        do {
            let fresh = try await api.fetchSchedule()
            data = fresh
            offline = false
        } catch {
            offline = data != nil
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
