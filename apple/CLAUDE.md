# apple — Manas 2026 iOS + watchOS

Native SwiftUI companion apps. Both consume the **same JSON API as the web PWA**
(`https://manas2026.vercel.app/api/schedule`) — no separate backend, no map feature.
Three targets share `ManasKit`. See `README.md` for the full feature tour and
`../CLAUDE.md` for the web ↔ apple wire contract (DTO parity + date format).

## Layout

```
project.yml              XcodeGen project definition — THE source of truth
Sources/
  ManasKit/              shared, platform-agnostic Swift core (no separate module)
    Models.swift         Codable DTOs (must match pwa/lib/types.ts) + JSONDecoder.manas
    APIClient.swift      fetch /api/schedule + offline disk cache (Application Support)
    AppState.swift       Settings + ScheduleStore + LocationStore (@MainActor singletons)
    Localization.swift   AppLocale (HU default) + baked-in ~47-key string table
    Formatting.swift     Fmt — Europe/Budapest formatters, festivalDay, debug clock
    Location.swift       Geo + LocationStore (nearest stage within radiusM / 150m)
    Theme.swift          Color(hex:), green palette, kind icon, language chip colors
    ManasMark.swift      vector flower mark (SwiftUI shapes — works in complications)
  Manas-iOS/             ManasApp, RootView, TimetableView, NowView, SettingsView
  Manas-watch/           ManasWatchApp, WatchRootView, WatchSettingsView
  Manas-watch-widget/    WidgetKit ext: ManasWidgetBundle, NowWidget, StageSelection,
                         LaunchWidget
```

## Build & run

Requires Xcode 16+ (developed against 26.x). `Manas.xcodeproj` and all `Info.plist`
files are **git-ignored and regenerated** — edit `project.yml`, never the `.xcodeproj`.
There is **no `.xcworkspace`** (use `-project`, not `-workspace`).

```bash
cd apple
xcodegen generate                         # after ANY project.yml change
open Manas.xcodeproj                       # Manas (iOS) or ManasWatch scheme

# headless simulator builds (no signing):
xcodebuild -project Manas.xcodeproj -scheme Manas \
  -destination 'platform=iOS Simulator,name=iPhone 17' build CODE_SIGNING_ALLOWED=NO
xcodebuild -project Manas.xcodeproj -scheme ManasWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm)' \
  build CODE_SIGNING_ALLOWED=NO
```

## Conventions

- **`ManasKit` is compiled into every target — it is NOT a module.** The files do
  **not** `import ManasKit`; `ScheduleStore`, `Theme`, `Fmt`, etc. are just available.
- **State:** `Settings`, `ScheduleStore`, `LocationStore` are `@MainActor`
  `ObservableObject`s injected at the app root; views hold only transient `@State`.
  Settings persist to `UserDefaults` with the `manas.` key prefix. **Each device is
  independent — no App Group, no iCloud, no iOS↔watch pairing.**
- **Versioning** (`project.yml`): `MARKETING_VERSION` (semver, `1.0.0`) bumped per
  release; `CURRENT_PROJECT_VERSION` (integer, currently `4`) bumped per TestFlight
  upload. Both flow into Info.plist via `$(…)` substitution — never hardcode them in a
  plist or the bump won't reach the binary.
- **Bundle IDs:** `ai.torma.manas.2026` (iOS) · `.watchkitapp` (watch) ·
  `.watchkitapp.widget` (widget). Team `5HW26FBLH4`, deployment targets iOS 17 /
  watchOS 10.
- **Commits** follow the repo-wide Conventional Commits with scope (`feat(watch):`,
  `build(ios):`), see `../CLAUDE.md`.

## UI model

- **iOS:** time-proportional `TimetableView` (fixed hour gutter, horizontally
  scrollable stage columns, live now-line, phone-portrait paging) + `NowView`
  (per-stage now-playing / up-next / pre-festival countdown). Map is intentionally omitted.
- **watch:** one stage at a time. Swipe up/down = prev/next act; swipe left/right =
  switch stage keeping the same anchor time (so browsing never drifts). Geofence can
  auto-jump to the nearest stage on foreground.
- **watch widgets:** `NowWidget` (`.accessoryRectangular`) is **per-stage
  configurable** via an `AppEntity`/`WidgetConfigurationIntent` — add one per stage to
  the Smart Stack and turn the crown to page. `LaunchWidget` is a circular/inline/corner
  launcher. The extension **fetches and caches the schedule itself** (no App Group),
  follows device language, and places one timeline entry per act boundary.

## Gotchas

- **DTO + date contract:** `Models.swift` mirrors `pwa/lib/types.ts`; `JSONDecoder.manas`
  hard-fails on any date shape outside the two the API emits. See `../CLAUDE.md` §2
  before any date-related edit.
- **Schedule endpoint only.** `APIClient.baseURL` is `…/api` and the only call is
  `schedule`. There is no locations/map code here — don't add an apple `/api/locations`
  consumer without a deliberate reason.
- **Offline cache lives in Application Support** (not Caches) so the OS won't purge it
  under storage pressure — important for watch offline-after-first-load. Every fetch
  rewrites the whole `manas-schedule.json`.
- **No stages hidden by default** (`AppState.swift` `?? []`) — kept in sync with web,
  see `../CLAUDE.md`. Bowl was default-hidden until its poster shipped.
- **Debug tooling is gated to DEBUG/TestFlight** (`appStoreReceiptURL` check) and
  compiled out of App Store builds. Drive it from the simulator:
  ```bash
  xcrun simctl spawn <udid> defaults write ai.torma.manas.2026 manas.debugNow '2026-07-09T15:30:00+02:00'
  xcrun simctl spawn <udid> defaults write ai.torma.manas.2026 manas.debugCoord '47.5,17.5'
  ```
- **`isLive`** is `startsAt <= now < (endsAt ?? startsAt)` — open-ended events count as
  live only at their exact start instant. Breaks (`kind == "break"`) are filtered out
  of stores and widget timelines everywhere.
