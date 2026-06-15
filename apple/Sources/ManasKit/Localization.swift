import Foundation

public enum AppLocale: String, CaseIterable, Sendable {
    case hu, en
    public var label: String { rawValue.uppercased() }
}

public extension I18nText {
    func text(_ locale: AppLocale) -> String { locale == .hu ? hu : en }
}

/// Small UI string table (the API supplies all schedule content; these are the
/// few chrome labels). HU first, EN second.
public enum L {
    private static let table: [String: (hu: String, en: String)] = [
        "app.title": ("Manas 2026", "Manas 2026"),
        "app.unofficial": ("Nem hivatalos app", "Unofficial guide"),
        "nav.timetable": ("Időrend", "Timetable"),
        "nav.now": ("Most", "Now"),
        "now.live": ("Most", "Live"),
        "now.playingNow": ("Most játszik", "Playing now"),
        "now.upNext": ("Következik", "Up next"),
        "now.until": ("eddig", "until"),
        "now.nothing": ("Most nincs program", "Nothing on right now"),
        "now.ended": ("A fesztivál véget ért", "The festival has ended"),
        "now.countdown": ("Visszaszámlálás", "Countdown"),
        "common.loading": ("Betöltés…", "Loading…"),
        "common.error": ("Nem sikerült betölteni", "Couldn't load"),
        "common.break": ("Szünet", "Break"),
        "common.offline": ("Offline – mentett adat", "Offline – cached data"),
        "settings.title": ("Beállítások", "Settings"),
        "settings.stages": ("Színpadok", "Stages"),
        "settings.reorderHint": ("Húzd a sorrend módosításához", "Drag to reorder"),
        "settings.done": ("Kész", "Done"),
        "days.short": ("nap", "day"),
        "watch.noEvents": ("Nincs program ezen a színpadon", "No programme on this stage"),
    ]

    public static func t(_ key: String, _ locale: AppLocale) -> String {
        guard let entry = table[key] else { return key }
        return locale == .hu ? entry.hu : entry.en
    }
}
