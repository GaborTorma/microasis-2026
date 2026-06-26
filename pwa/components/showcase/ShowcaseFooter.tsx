"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/LanguageToggle";

// Minimal footer: nav links + the app's exact disclaimer + author credit. Text is
// neutral cream — not the green accent. The only control is a language toggle
// beside the credit, shown ONLY on mobile (the top bar's toggle is desktop-only,
// so phones would otherwise have no way to switch language).
export function ShowcaseFooter() {
  const t = useTranslations("showcase.footer");
  const s = useTranslations("settings");
  return (
    <footer className="border-t border-line/60 px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#a3a3a3]">
          <Link href="/" className="underline-offset-2 hover:text-white hover:underline">
            {t("web")}
          </Link>
          <Link href="/privacy" className="underline-offset-2 hover:text-white hover:underline">
            {t("privacy")}
          </Link>
          <Link href="/support" className="underline-offset-2 hover:text-white hover:underline">
            {t("support")}
          </Link>
        </nav>

        <p className="max-w-2xl text-xs leading-relaxed text-[#8a8a8a]">{s("disclaimer")}</p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[#8a8a8a]">
            {s("madeprefix")}{" "}
            <a
              href="https://torma.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a3a3a3] underline underline-offset-2 hover:text-white"
            >
              {s("makername")}
            </a>
          </p>
          {/* Mobile-only: the top bar's toggle is hidden below sm. */}
          <div className="w-24 shrink-0 sm:hidden">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
