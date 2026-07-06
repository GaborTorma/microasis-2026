"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFavorites } from "./FavoritesContext";

/** Header heart that dims non-favorited acts on the timetable. Only offered
 *  once something is favorited (mirrors the iOS header filter). */
export function FavoritesFilterButton() {
  const t = useTranslations();
  const { favorites, showOnlyFavorites, toggleShowOnlyFavorites } =
    useFavorites();

  if (favorites.size === 0) return null;

  return (
    <button
      type="button"
      onClick={toggleShowOnlyFavorites}
      aria-pressed={showOnlyFavorites}
      aria-label={t("favorites.filter")}
      title={t("favorites.filter")}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-line bg-ink-2/70 ${
        showOnlyFavorites ? "text-red-400" : "text-cream-dim hover:text-cream"
      }`}
    >
      <Heart size={16} fill={showOnlyFavorites ? "currentColor" : "none"} />
    </button>
  );
}
