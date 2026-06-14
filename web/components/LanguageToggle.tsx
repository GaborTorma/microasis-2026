"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { LOCALES } from "@/i18n/config";

export function LanguageToggle() {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="flex items-center rounded-full border border-line bg-ink-2/70 p-0.5 text-xs font-semibold"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setLocale(l))}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition-colors ${
            locale === l
              ? "bg-sun text-ink"
              : "text-cream-dim hover:text-cream"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
