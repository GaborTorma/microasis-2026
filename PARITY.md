# Parity

> ⚠️ A parity-állapot **egyetlen forrása**. A `❓` cellákat és minden nem-`✅` cella **MIÉRT**-jét töltsd ki. Feature-rel egy körben frissül. (Auto-generálva: `multi-platform-parity:init` — az oszlopok a felderített platformok, a sorok a feature-leltár.)
>
> **Felderített platformok** (`apple/project.yml` + `pwa/`): **PWA** (Next.js 16 web + API), **iOS** (`Manas` target, iPhone-only `TARGETED_DEVICE_FAMILY "1"`), **watchOS** (`ManasWatch` app + `ManasWatchWidget` WidgetKit-extension). Nincs iPad-target és nincs Android → ezek az oszlopok kihagyva. A watch-widget a watchOS oszlop alatt, külön feature-sorokként jelenik meg.

| Feature                                  | PWA | iOS | watchOS | Megjegyzés / MIÉRT                                                                                          |
| ---------------------------------------- | --- | --- | ------- | ---------------------------------------------------------------------------------------------------------- |
| Timetable (idő-arányos rács)             | ✅  | ✅  | ❌      | watch: egy-színpad / act-böngészés a rács helyett (kis kijelző, HIG). `WatchRootView` swipe-navigáció.     |
| Now / up-next nézet                      | ✅  | ✅  | ✅      | PWA `/now`, iOS `NowView` tab, watch root nézet = per-színpad now-playing live-jelzéssel.                   |
| Térkép (fesztivál-terület)               | ✅  | ❌  | ❌      | Szándékosan web-only (lásd `../CLAUDE.md` §5 + `pwa/CLAUDE.md`: kalibráció törékeny). `/map` unlinked.      |
| Megosztás (QR + share link)              | ✅  | ✅  | ✅      | PWA `/share`, iOS „Add tovább” tab, watch QR-sheet (pre-baked asset — watchOS-en nincs CoreImage).         |
| „Töltsd le az appot” showcase (`/app`)   | ✅  | ➖  | ➖      | Web-only marketing landing; natív appoknál nem értelmezett (a Share tab a natív analóg).                    |
| Nyelvváltó HU/EN                         | ✅  | ✅  | ✅      | Widget a watch-app nyelvét örökli App Group-on át (saját váltó nélkül).                                     |
| Színpad elrejtés / sorrend               | ✅  | ✅  | ✅      | Beállítás mindhárom kliensen; eszközönként független perzisztencia (nincs iCloud/pairing).                  |
| Timetable zoom (oszlopszám + szövegméret) | ✅  | ✅  | ➖      | watch: nincs rács → nem értelmezett. iOS `effectiveColumns` + `fontScale`, web `columns`+`scale` tükrözi.   |
| Legközelebbi színpad (geolokáció)        | ✅  | ✅  | ✅      | PWA `useNearestStage` (Timetable+Now), iOS/watch `LocationStore` 150 m-es geofence.                         |
| Offline cache                            | ✅  | ✅  | ✅      | PWA service worker + localStorage; iOS/watch lemez-cache (Application Support); widget saját container.     |
| PWA install / Add to Home                | ✅  | ➖  | ➖      | `InstallPrompt`/`AddToHomeButton`; natív appnál nem értelmezett.                                            |
| Privacy / Support oldal                  | ✅  | ✅  | ❌      | PWA route-ok; iOS Settings linkel ki (`manas.torma.ai/privacy` `/support`); watch Settings nem linkel.     |
| „Nem hivatalos” disclaimer               | ✅  | ✅  | ✅      | PWA `DisclaimerGate`, iOS/watch Settings „about” + disclaimer-sheet.                                        |
| Widget: now-playing complication         | ➖  | ❌  | ✅      | `NowWidget` (`.accessoryRectangular`), per-színpad konfigurálható. iOS-en nincs widget-target megépítve.    |
| Widget: launcher complication            | ➖  | ❌  | ✅      | `LaunchWidget` (circular/inline/corner). watchOS-specifikus complication-felület.                          |
| Debug/test tooling (teszt-óra + hely)    | ❓  | ✅  | ✅      | iOS/watch Settings „Testing” (DEBUG/TestFlight gated). PWA-oldali debug-UI a kódból nem dőlt el → ellenőrzendő. |

Jelölés: `✅` kész · `🚧` folyamatban · `❌` nincs (lásd ok) · `➖` nem értelmezett · `❓` ellenőrzendő · `🗓️` ütemezett (+ verzió/dátum).
