"use client";

import { useTranslations } from "next-intl";

// The "Guide for / MANAS 2026 / Unofficial" lockup, reusing the Header's gradient
// wordmark treatment so the showcase reads as the same brand as the PWA.
export function Wordmark({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("app");
  return (
    <div className="min-w-0 leading-none">
      <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-cream/75">
        {t("guidefor")}
      </p>
      <p
        className={`bg-gradient-to-r from-cream via-sun to-teal bg-clip-text font-display font-extrabold tracking-wide text-transparent ${
          compact ? "text-lg" : "text-xl"
        }`}
      >
        {t("title")}
      </p>
      {!compact && (
        <p className="text-[0.55rem] font-medium uppercase tracking-[0.22em] text-sun/80">
          {t("unofficial")}
        </p>
      )}
    </div>
  );
}
