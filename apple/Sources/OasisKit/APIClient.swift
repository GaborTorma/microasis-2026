import Foundation

/// Talks to the same Neon-backed JSON API the PWA uses.
public struct APIClient: Sendable {
    /// QA override (`-microasis.apiBase http://localhost:3000/api`) so a simulator
    /// can exercise a local dev server; DEBUG/TestFlight only, like the debug clock.
    public static let baseURL: URL = {
        if AppEnv.debugToolsEnabled,
           let raw = UserDefaults.standard.string(forKey: "microasis.apiBase"),
           let url = URL(string: raw) {
            return url
        }
        return URL(string: "https://microasis.torma.ai/api")!
    }()

    private let session: URLSession
    public init(session: URLSession = .shared) { self.session = session }

    public func fetchSchedule() async throws -> ScheduleData {
        try await get("schedule", as: ScheduleData.self, cache: "schedule.json")
    }

    private func get<T: Decodable>(_ path: String, as type: T.Type, cache name: String,
                                   retried: Bool = false) async throws -> T {
        let url = Self.baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 20
        // Revalidate instead of re-downloading: while the cached body is still
        // on disk, a matching ETag turns the response into a bodyless 304.
        if !retried, let etag = Self.readEtag(name), Self.readCache(name) != nil {
            request.setValue(etag, forHTTPHeaderField: "If-None-Match")
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        if http.statusCode == 304 {
            if let cached = Self.readCache(name), let value = try? JSONDecoder.microasis.decode(T.self, from: cached) {
                // Revalidated = fresh: rewrite so the file's modification date
                // re-arms maxAge readers (the widget's shared-cache window), and
                // a body read from the per-process path lands in the group.
                Self.writeCache(cached, name: name)
                return value
            }
            // The cache vanished (or no longer decodes) since the header was
            // set — drop the stale ETag and fetch the full body once. A 304
            // to that unconditional retry is a protocol violation; give up.
            guard !retried else { throw URLError(.badServerResponse) }
            Self.deleteEtag(name)
            return try await get(path, as: type, cache: name, retried: true)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let value = try JSONDecoder.microasis.decode(T.self, from: data)
        // Pair the writes: an etag must never outlive the body it validates,
        // or the next revalidation would 304 against a different body.
        if Self.writeCache(data, name: name), let etag = http.value(forHTTPHeaderField: "ETag") {
            Self.writeEtag(etag, name: name)
        } else {
            Self.deleteEtag(name)
        }
        return value
    }

    // MARK: Offline cache

    /// Persisted in Application Support (not Caches) so the OS never purges it
    /// under storage pressure — the schedule must survive offline, including a
    /// watch with no phone and no signal once it has loaded once.
    /// Targets entitled to the App Group (watch app + widget) share one copy in
    /// the group container, so the widget reuses the app's fetch instead of
    /// downloading its own; targets without it (iOS) keep their own container.
    private static func cacheURL(_ name: String) -> URL? {
        guard let group = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: SharedDefaults.appGroupID) else {
            return legacyCacheURL(name)
        }
        let dir = group.appendingPathComponent("Library/Application Support", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("microasis-\(name)")
    }

    /// Per-process fallback (the target's own container), used when the App
    /// Group container is unavailable. Also read on the way in, so a copy
    /// written before the group was reachable is still served.
    private static func legacyCacheURL(_ name: String) -> URL? {
        try? FileManager.default
            .url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("microasis-\(name)")
    }

    private static func readCache(_ name: String, maxAge: TimeInterval? = nil) -> Data? {
        for url in [cacheURL(name), legacyCacheURL(name)].compactMap({ $0 }) {
            guard let data = try? Data(contentsOf: url) else { continue }
            if let maxAge {
                let values = try? url.resourceValues(forKeys: [.contentModificationDateKey])
                guard let modified = values?.contentModificationDate,
                      Date().timeIntervalSince(modified) <= maxAge else { continue }
            }
            return data
        }
        return nil
    }

    @discardableResult
    static func writeCache(_ data: Data, name: String) -> Bool {
        guard let url = cacheURL(name) else { return false }
        return (try? data.write(to: url, options: .atomic)) != nil
    }

    /// The last successfully fetched schedule, or nil. With `maxAge`, only a
    /// copy written within that window counts — lets the widget trust a cache
    /// the watch app just refreshed instead of fetching its own.
    public func cachedSchedule(maxAge: TimeInterval? = nil) -> ScheduleData? {
        guard let data = Self.readCache("schedule.json", maxAge: maxAge) else { return nil }
        return try? JSONDecoder.microasis.decode(ScheduleData.self, from: data)
    }

    // MARK: ETag sidecar (same directory as the cached body)

    private static func etagURL(_ name: String) -> URL? {
        cacheURL(name)?.appendingPathExtension("etag")
    }

    private static func readEtag(_ name: String) -> String? {
        guard let url = etagURL(name), let data = try? Data(contentsOf: url) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func writeEtag(_ etag: String, name: String) {
        guard let url = etagURL(name) else { return }
        try? Data(etag.utf8).write(to: url, options: .atomic)
    }

    private static func deleteEtag(_ name: String) {
        guard let url = etagURL(name) else { return }
        try? FileManager.default.removeItem(at: url)
    }
}
