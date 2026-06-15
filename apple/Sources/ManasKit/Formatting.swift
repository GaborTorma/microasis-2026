import Foundation

public enum Fmt {
    public static let budapest = TimeZone(identifier: "Europe/Budapest")!

    // Cached formatters — DateFormatter creation is expensive and these run in
    // hot paths (per-event / per-hour in the timetable, every second in NowView).
    private static let time = formatter(locale: "en_GB", format: "HH:mm")
    private static let ymd = formatter(locale: "en_US_POSIX", format: "yyyy-MM-dd")
    private static let weekdayHU = formatter(locale: "hu_HU", format: "EEEE")
    private static let weekdayEN = formatter(locale: "en_US", format: "EEEE")

    private static func formatter(locale: String, format: String) -> DateFormatter {
        let f = DateFormatter()
        f.timeZone = budapest
        f.locale = Locale(identifier: locale)
        f.dateFormat = format
        return f
    }

    /// "HH:mm" in festival-local time.
    public static func hhmm(_ date: Date) -> String { time.string(from: date) }

    /// True when `date` lands on midnight — a festival-day boundary.
    public static func isMidnight(_ date: Date) -> Bool { hhmm(date) == "00:00" }

    /// "HH:mm – HH:mm" (end optional), with spaces around the dash.
    public static func range(_ start: Date, _ end: Date?) -> String {
        guard let end else { return hhmm(start) }
        return "\(hhmm(start)) – \(hhmm(end))"
    }

    /// Parse a festival-day string ("YYYY-MM-DD") to a stable Date (Budapest noon).
    public static func day(_ s: String) -> Date? {
        guard let d = ymd.date(from: s) else { return nil }
        return d.addingTimeInterval(12 * 3600)
    }

    /// "07.08" from a "YYYY-MM-DD" day string.
    public static func mmdd(_ dayString: String) -> String {
        let parts = dayString.split(separator: "-")
        guard parts.count == 3 else { return dayString }
        return "\(parts[1]).\(parts[2])"
    }

    /// Full localized weekday ("Szerda" / "Wednesday").
    public static func weekday(_ dayString: String, _ locale: AppLocale) -> String {
        guard let date = day(dayString) else { return "" }
        let s = (locale == .hu ? weekdayHU : weekdayEN).string(from: date)
        return s.prefix(1).uppercased() + s.dropFirst()
    }

    /// Festival day (Budapest calendar date) for an absolute instant.
    public static func festivalDay(_ date: Date) -> String { ymd.string(from: date) }
}
