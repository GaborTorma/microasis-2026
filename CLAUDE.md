# Manas 2026 — monorepo

Unofficial companion apps for the **Manas 2026** festival: a Next.js PWA and native
Apple (iOS + watchOS) apps. Both clients render the same schedule; the **database is
the single source of truth** and the web app is the only backend.

```
pwa/      Next.js 16 PWA + the JSON API (Neon Postgres via Drizzle). See pwa/CLAUDE.md
apple/    iOS + watchOS SwiftUI apps + iOS/watch widgets.        See apple/CLAUDE.md
```

There is no shared build, no root package manager, no CI auto-release. The two
subprojects are developed and deployed independently. The only thing that couples
them is the **wire contract** below.

## The web ↔ apple wire contract (read this before editing data shapes)

The apple apps fetch JSON straight from the deployed web API
(`https://manas2026.vercel.app/api/schedule`). The DTOs are **hand-maintained in two
places that must stay byte-for-byte compatible**:

- web: `pwa/lib/types.ts` (`ScheduleData`, `FestivalDTO`, `StageDTO`, `EventDTO`)
- apple: `apple/Sources/ManasKit/Models.swift` (same structs, `Codable`)

Rules a future edit must respect:

1. **Field parity is manual.** Add/rename/retype a field in `types.ts` → mirror it in
   `Models.swift` (and vice-versa) in the same change. They are in sync today
   (incl. `radiusM: number|null` ↔ `Int?`, event `artist: string|null` ↔ `String?`,
   and event `slug: string` ↔ `String?` — optional in Swift on purpose: pre-slug
   payloads and old disk caches must keep decoding).
   A mismatch silently breaks decoding on device — the web app keeps working, so
   it's easy to miss.
2. **The date wire format is a strict dual-shape contract — the most fragile edit in
   the repo.** `pwa/lib/queries.ts` emits event `startsAt`/`endsAt` via
   `.toISOString()` → `2026-07-08T15:30:00.000Z` (UTC, fractional seconds, `Z`),
   while `pwa/lib/festival.ts` stores the festival window as `+02:00`-offset literals
   (`2026-07-08T12:00:00+02:00`). `JSONDecoder.manas` in `Models.swift` tolerates
   **exactly those two ISO-8601 shapes and hard-fails the whole decode on anything
   else.** Never change date serialization on the web side without updating the Swift
   decoder.
3. **`day` is computed identically on both sides** and must stay that way: web uses
   `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" })`
   (`queries.ts`), Swift uses `Fmt.festivalDay`. Both yield the Budapest-local
   calendar date `YYYY-MM-DD`. Diverge and day-bucketing splits.
4. **`kind` and `langAvailability` are open strings on the wire.** Swift keeps them as
   raw `String` for forward-compat; web narrows to unions (`EventKind`,
   `LangAvailability`). Adding a new `kind` won't crash the apps but won't render
   (icon/chip fall through to defaults) until Swift handles it.
5. **`/api/locations` is web-only.** The map feature exists only on web. The apple
   apps hit **`/api/schedule` and nothing else** — there is no `LocationsData` in
   `Models.swift` and no map/locations code under `apple/Sources`. Don't assume an
   apple consumer when touching locations.
6. **Both endpoints are conditional GETs.** The API sends an `ETag` (payload hash,
   `pwa/lib/etag.ts`); the web hook (`pwa/lib/useSchedule.ts`) and `APIClient.swift`
   send `If-None-Match` and treat a bodyless 304 as "serve the cached copy". Keep
   304 handling intact on both clients when touching the fetch layer; clients that
   never send the header (already-shipped app versions) still get full 200s.

## Cross-platform invariants (keep both sides in sync)

- **Hungarian is the default language.** First visit follows the browser/device:
  any declared Hungarian preference anywhere in `Accept-Language` → HU, otherwise
  EN; no header/locale → HU. (Web checks the *whole* list, not just the first tag —
  iOS Safari often lists English ahead of Hungarian on a Hungarian device, so
  first-tag-only wrongly served EN.) A user's explicit toggle persists and always wins. Implemented independently in
  web (`pwa/i18n/request.ts`, `i18n/config.ts` `DEFAULT_LOCALE='hu'`) and apple
  (`ManasKit/AppState.swift` device default). The **widgets** (watch Smart Stack +
  iOS home screen) read their host app's chosen language through an **App Group**
  (`group.ai.torma.manas.2026`, `ManasKit/AppState.swift` `SharedDefaults`; the apps
  mirror `manas.locale` there and reload timelines on change), falling back to
  device language until the app sets one.
- **All stages are shown by default on every client.** Bowl was hidden by default
  until its poster shipped; both defaults were then flipped together —
  `pwa/components/settings/SettingsContext.tsx` `hidden: []` and
  `ManasKit/AppState.swift` `?? []`. Note: this only changes *new* installs/visitors;
  users who already persisted `hidden: ["bowl"]` keep it until they toggle it back.
- **Stage `slug`** (`portal`, `field`, `bowl`, `terrace`, `mandala`) is the stable
  cross-platform key. Never repurpose a slug.
- **Event `slug` is the favorites key on every client** — event serial ids renumber
  on every re-seed and must never be persisted. Slugs (`portal-liquid-soul-0709`)
  are generated + uniqueness-asserted by `pwa/scripts/seed.ts`: `stage-title-MMDD`,
  a pure function of the event's own fields (never a positional counter — other
  entries' edits must not shift it); only a same-title-same-stage-same-day group
  also gets `-HHmm`. Editing an event's title or moving it across days orphans its
  favorites; a time-of-day correction doesn't. Favorites storage is deliberately
  split: web keeps them device-local (`manas-favorites-v1` localStorage — NO
  web↔apple sync, no accounts); iPhone↔watch sync via WatchConnectivity
  (`ManasKit/Favorites.swift`, per-slug last-writer-wins); the watch widget reads
  the App Group mirror (`manas.favorites`). Breaks (`kind == "break"`) are never
  favoritable.
- **A GPS fix is only trusted when accurate and fresh** (horizontal accuracy
  ≤ 100 m, fix age ≤ 60 s — thresholds must match across
  `pwa/lib/useNearestStage.ts` and `ManasKit/Location.swift`
  `Geo.maxFixAccuracyM`/`maxFixAgeS`). A coarse/stale/failed fix *clears* the
  nearest-stage state instead of keeping the previous value — no stage beats
  the wrong stage — and consumers must treat that nil as "don't move", never
  as "jump to the default stage". iOS retries the one-shot request a couple
  of times first, because CoreLocation usually serves a stale cached fix
  while the GPS warms up (the browser's `maximumAge` already prevents that
  on web). Known limit: 100 m cannot disambiguate the tightest stage pair
  (portal↔terrace ≈ 97 m) — accepted.
- **All times display in `Europe/Budapest`**, hardcoded on both sides
  (`pwa/lib/queries.ts`/`format.ts`, `ManasKit/Formatting.swift`).

## Conventions

- **Commits:** Conventional Commits with a scope: `feat(watch):`, `fix(ios):`,
  `feat(bowl):`, `build(ios):`, `feat(web):`. Imperative, lowercase, no trailing
  period. End the commit message with the `Co-Authored-By: Claude ...` trailer.
- **Language:** code, comments, and these CLAUDE.md files are English (matches the
  existing READMEs); UI strings are bilingual HU/EN.
- **Secrets:** the only secret is `DATABASE_URL`. Env handling lives in
  `pwa/.gitignore` (`.env*`, `!.env.example`); the root `.gitignore` only ignores
  `.DS_Store` and `.vercel`. `pwa/.env.example` is the template.
