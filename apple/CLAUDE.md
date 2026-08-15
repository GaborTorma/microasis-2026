# apple — MicrOasis 2026 iOS + watchOS

Native SwiftUI companion apps. Both consume the **same JSON API as the web PWA**
(`https://microasis.torma.ai/api/schedule`) — no separate backend, no map feature.
Three targets share `OasisKit`. See `README.md` for the full feature tour and
`../CLAUDE.md` for the web ↔ apple wire contract (DTO parity + date format).

## Layout

```
project.yml              XcodeGen project definition — THE source of truth
Sources/
  OasisKit/              shared, platform-agnostic Swift core (no separate module)
    Models.swift         Codable DTOs (must match pwa/lib/types.ts) + JSONDecoder.microasis
    APIClient.swift      fetch /api/schedule (ETag/If-None-Match revalidation) +
                         offline disk cache (App Group container where entitled)
    AppState.swift       Settings + ScheduleStore + LocationStore (@MainActor singletons)
    Favorites.swift      FavoritesStore (event-slug set, per-slug LWW merge) + WCSession
                         phone↔watch sync + App Group mirror for the widget
    Localization.swift   AppLocale (HU default) + baked-in ~47-key string table
    Formatting.swift     Fmt — Europe/Budapest formatters, festivalDay, debug clock
    Location.swift       Geo + LocationStore (nearest stage within radiusM / 150m)
    Theme.swift          Color(hex:), earthy palette (mirrors globals.css), kind icon
    OasisMark.swift      vector oasis mark (SwiftUI shapes — works in complications)
  MicrOasis-iOS/             MicrOasisApp, RootView, TimetableView, NowView, SettingsView
  MicrOasis-watch/           MicrOasisWatchApp, WatchRootView, WatchSettingsView
  MicrOasis-widget-shared/   compiled into BOTH widget extensions: NowWidget (provider +
                         MicrOasisNowWidget with per-platform families), StageSelection
  MicrOasis-iOS-widget/      iOS WidgetKit ext: MicrOasisIOSWidgetBundle, HomeWidgets
                         (glue; layouts live in OasisKit/HomeWidgetCard.swift)
  MicrOasis-watch-widget/    watchOS WidgetKit ext: MicrOasisWidgetBundle, LaunchWidget
```

## Build & run

Requires Xcode 16+ (developed against 26.x). `MicrOasis.xcodeproj` and all `Info.plist`
files are **git-ignored and regenerated** — edit `project.yml`, never the `.xcodeproj`.
There is **no `.xcworkspace`** (use `-project`, not `-workspace`).

**`xcode-select` points at the CLT, so EVERY `xcodebuild`/`xcrun simctl` needs
`DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` exported (per shell
call) — without it `simctl list` shows no runtimes/devices and builds use CLT.**

```bash
cd apple
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
xcodegen generate                         # after ANY project.yml change OR adding/removing a source file
open MicrOasis.xcodeproj                       # MicrOasis (iOS) or MicrOasisWatch scheme

# headless simulator builds (no signing):
xcodebuild -project MicrOasis.xcodeproj -scheme MicrOasis \
  -destination 'platform=iOS Simulator,name=iPhone 17' build CODE_SIGNING_ALLOWED=NO
xcodebuild -project MicrOasis.xcodeproj -scheme MicrOasisWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm)' \
  build CODE_SIGNING_ALLOWED=NO
```

### Verify UI in a simulator (screenshot a real render)

