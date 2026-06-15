import Foundation

public enum Fmt {
    public static let budapest = TimeZone(identifier: "Europe/Budapest")!

    private static func timeFormatter() -> DateFormatter {
        let f = DateFormatter()
        f.timeZone = budapest
        f.locale = Locale(identifier: "en_GB")
        f.dateFormat = "HH:mm"
        return f
    }

    /// "HH:mm" in festival-local time.
    public static func hhmm(_ date: Date) -> String { timeFormatter().string(from: date) }

    /// "HH:mm – HH:mm" (end optional).
    public static func range(_ start: Date, _ end: Date?) -> String {
        guard let end else { return hhmm(start) }
        return "\(hhmm(start))–\(hhmm(end))"
    }

    /// Parse a festival-day string ("YYYY-MM-DD") to a stable Date (Budapest noon).
    public static func day(_ s: String) -> Date? {
        let f = DateFormatter()
        f.timeZone = budapest
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        guard let d = f.date(from: s) else { return nil }
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
        let f = DateFormatter()
        f.timeZone = budapest
        f.locale = Locale(identifier: locale == .hu ? "hu_HU" : "en_US")
        f.dateFormat = "EEEE"
        let s = f.string(from: date)
        return s.prefix(1).uppercased() + s.dropFirst()
    }

    /// Festival day (Budapest calendar date) for an absolute instant.
    public static func festivalDay(_ date: Date) -> String {
        let f = DateFormatter()
        f.timeZone = budapest
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
}
