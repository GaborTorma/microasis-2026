"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { AppStoreButton } from "./AppStoreButton";
import { Reveal } from "./Reveal";

// Closing call-to-action band, shared by every direction.
export function CtaBand() {
  const t = useTranslations("showcase");
  return (
    <section className="relative overflow-hidden px-6 py-20 sm:py-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 60% at 50% 100%, rgba(94,201,138,0.22), transparent 72%)",
        }}
      />
      <Reveal className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
          {t("cta.title")}
        </h2>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-cream-dim">{t("cta.body")}</p>
        <AppStoreButton height={50} className="mt-7" />
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sun underline-offset-2 hover:underline"
        >
          {t("cta.web")}
          <ArrowUpRight size={15} strokeWidth={2.2} />
        </Link>
      </Reveal>
    </section>
  );
}
