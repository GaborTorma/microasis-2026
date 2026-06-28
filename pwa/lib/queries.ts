import { asc } from "drizzle-orm";
import { db, schema } from "./db";
import { FESTIVAL } from "./festival";

/** Map a UTC instant to its festival-local calendar date (matches poster columns). */
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: FESTIVAL.timezone });
export const festivalDay = (d: Date) => dayFmt.format(d); // YYYY-MM-DD

export type ScheduleResponse = Awaited<ReturnType<typeof getSchedule>>;
export type LocationsResponse = Awaited<ReturnType<typeof getLocations>>;

export async function getSchedule() {
  const [stageRows, eventRows] = await Promise.all([
    db.select().from(schema.stages).orderBy(asc(schema.stages.sortOrder)),
    db.select().from(schema.events).orderBy(asc(schema.events.startsAt)),
  ]);

  const slugById = new Map(stageRows.map((s) => [s.id, s.slug]));

  const events = eventRows.map((e) => ({
    id: e.id,
    stageId: e.stageId,
    stageSlug: slugById.get(e.stageId)!,
    title: e.title,
    artist: e.artist,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    kind: e.kind,
    langAvailability: e.langAvailability,
    day: festivalDay(e.startsAt),
  }));

  const days = [...new Set(events.map((e) => e.day))].sort();

  const stages = stageRows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    subtitle: s.subtitle,
    color: s.color,
    accent: s.accent,
    sortOrder: s.sortOrder,
    isDefault: s.isDefault,
    lat: s.lat,
    lng: s.lng,
    radiusM: s.radiusM,
  }));

  return { festival: FESTIVAL, stages, days, events };
}

export async function getLocations() {
  const [cats, locs] = await Promise.all([
    db
      .select()
      .from(schema.locationCategories)
      .orderBy(asc(schema.locationCategories.sortOrder)),
    db.select().from(schema.locations).orderBy(asc(schema.locations.sortOrder)),
  ]);

  const slugById = new Map(cats.map((c) => [c.id, c.slug]));

  return {
    categories: cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      group: c.group,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder,
    })),
    locations: locs.map((l) => ({
      id: l.id,
      categoryId: l.categoryId,
      categorySlug: slugById.get(l.categoryId)!,
      name: l.name,
      x: l.svgX,
      y: l.svgY,
      lat: l.lat,
      lng: l.lng,
      refCode: l.refCode,
      requiresRegistration: l.requiresRegistration,
      description: l.description,
    })),
  };
}
