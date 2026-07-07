import Foundation
import Combine
#if canImport(WatchConnectivity)
import WatchConnectivity
#endif
import WidgetKit

/// Per-event favorite state. Keeping a timestamp per slug (not just a set)
/// makes the phone↔watch merge last-writer-wins *per item*, so concurrent
/// adds and removes on the two devices never wipe each other out.
public struct FavState: Codable, Equatable, Sendable {
    public var isFav: Bool
    /// Unix epoch seconds of the last local toggle of this slug.
    public var ts: TimeInterval
    public init(isFav: Bool, ts: TimeInterval) { self.isFav = isFav; self.ts = ts }
}

/// Favorited events, keyed by the wire `slug` (the stable cross-platform event
/// identity; breaks are never favoritable). Persists to UserDefaults, mirrors
/// the favorited-slug list into the App Group for the watch widget, and syncs
/// phone↔watch over WatchConnectivity.
@MainActor
public final class FavoritesStore: ObservableObject {
    /// UserDefaults key for the full per-slug state dict (JSON `Data`).
    public static let statesKey = "manas.favoriteStates"

    /// Slugs currently favorited — what the UI binds to.
    @Published public private(set) var favorites: Set<String> = []

    private var states: [String: FavState] = [:]
    private let defaults = UserDefaults.standard
    #if canImport(WatchConnectivity)
    private var sync: FavoritesSync?
    #endif

    public init() {
        if let data = defaults.data(forKey: Self.statesKey),
           let decoded = try? JSONDecoder().decode([String: FavState].self, from: data) {
            states = decoded
        }
        // Screenshot-harness override (DEBUG/TestFlight): a PRESENT
        // `-manas.startFavorites "slug1,slug2"` replaces the set for THIS launch
        // only (empty value → no favorites) — nothing is persisted, so shots stay
        // deterministic (like manas.debugNow). It also disables WCSession sync
        // below: a paired simulator's stale applicationContext once merged a
        // watch shot's favorite into the next run's iPhone shots.
        var harnessRun = false
        if AppEnv.debugToolsEnabled,
           let raw = defaults.string(forKey: "manas.startFavorites") {
            harnessRun = true
            let now = Date().timeIntervalSince1970
            states = Dictionary(uniqueKeysWithValues: raw.split(separator: ",").map {
                ($0.trimmingCharacters(in: .whitespaces), FavState(isFav: true, ts: now))
            })
        }
        favorites = Set(states.filter { $0.value.isFav }.keys)
        mirrorForWidget()
        #if canImport(WatchConnectivity)
        // isSupported() is false in app extensions (the widget process must
        // never activate a session) and on iPad — only real apps sync.
        if !harnessRun, WCSession.isSupported() { sync = FavoritesSync(store: self) }
        #endif
    }

    public func isFavorite(_ slug: String) -> Bool { favorites.contains(slug) }

    /// Flip a slug's favorite state, stamping it with "now" so the other
    /// device can merge by recency. Persists, mirrors, and syncs.
    public func toggle(_ slug: String) {
        let next = !(states[slug]?.isFav ?? false)
        states[slug] = FavState(isFav: next, ts: Date().timeIntervalSince1970)
        applyAndPersist()
        #if canImport(WatchConnectivity)
        sync?.send(encodedStates())
        #endif
    }

    // MARK: Sync plumbing

    /// The states dict as JSON — the application-context payload.
    fileprivate func encodedStates() -> Data { (try? JSONEncoder().encode(states)) ?? Data() }

    /// Merge a peer's states dict: per slug the higher timestamp wins; an
    /// exact tie keeps the favorited side (losing a favorite hurts more than
    /// keeping a stale one). If the merged view differs from the payload we
    /// received, send it back so both sides converge — and stop once they're
    /// equal, so there is no ping-pong loop.
    fileprivate func mergeReceived(_ data: Data) {
        guard let received = try? JSONDecoder().decode([String: FavState].self, from: data) else { return }
        var merged = states
        for (slug, theirs) in received {
            guard let ours = merged[slug] else { merged[slug] = theirs; continue }
            if theirs.ts > ours.ts {
                merged[slug] = theirs
            } else if theirs.ts == ours.ts, theirs.isFav != ours.isFav {
                merged[slug] = FavState(isFav: true, ts: theirs.ts)
            }
        }
        if merged != states {
            states = merged
            applyAndPersist()
        }
        #if canImport(WatchConnectivity)
        if merged != received { sync?.send(encodedStates()) }
        #endif
    }

    private func applyAndPersist() {
        favorites = Set(states.filter { $0.value.isFav }.keys)
        defaults.set(encodedStates(), forKey: Self.statesKey)
        mirrorForWidget()
    }

    /// Widget mirror: the sorted favorited slugs, readable from the widget
    /// process via the App Group (the widget never instantiates this store).
    private func mirrorForWidget() {
        SharedDefaults.suite.set(Array(favorites).sorted(), forKey: SharedDefaults.favoritesKey)
        // Both apps host a widget extension now (watch Smart Stack + iOS home
        // screen) — reload so the hearts repaint right after a toggle.
        WidgetCenter.shared.reloadAllTimelines()
    }
}

#if canImport(WatchConnectivity)
/// WCSession glue for `FavoritesStore`. Holds the store weakly (the store owns
/// this object); every inbound payload is merged on the MainActor.
private final class FavoritesSync: NSObject, WCSessionDelegate {
    private weak var store: FavoritesStore?

    @MainActor
    init(store: FavoritesStore) {
        self.store = store
        super.init()
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Publish the full states dict; the system hands the latest context to
    /// the counterpart app in the background (no reachability needed).
    func send(_ data: Data) {
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        try? session.updateApplicationContext(["favStates": data])
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        guard activationState == .activated else { return }
        // Fresh-install pull: adopt whatever the peer last published, then
        // publish our (merged) view so the peer converges too.
        let pending = session.receivedApplicationContext["favStates"] as? Data
        Task { @MainActor [weak self] in
            guard let store = self?.store else { return }
            if let pending { store.mergeReceived(pending) }
            self?.send(store.encodedStates())
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let data = applicationContext["favStates"] as? Data else { return }
        Task { @MainActor [weak self] in self?.store?.mergeReceived(data) }
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}
    // The phone can switch between paired watches; re-activate for the new one.
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
    #endif
}
#endif
