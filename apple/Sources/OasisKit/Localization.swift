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
        "app.title": ("MicrOasis 2026", "MicrOasis 2026"),
        // Intentionally English in both locales — matches the App Store name
        // "Guide for MicrOasis 2026" and frames the name as referential (nominative) use.
        "app.guidefor": ("Guide for", "Guide for"),
        "app.unofficial": ("Nem hivatalos", "Unofficial"),
        "nav.timetable": ("Időrend", "Timetable"),
        "nav.now": ("Most", "Now"),
        "nav.share": ("Megosztás", "Share"),
        "now.playingNow": ("Most játszik", "Playing now"),
        "now.upNext": ("Következik", "Up next"),
        "now.until": ("eddig", "until"),
        "now.nothing": ("Most nincs program", "Nothing on right now"),
        "now.ended": ("Jövőre újra találkozunk", "See you again next year"),
        "now.endedEyebrow": ("A fesztiválnak vége", "The festival is over"),
        "now.countdown": ("Visszaszámlálás", "Countdown"),
        // Opening-day camp scene (festival start → the first act).
        "now.tent.title": ("Épül a tábor", "Setting up camp"),
        "now.tent.body": (
            "Keress magadnak egy jó helyet, verd fel a sátrad és készülj fel az első szettre!",
            "Find yourself a good spot, pitch your tent and get ready for the first set!"),
        // Closing camp scene (last act → festival end).
        "now.teardown.title": ("Bontjuk a tábort", "Breaking camp"),
        "now.teardown.body": (
            "Az utolsó szett is lement. Szedd össze a cuccod, hagyd magad után tisztán a helyet — és köszönjük, hogy itt voltál!",
            "The last set is over. Pack up, leave your spot as clean as you found it — and thank you for being here!"),
        "time.days": ("nap", "days"),
        "time.hours": ("óra", "hrs"),
        "time.minutes": ("perc", "min"),
        "time.seconds": ("mp", "sec"),
        "common.loading": ("Betöltés…", "Loading…"),
        "common.error": ("Nem sikerült betölteni", "Couldn't load"),
        "common.break": ("Szünet", "Break"),
        "common.offline": ("Offline – mentett adat", "Offline – cached data"),
        "settings.title": ("Beállítások", "Settings"),
        "settings.stages": ("Színpadok", "Stages"),
        "settings.language": ("Nyelv", "Language"),
        "settings.done": ("Kész", "Done"),
        "settings.about": ("Névjegy", "About"),
        "settings.privacy": ("Adatvédelem", "Privacy Policy"),
        "settings.support": ("Támogatás", "Support"),
        "about.disclaimer": (
            "Ez egy nem hivatalos, csak egy lelkes fesztiválozó által készített app — nem a MicrOasis fesztivál hivatalos szoftvere vagy terméke. Nem áll kapcsolatban a fesztivállal vagy annak szervezőivel; a szervezőség nem vállal érte felelősséget.",
            "This is an unofficial app made by an enthusiastic festival-goer — not the official software or product of the MicrOasis festival. It is not affiliated with the festival or its organizers, who accept no responsibility for it."),
        "about.madeprefix": ("Készítette:", "Made by"),
        "about.makername": ("Torma Gábor", "Gábor Torma"),
        "disclaimer.title": ("Nem hivatalos alkalmazás", "Unofficial app"),
        "disclaimer.ok": ("Értem", "Got it"),
        // Share sheet — mirrors the web /share page.
        "share.title": ("Add tovább!", "Pass it on!"),
        "share.body": (
            "Olvastasd be valakivel ezt a kódot,\nés már meg is osztottad az appot.",
            "Let a friend scan this code,\nand you've shared the app."),
        "share.button": ("Megosztás", "Share"),
        "share.invite": ("Nézd meg a MicrOasis 2026 programját 🎶", "Check out the MicrOasis 2026 schedule 🎶"),
        "settings.testing": ("Teszt", "Testing"),
        "settings.testTime": ("Teszt idő", "Test time"),
        "settings.testLocation": ("Teszt hely", "Test location"),
        "settings.testLocationFar": ("Távol", "Far away"),
        "watch.noEvents": ("Nincs program ezen a színpadon", "No programme on this stage"),
        "watch.noProgram": ("Ekkor nincs program", "Nothing on at this time"),
        // Favorites (tap-to-toggle labels + the timetable dim-filter).
        "fav.add": ("Hozzáadás a kedvencekhez", "Add to favorites"),
        "fav.remove": ("Eltávolítás a kedvencekből", "Remove from favorites"),
        "fav.filter": ("Kedvencek kiemelése", "Highlight favorites"),
    ]

    public static func t(_ key: String, _ locale: AppLocale) -> String {
        guard let entry = table[key] else { return key }
        return locale == .hu ? entry.hu : entry.en
    }
}
