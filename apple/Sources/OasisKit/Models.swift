import Foundation

/// Bilingual string used throughout the API (EN + HU).
public struct I18nText: Codable, Hashable, Sendable {
    public let en: String
    public let hu: String
    public init(en: String, hu: String) { self.en = en; self.hu = hu }
}

public struct StageDTO: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let slug: String
    public let name: String
    public let subtitle: I18nText?
    public let color: String
    public let accent: String
    public let sortOrder: Int
    public let isDefault: Bool
    public let lat: Double?
    public let lng: Double?
    public let radiusM: Int?
}

/// Event kinds are kept as raw strings for forward-compatibility with the API.
/// `music` is a DJ set or live act, `break` a marked gap, and `yoga`/`workshop`
/// split the Yoga Terrace programme; `ceremony` is unused so far. Mirrors
/// `pwa/lib/types.ts` EventKind — new values decode fine (raw String).
public enum EventKind {
    public static let music = "music"
    public static let breakGap = "break"
    public static let workshop = "workshop"
    public static let yoga = "yoga"
    public static let ceremony = "ceremony"
}

public struct EventDTO: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let stageId: Int
    public let stageSlug: String
    /// Stable cross-platform event identity (seed-generated, mirrors
    /// `pwa/lib/types.ts`) — the favorites key. Optional because old API
    /// payloads and old disk caches lack it; decoding must not fail on them.
    public let slug: String?
    public let title: I18nText
    /// Performer / facilitator; nil where the act name is the title or none exists.
    public let artist: String?
    public let startsAt: Date
    public let endsAt: Date?
    public let kind: String
    public let langAvailability: String?
    /// Festival day (Europe/Budapest calendar date), "YYYY-MM-DD".
    public let day: String

    public var isBreak: Bool { kind == EventKind.breakGap }
    /// Events that actually occupy a slot a watcher would care about.
    public var isPlayable: Bool { kind != EventKind.breakGap }
    /// On stage at `now` (open-ended events count only at their start instant).
    public func isLive(at now: Date) -> Bool { startsAt <= now && (endsAt ?? startsAt) > now }
}

public struct FestivalDTO: Codable, Hashable, Sendable {
    public let name: String
    public let fullName: String
    public let unofficialNote: I18nText
    public let location: I18nText
    public let timezone: String
    public let startsAt: Date
    public let endsAt: Date
    public let website: String
}

public struct ScheduleData: Codable, Hashable, Sendable {
    public let festival: FestivalDTO
    public let stages: [StageDTO]
    public let days: [String]
    public let events: [EventDTO]
}

// MARK: - Decoding helpers

public extension JSONDecoder {
    /// Decoder tolerant of the two ISO-8601 shapes the API emits:
    /// `2026-08-21T15:30:00.000Z` (events) and `2026-08-20T12:00:00+02:00`
    /// (festival window). Built once — the two formatters live in the closure.
    static let microasis: JSONDecoder = {
        let decoder = JSONDecoder()
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        decoder.dateDecodingStrategy = .custom { d in
            let raw = try d.singleValueContainer().decode(String.self)
            if let date = withFraction.date(from: raw) ?? plain.date(from: raw) {
                return date
            }
            throw DecodingError.dataCorrupted(
                .init(codingPath: d.codingPath, debugDescription: "Bad date: \(raw)")
            )
        }
        return decoder
    }()
}
