"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TextScaleControl } from "./TextScaleControl";
import { ColumnCountControl } from "./ColumnCountControl";
import { FavoritesFilterButton } from "./favorites/FavoritesFilterButton";
import { SettingsButton } from "./settings/SettingsButton";

export function Header() {
  const t = useTranslations("app");
  const pathname = usePathname();
  const onTimetable = pathname === "/";
  const ref = useRef<HTMLElement>(null);

  // Publish the header height so the timetable's sticky toolbar pins right below
  // it — header + toolbar stay fixed, only the grid scrolls (like iOS portrait).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const set = () =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    const ro = new ResizeObserver(set);
    ro.observe(el);
    set();
    return () => ro.disconnect();
  }, []);

  return (
    <header
      ref={ref}
      style={{ paddingTop: "var(--safe-top)" }}
      className="sticky top-0 z-30 bg-ink/95 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-3">
        <div className="min-w-0 leading-none">
          {/* Referential "Guide for" kicker so the wordmark reads as a unit —
              "Guide for MANAS 2026". English in both locales (matches iOS). */}
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cream/75">
            {t("guidefor")}
          </p>
          <h1 className="truncate bg-gradient-to-r from-cream via-sun to-teal bg-clip-text font-display text-2xl font-extrabold leading-none tracking-wide text-transparent">
            {t("title")}
          </h1>
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-sun/80">
            {t("unofficial")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onTimetable && <TextScaleControl />}
          {onTimetable && <ColumnCountControl />}
          {onTimetable && <FavoritesFilterButton />}
          <SettingsButton />
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-sun/30 to-transparent" />
    </header>
  );
}
