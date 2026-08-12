"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import { STAGE_ACCENTS, framedWatch } from "@/lib/showcase";
import { SectionHeading } from "./SectionHeading";
import { Framed } from "./Framed";
import { Reveal } from "./Reveal";

const portal = STAGE_ACCENTS.portal;
const field = STAGE_ACCENTS.field;

// The Apple Watch chapter. Band-less watches (no strap), no background band.
// Swipe row = a 3-watch fan; widget row = two overlapping Smart Stack cards.
export function WatchSection() {
  const t = useTranslations("showcase.watch");
  const locale = useLocale() as Locale;

  return (
    <section className="px-6 py-14 sm:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} sub={t("body")} />

        {/* Swipe story — a fan of three */}
        <div className="mt-12 grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
          <Reveal className="flex items-center justify-center">
            <Framed
              kind="watch"
              src={framedWatch(locale, "nowWadi")}
              alt="Apple Watch — Terrace"
              className="z-0 w-[30vw] max-w-[124px] -rotate-[14deg] translate-y-4 opacity-75"
              sizes="124px"
            />
            <Framed
              kind="watch"
              src={framedWatch(locale, "nowOasis")}
              alt="Apple Watch — Portal"
              className="z-10 -mx-6 w-[42vw] max-w-[176px]"
              sizes="(max-width: 640px) 42vw, 176px"
            />
            <Framed
              kind="watch"
              src={framedWatch(locale, "nowQuiet")}
              alt="Apple Watch — Mandala"
              className="z-0 w-[30vw] max-w-[124px] rotate-[14deg] translate-y-4 opacity-75"
              sizes="124px"
            />
          </Reveal>
          <Reveal delay={100}>
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-cream sm:text-[1.8rem]">
              {t("swipeTitle")}
            </h3>
            <p className="mt-3 max-w-md text-base leading-relaxed text-cream-dim sm:text-[1.05rem]">
              {t("swipeBody")}
            </p>
          </Reveal>
        </div>

        {/* Smart Stack widgets — two stacked cards */}
        <div className="mt-14 grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
          <Reveal className="flex items-center justify-center sm:order-2">
            <Framed
              kind="watch"
              src={framedWatch(locale, "widgetWadi")}
              alt="Smart Stack widget — Field"
              className="z-0 w-[32vw] max-w-[140px] -rotate-[10deg] translate-y-3 opacity-80"
              glow={field}
              sizes="140px"
            />
            <Framed
              kind="watch"
              src={framedWatch(locale, "widgetOasis")}
              alt="Smart Stack widget — Portal"
              className="z-10 -ml-6 w-[42vw] max-w-[176px]"
              glow={portal}
              sizes="(max-width: 640px) 42vw, 176px"
            />
          </Reveal>
          <Reveal delay={100} className="sm:order-1">
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-cream sm:text-[1.8rem]">
              {t("widgetTitle")}
            </h3>
            <p className="mt-3 max-w-md text-base leading-relaxed text-cream-dim sm:text-[1.05rem]">
              {t("widgetBody")}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
