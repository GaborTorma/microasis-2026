"use client";

import { useEffect, useState } from "react";
import type { StageDTO } from "./types";
import { nearestStageSlug } from "./geo";

/** Optional `?debugCoord=lat,lng` override to test stage proximity off-site. */
function debugCoord(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("debugCoord");
  if (!raw) return null;
  const [lat, lng] = raw.split(",").map((s) => Number(s.trim()));
  return Number.isNaN(lat) || Number.isNaN(lng) ? null : { lat, lng };
}

/**
 * Slug of the stage the device is standing at (within its geofence), or null.
 * One-shot `getCurrentPosition` on mount and whenever the tab returns to the
 * foreground — cheap, no continuous watch. Stays null if geolocation is
 * unavailable or permission is denied (no prompt loop, no error surfaced).
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
          if (alive)
            setSlug(
              nearestStageSlug(pos.coords.latitude, pos.coords.longitude, stages),
            );
        },
        () => {
          /* denied / unavailable → leave as-is */
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
