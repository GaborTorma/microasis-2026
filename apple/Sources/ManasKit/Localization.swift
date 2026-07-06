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
        // Intentionally English in both locales — matches the App Store name
        // "Guide for MANAS 2026" and frames the name as referential (nominative) use.
        "app.guidefor": ("Guide for", "Guide for"),
        "app.unofficial": ("Nem hivatalos", "Unofficial"),
        "nav.timetable": ("Időrend", "Timetable"),
        "nav.now": ("Most", "Now"),
        "nav.share": ("Megosztás", "Share"),
        "now.live": ("Most", "Live"),
        "now.playingNow": ("Most játszik", "Playing now"),
        "now.upNext": ("Következik", "Up next"),
        "now.until": ("eddig", "until"),
        "now.nothing": ("Most nincs program", "Nothing on right now"),
        "now.ended": ("Jövőre újra találkozunk", "See you again next year"),
        "now.endedEyebrow": ("A fesztiválnak vége", "The festival is over"),
        "now.countdown": ("Visszaszámlálás", "Countdown"),
        // Opening-day camp scene (festival start → Mandala opening ceremony).
        "now.tent.title": ("Épül a tábor", "Setting up camp"),
        "now.tent.body": (
            "Keress magadnak egy jó helyet, verd fel a sátrad és készülj fel a megnyitóra!",
            "Find yourself a good spot, pitch your tent and get ready for the opening!"),
        // Post-festival GROUNDING Days link.
        "now.grounding.eyebrow": ("Fesztivál után", "After the festival"),
        "now.grounding.title": ("GROUNDING Napok", "GROUNDING Days"),
        "now.grounding.when": ("Júl 12. 19:00 – Júl 15. 12:00", "Jul 12, 19:00 – Jul 15, 12:00"),
        "now.grounding.body": (
            "A fesztivál véget ért, de a folyamat még tart. A GROUNDING Napok lassú, 2,5 napos földet érés: integrációs műhelyek, pihenés, közös csend és feltöltődés, mielőtt hazaindulsz.",
            "The festival is over, but the process isn't. GROUNDING Days is a slow, 2.5-day landing — integration workshops, rest, shared stillness and recovery before you head home."),
        "now.grounding.cta": ("Részletek", "Details"),
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
        "settings.reorderHint": ("Húzd a sorrend módosításához", "Drag to reorder"),
        "settings.done": ("Kész", "Done"),
        "settings.about": ("Névjegy", "About"),
        "settings.privacy": ("Adatvédelem", "Privacy Policy"),
        "settings.support": ("Támogatás", "Support"),
        "about.disclaimer": (
            "Ez egy nem hivatalos, csak egy lelkes fesztiválozó által készített app — nem a MANAS Fesztivál hivatalos szoftvere vagy terméke. Nem áll kapcsolatban a fesztivállal vagy annak szervezőivel; a szervezőség nem vállal érte felelősséget.",
            "This is an unofficial app made by an enthusiastic festival-goer — not the official software or product of the MANAS Festival. It is not affiliated with the festival or its organizers, who accept no responsibility for it."),
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
        "share.invite": ("Nézd meg a MANAS 2026 programját 🎶", "Check out the MANAS 2026 schedule 🎶"),
        "settings.testing": ("Teszt", "Testing"),
        "settings.testTime": ("Teszt idő", "Test time"),
        "settings.testLocation": ("Teszt hely", "Test location"),
        "settings.testLocationFar": ("Távol", "Far away"),
        "days.short": ("nap", "day"),
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
