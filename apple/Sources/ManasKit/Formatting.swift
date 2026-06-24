import Foundation

public enum AppEnv {
    /// QA tools (the debug time override) are available in DEBUG builds and in
    /// TestFlight, but compiled-out behaviour-wise for App Store releases.
    public static let debugToolsEnabled: Bool = {
        #if DEBUG
        return true
        #else
        return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        #endif
    }()

    /// Screenshot-only escape hatch: when `manas.hideTestUI` is set the in-app
    /// "Testing" settings section is hidden even in DEBUG/TestFlight, so App
    /// Store / marketing captures don't show the QA time/location controls. The
    /// clock and coordinate overrides themselves keep working — only the UI is
    /// hidden. Undocumented, invisible default written by the screenshot harness.
    public static var hideTestUI: Bool {
        UserDefaults.standard.bool(forKey: "manas.hideTestUI")
    }
}

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

    /// Current instant. In DEBUG it can be overridden for simulator testing:
    ///   xcrun simctl spawn <udid> defaults write <bundle> manas.debugNow "2026-07-09 00:15"
    /// (also accepts a full ISO-8601 string). Compiled out of release builds.
    public static var now: Date {
        if AppEnv.debugToolsEnabled,
           let s = UserDefaults.standard.string(forKey: "manas.debugNow"),
           let d = parseDateTime(s) {
            return d
        }
        return Date()
    }

    /// Parse the debug clock value: a full ISO-8601 instant (what the in-app
    /// picker stores, and the recommended simctl form, e.g.
    /// "2026-07-09T00:15:00+02:00"), or a friendly Budapest-local
    /// "yyyy-MM-dd HH:mm". The `T` check keeps ISO from mis-reading the space
    /// form as a date-only value.
    public static func parseDateTime(_ s: String) -> Date? {
        if s.contains("T") { return ISO8601DateFormatter().date(from: s) }
        let f = DateFormatter()
        f.timeZone = budapest
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd HH:mm"
        return f.date(from: s)
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
