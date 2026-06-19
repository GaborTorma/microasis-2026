"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Settings = { order: string[]; hidden: string[]; scale: number };
// Bowl is hidden by default (its poster isn't published); users can re-enable it.
const DEFAULT: Settings = { order: [], hidden: ["bowl"], scale: 1 };
const KEY = "manas-settings-v1";

/** Timetable text/width zoom levels (−25% … +50%, 25% steps). */
export const SCALE_LEVELS = [0.75, 1, 1.25, 1.5] as const;

type Ctx = Settings & {
  setOrder: (order: string[]) => void;
  toggleHidden: (slug: string) => void;
  setScale: (scale: number) => void;
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
  };

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error("useSettings must be used within SettingsProvider");
  return c;
}
