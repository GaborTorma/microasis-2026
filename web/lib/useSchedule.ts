"use client";

import { useEffect, useState } from "react";
import type { LocationsData, ScheduleData } from "./types";

type State<T> = {
  data: T | null;
  loading: boolean;
  offline: boolean;
  error: boolean;
};

/**
 * Fetch JSON with a localStorage cache so the app keeps working with no
 * signal on-site. Hydrates instantly from cache, then revalidates; on a
 * failed network it falls back to whatever was cached.
 */
function useFetchCached<T>(url: string, key: string): State<T> {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    offline: false,
    error: false,
  });

  useEffect(() => {
    let alive = true;

    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        setState((s) => ({ ...s, data: JSON.parse(cached) as T }));
      }
    } catch {
      /* ignore corrupt cache */
    }

    fetch(url, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<T>;
      })
      .then((json) => {
        if (!alive) return;
        try {
          localStorage.setItem(key, JSON.stringify(json));
        } catch {
          /* storage full / private mode */
        }
        setState({ data: json, loading: false, offline: false, error: false });
      })
      .catch(() => {
        if (!alive) return;
        setState((s) => ({
          data: s.data,
          loading: false,
          offline: Boolean(s.data),
          error: !s.data,
        }));
      });

    return () => {
      alive = false;
    };
  }, [url, key]);

  return state;
}

export const useSchedule = () =>
  useFetchCached<ScheduleData>("/api/schedule", "manas-schedule-v1");

export const useLocations = () =>
  useFetchCached<LocationsData>("/api/locations", "manas-locations-v1");
