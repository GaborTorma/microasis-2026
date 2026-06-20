"use client";

import { useEffect, useState } from "react";

/** Optional `?mockNow=<ISO>` override for testing festival-time UI. */
function mockNow(): Date | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("mockNow");
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Fresh "current" instant, honouring the `?mockNow=` override. Use for one-off
 * reads (e.g. re-centring the timetable on foreground) where the throttled
 * `useNow` state may be stale.
 */
export function currentNow(): Date {
  return mockNow() ?? new Date();
}

/** Current time, re-rendered every `intervalMs` (default 20s). Frozen if mocked. */
export function useNow(intervalMs = 20_000): Date {
  const [now, setNow] = useState<Date>(() => mockNow() ?? new Date());
  useEffect(() => {
    if (mockNow()) return; // frozen for testing
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
