import Foundation

/// Talks to the same Neon-backed JSON API the PWA uses.
public struct APIClient: Sendable {
    public static let baseURL = URL(string: "https://manas2026.vercel.app/api")!

    private let session: URLSession
    public init(session: URLSession = .shared) { self.session = session }

    public func fetchSchedule() async throws -> ScheduleData {
        try await get("schedule", as: ScheduleData.self, cache: "schedule.json")
    }

    private func get<T: Decodable>(_ path: String, as type: T.Type, cache name: String) async throws -> T {
        let url = Self.baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 20

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let value = try JSONDecoder.manas.decode(T.self, from: data)
        Self.writeCache(data, name: name)
        return value
    }

    // MARK: Offline cache (best-effort)

    private static func cacheURL(_ name: String) -> URL? {
        try? FileManager.default
            .url(for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("manas-\(name)")
    }

    static func writeCache(_ data: Data, name: String) {
        guard let url = cacheURL(name) else { return }
        try? data.write(to: url, options: .atomic)
    }

    public func cachedSchedule() -> ScheduleData? {
        guard let url = Self.cacheURL("schedule.json"), let data = try? Data(contentsOf: url) else {
            return nil
        }
        return try? JSONDecoder.manas.decode(ScheduleData.self, from: data)
    }
}
