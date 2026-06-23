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
      className="flex w-full items-center gap-1 rounded-xl border border-line bg-ink-2/70 p-1 text-sm font-semibold"
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
          className={`flex-1 rounded-lg px-3 py-1.5 uppercase tracking-wide transition-colors ${
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
