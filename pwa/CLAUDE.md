# web — MicrOasis 2026 PWA + API

Next.js 16 (App Router) + React 19 PWA. Two views (timetable, now), one JSON
API endpoint, Neon Postgres via Drizzle ORM, bilingual HU/EN, offline-first.
**This is also the only backend** — the apple apps consume `/api/schedule`.

See `../CLAUDE.md` for the web ↔ apple wire contract before editing any DTO or date.

## Stack & tooling

- **Package manager is `pnpm`** (only `pnpm-lock.yaml` exists — never run `npm`/`yarn`).
- Next.js 16, React 19, Tailwind CSS **v4** (`@theme` in `app/globals.css`, no
  `tailwind.config`), `next-intl`, Drizzle ORM + `@neondatabase/serverless`.
- Strict TS, `@/*` path alias to project root.

```
app/
  layout.tsx        Root layout (server): metadata, viewport, NextIntlClientProvider,
                    SettingsProvider, FavoritesProvider, Header, BottomNav, SWRegister
  page.tsx          /      → <Timetable/>
  now/page.tsx      /now   → <NowView/>
  api/schedule/     GET, ETag/304 + 60s payload memo, getSchedule()  (web + apple)
  actions/locale.ts setLocale() server action → sets microasis-locale cookie
  manifest.ts       PWA manifest        globals.css  Tailwind v4 @theme + utilities
components/         Timetable / NowView (+ settings/, favorites/, showcase/), Header, BottomNav
lib/                db/ (schema + client), queries, types, format, festival, geo,
                    etag, stageSettings, useSchedule, useNearestStage
i18n/               config (LOCALES, DEFAULT_LOCALE='hu') + request (locale detection)
messages/           hu.json, en.json   (flat files — NOT messages/<locale>/*.json)
public/             sw.js, icons/       scripts/  seed.ts, icons.ts
```

## Architecture / data flow

- **DB → API → client.** `lib/queries.ts` reads Drizzle/Neon and shapes rows into the
  DTOs in `lib/types.ts`. `/api/schedule` is GET-only, no params, a
  dynamic conditional GET via `lib/etag.ts`: the payload is serialized + hashed once
  per 60s (in-memory memo per warm instance, so Neon is read at most once a minute —
  the route is dynamic because it reads `If-None-Match`, which route caching cannot
  see), sent with an `ETag`, and a matching `If-None-Match` gets a bodyless 304.
- **All views are `"use client"`** and fetch through `useSchedule()`
  (`lib/useSchedule.ts`): one module-level shared store per endpoint (any number of
  subscribed components share a single request), hydrate from `localStorage`, fetch
  with `If-None-Match` (304 → keep cache), persist body + etag, refetch on tab focus.
  `offline` is only set when the network fails *and* there is no cache — a stale
  cache is shown silently.
- **Settings** (stage order/visibility, text scale, column count) and **favorites**
  (event-slug list, `components/favorites/FavoritesContext.tsx`, key
  `microasis-favorites-v1`) live in React context + `localStorage`, never server-side.
  Favorites are keyed on the seed-generated event `slug` — see `../CLAUDE.md`.
- **i18n is cookie-based, no middleware, no locale path segments.** There is no
  `middleware.ts` and no `/hu`/`/en` routes. `i18n/request.ts`: cookie `microasis-locale`
  > `Accept-Language` first tag (`hu*`→HU else EN) > HU default; cookie always wins.

## Data model (`lib/db/schema.ts`)

Two tables. `stages` (slug, name, colors, `sortOrder`, `isDefault`, `lat/lng/radiusM`
geofence) · `events` (stageId FK, `slug` seed-generated stable identity, `title` jsonb
i18n, `startsAt`/`endsAt` tz timestamps, `kind`, `langAvailability`, `sortOrder`).
All translatable text is `I18nText = {en, hu}` stored as jsonb. Times are
`timestamp withTimezone`.

## Commands (pnpm)

```bash
pnpm dev                 # dev server on :3000
pnpm build && pnpm start # production
pnpm lint                # ESLint (react-hooks/set-state-in-effect is warn, by design)
pnpm db:generate         # Drizzle migration from schema.ts changes
pnpm db:push             # apply to Neon (needs DATABASE_URL in .env.local)
pnpm db:studio           # Drizzle Studio
pnpm db:seed             # WIPE + re-insert all data from scripts/seed.ts (see gotcha)
pnpm icons               # regenerate every icon from the oasis mark (web + apple)
```

`DATABASE_URL` must be in `.env.local`: the Drizzle CLI loads it via
`process.loadEnvFile()` (`drizzle.config.ts`), which Next does not auto-apply.

## Gotchas / footguns

- **Service worker cache versioning is manual.** `public/sw.js` keys everything off
  `VERSION = "microasis-vNN"` (currently v2). **Bump it after any deploy that changes cached assets** or
  returning PWA users get stale files — the #1 "my change isn't showing" trap.
- **`pnpm db:seed` is destructive and idempotent:** it `db.delete()`s events, then
  stages, then re-inserts from the hardcoded arrays in
  `scripts/seed.ts` (transcribed from the printed posters). **Any data edited in the DB
  directly is lost on the next seed.** Seed is the source of truth for content.
- **localStorage cache keys are hand-versioned:** `microasis-schedule-v1`,
  `microasis-settings-v1`, `microasis-favorites-v1` (+ `<key>:etag`
  sidecars for the conditional refetch). Bump on DTO changes or stale cache can
  feed malformed data.
- **Payload memo = 60s:** DB edits take up to a minute (plus client cache) to appear.
  No realtime.
- **There is no map feature and no `locations` data.** `/api/schedule` is the only
  endpoint. `lib/geo.ts` + `lib/useNearestStage.ts` are not map code — they only
  resolve which stage the device is standing at, from the stage rows' own
  `lat/lng/radiusM`.
- **Samsung Internet must never install the PWA itself.** It is Chromium, so it
  fires `beforeinstallprompt` and looks like Chrome to feature detection — but the
  WebAPK Samsung mints carries a stale `targetSdkVersion`, and Android blocks the
  finished app with a Play Protect warning naming *this app*. A page cannot
  influence the generated APK, so `installAndroid()` (`lib/useInstallPrompt.ts`)
  routes Samsung to Chrome via `intent://` **even though a native prompt is
  available**, and the help sheet must not fall back to "use the browser menu"
  there — that installs the same broken WebAPK. Re-test if Samsung ships a fix;
  the gate is `isSamsungInternet()` in `lib/platform.ts`.
- **Date serialization is a cross-platform contract** — see `../CLAUDE.md` §2 before
  touching `.toISOString()` in `queries.ts` or the offset literals in `festival.ts`.
