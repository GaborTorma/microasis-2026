"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Settings = {
  order: string[];
  hidden: string[];
  scale: number;
  /** Portrait-mobile column-count zoom: how many stage columns fill the width. */
  columns: number;
};
// The Yoga Terrace has no published programme yet, so it starts hidden (kept in
// sync with ManasKit/AppState.swift — see ../CLAUDE.md). Users can show it, and
// any other stage, in settings.
const DEFAULT: Settings = { order: [], hidden: ["terrace"], scale: 1, columns: 3 };
const KEY = "microasis-settings-v1";

/** Timetable text/width zoom levels (−25% … +50%, 25% steps). */
export const SCALE_LEVELS = [0.75, 1, 1.25, 1.5] as const;

/** Hard cap on stage columns shown at once in portrait (mirrors iOS maxColumns). */
export const MAX_COLUMNS = 5;

type Ctx = Settings & {
  setOrder: (order: string[]) => void;
  toggleHidden: (slug: string) => void;
  setScale: (scale: number) => void;
  setColumns: (columns: number) => void;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, loaded]);

  const value: Ctx = {
    ...settings,
    setOrder: (order) => setSettings((s) => ({ ...s, order })),
    toggleHidden: (slug) =>
      setSettings((s) => ({
        ...s,
        hidden: s.hidden.includes(slug)
          ? s.hidden.filter((x) => x !== slug)
          : [...s.hidden, slug],
      })),
    setScale: (scale) => setSettings((s) => ({ ...s, scale })),
    setColumns: (columns) => setSettings((s) => ({ ...s, columns })),
  };

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error("useSettings must be used within SettingsProvider");
  return c;
}
