import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  real,
  index,
} from "drizzle-orm/pg-core";

/** Translatable string. EN + HU (artist names use the same value for both). */
export type I18nText = { en: string; hu: string };

/**
 * Stages. slug is the stable identifier used by all clients
 * (oasis, wadi, terrace). lat/lng/radiusM let the apps pick the
 * nearest stage from GPS; null = no geofence yet (falls back to default).
 */
export const stages = pgTable("stages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  subtitle: jsonb("subtitle").$type<I18nText>(),
  /** Primary theme color (hex) drawn from the printed timetable poster. */
  color: text("color").notNull().default("#4a3428"),
  /** Brighter accent color (hex) for now-playing / highlights. */
  accent: text("accent").notNull().default("#c89468"),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  lat: real("lat"),
  lng: real("lng"),
  radiusM: integer("radius_m"),
});

/**
 * kind discriminates rendering. `music` is a DJ set or live act, `break` is a
 * gap the poster marks explicitly. The rest exist for anything the Yoga Terrace
 * eventually programmes. Open string on the wire (Swift keeps it raw), so
 * widening needs no DB migration.
 */
export type EventKind = "music" | "break" | "workshop" | "yoga" | "ceremony";
/** Spoken-language badge for talk-like events: both / english only / hungarian only. */
export type LangAvailability = "both" | "en" | "hu";

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    stageId: integer("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    title: jsonb("title").$type<I18nText>().notNull(),
    /** Stable cross-platform event identity, generated + uniqueness-asserted
     *  by the seed (not DB-enforced: the column backfills '' on push before
     *  the seed runs). */
    slug: text("slug").notNull().default(""),
    /** Performer / facilitator. Language-neutral proper noun; null where the
     *  act name already is the title (as it is for every DJ set). */
    artist: text("artist"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    kind: text("kind").$type<EventKind>().notNull().default("music"),
    langAvailability: text("lang_availability").$type<LangAvailability>(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("events_stage_start_idx").on(t.stageId, t.startsAt)],
);

export type Stage = typeof stages.$inferSelect;
export type EventRow = typeof events.$inferSelect;
