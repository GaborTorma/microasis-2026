/**
 * Seed the MicrOasis 2026 schedule into Neon.
 *
 * Data transcribed from the printed WADI and OASIS timetable posters.
 * Times are festival-local (Europe/Budapest = CEST = UTC+02:00 in August).
 *
 * Run: pnpm db:seed   (idempotent — wipes and re-inserts)
 *
 * A set that runs past midnight is ONE entry (its end comes from the next
 * entry's start), not the two blocks the poster draws — the timetable is a
 * single continuous timeline with day dividers, so it renders across the
 * divider, and one act keeps one slug (= one favorite).
 */
import { db, schema } from "../lib/db";
import type { I18nText, EventKind, LangAvailability } from "../lib/db/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* rely on ambient env */
}

const { stages, events } = schema;

/** Festival-local datetime (CEST). */
const bp = (date: string, time: string) =>
  new Date(`${date}T${time}:00+02:00`);
/** Language-neutral title (artist / act proper noun). */
const t = (s: string): I18nText => ({ en: s, hu: s });

const BREAK: I18nText = { en: "Break", hu: "Szünet" };

type Entry = {
  d: string; // date YYYY-MM-DD (festival-local)
  s: string; // start HH:mm
  e?: string; // explicit end HH:mm (else = next entry's start)
  ed?: string; // explicit end date (for cross-midnight ends)
  title: I18nText;
  a?: string; // performer (null where the act name is the title)
  kind?: EventKind;
  lang?: LangAvailability;
};

/** Shared cross-platform slug algorithm (see root CLAUDE.md wire contract). */
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Turn an ordered entry list into insert rows. Uses explicit end if given,
 *  otherwise endsAt = next entry's start. `kind` is taken verbatim from each
 *  entry — the seed mirrors the DB exactly. Entries without a kind default to
 *  "music". Slug parts ride along raw; assignSlugs() finalizes them once all
 *  stages are merged. */
function withEnds(stageSlug: string, list: Entry[], lastMinutes = 90) {
  const sorted = [...list].sort(
    (a, b) => bp(a.d, a.s).getTime() - bp(b.d, b.s).getTime(),
  );
  return sorted.map((ev, i) => {
    const startsAt = bp(ev.d, ev.s);
    const next = sorted[i + 1];
    const endsAt = ev.e
      ? bp(ev.ed ?? ev.d, ev.e)
      : next
        ? bp(next.d, next.s)
        : new Date(startsAt.getTime() + lastMinutes * 60_000);
    return {
      stageSlug,
      slugBase: `${stageSlug}-${slugify(ev.title.en)}-${ev.d.slice(5).replace("-", "")}`,
      slugTime: ev.s.replace(":", ""),
      title: ev.title,
      artist: ev.a ?? null,
      startsAt,
      endsAt,
      kind: ev.kind ?? ("music" as EventKind),
      langAvailability: ev.lang ?? null,
    };
  });
}

/** Finalize the wire `slug` — the stable cross-platform event identity used by
 *  favorites (see root CLAUDE.md). `stage-title-MMDD` is a pure function of the
 *  event's OWN fields, so adding/removing/editing *other* entries never shifts
 *  it (a positional "-2" counter would re-point favorites at a different
 *  session). Only a same-title-same-stage-same-day group also gets "-HHmm".
 *  Throws on residual duplicates — callers must run this BEFORE any DB write. */
function assignSlugs<T extends { slugBase: string; slugTime: string }>(
  rows: T[],
) {
  const baseCounts = new Map<string, number>();
  for (const r of rows)
    baseCounts.set(r.slugBase, (baseCounts.get(r.slugBase) ?? 0) + 1);
  const out = rows.map(({ slugBase, slugTime, ...rest }) => ({
    ...rest,
    slug: (baseCounts.get(slugBase) ?? 1) > 1 ? `${slugBase}-${slugTime}` : slugBase,
  }));
  const dupes = [
    ...new Set(out.map((r) => r.slug).filter((s, i, all) => all.indexOf(s) !== i)),
  ];
  if (dupes.length)
    throw new Error(`Duplicate event slugs: ${dupes.join(", ")}`);
  return out;
}