Simulators **are** available (e.g. iPhone 17 / Apple Watch Ultra 3 — `simctl list
devices available`). Recipe — note the **`-derivedDataPath` pin**: `find … MicrOasis.app
| head -1` often grabs a STALE build from another DerivedData dir and you screenshot
old code (the #1 "my change isn't showing" trap here).

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
UDID=<booted-sim-udid>; DD=/tmp/dd            # known derived-data path
xcodebuild -project MicrOasis.xcodeproj -scheme MicrOasis -destination "id=$UDID" \
  -derivedDataPath "$DD" build CODE_SIGNING_ALLOWED=NO
xcrun simctl install "$UDID" "$DD/Build/Products/Debug-iphonesimulator/MicrOasis.app"
# Inject QA state via launch args (NSArgumentDomain), DEBUG/TestFlight only:
xcrun simctl launch "$UDID" ai.torma.microasis.2026 \
  -microasis.disclaimerSeen 1 -microasis.locale hu -microasis.startView timetable \
  -microasis.debugNow '2026-08-21T15:30:00+02:00' -microasis.debugCoord '46.67611,17.66146'
xcrun simctl io "$UDID" screenshot /tmp/shot.png
```

Bundle ids: iOS `ai.torma.microasis.2026`, watch `ai.torma.microasis.2026.watchkitapp`
(watch `.app` is `Debug-watchsimulator/MicrOasisWatch.app`). `-microasis.debugCoord` sets the
geofence so the watch jumps to the nearest stage (here Wadi). Skip the first-run
disclaimer with `-microasis.disclaimerSeen 1`.

## Conventions

- **`OasisKit` is compiled into every target — it is NOT a module.** The files do
  **not** `import OasisKit`; `ScheduleStore`, `Theme`, `Fmt`, etc. are just available.
- **State:** `Settings`, `ScheduleStore`, `LocationStore` are `@MainActor`
  `ObservableObject`s injected at the app root; views hold only transient `@State`.
  Settings persist to `UserDefaults` with the `microasis.` key prefix. **Settings stay
  device-independent (no iCloud). The ONE cross-device channel is favorites:**
  `OasisKit/Favorites.swift` syncs the favorite-event-slug set iPhone↔watch over
  WatchConnectivity `applicationContext` (per-slug last-writer-wins timestamps,
  persisted as `microasis.favoriteStates`; the widget processes never activate
  `WCSession`). The App Group (`SharedDefaults`, `group.ai.torma.microasis.2026`) each
  **app + its own widget extension** share (watch app + watch widget, iOS app +
  iOS widget — group containers are per-device, so this shares nothing across
  devices) mirrors the app's language, the favorite slugs (`microasis.favorites`),
  the QA `microasis.debugNow` clock (DEBUG/TestFlight only), and — same group
  container — **one schedule disk cache** (the widget reuses the app's fetch).
- **Versioning** (`project.yml`): `MARKETING_VERSION` (semver, currently `1.0.0`)
  bumped per release; `CURRENT_PROJECT_VERSION` (integer, currently `2`) bumped per
  TestFlight upload. Both flow into Info.plist via `$(…)` substitution — never hardcode them in a
  plist or the bump won't reach the binary.
- **Bundle IDs:** `ai.torma.microasis.2026` (iOS) · `.widget` (iOS widget) ·
  `.watchkitapp` (watch) · `.watchkitapp.widget` (watch widget). Team `5HW26FBLH4`,
  deployment targets iOS 17 / watchOS 10.
- **App Store:** `1.0` is staged and `READY_FOR_REVIEW` with build `1.0.0 (2)`
  attached — everything filled in, deliberately **not** submitted (that button is
  the developer's to press). Apple ID
  `6800753437` (`Guide for MicrOasis 2026`, SKU `microasis2026`). The id lives in
  two mirrored places: `AppLinks.appStore` and the web's `APP_STORE_URL`.
- **Commits** follow the repo-wide Conventional Commits with scope (`feat(watch):`,
  `build(ios):`), see `../CLAUDE.md`.

## UI model

- **iOS:** time-proportional `TimetableView` (fixed hour gutter, horizontally
  scrollable stage columns, live now-line, phone-portrait paging) + `NowView`
  (per-stage now-playing / up-next / pre-festival countdown) + a `ShareView` tab
  ("Add tovább") — a QR encoding `AppLinks.qr` (web `/get`) plus a native
  `ShareLink` handing out `AppLinks.share` (`/app`), mirroring the web `/share`
  page. Tapping a timetable block toggles its
  favorite — the always-red heart is inlined before the title as part of its
  text run (`titleText`, mirrors web + the watch widget; deliberately no border
  change); a header heart — visible once any favorite exists — dims
  non-favorites; NowView hearts are display-only, same inline-before-title run.
- **watch:** one stage at a time. Swipe up/down = prev/next act; swipe left/right =
  switch stage keeping the same anchor time (so browsing never drifts). Geofence can
  auto-jump to the nearest stage on foreground. A `.bottomBar` toolbar holds settings
  (leading) + a share QR (trailing); the QR sheet (`WatchShareView`) shows the same
  `/get` code as iOS but — watchOS has no CoreImage — from a **pre-baked asset**
  (`ShareQR`, regenerated by `scripts/build_share_qr.py` if `AppLinks.qr` changes),
  not runtime CIFilter. Tapping the act card toggles its favorite (haptic differs
  add vs remove; heart beside the kind icon).
- **widgets (both platforms):** `MicrOasisNowWidget` (kind `"MicrOasisNow"`,
  `MicrOasis-widget-shared/NowWidget.swift`) is **per-stage configurable** via an
  `AppEntity`/`WidgetConfigurationIntent` and shared by both extensions; only the
  rendering differs. watch: `.accessoryRectangular` (`NowWidgetView` in OasisKit) —
  add one per stage to the Smart Stack and turn the crown to page; plus
  `LaunchWidget`, a circular/inline/corner launcher. iOS: `.systemSmall/Medium`
  (`OasisKit/HomeWidgetCard.swift`) — both sizes render the watch card's "now"
  block, then a bottom-anchored up-next list (act · start time; as many rows as
  fit, last row flush with the card bottom) with a 1pt `Theme.line` rule centered
  in the gap between the act name and the list (`NowEntry.upcoming`, capped at 4,
  row count picked by `ViewThatFits` + `layoutPriority`). The kind icon is a
  translucent top-right watermark (38/48 pt at 0.26, content may run over it);
  the HU/EN chip is full-opacity — medium puts it on the title's last line and
  the time range flush with the header's trailing edge, small puts the chip
  top-right in the header. Tapping an iOS widget deep-links via
  `microasis://stage/<slug>` (`AppLinks.stageDeepLink`, scheme registered in
  `project.yml`) — `RootView.onOpenURL` switches to the timetable and
  `TimetableView` makes that stage the leading column (clamped near the end of
  the stage list so the header and scroll stay in sync). Each extension reads the
  **schedule cache it shares with its host app** (App Group container; a copy
  fresher than 6 h skips the network, otherwise it does its own ETag-revalidated
  fetch), follows the **host app's language** via the `SharedDefaults` App Group
  (device language until the app sets one), and places one timeline entry per act
  boundary. Both apps call `WidgetCenter.reloadAllTimelines()` after foreground
  fetches, on language change, and on favorite toggles. Favorited acts get the
  same inline red heart before the act name as everywhere else (0.8× the row
  font) — the main act line on both platforms plus the iOS up-next rows —
  matched by slug against the `microasis.favorites` App Group mirror
  (`NowEntry.favorites`).

