"use client";

import { useSyncExternalStore } from "react";
import type { ScheduleData } from "./types";

type State<T> = {
  data: T | null;
  loading: boolean;
  offline: boolean;
  error: boolean;
};

type Resource<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => State<T>;
  getServerSnapshot: () => State<T>;
};

/**
 * One shared fetch per endpoint no matter how many components subscribe —
 * several views mount `useSchedule()` at once and must not fan out into
 * parallel identical requests. Keeps the localStorage cache so the app works
 * with no signal on-site: hydrates instantly from cache, then revalidates
 * (If-None-Match, so an unchanged payload costs a bodyless 304); on a failed
 * network it falls back to whatever was cached.
 */
function createResource<T>(url: string, key: string): Resource<T> {
  const etagKey = `${key}:etag`;
  const initial: State<T> = { data: null, loading: true, offline: false, error: false };
  let state = initial;
  // The validator for the body currently in `state` — kept in memory, NOT
  // re-read from localStorage per request: another tab may have persisted a
  // newer body+etag pair there, and sending *that* etag while still holding
  // the older body would turn the server's 304 into permanently stale data.
  let etag: string | null = null;
  const listeners = new Set<() => void>();
  let started = false;
  let inFlight = false;

  const emit = (next: State<T>) => {
    state = next;
    listeners.forEach((l) => l());
  };

  const refetch = () => {
    if (inFlight) return;
    inFlight = true;
    const headers: HeadersInit = {};
    // Only revalidate when we still hold a body to serve on a 304.
    if (etag && state.data) headers["If-None-Match"] = etag;
    fetch(url, { cache: "no-store", headers })
      .then(async (r) => {
        if (r.status === 304) {
          emit({ ...state, loading: false, offline: false, error: false });
          return;
        }
        if (!r.ok) throw new Error(String(r.status));
        const json = (await r.json()) as T;
        etag = r.headers.get("etag");
        try {
          localStorage.setItem(key, JSON.stringify(json));
          if (etag) localStorage.setItem(etagKey, etag);
          else localStorage.removeItem(etagKey);
        } catch {
          /* storage full / private mode */
        }
        emit({ data: json, loading: false, offline: false, error: false });
      })
      .catch(() => {
        emit({
          data: state.data,
          loading: false,
          offline: Boolean(state.data),
          error: !state.data,
        });
      })
      .finally(() => {
        inFlight = false;
      });
  };

  const start = () => {
    if (started) return;
    started = true;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        state = { ...state, data: JSON.parse(cached) as T };
        // Body and etag are persisted together, so the pair is consistent.
        etag = localStorage.getItem(etagKey);
      }
    } catch {
      /* ignore corrupt cache */
    }
    // Re-fetch whenever the tab/PWA returns to the foreground. Registered
    // once for the module's lifetime; a no-subscriber tab skips the work.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && listeners.size > 0) refetch();
    });
    refetch();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (!started) start();
      // A consumer (re)mounting after a failure is the old per-mount retry
      // moment — without this, an error/offline state would only ever recover
      // on a visibilitychange.
      else if (state.error || state.offline) refetch();
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
  };
}

const scheduleResource = createResource<ScheduleData>("/api/schedule", "microasis-schedule-v1");

function useResource<T>(resource: Resource<T>): State<T> {
  return useSyncExternalStore(
    resource.subscribe,
    resource.getSnapshot,
    resource.getServerSnapshot,
  );
}

export const useSchedule = () => useResource(scheduleResource);