// ─────────────────────────────────────────────────────────────── WADI ──
// Thursday 16:30 → Sunday 23:00, with a long daytime break on Fri/Sat/Sun.
const WADI: Entry[] = [
  // Thursday 08/20
  { d: "2026-08-20", s: "16:30", title: t("Baazs") },
  { d: "2026-08-20", s: "18:00", title: t("Borish & Szoa") },
  { d: "2026-08-20", s: "20:00", title: t("SNP") },
  { d: "2026-08-20", s: "21:30", title: t("Route 8") },
  { d: "2026-08-20", s: "23:00", title: t("Lau") }, // runs to 00:30 on Friday
  // Friday 08/21
  { d: "2026-08-21", s: "00:30", title: t("3en & Daniel Moritz") },
  { d: "2026-08-21", s: "02:30", title: t("Gingershot & Rozalinaa") },
  { d: "2026-08-21", s: "04:30", title: t("Dé & Korodi") },
  { d: "2026-08-21", s: "06:30", title: BREAK, kind: "break" },
  { d: "2026-08-21", s: "14:00", title: t("Olchie") },
  { d: "2026-08-21", s: "15:30", title: t("Stark & Hanussen") },
  { d: "2026-08-21", s: "17:30", title: t("ADX & D365") },
  { d: "2026-08-21", s: "19:30", title: t("Varis") },
  { d: "2026-08-21", s: "21:00", title: t("Pau Perez") },
  { d: "2026-08-21", s: "22:30", title: t("ISU") },
  // Saturday 08/22
  { d: "2026-08-22", s: "00:00", title: t("Mode & Valens") },
  { d: "2026-08-22", s: "02:00", title: t("Azami") },
  { d: "2026-08-22", s: "03:30", title: t("Aga2L") },
  { d: "2026-08-22", s: "05:00", title: t("BLZS") },
  { d: "2026-08-22", s: "06:30", title: BREAK, kind: "break" },
  { d: "2026-08-22", s: "15:00", title: t("Sabani") },
  { d: "2026-08-22", s: "16:30", title: t("Apua") },
  { d: "2026-08-22", s: "18:00", title: t("Stipo") },
  { d: "2026-08-22", s: "19:30", title: t("Tolo") },
  { d: "2026-08-22", s: "21:00", title: t("Jaffa Surfa") },
  { d: "2026-08-22", s: "22:30", title: t("Maron") },
  // Sunday 08/23
  { d: "2026-08-23", s: "00:00", title: t("Justine Perry") },
  { d: "2026-08-23", s: "02:00", title: t("Reka Zalan") },
  { d: "2026-08-23", s: "04:00", title: t("Mankind") },
  { d: "2026-08-23", s: "05:30", title: t("Faktor X") },
  { d: "2026-08-23", s: "07:00", title: BREAK, kind: "break" },
  { d: "2026-08-23", s: "17:00", title: t("Raasa") },
  { d: "2026-08-23", s: "18:30", title: t("Vedat Akdag") },
  { d: "2026-08-23", s: "20:00", e: "23:00", title: t("Josefina Tapia") },
];

