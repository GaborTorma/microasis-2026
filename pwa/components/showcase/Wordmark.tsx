"use client";

import { useTranslations } from "next-intl";

// The "Guide for / MicrOasis 2026" lockup for the showcase top bar, reusing the
// Header's gradient wordmark treatment so the showcase reads as the same brand
// as the PWA.
export function Wordmark() {
  const t = useTranslations("app");
  return (
    <div className="min-w-0 leading-none">
      <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-cream/75">
        {t("guidefor")}
      </p>
      <p className="bg-gradient-to-r from-cream via-sun to-teal bg-clip-text font-display text-lg font-extrabold tracking-wide text-transparent">
        {t("title")}
      </p>
    </div>
  );
}
