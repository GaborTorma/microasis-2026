# App Store listing — Guide for MicrOasis 2026

Copy-paste source for App Store Connect. Character counts shown against Apple's
limits. The privacy/support URLs point at the deployed pwa.

> **Unofficial fan app.** Keep all wording referential ("guide for"); never imply
> it is the official festival app. See `../CLAUDE.md` and the in-app disclaimer.

**Status: `1.0` (build 2) is live on the App Store since 2026-08-16.**
[apps.apple.com/app/id6800753437](https://apps.apple.com/app/id6800753437). The
copy below is what shipped; everything from here on is reference for the next
version.

## Submission checklist (the things the API cannot tell you are missing)

These all bit once on the way to 1.0. The API reports "appStoreVersions … is not
in valid state" for *every* missing piece, without saying which — most are
one-time, app-level settings that a second version inherits, but re-check them
if a submission is refused for no visible reason:

1. **App availability was never set** — a brand-new app record has no territories
   at all (`GET /v2/appAvailabilities/<id>` → 404). Set it before anything else.
2. **Content rights declaration was empty** — app-level
   `contentRightsDeclaration`, not part of any version.
3. **Screenshots must be 6.9" (1320×2868)** for the `APP_IPHONE_67` slot. A 6.5"
   capture (1284×2778) *uploads fine* and only fails minutes later, asynchronously:
   `assetDeliveryState.state = FAILED, IMAGE_INCORRECT_DIMENSIONS`. Always re-read
   the state after uploading. 6.5" alone does not satisfy the requirement.
   `screenshots.yaml` captures on an iPhone 17 Pro Max for this reason.
4. **Age rating: `socialMedia` and `userGeneratedContent`** must be answered, but
   the API's "missing required attribute" error does *not* list `socialMedia` —
   only the web questionnaire shows it. Check both after a PATCH.
5. **The price must be picked explicitly** (Pricing and Availability → 0 / Free).
   `appPriceSchedule` reports "present" on a fresh app even when no price has been
   chosen, so the API cannot tell you this one is missing. Without an explicit
   price the version never reaches READY_FOR_REVIEW.

App Privacy ("Data Not Collected") is web-only too: no API endpoint exists on
this API version, and it must show **Published**, not just filled in.

The watch slot `APP_WATCH_ULTRA` does accept the Ultra 3's 422×514 captures.

## Replacing assets on a version that is already READY_FOR_REVIEW

A version sitting in `READY_FOR_REVIEW` is **frozen**: creating or deleting a
screenshot returns `409 STATE_ERROR — "Can't Create Screenshot while Ready For
Review appScreenshots"`. The freeze comes from the open review submission, not
from the version itself. To edit:

1. `DELETE /v1/reviewSubmissionItems/<itemId>` — the version drops back to
   `PREPARE_FOR_SUBMISSION` and its assets unfreeze. (The failed deletes are
   safe: a 409 changes nothing, so the old screenshots survive.)
2. Swap the assets, attach the new build.
3. `POST /v1/reviewSubmissionItems` with the same `reviewSubmission` +
   `appStoreVersion` relationships — the version returns to `READY_FOR_REVIEW`,
   one button away from submission.

`reviewSubmissions` themselves allow only CREATE/GET/UPDATE — **there is no
DELETE**, so an empty submission created by mistake cannot be cleaned up. It is
harmless with zero items, but don't create spares.

Two more API quirks around a new build:

- `betaBuildLocalizations` already exist for a freshly processed build — POST
  returns `409 "There is an entity with same 'locale'"`. **PATCH** them instead.
- Adding a build to an **internal** TestFlight group returns `422 "Cannot add
  internal group to a build"`: internal groups receive every build automatically.
- The age rating lives at `/v1/appInfos/<appInfoId>/ageRatingDeclaration` —
  `/v1/apps/<id>/ageRatingDeclaration` does **not** exist, so a check against it
  reports a false "missing".

## URLs
- **Privacy Policy URL:** https://microasis.torma.ai/privacy
- **Support URL:** https://microasis.torma.ai/support
- **Marketing URL:** https://microasis.torma.ai/app

## App information (app-level)
- **Primary category:** Entertainment
- **Secondary category:** Lifestyle
- **Copyright** (required): `2026 Gábor Torma` — year + rights holder (the app's
  developer, NOT the festival); no © symbol, no "Copyright" word. Match your Apple
  account's legal name if it differs.
- **Content rights:** does not contain third-party content (the schedule is public
  info; "MicrOasis 2026" used referentially). Answer accordingly.
- **Age rating:** 4+ (complete the questionnaire; no objectionable content).

## App name & subtitle
- **App Name** (≤30): `Guide for MicrOasis 2026`  — 20 chars
- **Subtitle — EN** (≤30): `Unofficial guide & timetable`  — 28 chars
- **Subtitle — HU** (≤30): `Nem hivatalos program-kalauz`  — 28 chars

> App Name is English in both locales (matches the in-app lockup).

## Keywords (≤100, comma-separated, no spaces)
- **EN** (88): `microasis,festival,2026,schedule,timetable,lineup,guide,unofficial,stages,nowplaying,offline`
- **HU** (93): `microasis,fesztivál,2026,időrend,program,fellépők,kalauz,nemhivatalos,színpad,mostjátszik,offline`

## Promotional text (≤170, editable without resubmission)
- **EN** (150):

Unofficial fan-made guide to MicrOasis 2026: full timetable, live Now view, favourites synced between iPhone and Watch, home-screen widgets, offline — share it by QR.

- **HU** (156):

Nem hivatalos rajongói kalauz a MicrOasis 2026-hoz: teljes időrend, élő Most nézet, kedvencek iPhone és Watch között, widgetek, offline — QR-ral továbbadható.

## Description (≤4000)

### English (3257 chars)

This is an unofficial, fan-made guide. It is not affiliated with, endorsed by, or sponsored by the MicrOasis festival or its organizers.

Guide for MicrOasis 2026 is an independent companion app for visitors to the MicrOasis 2026 festival in Hungary (August 2026). It puts the full programme in your pocket — on iPhone and on your wrist — so you always know what is on, where, and when.

THE WHOLE PROGRAMME
- Browse the complete timetable across every stage: Oasis, Wadi and the Yoga Terrace.
- A time-proportional grid on iPhone lays the day out to scale, so overlaps and gaps are easy to see at a glance.
- Every set shows its start and end time, so the night reads at a glance; breaks are marked and dimmed rather than left as blank gaps.
- Scroll horizontally between stages and tap any act for the details.

NOW VIEW
- A "Now" screen shows what is playing right now and what is up next on each stage.
- Before the gates open it counts down to the start; on opening day it welcomes you while the camp goes up, and after the closing act it winds the festival down.

YOUR FAVOURITES, EVERYWHERE
- Tap an act to heart it — your picks stand out in the timetable and the Now view.
- Favourites sync automatically between iPhone and Apple Watch, and are marked in the widgets too.
- Stored only on your devices — no account needed.

ON YOUR HOME SCREEN
- Small and medium home-screen widgets show what is playing now and what is up next on a stage of your choice.
- Add one per stage; a tap opens the app right at that stage's column.

ON YOUR APPLE WATCH
- A built-in watchOS app lets you browse one stage at a time, with no fiddly grid.
- Swipe up or down to move between acts; swipe left or right to switch stage while keeping the same moment in time.
- Smart Stack widgets and watch-face complications show the act playing now. Pin a widget to a stage and add one per stage, then turn the crown to page between them.

SHARE IT ON THE SPOT
- A Share tab shows a QR code a friend can scan to get the app right there — the App Store on iPhone, the web app on anything else.
- Or pass it on through the usual share sheet. On Apple Watch the same share QR sits in the toolbar.

BUILT FOR THE FIELD
- Works offline after the first load, so a weak signal in a crowd is no problem — the schedule is cached on your device.
- Bilingual: full Hungarian and English, with a one-tap language toggle.
- All times are shown in Budapest time (Europe/Budapest).

OPTIONAL LOCATION
- If you allow it, the app can use your location only on your device to auto-select the stage nearest to you. Your location is never sent off the device and is never shared.

PRIVATE BY DESIGN
- No account, no login, no sign-up.
- No ads, no in-app purchases — completely free.
- No analytics, no tracking, no third-party SDKs. No personal data is collected or sent off your device.
- The schedule is fetched read-only over a secure connection and cached locally.

A NOTE ON AFFILIATION
This app is made by an independent fan and is not the official festival app. "MicrOasis 2026" is referenced only to describe which festival this guide is for. For official information, always refer to the festival's own channels.

Questions or feedback? Email microasis2026@torma.ai

### Magyar (3585 chars)

Ez egy nem hivatalos, rajongók által készített kalauz. Nem áll kapcsolatban a MicrOasis fesztivállal vagy annak szervezőivel, azok nem támogatják és nem szponzorálják.

A Guide for MicrOasis 2026 egy független kísérőalkalmazás a magyarországi MicrOasis 2026 fesztivál látogatóinak (2026. augusztus). A teljes programot a zsebedbe teszi — iPhone-on és a csuklódon is —, hogy mindig tudd, mi, hol és mikor zajlik.

A TELJES PROGRAM
- Böngészd a teljes időrendet minden színpadon: Oasis, Wadi és a Yoga Terrace.
- iPhone-on idő-arányos rács mutatja a napot, így az átfedések és a szünetek egy pillantással átláthatók.
- Minden szettnél ott a kezdés és a vég, így az éjszaka egy pillantással átlátható; a szüneteket jelöljük és halványítjuk, nem üres résként hagyjuk.
- Görgess vízszintesen a színpadok között, és koppints bármelyik fellépőre a részletekért.

MOST NÉZET
- A „Most" képernyő megmutatja, mi szól éppen, és mi következik az egyes színpadokon.
- A kapunyitás előtt visszaszámol a kezdésig; a nyitónapon a tábor épülése közben köszönt, a záró fellépő után pedig lezárja a fesztivált.

A KEDVENCEID, MINDENHOL
- Koppints egy programra, és jelöld szívvel — a kedvenceid kiemelkednek az időrendben és a Most nézetben is.
- A kedvencek automatikusan szinkronizálódnak iPhone és Apple Watch között, és a widgetekben is jelölve vannak.
- Csak a készülékeiden tárolódnak — nem kell hozzá fiók.

A KEZDŐKÉPERNYŐDÖN
- Kicsi és közepes kezdőképernyő-widgetek mutatják, mi szól éppen és mi következik az általad választott színpadon.
- Adj hozzá színpadonként egyet; egy koppintás az appot pont annál a színpad-oszlopnál nyitja meg.

AZ APPLE WATCH-ON
- A beépített watchOS-alkalmazással egyszerre egy színpadot böngészhetsz, bonyolult rács nélkül.
- Felfelé/lefelé húzva válthatsz a fellépők között; balra/jobbra húzva színpadot válthatsz úgy, hogy ugyanaz az időpont marad a fókuszban.
- A Smart Stack widgetek és az óraszámlap-kiegészítők az éppen játszó fellépőt mutatják. Rögzíts egy widgetet egy színpadhoz, adj hozzá színpadonként egyet, majd a koronával lapozhatsz közöttük.

OSZD MEG HELYBEN
- A Megosztás fülön egy QR-kód, amit a barátod beolvasva azonnal megszerzi az appot — iPhone-on az App Store, máson a webes verzió.
- Vagy add tovább a megszokott megosztási lappal. Apple Watch-on ugyanez a QR az eszköztárban van.

A HELYSZÍNRE TERVEZVE
- Az első betöltés után offline is működik, így a tömegben gyenge térerő sem gond — az időrend a készülékeden tárolódik.
- Kétnyelvű: teljes magyar és angol, egyérintéses nyelvváltóval.
- Minden időpont budapesti idő szerint (Europe/Budapest) jelenik meg.

OPCIONÁLIS HELYMEGHATÁROZÁS
- Ha engedélyezed, az app a helyzetedet kizárólag a készülékeden használja, hogy automatikusan a hozzád legközelebbi színpadot válassza ki. A helyzeted soha nem hagyja el a készüléket, és sosem kerül megosztásra.

ALAPVETŐEN ADATVÉDŐ
- Nincs fiók, nincs bejelentkezés, nincs regisztráció.
- Nincs reklám, nincs alkalmazáson belüli vásárlás — teljesen ingyenes.
- Nincs analitika, nincs követés, nincs harmadik féltől származó SDK. Semmilyen személyes adatot nem gyűjtünk, és nem küldünk el a készülékedről.
- Az időrend csak olvasásra, biztonságos kapcsolaton keresztül töltődik le, és helyben tárolódik.

MEGJEGYZÉS A KAPCSOLATRÓL
Ezt az alkalmazást egy független rajongó készítette, és nem a hivatalos fesztiválalkalmazás. A „MicrOasis 2026" megnevezés csak azt jelzi, melyik fesztiválhoz készült ez a kalauz. Hivatalos információkért mindig a fesztivál saját csatornáit nézd.

Kérdés vagy visszajelzés? Írj a microasis2026@torma.ai címre.

## What's New

1.0 shipped without one: App Store Connect keeps the field read-only for a
first release. A **1.1 must have it** in both locales — write it here first,
and keep it about what the festival-goer notices, not the internals.


## Notes for Review

Unofficial, fan-made companion guide for the MicrOasis 2026 music festival (Hungary, August 2026). Not affiliated with, endorsed by, or sponsored by the festival or its organizers; "MicrOasis 2026" is used referentially to indicate which festival this guide covers.

Favourites are hearts the user taps onto acts; they are stored locally on the device and synced directly between the user's own iPhone and Apple Watch via Apple's WatchConnectivity framework — nothing is sent to any server, there is no account, and no data is collected. The home-screen widgets (WidgetKit, small/medium) show the same public schedule as the app for a chosen stage.

No account or login required — no sign-up, no authentication of any kind. The app is free with no ads and no in-app purchases.

It only displays publicly available schedule information, fetched read-only over HTTPS from https://microasis.torma.ai/api/schedule and cached on the device for offline use. No analytics, no tracking, no third-party SDKs, and no personal data is collected or transmitted off the device.

Location use is optional and on-device only: if the user grants permission, the device location is used solely to auto-select the nearest festival stage. The location is never transmitted off the device and is never shared.

The submission includes an embedded watchOS app and watch widgets/complications that show the schedule. All functionality is available immediately without any credentials.

## App Privacy questionnaire (data collection) — app-level, REQUIRED before review
- Sidebar (app level) → **App Privacy → Get Started**. Needs an **Admin/Account
  Holder** role. Answer **"No, we do not collect data from this app." → Save →
  Publish.** Location is processed on-device only and never transmitted; the
  schedule fetch pulls public data in, it does not collect user data. (See `/privacy`.)
  This is separate from the version page — "Add for Review" blocks until it's published.

## Submission gates (one-time)
- **Export compliance:** already handled — `ITSAppUsesNonExemptEncryption=false` in
  the build (HTTPS-only, exempt). No "Missing Compliance".
- **Pricing:** Free.
- **Availability:** must be set explicitly — a new app record has no territories.
- **Build:** attach the processed build to the version before submitting.
- **Version release:** automatic after approval, or manual if you want to control go-live timing.
