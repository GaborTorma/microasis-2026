// Generated content for the /privacy and /support pages.
// Source: hand-reviewed App Store release copy (HU/EN). The privacy claims were
// verified line-by-line against the iOS/watch source (Location.swift, APIClient.swift,
// AppState.swift) and the pwa schedule API. Edit here to update both pages.

export const privacyContent = {
  "lastUpdated": "2026-06-23",
  "summaryHu": "Nem gyűjtünk semmilyen személyes adatot. A Guide for MANAS 2026 egy ingyenes, nem hivatalos, rajongók által készített kísérőalkalmazás: nincs benne reklám, nincs alkalmazáson belüli vásárlás, és nincs fiók vagy regisztráció. Nincs benne analitika, nyomkövetés, és nem használ harmadik féltől származó SDK-t. A fesztiválprogram csak olvasásra, HTTPS-en keresztül töltődik le a https://manas2026.vercel.app/api/schedule címről, és az eszközön gyorsítótárba kerül, így az alkalmazás az első betöltés után offline is működik; ez a kérés semmilyen személyes adatot nem tartalmaz, és a szerver nem tárol rólad semmit. Ha megadod a helymeghatározási engedélyt, a helyzeted kizárólag az eszközön belül használjuk a legközelebbi színpad automatikus kiválasztásához, és soha nem küldjük el az eszközről. A beállításaid (színpadsorrend, elrejtett színpadok, nyelv, betűméret, oszlopszám) kizárólag helyben, az eszközödön tárolódnak. Az alkalmazás nem áll kapcsolatban a Manas fesztivállal vagy szervezőivel, nem azok támogatásával vagy jóváhagyásával készült.",
  "summaryEn": "We do not collect any personal data. Guide for MANAS 2026 is a free, unofficial, fan-made companion app with no ads, no in-app purchases, and no accounts or sign-up. It has no analytics, no tracking, and no third-party SDKs. The festival schedule is fetched read-only over HTTPS from https://manas2026.vercel.app/api/schedule and cached on your device so the app works offline after the first load; that request carries no personal information and the server stores nothing about you. If you grant location permission, your location is used only on your device to auto-select the nearest stage and is never transmitted off the device. Your settings (stage order, hidden stages, language, text size, column count) are stored only locally on your device. This app is not affiliated with, endorsed by, or sponsored by the Manas festival or its organizers.",
  "sections": [
    {
      "headingHu": "Milyen adatokat gyűjtünk",
      "headingEn": "Data we collect",
      "bodyHu": "Semmilyet. Az alkalmazás nem gyűjt, nem tárol és nem továbbít rólad semmilyen személyes adatot. Nincs fiók, nincs bejelentkezés, nincs regisztráció, és az alkalmazás soha nem kéri a nevedet, e-mail-címedet vagy bármilyen más személyes adatodat. Az alkalmazás semmilyen rólad szóló adatot nem küld nekünk vagy bárki másnak.",
      "bodyEn": "None. The app does not collect, store, or transmit any personal data about you. There are no accounts, no login, no sign-up, and you are never asked for your name, email, or any other personal information inside the app. The app sends no data about you to us or to anyone else."
    },
    {
      "headingHu": "Helymeghatározás",
      "headingEn": "Location",
      "bodyHu": "A helymeghatározás használata opcionális. Ha megadod a helymeghatározási engedélyt (Az alkalmazás használata közben), az alkalmazás alkalmanként egyszeri, durva felbontású (nagyjából 100 m pontosságú) helymeghatározást végez az eszközödön, kizárólag azért, hogy kiszámítsa, melyik színpadhoz állsz a legközelebb, és kiemelhesse vagy automatikusan kiválaszthassa azt. Ez a számítás teljes egészében az eszközödön történik. A helyzetedet soha nem küldjük el a szerverünkre vagy bármely harmadik félnek, a felhasználás után nem tároljuk, és soha nem használjuk reklámozásra vagy nyomkövetésre. Ha elutasítod vagy kikapcsolod a helymeghatározási engedélyt, az alkalmazás többi része normálisan működik; csak a legközelebbi színpad kényelmi funkciója nem lesz elérhető.",
      "bodyEn": "Location use is optional. If you grant location permission (While Using the App), the app takes occasional one-time, coarse (roughly 100 m accuracy) location fixes from your device only to work out which stage you are standing nearest to, so it can highlight or auto-select that stage. This calculation happens entirely on your device. Your location is never sent to our server or any third party, never stored after it is used, and never used for advertising or tracking. If you deny or turn off location permission, the rest of the app works normally; only the nearest-stage convenience feature is unavailable."
    },
    {
      "headingHu": "Hálózat és programadatok",
      "headingEn": "Network and schedule data",
      "bodyHu": "A program megjelenítéséhez az alkalmazás csak olvasásra szolgáló HTTPS-kéréseket küld a https://manas2026.vercel.app/api/schedule címre. Ez a kérés a nyilvános fesztiválprogramot tölti le (fesztiváladatok, színpadok és eseményidőpontok), és a szokásos technikai adatokon túl, amelyeket minden HTTPS-kérés tartalmaz, semmilyen rólad vagy az eszközödről szóló személyes adatot nem küld. A végpont egy nyilvános, csak olvasható GET-kérés, amely nem fogad paramétert, és mindenkinek ugyanazt a programot adja vissza; a szerver nem naplóz, nem profiloz és nem tárol rólad semmilyen, az alkalmazással kapcsolatos információt. Az alkalmazás semmilyen más hálózati hívást nem végez.",
      "bodyEn": "To show the timetable, the app makes read-only HTTPS requests to https://manas2026.vercel.app/api/schedule. This request fetches the public festival schedule (festival info, stages, and event times) and contains no personal information about you or your device beyond the standard technical details any HTTPS request includes. The endpoint is a public, read-only GET that takes no parameters and returns the same schedule to everyone; the server does not log, profile, or store any information about you in connection with the app. The app makes no other network calls."
    },
    {
      "headingHu": "Eszközön tárolt adatok",
      "headingEn": "On-device storage",
      "bodyHu": "A letöltött programot az alkalmazás az eszközödön gyorsítótárazza, hogy az alkalmazás (és az órás alkalmazás) az első betöltés után offline is működjön. A beállításaid, mint a színpadsorrend, az elrejtett színpadok, a nyelv, a betűméret és az oszlopszám, kizárólag az eszköz helyi tárolójába kerülnek. Mindez az eszközödön marad, nem szinkronizálódik hozzánk vagy az iCloudba, és az alkalmazás törlésekor eltávolításra kerül. Az iPhone- és az Apple Watch-alkalmazás saját helyi másolatot tárol, nem párosítják egymást és nem osztanak meg adatot egymással.",
      "bodyEn": "The downloaded schedule is cached on your device so the app (and the watch app) keeps working offline after the first load. Your preferences such as stage order, which stages are hidden, language, text size, and column count are saved only in local device storage. All of this stays on your device, is not synced to us or to iCloud, and is removed if you delete the app. The iPhone and Apple Watch apps each keep their own local copy and do not pair or share data with each other."
    },
    {
      "headingHu": "Harmadik felek, reklámok és nyomkövetés",
      "headingEn": "Third parties, ads and tracking",
      "bodyHu": "Az alkalmazás nem tartalmaz harmadik féltől származó reklám-, analitikai vagy nyomkövető SDK-t. Nem használunk nyomkövető sütiket, nem készítünk profilokat, és nem adunk el vagy osztunk meg semmilyen adatot, mivel semmilyet nem gyűjtünk. Az egyetlen hálózati kapcsolat a fent leírt programvégponthoz irányul, amelyet ugyanaz a független fejlesztő üzemeltet.",
      "bodyEn": "There are no third-party advertising, analytics, or tracking SDKs in this app. We do not use cookies for tracking, we do not build profiles, and we do not sell or share any data, because we do not collect any. The only network connection is to the schedule endpoint described above, which is operated by the same independent developer."
    },
    {
      "headingHu": "Gyermekek",
      "headingEn": "Children",
      "bodyHu": "Az alkalmazás minden korosztály számára alkalmas (4+ besorolás). Mivel nem gyűjt személyes adatot, nem igényel fiókot, és nem tartalmaz reklámot vagy alkalmazáson belüli vásárlást, gyermekek számára is biztonságosan használható. Tudatosan senkitől sem gyűjtünk adatot, beleértve a gyermekeket is.",
      "bodyEn": "This app is suitable for all ages (rated 4+). Because it collects no personal data, requires no account, and contains no ads or in-app purchases, it is safe for children to use. We do not knowingly collect any information from anyone, including children."
    },
    {
      "headingHu": "A szabályzat módosítása",
      "headingEn": "Changes to this policy",
      "bodyHu": "Ha ez az adatvédelmi szabályzat megváltozik, a frissített változat az alkalmazással együtt kerül közzétételre. Mivel az alkalmazás nem gyűjt személyes adatot, a változások várhatóan csak apró pontosítások lesznek.",
      "bodyEn": "If this privacy policy changes, the updated version will be published with the app. Since the app collects no personal data, any changes are expected to be minor clarifications."
    },
    {
      "headingHu": "Kapcsolat",
      "headingEn": "Contact",
      "bodyHu": "Az alkalmazást Torma Gábor készíti függetlenül, és nem a fesztivál jogi szervezete. Adatvédelmi kérdésekkel kapcsolatban írj a manas2026@torma.ai címre.",
      "bodyEn": "This app is made independently by Gabor Torma and is not the festival legal entity. For any privacy questions, contact manas2026@torma.ai."
    }
  ],
  "contactHu": "Adatvédelmi kérdésekkel fordulj a fejlesztőhöz, Torma Gáborhoz: manas2026@torma.ai. Ez egy nem hivatalos, rajongók által készített alkalmazás, amely nem áll kapcsolatban a Manas fesztivállal vagy szervezőivel, és nem azok támogatásával vagy jóváhagyásával készült.",
  "contactEn": "For privacy questions, contact the developer, Gabor Torma, at manas2026@torma.ai. This is an unofficial, fan-made app and is not affiliated with, endorsed by, or sponsored by the Manas festival or its organizers."
} as const;

