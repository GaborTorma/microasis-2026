"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "./LanguageToggle";
import { TextScaleControl } from "./TextScaleControl";
import { SettingsButton } from "./settings/SettingsButton";

export function Header() {
  const t = useTranslations("app");
  const pathname = usePathname();
  const onTimetable = pathname === "/";

  return (
    <header style={{ paddingTop: "var(--safe-top)" }}>
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-3">
        <div className="min-w-0 leading-none">
          <h1 className="truncate bg-gradient-to-r from-cream via-sun to-teal bg-clip-text font-display text-2xl font-extrabold tracking-wide text-transparent">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.22em] text-sun/80">
            {t("unofficial")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageToggle />
          {onTimetable && <TextScaleControl />}
          <SettingsButton />
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-sun/30 to-transparent" />
    </header>
  );
}
