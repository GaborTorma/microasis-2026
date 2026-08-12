# MicrOasis 2026 — PWA + API

The web app and the only backend: a Next.js 16 (App Router) PWA that renders the
festival timetable, and the `/api/schedule` JSON endpoint the iOS and watchOS
apps read. Neon Postgres via Drizzle, bilingual HU/EN, works offline.

See [`CLAUDE.md`](CLAUDE.md) for the architecture and the gotchas, and
[`../CLAUDE.md`](../CLAUDE.md) for the web ↔ apple wire contract.

## Getting started

Package manager is **pnpm** (only `pnpm-lock.yaml` exists).

```bash
pnpm install
cp .env.example .env.local     # then fill in DATABASE_URL
pnpm db:push                   # create the schema
pnpm db:seed                   # load the programme from scripts/seed.ts
pnpm dev                       # http://localhost:3000
```

`DATABASE_URL` is the only secret. The Drizzle CLI reads it from `.env.local`
via `process.loadEnvFile()` (see `drizzle.config.ts`); Next loads it on its own.

## Routes

| path            | what                                                        |
| --------------- | ----------------------------------------------------------- |
| `/`             | timetable — time-proportional grid, one column per stage     |
| `/now`          | what's playing now, up next, and the countdown / camp scenes |
| `/share`        | QR code + share sheet for passing the app on                 |
| `/app`, `/get`  | showcase landing and the scan-me redirect                    |
| `/privacy`, `/support` | the pages the App Store listing links to             |
| `/api/schedule` | the JSON every client reads (ETag + 304)                     |

## Commands

```bash
pnpm dev                 # dev server on :3000
pnpm build && pnpm start # production build
pnpm lint                # ESLint
pnpm db:push             # apply schema.ts to the database
pnpm db:seed             # WIPE + re-insert the programme (seed is the source of truth)
pnpm db:studio           # Drizzle Studio
pnpm icons               # regenerate every icon from the oasis mark (web + apple)
```

## Deploy

Production deploys are manual, from this directory:

```bash
vercel --prod
```

Functions are pinned to `fra1` (`vercel.json`) to sit next to the database.
After a deploy that changes cached assets, bump `VERSION` in `public/sw.js` or
returning PWA users keep the previously cached files.
