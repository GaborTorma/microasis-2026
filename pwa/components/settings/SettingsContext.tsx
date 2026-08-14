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
// Every stage starts visible (kept in sync with OasisKit/AppState.swift — see
// ../CLAUDE.md). Users can hide any of them in settings.
const DEFAULT: Settings = { order: [], hidden: [], scale: 1, columns: 3 };
const KEY = "microasis-settings-v1";
// One-shot migration. The Yoga Terrace shipped hidden by default because it had
// no published programme; now it has one. Flipping DEFAULT only reaches new
// visitors — anyone who loaded the site before persisted the old hidden set and
// would never see the stage. Drop "terrace" from it exactly once, leaving every
// stage the user hid themselves alone. Delete this once the audience has turned
// over (it is dead weight after the festival).
const TERRACE_UNHIDE_KEY = "microasis-terrace-programmed-v1";

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
      let next: Settings = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
      if (!localStorage.getItem(TERRACE_UNHIDE_KEY)) {
        localStorage.setItem(TERRACE_UNHIDE_KEY, "1");
        next = { ...next, hidden: next.hidden.filter((s) => s !== "terrace") };
      }
      setSettings(next);
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
