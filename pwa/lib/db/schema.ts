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
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Translatable string. EN + HU (artist names use the same value for both). */
export type I18nText = { en: string; hu: string };

/**
 * Stages / floors. slug is the stable identifier used by all clients
 * (portal, field, bowl). lat/lng/radiusM let the watchOS app pick the
 * nearest stage from GPS; null = no geofence yet (falls back to default).
 */
export const stages = pgTable("stages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  subtitle: jsonb("subtitle").$type<I18nText>(),
  /** Primary theme color (hex) drawn from the printed timetable poster. */
  color: text("color").notNull().default("#b5532f"),
  /** Brighter accent color (hex) for now-playing / highlights. */
  accent: text("accent").notNull().default("#e8a04c"),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  lat: real("lat"),
  lng: real("lng"),
  radiusM: integer("radius_m"),
});

/**
 * kind discriminates rendering. Structural kinds: music / ceremony / break.
 * Workshops carry their *category* as the kind (drives the per-cell icon):
 * sound-bath / voice / drum / yoga / wind / dance / drama / mind / build /
 * handpan, with "workshop" as the uncategorised fallback. Open string on the
 * wire (Swift keeps it raw) — widening needs no DB migration.
 */
export type EventKind =
  | "music"
  | "ceremony"
  | "break"
  | "workshop"
  | "sound-bath"
  | "voice"
  | "drum"
  | "yoga"
  | "wind"
  | "dance"
  | "drama"
  | "mind"
  | "build"
  | "handpan";
/** Field-stage language availability badge: both / english only / hungarian only. */
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
     *  act name already is the title (Portal/Bowl) or there is no performer. */
    artist: text("artist"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    kind: text("kind").$type<EventKind>().notNull().default("music"),
    langAvailability: text("lang_availability").$type<LangAvailability>(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("events_stage_start_idx").on(t.stageId, t.startsAt)],
);

/** Groups for the map legend: facility, integration space, stage, or area. */
export type CategoryGroup = "facility" | "integration" | "stage" | "area";

export const locationCategories = pgTable("location_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: jsonb("name").$type<I18nText>().notNull(),
  group: text("group").$type<CategoryGroup>().notNull().default("facility"),
  /** lucide icon name or custom SVG symbol id used by the map renderer. */
  icon: text("icon"),
  color: text("color").notNull().default("#d8c4a0"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * A single marker on the SVG map. Position is stored in the map's own
 * viewBox coordinate space (svgX/svgY); lat/lng are optional for aligning
 * the live-GPS overlay. refCode holds the legend number/letter when present.
 */
export const locations = pgTable(
  "locations",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => locationCategories.id, { onDelete: "cascade" }),
    name: jsonb("name").$type<I18nText>(),
    svgX: real("svg_x").notNull(),
    svgY: real("svg_y").notNull(),
    lat: real("lat"),
    lng: real("lng"),
    refCode: text("ref_code"),
    requiresRegistration: boolean("requires_registration")
      .notNull()
      .default(false),
    description: jsonb("description").$type<I18nText>(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("locations_category_idx").on(t.categoryId),
    uniqueIndex("locations_refcode_idx").on(t.refCode),
  ],
);

export type Stage = typeof stages.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type LocationCategory = typeof locationCategories.$inferSelect;
export type LocationRow = typeof locations.$inferSelect;