export const supportContent = {
  "lastUpdated": "2026-06-23",
  "introHu": "Üdv a Guide for MANAS 2026 támogatási oldalán! Ez egy rajongói kalauz, amely az egész fesztivál időrendjét a zsebedben tartja: böngészd a műsort színpadokra bontva, nézd meg, mi szól éppen most, és vidd magaddal az Apple Watch-odon is. Lent megtalálod a leggyakoribb kérdéseket – ha valami mégis kimaradt, írj nekünk bátran.",
  "introEn": "Welcome to the support page for Guide for MANAS 2026! This is a fan-made companion that keeps the whole festival timetable in your pocket: browse the line-up stage by stage, see what's playing right now, and take it with you on your Apple Watch. Below you'll find the most common questions – and if anything's missing, just drop us a line.",
  "aboutHu": "A Guide for MANAS 2026 egy ingyenes, rajongók által készített kalauz a magyarországi MANAS 2026 fesztiválhoz (2026. július). Megmutatja a teljes időrendet az összes színpadon (Portal, Field, Bowl, Terrace, Mandala), tartalmaz egy „Most” nézetet, ami kiemeli, mi szól éppen és mi következik, valamint egy beépített Apple Watch-alkalmazást és Smart Stack widgeteket. Ingyenes, reklámmentes, nincs benne alkalmazáson belüli vásárlás, és nem kér regisztrációt vagy bejelentkezést. Az első betöltés után offline is működik. Minden időpont Európa/Budapest idő szerint jelenik meg.\n\nFontos: ez egy NEM HIVATALOS, rajongói alkalmazás. Nem áll kapcsolatban a MANAS fesztivállal vagy annak szervezőivel, nem ők készítették, nem támogatják és nem szponzorálják. Minden védjegy a jogtulajdonosát illeti; a fesztivál nevét kizárólag hivatkozás (megnevezés) céljából használjuk. A fejlesztő Torma Gábor, független magánszemély – nem a fesztivál jogi entitása.",
  "aboutEn": "Guide for MANAS 2026 is a free, fan-made companion for the MANAS 2026 festival in Hungary (July 2026). It shows the full timetable across every stage (Portal, Field, Bowl, Terrace, Mandala), a \"Now\" view that highlights what's playing and what's up next, plus a built-in Apple Watch app and Smart Stack widgets. It's free, ad-free, has no in-app purchases, and asks for no account or sign-in. It works offline after the first load, and all times are shown in Europe/Budapest time.\n\nImportant: this is an UNOFFICIAL, fan-made app. It is not affiliated with, endorsed by, or sponsored by the MANAS festival or its organizers, and was not made by them. All trademarks belong to their respective owners; the festival's name is used purely for reference (to say what the app is a guide for). The developer is Gábor Torma, an independent individual – not the festival's legal entity.",
  "faq": [
    {
      "qHu": "Hogyan olvasom az időrendet?",
      "qEn": "How do I read the timetable?",
      "aHu": "Az időrend egy idő-arányos rács: a bal oldali sáv mutatja az órákat, a színpadok pedig külön oszlopokban jelennek meg. Egy program magassága az időtartamát tükrözi – minél hosszabb a fellépés, annál magasabb a blokk. Oldalra húzva válthatsz a színpadok között, fel-le görgetve pedig a nap óráin haladsz végig. Egy élő, mozgó vonal jelzi az aktuális időt. Telefonon álló módban egyszerre egy színpadot látsz, és lapozással ugorhatsz a következőre.",
      "aEn": "The timetable is a time-proportional grid: the left gutter shows the hours and each stage gets its own column. An event's height reflects its length – the longer the set, the taller the block. Swipe sideways to move between stages and scroll up/down to move through the hours of the day. A live now-line marks the current time. On iPhone in portrait you see one stage at a time and can page across to the next."
    },
    {
      "qHu": "Mire jó a „Most” nézet?",
      "qEn": "What is the \"Now\" view for?",
      "aHu": "A „Most” nézet a gyors tájékozódáshoz készült: színpadonként megmutatja, mi játszik éppen („Most játszik”) és mi következik („Következik”), valamint hogy meddig tart az aktuális program. A fesztivál kezdete előtt visszaszámlálót mutat, a vége után pedig jelzi, hogy a fesztivál véget ért. Ha épp nincs program egy színpadon, azt is jelzi.",
      "aEn": "The \"Now\" view is for quick orientation: for each stage it shows what's playing now (\"Playing now\") and what's coming up (\"Up next\"), along with when the current act ends. Before the festival starts it shows a countdown, and after it ends it tells you the festival is over. If nothing is on at a stage, it says so too."
    },
    {
      "qHu": "Hogyan váltok nyelvet?",
      "qEn": "How do I switch language?",
      "aHu": "Az alkalmazás magyarul és angolul is elérhető. Alapból a magyar a nyelv; első indításkor a készüléked nyelvét követi (ha nem magyar nyelvű, angolra vált). A Beállítások közt bármikor átállíthatod a nyelvet, és a választásod megmarad. Megjegyzés: az óra Smart Stack widgetje mindig a készülék nyelvét követi, és nem reagál az alkalmazásban beállított nyelvre.",
      "aEn": "The app is available in Hungarian and English. Hungarian is the default; on first launch it follows your device language (anything other than Hungarian starts in English). You can change the language any time in Settings and your choice is remembered. Note: the watch Smart Stack widget always follows the device language and does not react to the in-app language toggle."
    },
    {
      "qHu": "Hogyan használom az Apple Watch-alkalmazást?",
      "qEn": "How do I use the Apple Watch app?",
      "aHu": "Az órán egyszerre egy színpadot böngészel. Húzz felfelé vagy lefelé az adott színpad fellépései között lépkedéshez, és balra-jobbra a színpadok közti váltáshoz – a váltáskor ugyanaz az időpont marad a fókuszban, így a böngészés nem „csúszik el”. Ha bekapcsolod a helymeghatározást, az óra előtérbe hozáskor automatikusan a legközelebbi színpadra ugorhat.",
      "aEn": "On the watch you browse one stage at a time. Swipe up or down to step through that stage's acts, and swipe left or right to switch stages – switching keeps the same anchor time in focus, so browsing never drifts. If you enable location, the watch can auto-jump to the nearest stage when you bring it to the foreground."
    },
    {
      "qHu": "Mik azok a Smart Stack widgetek és komplikációk?",
      "qEn": "What are the Smart Stack widgets and complications?",
      "aHu": "Az órán hozzáadhatsz a Smart Stackhez egy widgetet, ami mutatja, mi szól éppen és mi következik egy adott színpadon. A widget színpadonként beállítható, így akár több színpadhoz is felvehetsz egyet-egyet, és a Digital Crownnal lapozhatsz közöttük. Van egy egyszerű indító komplikáció is, amivel egy koppintással megnyitható az alkalmazás. A widget magától frissül, és saját maga tölti le az adatokat.",
      "aEn": "On the watch you can add a Smart Stack widget that shows what's playing now and what's up next for a stage. The widget is configurable per stage, so you can add one for each stage and turn the Digital Crown to page between them. There's also a simple launcher complication that opens the app in one tap. The widget updates itself and fetches its own data."
    },
    {
      "qHu": "Működik internet nélkül?",
      "qEn": "Does it work without internet?",
      "aHu": "Igen. Az időrendet az alkalmazás az első betöltéskor letölti és a készüléken tárolja, ezután offline is böngészheted – ideális a fesztivál gyenge térerejű pontjain. Amikor újra van net, az alkalmazás frissíti a mentett adatokat. Az óra ugyanígy önállóan tárolja a saját másolatát.",
      "aEn": "Yes. The timetable is downloaded on first load and stored on your device, so you can browse it offline afterwards – handy in patchy-signal spots around the festival. When you're back online, the app refreshes the cached data. The watch keeps its own copy in the same way."
    },
    {
      "qHu": "Honnan jönnek az adatok, és gyűjttök rólam bármit?",
      "qEn": "Where does the data come from, and do you collect anything about me?",
      "aHu": "Az időrendet az alkalmazás csak olvasásra, HTTPS-en keresztül tölti le (https://manas2026.vercel.app/api/schedule), és a készüléken tárolja. Nincs analitika, nincs követés, nincsenek harmadik féltől származó SDK-k, és semmilyen személyes adatot nem gyűjtünk vagy küldünk a készülékről. Nincs fiók, nincs bejelentkezés.",
      "aEn": "The timetable is fetched read-only over HTTPS (https://manas2026.vercel.app/api/schedule) and cached on your device. There's no analytics, no tracking, no third-party SDKs, and no personal data is collected or sent off your device. No account, no sign-in."
    },
    {
      "qHu": "Hogyan választja ki a legközelebbi színpadot a helymeghatározás?",
      "qEn": "How does the location feature pick the nearest stage?",
      "aHu": "A helymeghatározás teljesen opcionális. Ha engedélyezed, az alkalmazás kizárólag a készüléken, helyben használja a pozíciódat ahhoz, hogy automatikusan a hozzád legközelebbi színpadot válassza ki – így nem kell kézzel keresgélned. A helyzeted SOHA nem hagyja el a készüléket: nem küldjük el sehová, és nem tároljuk szerveren. Ha nem adsz engedélyt, minden funkció ugyanúgy működik, csak a színpadot magadnak állítod be.",
      "aEn": "Location is entirely optional. If you allow it, the app uses your position only on-device to auto-select the stage nearest to you – so you don't have to pick it manually. Your location NEVER leaves the device: it is not sent anywhere and not stored on any server. If you don't grant permission, everything still works; you just choose the stage yourself."
    },
    {
      "qHu": "Egy színpad vagy program hiányzik – miért?",
      "qEn": "A stage or event is missing – why?",
      "aHu": "Két gyakori ok van. Egyrészt a Beállításokban elrejthetsz színpadokat; ha valami nem látszik, nézd meg, hogy nincs-e kikapcsolva ott. Másrészt az időrend a hivatalos plakátok és bejelentések alapján készül, és menet közben változhat – ha újra van interneted, az alkalmazás frissíti az adatokat. Ha biztosan tévedést látsz, írj nekünk.",
      "aEn": "There are two common reasons. First, you can hide stages in Settings; if something isn't showing, check it isn't turned off there. Second, the timetable is built from official posters and announcements and can change over time – when you're back online the app refreshes the data. If you're sure something's wrong, let us know."
    },
    {
      "qHu": "Ez a hivatalos MANAS-alkalmazás?",
      "qEn": "Is this the official MANAS app?",
      "aHu": "Nem. Ez egy független, rajongói kalauz, amelyet egy magánszemély készített. Nem áll kapcsolatban a MANAS fesztivállal vagy szervezőivel, és azok nem támogatják. A fesztivál nevét csak azért használjuk, hogy elmondjuk, mihez készült a kalauz.",
      "aEn": "No. This is an independent, fan-made guide built by a private individual. It is not affiliated with or endorsed by the MANAS festival or its organizers. We use the festival's name only to say what the guide is for."
    },
    {
      "qHu": "Hogyan érem el a támogatást?",
      "qEn": "How do I contact support?",
      "aHu": "Kérdés, hibajelzés vagy javaslat esetén írj e-mailt a manas2026@torma.ai címre. Szívesen fogadjuk a visszajelzést, és igyekszünk hamar válaszolni. Ha hibát jelentesz, segít, ha leírod, milyen készüléken (iPhone vagy Apple Watch) és melyik nézetben tapasztaltad.",
      "aEn": "For questions, bug reports, or suggestions, email manas2026@torma.ai. We welcome feedback and try to reply quickly. When reporting a bug, it helps to mention which device (iPhone or Apple Watch) and which view you saw it in."
    }
  ],
  "contactEmail": "manas2026@torma.ai"
} as const;