## Gotchas

- **DTO + date contract:** `Models.swift` mirrors `pwa/lib/types.ts`; `JSONDecoder.microasis`
  hard-fails on any date shape outside the two the API emits. See `../CLAUDE.md` §2
  before any date-related edit.
- **Schedule endpoint only.** `APIClient.baseURL` is `…/api` and the only call is
  `schedule` — the web app serves no other endpoint.
- **Offline cache lives in Application Support** (not Caches) so the OS won't purge it
  under storage pressure — important for watch offline-after-first-load. All four
  targets are entitled to the App Group, so it sits in the **group container**
  (`…/AppGroup/…/Library/Application Support/microasis-schedule.json`, shared between an
  app and its widget extension on the same device); each target's own container is
  read as a fallback when the group container is unavailable. A 200 rewrites `microasis-schedule.json` +
  its `.etag` sidecar; an ETag-matching refetch is a bodyless 304 that leaves the
  cache untouched.
- **No stage is hidden by default** (`AppState.swift` `?? []`), and a one-shot
  `microasis.terraceProgrammed` migration un-hides the Yoga Terrace for devices
  that persisted the old default. Kept in sync with web, see `../CLAUDE.md`.
- **Debug tooling is gated to DEBUG/TestFlight** (`AppEnv.debugToolsEnabled`, an
  `appStoreReceiptURL` check) and compiled out of App Store builds. Drive it from
  the simulator:
  ```bash
  xcrun simctl spawn <udid> defaults write ai.torma.microasis.2026 microasis.debugNow '2026-08-21T15:30:00+02:00'
  xcrun simctl spawn <udid> defaults write ai.torma.microasis.2026 microasis.debugCoord '47.5,17.5'
  ```
