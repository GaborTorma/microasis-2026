"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// Minimal footer: nav links + the app's exact disclaimer + author credit. No
// logo / wordmark / App Store badge / language toggle (those live in the hero and
// the top bar). Text is neutral cream — not the green accent.
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
      </div>
    </footer>
  );
}
