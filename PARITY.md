# Parity

> ⚠️ A parity-állapot **egyetlen forrása**. A `❓` cellákat és minden nem-`✅` cella **MIÉRT**-jét töltsd ki. Feature-rel egy körben frissül.
>
> **Platformok** (`apple/project.yml` + `pwa/`): **PWA** (Next.js 16 web + API), **iOS** (`MicrOasis` app, iPhone-only `TARGETED_DEVICE_FAMILY "1"`, + `MicrOasisWidget` WidgetKit-extension), **watchOS** (`MicrOasisWatch` app + `MicrOasisWatchWidget` extension). Nincs iPad-target és nincs Android → ezek az oszlopok kihagyva. A widgetek a saját platformjuk oszlopa alatt, külön feature-sorokként jelennek meg.

| Feature                                   | PWA | iOS | watchOS | Megjegyzés / MIÉRT                                                                                          |
| ----------------------------------------- | --- | --- | ------- | ----------------------------------------------------------------------------------------------------------- |
| Timetable (idő-arányos rács)              | ✅  | ✅  | ❌      | watch: egy-színpad / act-böngészés a rács helyett (kis kijelző, HIG). `WatchRootView` swipe-navigáció.        |
| Now / up-next nézet                       | ✅  | ✅  | ✅      | PWA `/now`, iOS `NowView` tab, watch root nézet = per-színpad now-playing live-jelzéssel.                     |
| Tábor-jelenetek (nyitás / bontás)         | ✅  | ✅  | ✅      | Első act előtt sátorállítás, utolsó act után sátorbontás (visszaszámláló nélkül), utána „vége". Ablakok adatból: `campSceneWindow` / `teardownWindow`. Watch: a sátor az üres „nincs műsor" kártya helyén. |
| Kedvencek (szív + kiemelés)               | ✅  | ✅  | ✅      | Kulcs az event `slug`. **Szándékosan nincs web↔apple szinkron** (nincs fiók): web `microasis-favorites-v1` localStorage; iPhone↔watch `WCSession.applicationContext`, per-slug last-writer-wins (`microasis.favoriteStates`); a widgetek az App Group-tükröt olvassák (`microasis.favorites`) — widget-processz sosem aktivál WCSession-t. |
| Kedvencek-szűrő a rácson                  | ✅  | ✅  | ➖      | Nem-kedvenc blokkok halványulnak. watch: nincs rács.                                                          |
| Megosztás (QR + share link)               | ✅  | ✅  | ✅      | PWA `/share`, iOS „Add tovább" tab, watch QR-sheet (előre renderelt asset — watchOS-en nincs CoreImage).      |
| „Töltsd le az appot" showcase (`/app`)    | ✅  | ➖  | ➖      | Web-only marketing landing; natív appoknál nem értelmezett (a Share tab a natív analóg).                      |
| Nyelvváltó HU/EN                          | ✅  | ✅  | ✅      | Mindkét widget a saját host appja nyelvét örökli App Group-on át (saját váltó nélkül); amíg az app nem állít nyelvet, az eszköz nyelve. |
| Színpad elrejtés / sorrend                | ✅  | ✅  | ✅      | Beállítás mindhárom kliensen; eszközönként független perzisztencia (nincs iCloud/pairing). A Yoga Terrace alapból rejtett. |
| Timetable zoom (oszlopszám + szövegméret) | ✅  | ✅  | ➖      | watch: nincs rács → nem értelmezett. iOS `effectiveColumns` + `fontScale`, web `columns`+`scale` tükrözi.      |
| Legközelebbi színpad (geolokáció)         | ✅  | ✅  | ✅      | PWA `useNearestStage`, iOS/watch `LocationStore`. 50 m-es stage-geofence; a fix csak ≤100 m pontosság és ≤60 s kor mellett érvényes. |
| Offline cache                             | ✅  | ✅  | ✅      | PWA SW + localStorage (ETag/304 revalidálás). Apple: közös lemez-cache az App Group konténerben (`…/Library/Application Support/microasis-schedule.json` + `.etag`), app és widget között — a widget <6 h friss másolatnál nem hálózik. |
| PWA install / Add to Home                 | ✅  | ➖  | ➖      | `InstallPrompt` (iOS/Safari sáv), `useInstallPrompt` + `AndroidInstallSheet` (Chrome `beforeinstallprompt`), showcase CTA `showcase/InstallCta`; natív appnál nem értelmezett. |
| Privacy / Support oldal                   | ✅  | ✅  | ❌      | PWA route-ok; iOS Settings linkel ki (`microasis.torma.ai/privacy` `/support`); watch Settings nem linkel.     |
| „Nem hivatalos" disclaimer                | ✅  | ✅  | ✅      | PWA `DisclaimerGate`, iOS/watch Settings „about" + disclaimer-sheet.                                           |
| Widget: now-playing (per-színpad)         | ➖  | ✅  | ✅      | `MicrOasisNowWidget` (`MicrOasis-widget-shared/NowWidget.swift`, mindkét extension fordítja): watchOS `.accessoryRectangular` Smart Stack kártya, iOS `.systemSmall`/`.systemMedium` home-screen widget (`OasisKit/HomeWidgetCard.swift`). Per-színpad konfigurálható; iOS-en koppintásra `microasis://stage/<slug>` deep link. |
| Widget: launcher complication             | ➖  | ➖  | ✅      | `LaunchWidget` (circular/inline/corner) — watchOS-specifikus complication-felület, iOS-en nem értelmezett.     |
| Debug/test tooling (teszt-óra + hely)     | ✅  | ✅  | ✅      | PWA: `?mockNow=<ISO>` és `?debugCoord=lat,lng` URL-paraméter (nincs UI). iOS/watch: Settings „Testing" panel, DEBUG/TestFlight-gated; a teszt-óra App Group-on át a widgetre is hat. |

Jelölés: `✅` kész · `🚧` folyamatban · `❌` nincs (lásd ok) · `➖` nem értelmezett · `❓` ellenőrzendő · `🗓️` ütemezett (+ verzió/dátum).
