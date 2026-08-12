import { asc } from "drizzle-orm";
import { db, schema } from "./db";
import { FESTIVAL } from "./festival";

/** Map a UTC instant to its festival-local calendar date (matches poster columns). */
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: FESTIVAL.timezone });
export const festivalDay = (d: Date) => dayFmt.format(d); // YYYY-MM-DD

export type ScheduleResponse = Awaited<ReturnType<typeof getSchedule>>;

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
    slug: e.slug,
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