- **Screenshot generator:** `screenshots/make_screenshots.py` + `screenshots.yaml`
  render the App Store / landing-page shots (iOS + watch, HU/EN) via `simctl`. It
  injects state as **launch arguments** (NSArgumentDomain — `defaults write` is
  cfprefsd-cached and bleeds across rapid relaunches), so prefer that for any
  scripted capture. Extra invisible, DEBUG-gated screenshot-only defaults beyond
  the two above: `microasis.startView` (`timetable`/`now`/`share` tab or `settings`
  sheet), `microasis.hideTestUI` (hide the in-app Testing section),
  `microasis.startFavorites` (comma-separated event slugs → red hearts, per-launch;
  the harness pins it on every shot — its presence also disables WCSession sync,
  because a paired simulator's stale applicationContext once bled a watch shot's
  favorite into the next run's iPhone captures),
  `microasis.startFavFilter` (turn on the timetable favorites dim-filter — pair with
  `microasis.startFavorites`), and `microasis.startWidgetPreview` (render widget card(s)
  full-screen — watch: one stage slug; iPhone: `"medium,small"` slugs, e.g.
  `oasis,wadi`, for the two home-widget
  sizes). The widget shots reuse the real widget views (`OasisKit/NowWidgetCard.swift`
  and `OasisKit/HomeWidgetCard.swift`, so the apps + the WidgetKit extensions share
  them). The extension honours the QA
  debug clock too: the watch app mirrors `microasis.debugNow` into the App Group
  (`SharedDefaults.debugNowKey`) and `WidgetSchedule.now` reads it (DEBUG/TestFlight
  only); when set, the provider pins one entry at the frozen time instead of the
  real-clock act-boundary timeline. See `screenshots/README.md`.
- **`isLive`** is `startsAt <= now < (endsAt ?? startsAt)` — open-ended events count as
  live only at their exact start instant. Breaks (`kind == "break"`) are filtered out
  of stores and widget timelines everywhere.
- **Widget stage-config cannot be verified on the iOS simulator.** Every AppIntents
  type name (intent, entity, query) must be unique across the TWO widget appexes in
  the iOS app bundle (see `MicrOasis-widget-shared/StageSelection.swift` — iOS uses
  `Home`-prefixed twins); a duplicate intent name made SpringBoard persist empty
  parameters. With unique names SpringBoard commits the full config, but the sim's
  appex-side AppIntents decode still fails ("HomeStageEntity is not a registered
  AppEntity identifier", metadata fetch via linkd fails, Apple parser faults on a
  corrupt `to-0.0` AppEnum case) → the widget falls back to the default stage.
  Reproduced on two sims, fresh installs, with `ENABLE_DEBUG_DYLIB=NO` too. Stage
  configs **work on a real device** — don't chase the
  default-stage fallback on the simulator.
