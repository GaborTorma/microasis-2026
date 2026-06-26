"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, MapPin, WifiOff } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { framedHero, framedPhone } from "@/lib/showcase";
import { AndroidIcon } from "./AndroidIcon";
import { ShowcaseTopBar } from "./ShowcaseTopBar";
import { Framed } from "./Framed";
import { InstallCta } from "./InstallCta";
import { TrustPills } from "./TrustPills";
import { SectionHeading } from "./SectionHeading";
import { FeatureRow } from "./FeatureRow";
import { MiniFeature } from "./MiniFeature";
import { WatchSection } from "./WatchSection";
import { CtaBand } from "./CtaBand";
import { ShowcaseFooter } from "./ShowcaseFooter";
import { Reveal } from "./Reveal";

// The three alternating feature rows: 1 left · 2 right · 3 left. Each device gets a
// slight desktop-only tilt; row 1's copy is nudged up to sit beside its tall shot.
// The float amp/dur/delay differ per row so the three devices bob irregularly,
// never re-syncing (negative delays start each one mid-phase).
const FEATURES = [
  { key: "timetable", shot: "timetableFri", flip: false, rotate: "md:-rotate-[8deg]", bodyClass: "md:-mt-[200px]", floatAmp: "-12px", floatDur: "7s", floatDelay: "0s" },
  { key: "now", shot: "now", flip: true, rotate: "md:rotate-[4deg]", bodyClass: "", floatAmp: "-9px", floatDur: "7.6s", floatDelay: "-1.6s" },
  { key: "settings", shot: "settings", flip: false, rotate: "md:-rotate-[9deg]", bodyClass: "", floatAmp: "-11px", floatDur: "6.6s", floatDelay: "-3.1s" },
] as const;

// The /app showcase: a restrained, Apple-indie presentation of the native iOS +
// watchOS apps. Real device-framed screenshots are the hero; the page chrome stays
// dark and architectural. Bilingual via next-intl (copy + screenshots swap by
// locale); reuses the PWA's tokens, fonts, LanguageToggle and lib/platform.
export function AppShowcase() {
  const t = useTranslations("showcase");
  const locale = useLocale() as Locale;

  // The top bar swaps the language toggle for the install/download CTA only once
  // the hero's own CTA has scrolled out of view (behind the fixed bar — hence the
  // negative top rootMargin).
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const [heroCtaInView, setHeroCtaInView] = useState(true);
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setHeroCtaInView(e.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="relative">
      <ShowcaseTopBar showInstall={!heroCtaInView} />

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
            <div ref={heroCtaRef} className="mt-7 w-fit">
              <InstallCta height={52} pulse />
            </div>
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
            {/* Desktop tilt on a wrapper so it composes with float-soft (which
                animates transform on the Framed element itself). */}
            <div className="md:rotate-[5deg]">
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
        </div>
      </section>

      {/* ── Features (alternating, interleaved on desktop) ── */}
      <section className="px-6 py-10 sm:py-12">
        <Reveal className="md:-mt-[50px]">
          <SectionHeading title={t("featuresHeading")} />
        </Reveal>
        {/* On desktop each row slides up to overlap the previous one's whitespace
            (the phones alternate sides, so they interleave instead of colliding).
            A plain block container (not flex) keeps the negative margin reliable in
            Safari; the rising z-index keeps later rows on top where they meet. */}
        <div className="mx-auto mt-14 max-w-4xl">
          {FEATURES.map((f, i) => (
            <div
              key={f.key}
              className={`relative ${i > 0 ? "mt-10 md:-mt-[140px]" : ""}`}
              style={{ zIndex: i + 1 }}
            >
              <FeatureRow
                flip={f.flip}
                rotate={f.rotate}
                bodyClass={f.bodyClass}
                floatStyle={{
                  ["--float-amp" as string]: f.floatAmp,
                  ["--float-dur" as string]: f.floatDur,
                  ["--float-delay" as string]: f.floatDelay,
                }}
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
            Icon={AndroidIcon}
            title={t("features.android.title")}
            body={t("features.android.body")}
            accent="var(--color-sun)"
          />
          <MiniFeature
            Icon={MapPin}
            title={t("features.location.title")}
            body={t("features.location.body")}
            accent="var(--color-ember)"
            delay={80}
          />
          <MiniFeature
            Icon={WifiOff}
            title={t("features.offline.title")}
            body={t("features.offline.body")}
            accent="var(--color-teal)"
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
