"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, MapPin, Sparkles, Sunset, Volume2, Waves } from "lucide-react";
import { useSchedule } from "@/lib/useSchedule";
import { useNow } from "@/lib/useNow";
import { useNearestStage } from "@/lib/useNearestStage";
import { hhmm, tx } from "@/lib/format";
import { orderedVisibleStages } from "@/lib/stageSettings";
import { GROUNDING } from "@/lib/grounding";
import type { EventDTO, StageDTO } from "@/lib/types";
import { StatusBar } from "./StatusBar";
import { useSettings } from "./settings/SettingsContext";

/** Time left until `endIso`, "H:MM:SS" (or "M:SS" under an hour). */
function remaining(endIso: string, nowMs: number): string {
  const s = Math.max(0, Math.floor((new Date(endIso).getTime() - nowMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Whether `event` is on air at `nowMs` (started, not yet ended). */
function isLive(event: EventDTO, nowMs: number): boolean {
  return (
    new Date(event.startsAt).getTime() <= nowMs &&
    !!event.endsAt &&
    new Date(event.endsAt).getTime() > nowMs
  );
}

type OpeningRow = { event: EventDTO; live: boolean };
type OpeningCard = { stage: StageDTO; rows: OpeningRow[] };

/** Renders `text` at the class-defined size, shrinking the font (rather than
 *  truncating) when it would wrap past `lines` lines. Re-fits on width change. */
function FitText({
  text,
  className,
  minRem = 0.85,
  lines = 2,
}: {
  text: string;
  className?: string;
  minRem?: number;
  lines?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [rem, setRem] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      const minPx = minRem * 16;
      let px = parseFloat(getComputedStyle(el).fontSize);
      const overflows = () => {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || px * 1.2;
        // Half-line slack so a clean N-line block (whose scrollHeight runs a few
        // px over N×line-height from leading/descenders) isn't read as N+1.
        return el.scrollHeight > lh * (lines + 0.5);
      };
      while (px > minPx && overflows()) {
        px -= 1;
        el.style.fontSize = `${px}px`;
      }
      setRem(px / 16);
    };
    fit();
    const parent = el.parentElement;
    if (!parent) return;
    let lastW = parent.clientWidth;
    const ro = new ResizeObserver(() => {
      if (parent.clientWidth !== lastW) {
        lastW = parent.clientWidth;
        fit();
      }
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [text, minRem, lines]);
  return (
    <p
      ref={ref}
      className={className}
      style={rem != null ? { fontSize: `${rem}rem` } : undefined}
    >
      {text}
    </p>
  );
}

export function NowView() {
  const { data, loading, offline, error } = useSchedule();
  const now = useNow(1000);
  const locale = useLocale();
  const t = useTranslations();
  const { order, hidden } = useSettings();
  const stages = data ? orderedVisibleStages(data.stages, order, hidden) : [];
  const nearestSlug = useNearestStage(stages);

  if (loading && !data)
    return <p className="p-6 text-center text-cream-faint">{t("common.loading")}</p>;
  if (error || !data)
    return <p className="p-6 text-center text-cream-faint">{t("common.error")}</p>;

  const nowMs = now.getTime();
  const start = new Date(data.festival.startsAt).getTime();
  const end = new Date(data.festival.endsAt).getTime();

  if (nowMs < start) {
    return (
      <div className="flex flex-col">
        {offline && <StatusBar kind="offline" />}
        <Countdown msLeft={start - nowMs} />
      </div>
    );
  }

  // Opening day camp scene: from the festival start (12:00) until the Mandala
  // opening ceremony (18:30) the normal grid is replaced by the tent, with the
  // live Bowl set and the next Mandala rituals teased below it. No schema flag
  // marks the opening, so match the Mandala stage's opening-titled event; the
  // whole scene falls back to the normal grid if it can't be found.
  const mandala = data.stages.find((s) => s.slug === "mandala") ?? null;
  const opening =
    data.events.find(
      (e) =>
        e.stageSlug === "mandala" &&
        /nyit|opening/i.test(`${e.title.hu} ${e.title.en}`),
    ) ?? null;
  const openingStart = opening ? new Date(opening.startsAt).getTime() : null;
  if (openingStart != null && nowMs < openingStart) {
    const bowlStage = data.stages.find((s) => s.slug === "bowl") ?? null;
    // Bowl row: the set playing right now, or — before the first set begins —
    // that set shown as "up next". Once the first set has ended the Bowl card
    // drops out entirely (no row).
    const bowlLive =
      data.events.find(
        (e) =>
          e.stageSlug === "bowl" &&
          e.kind !== "break" &&
          new Date(e.startsAt).getTime() <= nowMs &&
          !!e.endsAt &&
          new Date(e.endsAt).getTime() > nowMs,
      ) ?? null;
    const firstBowlSet = data.events.find(
      (e) => e.stageSlug === "bowl" && e.kind !== "break",
    );
    const bowlRow: OpeningRow | null = bowlLive
      ? { event: bowlLive, live: true }
      : firstBowlSet && new Date(firstBowlSet.startsAt).getTime() > nowMs
        ? { event: firstBowlSet, live: false }
        : null;
    // Mandala: the opening ceremony and the ritual right before it (sound bath),
    // each dropped once it has ended — at most two rows.
    const mandalaRows = data.events
      .filter(
        (e) =>
          e.stageSlug === "mandala" &&
          new Date(e.startsAt).getTime() <= openingStart &&
          (e.endsAt
            ? new Date(e.endsAt).getTime() > nowMs
            : new Date(e.startsAt).getTime() > nowMs),
      )
      .slice(-2);
    const cards: OpeningCard[] = [];
    if (bowlStage && bowlRow) cards.push({ stage: bowlStage, rows: [bowlRow] });
    if (mandala && mandalaRows.length)
      cards.push({
        stage: mandala,
        rows: mandalaRows.map((e) => ({ event: e, live: isLive(e, nowMs) })),
      });
    return (
      <TentBuilding
        cards={cards}
        nowMs={nowMs}
        locale={locale}
        offline={offline}
        nearestSlug={nearestSlug}
      />
    );
  }

  // Post-festival GROUNDING window overrides both the live grid and the
  // "see you next year" screen — it runs from the last act into 15 Jul.
  const gStart = new Date(GROUNDING.startsAt).getTime();
  const gEnd = new Date(GROUNDING.endsAt).getTime();
  if (nowMs >= gStart && nowMs < gEnd) {
    return <GroundingCard offline={offline} />;
  }

  if (nowMs >= end) {
    return (
      <div className="flex flex-col">
        {offline && <StatusBar kind="offline" />}
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-2 text-sun/70">
            <Sunset size={16} className="shrink-0" />
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.22em]">
              {t("now.endedEyebrow")}
            </span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-sun">
            {t("now.ended")}
          </p>
        </div>
      </div>
    );
  }

  // Stages with something playing right now float to the top; idle ones sink to
  // the bottom (stable within each group, so the user's order is otherwise kept).
  const liveNow = (s: StageDTO) =>
    data.events.some(
      (e) => e.stageSlug === s.slug && e.kind !== "break" && isLive(e, nowMs),
    );
  const ordered = [...stages].sort(
    (a, b) => Number(liveNow(b)) - Number(liveNow(a)),
  );

  return (
    <div className="flex flex-col gap-3 px-3 pt-3">
      {offline && <StatusBar kind="offline" />}
      {ordered.map((stage) => (
        <StageNowCard
          key={stage.id}
          stage={stage}
          events={data.events.filter((e) => e.stageSlug === stage.slug)}
          nowMs={nowMs}
          locale={locale}
          near={nearestSlug === stage.slug}
        />
      ))}
    </div>
  );
}

function StageNowCard({
  stage,
  events,
  nowMs,
  locale,
  near,
}: {
  stage: StageDTO;
  events: EventDTO[];
  nowMs: number;
  locale: string;
  near: boolean;
}) {
  const t = useTranslations();
  const playable = events.filter((e) => e.kind !== "break");
  const live = playable.find(
    (e) =>
      new Date(e.startsAt).getTime() <= nowMs &&
      (e.endsAt ? new Date(e.endsAt).getTime() > nowMs : false),
  );
  const next = playable.find((e) => new Date(e.startsAt).getTime() > nowMs);
  // Only surface "up next" when it actually starts soon (within 6 hours).
  const soonNext =
    next && new Date(next.startsAt).getTime() - nowMs <= 6 * 3_600_000
      ? next
      : null;
  // Workshops show sparkles; music / ceremony a loud speaker (mirrors the grid).
  const LiveKind = live ? (live.kind === "workshop" ? Sparkles : Volume2) : null;
  const NextKind = soonNext
    ? soonNext.kind === "workshop"
      ? Sparkles
      : Volume2
    : null;

  return (
    <article
      className="card overflow-hidden rounded-2xl"
      style={{ boxShadow: live ? `0 0 0 1.5px ${stage.accent}55` : undefined }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: `linear-gradient(135deg, ${stage.color}, ${stage.color}bb)` }}
      >
        <div className="flex items-center gap-1.5">
          {live && (
            <span
              className="pulse-dot size-2.5 shrink-0 rounded-full bg-now"
              role="img"
              aria-label={t("now.playingNow")}
            />
          )}
          <h2 className="font-display text-lg font-bold text-cream">{stage.name}</h2>
          {near && (
            <MapPin
              size={15}
              className="shrink-0 text-cream"
              aria-label={t("common.youAreHere")}
            />
          )}
        </div>
        {LiveKind && (
          <LiveKind
            size={18}
            className={`shrink-0 text-cream/90 ${near ? "pulse-dot" : ""}`}
          />
        )}
      </div>

      <div className="px-4 py-3">
        {live ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <FitText
                text={tx(live.title, locale)}
                className="min-w-0 flex-1 font-display text-xl font-bold leading-tight text-cream"
              />
              {live.endsAt && (
                <div className="shrink-0 text-right">
                  <p className="font-mono text-base font-semibold tabular-nums text-sun">
                    {remaining(live.endsAt, nowMs)}
                  </p>
                  <p className="text-xs text-cream-dim">
                    {t("now.until", { time: hhmm(live.endsAt, locale) })}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-cream-faint">{t("now.nothing")}</p>
        )}

        {soonNext && (
          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2">
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cream-faint">
                {t("now.upNext")}
              </p>
              <p className="font-display text-base font-semibold text-cream-dim">
                {tx(soonNext.title, locale)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="font-mono text-sm font-semibold tabular-nums"
                style={{ color: stage.accent }}
              >
                {hhmm(soonNext.startsAt, locale)}
              </span>
              {NextKind && <NextKind size={13} style={{ color: stage.accent }} />}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function Countdown({ msLeft }: { msLeft: number }) {
  const t = useTranslations("now");
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const cells: [number, string][] = [
    [d, t("days")],
    [h, t("hours")],
    [m, t("minutes")],
    [s, t("seconds")],
  ];

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sun/80">
        {t("countdown")}
      </p>
      <div className="mt-6 flex gap-2.5">
        {cells.map(([value, label]) => (
          <div
            key={label}
            className="card flex min-w-[4.2rem] flex-col items-center rounded-2xl px-3 py-3"
          >
            <span className="font-display text-3xl font-extrabold tabular-nums text-cream">
              {String(value).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-wider text-cream-faint">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Opening-day scene: a tent pitches itself while the camp fills up, with the
 *  live Bowl set and the next Mandala rituals teased below it. */
function TentBuilding({
  cards,
  nowMs,
  locale,
  offline,
  nearestSlug,
}: {
  cards: OpeningCard[];
  nowMs: number;
  locale: string;
  offline: boolean;
  nearestSlug: string | null;
}) {
  const t = useTranslations("now.tent");
  return (
    <div className="flex flex-col">
      {offline && <StatusBar kind="offline" />}
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <TentArt />
        <h2 className="mt-7 font-display text-2xl font-bold text-cream">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-cream-dim">
          {t("body")}
        </p>
        {cards.map((c) => (
          <OpeningStageCard
            key={c.stage.id}
            card={c}
            nowMs={nowMs}
            locale={locale}
            near={nearestSlug === c.stage.slug}
          />
        ))}
      </div>
    </div>
  );
}

/** A stage card under the tent: one or more rows, each live or upcoming. */
function OpeningStageCard({
  card,
  nowMs,
  locale,
  near,
}: {
  card: OpeningCard;
  nowMs: number;
  locale: string;
  near: boolean;
}) {
  const t = useTranslations("now");
  const tCommon = useTranslations("common");
  const { stage, rows } = card;
  const HeaderIcon = rows[0]?.event.kind === "workshop" ? Sparkles : Volume2;
  const hasLive = rows.some((r) => r.live);
  return (
    <article className="card mt-4 w-full max-w-sm overflow-hidden rounded-2xl text-left">
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: `linear-gradient(135deg, ${stage.color}, ${stage.color}bb)` }}
      >
        <div className="flex items-center gap-2">
          {hasLive && (
            <span
              className="pulse-dot size-2.5 shrink-0 rounded-full bg-now"
              role="img"
              aria-label={t("playingNow")}
            />
          )}
          <h3 className="font-display text-lg font-bold text-cream">{stage.name}</h3>
          {near && (
            <MapPin
              size={15}
              className="shrink-0 text-cream"
              aria-label={tCommon("youAreHere")}
            />
          )}
        </div>
        <HeaderIcon
          size={18}
          className={`shrink-0 text-cream/90 ${near ? "pulse-dot" : ""}`}
        />
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-sm text-cream-faint">{t("nothing")}</p>
      ) : (
        <div className="divide-y divide-line/60">
          {rows.map(({ event, live }) => (
            <div key={event.id} className="px-4 py-2.5">
              {!live && (
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cream-faint">
                  {t("upNext")}
                </p>
              )}
              <div className={`flex items-start justify-between gap-3 ${live ? "" : "mt-0.5"}`}>
                <p className="font-display text-base font-semibold leading-tight text-cream">
                  {tx(event.title, locale)}
                </p>
                <div className="shrink-0 text-right">
                  {live && event.endsAt ? (
                    <>
                      <p className="font-mono text-base font-semibold tabular-nums text-sun">
                        {remaining(event.endsAt, nowMs)}
                      </p>
                      <p className="text-xs text-cream-dim">
                        {t("until", { time: hhmm(event.endsAt, locale) })}
                      </p>
                    </>
                  ) : (
                    <span
                      className="font-mono text-sm font-semibold tabular-nums"
                      style={{ color: stage.accent }}
                    >
                      {hhmm(event.startsAt, locale)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

/** Minimal line-art tent that pitches up and resets in a slow loop. */
function TentArt() {
  return (
    <svg
      viewBox="0 0 220 150"
      className="w-full max-w-[14rem]"
      role="img"
      aria-hidden="true"
    >
      {/* ground glow + baseline */}
      <ellipse cx="110" cy="122" rx="92" ry="11" fill="var(--color-leaf)" opacity="0.12" />
      <line
        x1="24"
        y1="121"
        x2="196"
        y2="121"
        stroke="var(--color-line)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* grass tufts */}
      <g stroke="var(--color-leaf)" strokeWidth="2" strokeLinecap="round" opacity="0.7" fill="none">
        <path d="M34 121 q-1 -7 -4 -10 M34 121 q1 -6 4 -9" />
        <path d="M188 121 q-1 -7 -4 -10 M188 121 q1 -6 4 -9" />
      </g>
      {/* the tent rises from the base, then resets */}
      <g className="tent-pitch">
        <path d="M110 44 L74 120 L110 120 Z" fill="var(--color-leaf)" opacity="0.85" />
        <path d="M110 44 L146 120 L110 120 Z" fill="var(--color-ink-3)" />
        <path d="M110 60 L99 120 L121 120 Z" fill="var(--color-ink)" />
        <path
          d="M110 44 L74 120 M110 44 L146 120 M74 120 L146 120 M110 44 L110 120"
          fill="none"
          stroke="var(--color-sun)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line x1="110" y1="44" x2="110" y2="27" stroke="var(--color-sun)" strokeWidth="2.4" strokeLinecap="round" />
        <path className="flag-wave" d="M110 28 L128 32 L110 36 Z" fill="var(--color-ember)" />
      </g>
    </svg>
  );
}

/** Post-festival GROUNDING Days link with a few words about it (no card). */
function GroundingCard({ offline }: { offline: boolean }) {
  const t = useTranslations("now.grounding");
  return (
    <div className="flex flex-col">
      {offline && <StatusBar kind="offline" />}
      <div className="mx-auto max-w-md px-6 py-14 text-center">
        <div className="flex items-center justify-center gap-2 text-teal">
          <Waves size={16} className="shrink-0" />
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.22em]">
            {t("eyebrow")}
          </span>
        </div>
        <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-cream">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm font-medium text-cream-dim">{t("when")}</p>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-cream-dim">
          {t("body")}
        </p>
        <a
          href={GROUNDING.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-sun px-6 py-3 font-display text-sm font-bold text-ink transition active:scale-[0.98]"
        >
          {t("cta")}
          <ArrowUpRight size={17} className="shrink-0" />
        </a>
        <p className="mt-3 text-xs text-cream-faint">grounding.manasfestival.eu</p>
      </div>
    </div>
  );
}
