"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Stored value: plain string[] of event slugs (the cross-platform event key).
const KEY = "manas-favorites-v1";

type Ctx = {
  favorites: Set<string>;
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
};

const FavoritesCtx = createContext<Ctx | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const parse = (raw: string | null): Set<string> | null => {
      try {
        const parsed: unknown = JSON.parse(raw ?? "[]");
        if (Array.isArray(parsed))
          return new Set(parsed.filter((x): x is string => typeof x === "string"));
      } catch {
        /* ignore */
      }
      return null;
    };
    const initial = parse(localStorage.getItem(KEY));
    if (initial) setFavorites(initial);
    setLoaded(true);
    // Another tab's write lands here — without it, this tab's next toggle
    // would clobber that tab's favorites with its own stale snapshot.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const next = parse(e.newValue);
      if (next) setFavorites(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify([...favorites]));
    } catch {
      /* ignore */
    }
  }, [favorites, loaded]);

  const value: Ctx = {
    favorites,
    isFavorite: (slug) => favorites.has(slug),
    toggleFavorite: (slug) =>
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(slug)) next.delete(slug);
        else next.add(slug);
        return next;
      }),
  };

  return <FavoritesCtx.Provider value={value}>{children}</FavoritesCtx.Provider>;
}

export function useFavorites(): Ctx {
  const c = useContext(FavoritesCtx);
  if (!c) throw new Error("useFavorites must be used within FavoritesProvider");
  return c;
}
