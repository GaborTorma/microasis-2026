"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Languages, MapPin, WifiOff } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { framedHero, framedPhone } from "@/lib/showcase";
import { ShowcaseTopBar } from "./ShowcaseTopBar";
import { Framed } from "./Framed";
import { AppStoreButton } from "./AppStoreButton";
import { TrustPills } from "./TrustPills";
import { SectionHeading } from "./SectionHeading";
import { FeatureRow } from "./FeatureRow";
import { MiniFeature } from "./MiniFeature";
import { WatchSection } from "./WatchSection";
import { CtaBand } from "./CtaBand";
import { ShowcaseFooter } from "./ShowcaseFooter";
import { Reveal } from "./Reveal";

// The /app showcase: a restrained, Apple-indie presentation of the native iOS +
// watchOS apps. Real device-framed screenshots are the hero; the page chrome stays
// dark and architectural. Bilingual via next-intl (copy + screenshots swap by
// locale); reuses the PWA's tokens, fonts, LanguageToggle and lib/platform.
export function AppShowcase() {
  const t = useTranslations("showcase");
  const locale = useLocale() as Locale;

  // 1 right · 2 left · 3 right
  const FEATURES = [
    { key: "timetable", shot: "timetableFri", flip: true },
    { key: "now", shot: "now", flip: false },
    { key: "settings", shot: "settings", flip: true },
  ] as const;

  return (
    <div className="relative">
      <ShowcaseTopBar />

      {/* ── Hero ── (top padding clears the fixed top bar) */}
      <section className="relative overflow-hidden px-6 pb-10 pt-20 sm:pt-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(48% 40% at 16% 6%, rgba(94,201,138,0.18), transparent 70%), radial-gradient(46% 38% at 90% 14%, rgba(70,179,163,0.15), transparent 70%)",
          }}
        />
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <img src="/icon.svg" alt="" width={56} height={56} className="rounded-2xl" />
            <p className="mt-5 text-sm font-semibold text-teal">{t("hero.eyebrow")}</p>
            <h1 className="mt-2 font-display font-extrabold leading-[1.06] tracking-tight text-cream text-[clamp(2.3rem,6.4vw,3.7rem)]">
              {t("hero.headline")}
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-cream-dim">{t("hero.sub")}</p>
            <AppStoreButton height={52} className="mt-7" pulse />
            <Link
              href="/"
              className="mt-4 flex w-fit items-center gap-1 text-sm font-semibold text-sun underline-offset-2 hover:underline"
            >
              {t("hero.webSchedule")}
              <ArrowUpRight size={15} strokeWidth={2.2} />
            </Link>
            <TrustPills className="mt-7" />
          </div>

          <div className="relative flex justify-center">
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 -z-10 h-[78%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{ background: "var(--color-sun)", opacity: 0.15 }}
            />
            <Framed
              kind="hero"
              src={framedHero(locale)}
              alt={`${t("features.timetable.title")} · Apple Watch`}
              priority
              className="float-soft w-[82vw] max-w-[360px] md:max-w-[480px]"
              sizes="(max-width: 768px) 82vw, 480px"
            />
          </div>
        </div>
      </section>

      {/* ── Features (alternating, interleaved on desktop) ── */}
      <section className="px-6 py-10 sm:py-12">
        <Reveal>
          <SectionHeading title={t("featuresHeading")} />
        </Reveal>
        {/* On desktop each row slides up to overlap the previous one's whitespace
            (the phones alternate sides, so they interleave instead of colliding).
            A plain block container (not flex) keeps the negative margin reliable in
            Safari; the rising z-index keeps later rows on top where they meet. */}
        <div className="mx-auto mt-8 max-w-4xl">
          {FEATURES.map((f, i) => (
            <div
              key={f.key}
              className={`relative ${i > 0 ? "mt-10 md:-mt-[140px]" : ""}`}
              style={{ zIndex: i + 1 }}
            >
              <FeatureRow
                index={i + 1}
                flip={f.flip}
                src={framedPhone(locale, f.shot)}
                alt={t(`features.${f.key}.title`)}
                title={t(`features.${f.key}.title`)}
                body={t(`features.${f.key}.body`)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Smaller proof points ── */}
      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          <MiniFeature
            Icon={WifiOff}
            title={t("features.offline.title")}
            body={t("features.offline.body")}
            accent="var(--color-teal)"
          />
          <MiniFeature
            Icon={MapPin}
            title={t("features.location.title")}
            body={t("features.location.body")}
            accent="var(--color-ember)"
            delay={80}
          />
          <MiniFeature
            Icon={Languages}
            title={t("features.language.title")}
            body={t("features.language.body")}
            accent="var(--color-sun)"
            delay={160}
          />
        </div>
      </section>

      <WatchSection />
      <CtaBand />
      <ShowcaseFooter />
    </div>
  );
}
