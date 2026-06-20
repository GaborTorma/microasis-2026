import type { StageDTO } from "./types";

/** Fallback geofence radius when a stage row carries no `radiusM` (metres). */
const DEFAULT_RADIUS_M = 150;
const EARTH_R = 6_371_000; // metres

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in metres (haversine). */
export function distanceM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Slug of the stage the device stands nearest to — but only within that stage's
 * geofence (`radiusM`, default 150 m). null = nothing nearby. Mirrors the iOS
 * `Geo.nearest` + per-stage radius gate; both read the same DB lat/lng/radius.
 */
export function nearestStageSlug(
  lat: number,
  lng: number,
  stages: StageDTO[],
): string | null {
  let best: { slug: string; dist: number; radius: number } | null = null;
  for (const s of stages) {
    if (s.lat == null || s.lng == null) continue;
    const dist = distanceM(lat, lng, s.lat, s.lng);
    if (!best || dist < best.dist) {
      best = { slug: s.slug, dist, radius: s.radiusM ?? DEFAULT_RADIUS_M };
    }
  }
  return best && best.dist <= best.radius ? best.slug : null;
}