// ────────────────────────────────────────────────────────────── OASIS ──
// Thursday 14:30 → Sunday 20:00, non-stop apart from one Friday-noon break.
const OASIS: Entry[] = [
  // Thursday 08/20
  { d: "2026-08-20", s: "14:30", title: t("Valaki & T-Coslo") },
  { d: "2026-08-20", s: "16:30", title: t("Lost In Details") },
  { d: "2026-08-20", s: "18:00", title: t("Glev & Rosalcodo") },
  { d: "2026-08-20", s: "20:00", title: t("Octile") },
  { d: "2026-08-20", s: "21:30", title: t("Daniel Meister") },
  { d: "2026-08-20", s: "23:30", title: t("Constratti") }, // runs to 02:00 on Friday
  // Friday 08/21
  { d: "2026-08-21", s: "02:00", title: t("Pauli (live)") },
  { d: "2026-08-21", s: "04:00", title: t("Spy C & Revesz Balint") },
  { d: "2026-08-21", s: "06:00", title: t("Octave") },
  { d: "2026-08-21", s: "08:30", title: t("Lakidani & Moh") },
  { d: "2026-08-21", s: "10:30", title: BREAK, kind: "break" },
  { d: "2026-08-21", s: "12:30", title: t("Möb & Akhi") },
  { d: "2026-08-21", s: "14:30", title: t("Jess") },
  { d: "2026-08-21", s: "16:00", title: t("Lilos") },
  { d: "2026-08-21", s: "17:30", title: t("Chiodan & Hanzo") },
  { d: "2026-08-21", s: "20:00", title: t("Lukea") },
  { d: "2026-08-21", s: "22:30", title: t("Moma") }, // runs to 00:30 on Saturday
  // Saturday 08/22
  { d: "2026-08-22", s: "00:30", title: t("Cap") },
  { d: "2026-08-22", s: "03:30", title: t("Baco & Li") },
  { d: "2026-08-22", s: "05:30", title: t("Mihai Pol") },
  { d: "2026-08-22", s: "08:00", title: t("Flixon") },
  { d: "2026-08-22", s: "09:30", title: t("Martin M") },
  { d: "2026-08-22", s: "11:00", title: t("Liro & Robert Dobak") },
  { d: "2026-08-22", s: "13:00", title: t("Krudy C") },
  { d: "2026-08-22", s: "14:30", title: t("Rolo") },
  { d: "2026-08-22", s: "16:00", title: t("Knoll") },
  { d: "2026-08-22", s: "17:30", title: t("Peter Bernath") },
  { d: "2026-08-22", s: "19:30", title: t("Barac") },
  { d: "2026-08-22", s: "23:30", title: t("Electricano") }, // runs to 02:00 on Sunday
  // Sunday 08/23
  { d: "2026-08-23", s: "02:00", title: t("Coloboma + S&H (live)") },
  { d: "2026-08-23", s: "05:00", title: t("Erro") },
  { d: "2026-08-23", s: "07:30", title: t("Ambos") },
  { d: "2026-08-23", s: "09:00", title: t("Raqpar") },
  { d: "2026-08-23", s: "10:30", title: t("Mole") },
  { d: "2026-08-23", s: "12:00", title: t("Kele") },
  { d: "2026-08-23", s: "13:30", title: t("Roocha & Roland Kandrick") },
  { d: "2026-08-23", s: "15:30", title: t("Zvezda Beta") },
  { d: "2026-08-23", s: "18:00", e: "20:00", title: t("Zsom") },
];

// ──────────────────────────────────────────────────────── YOGA TERRACE ──
// Third stage, announced but with no published programme yet. Seeded so the
// stage exists (settings, geofence); hidden by default on every client until
// it has acts.
const TERRACE: Entry[] = [];

async function main() {
  // Build + validate every event row up front — a slug collision must abort
  // while the DB still holds the previous dataset, not after the wipe.
  const eventRows = assignSlugs([
    ...withEnds("oasis", OASIS),
    ...withEnds("wadi", WADI),
    ...withEnds("terrace", TERRACE),
  ]);

  console.log("Wiping existing rows…");
  await db.delete(events);
  await db.delete(stages);

  console.log("Inserting stages…");
  const [oasis, wadi, terrace] = await db
    .insert(stages)
    .values([
      {
        slug: "oasis",
        name: "Oasis",
        color: "#4a3428",
        accent: "#c89468",
        sortOrder: 0,
        isDefault: true,
        lat: 46.67397480333385,
        lng: 17.660425843597828,
        radiusM: 50,
      },
      {
        slug: "wadi",
        name: "Wadi",
        color: "#2e3b45",
        accent: "#8fa69b",
        sortOrder: 1,
        lat: 46.676109554244164,
        lng: 17.661461486061544,
        radiusM: 50,
      },
      {
        slug: "terrace",
        name: "Yoga Terrace",
        color: "#46603a",
        accent: "#93c06a",
        sortOrder: 2,
        lat: 46.674407488023085,
        lng: 17.661415611588946,
        radiusM: 50,
      },
    ])
    .returning();

  console.log("Inserting events…");
  const stageIdBySlug = new Map(
    [oasis, wadi, terrace].map((s) => [s.slug, s.id]),
  );
  await db.insert(events).values(
    eventRows.map(({ stageSlug, ...r }) => ({
      ...r,
      stageId: stageIdBySlug.get(stageSlug)!,
    })),
  );

  const counts = {
    stages: 3,
    oasisEvents: OASIS.length,
    wadiEvents: WADI.length,
    terraceEvents: TERRACE.length,
    acts: eventRows.filter((r) => r.kind !== "break").length,
    breaks: eventRows.filter((r) => r.kind === "break").length,
  };
  console.log("Seed complete:", counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
