"use client";

import { useEffect, useState } from "react";
import type { StageDTO } from "./types";
import { nearestStageSlug } from "./geo";

/**
 * A GPS fix is only trusted when it is both accurate and fresh — a weak-signal
 * or cached coordinate would light up (or auto-select) the wrong stage, and no
 * stage beats the wrong stage. Mirrors the iOS gate in
 * apple/Sources/ManasKit/Location.swift (`Geo.maxFixAccuracyM`/`maxFixAgeS`) —
 * keep the thresholds in sync.
 */
const MAX_FIX_ACCURACY_M = 100;
const MAX_FIX_AGE_MS = 60_000;

/** Optional `?debugCoord=lat,lng` override to test stage proximity off-site. */
function debugCoord(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("debugCoord");
  if (!raw) return null;
  // Strict parse: a malformed value must fall through to real GPS, not
  // silently disable it (`Number.isNaN(undefined)` is false, `Number("")` is 0).
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length !== 2 || parts.some((p) => p === "")) return null;
  const [lat, lng] = parts.map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Slug of the stage the device is standing at (within its geofence), or null.
 * One-shot `getCurrentPosition` on mount and whenever the tab returns to the
 * foreground — cheap, no continuous watch. null when geolocation is
 * unavailable, permission is denied, or the fix is too coarse/stale to trust
 * (no prompt loop, no error surfaced).
 */
export function useNearestStage(stages: StageDTO[]): string | null {
  const [slug, setSlug] = useState<string | null>(null);
  // Stable signature: re-run only when the stage geo set changes, not on every
  // render (orderedVisibleStages returns a fresh array each time).
  const sig = stages
    .map((s) => `${s.slug}:${s.lat ?? ""}:${s.lng ?? ""}:${s.radiusM ?? ""}`)
    .join("|");

  useEffect(() => {
    if (stages.length === 0) return;
    // Debug override wins over real GPS (test stage proximity from a link).
    const dbg = debugCoord();
    if (dbg) {
      setSlug(nearestStageSlug(dbg.lat, dbg.lng, stages));
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let alive = true;
    const locate = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!alive) return;
          const trusted =
            pos.coords.accuracy <= MAX_FIX_ACCURACY_M &&
            Date.now() - pos.timestamp <= MAX_FIX_AGE_MS;
          setSlug(
            trusted
              ? nearestStageSlug(pos.coords.latitude, pos.coords.longitude, stages)
              : null,
          );
        },
        () => {
          // Denied / unavailable / timed out → no trustworthy fix; clear any
          // previous value rather than keep showing a stale stage.
          if (alive) setSlug(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    };
    locate();
    const onVisible = () => {
      if (document.visibilityState === "visible") locate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
    // sig captures the geo-relevant fields of `stages`; the closure reads the
    // latest array on each re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return slug;
}
