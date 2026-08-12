"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Heart, MapPin, Sunset } from "lucide-react";
import { EVENT_ICONS, eventIconKey } from "@/lib/eventIcon";
import { useSchedule } from "@/lib/useSchedule";
import { useNow } from "@/lib/useNow";
import { useNearestStage } from "@/lib/useNearestStage";
import { hhmm, tx } from "@/lib/format";
import { orderedVisibleStages } from "@/lib/stageSettings";
import type { EventDTO, StageDTO } from "@/lib/types";
import { StatusBar } from "./StatusBar";
import { useFavorites } from "./favorites/FavoritesContext";
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
  prefix,
  className,
  minRem = 0.85,
  lines = 2,
}: {
  text: string;
  /** Inline node rendered inside the text run before the first word (e.g. the
   *  favorite heart) — em-sized content scales with the fitted font. */
  prefix?: ReactNode;
  className?: string;
  minRem?: number;
  lines?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [rem, setRem] = useState<number | null>(null);
  const hasPrefix = prefix != null;
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
  }, [text, minRem, lines, hasPrefix]);
  return (
    <p
      ref={ref}
      className={className}
      style={rem != null ? { fontSize: `${rem}rem` } : undefined}
    >
      {prefix}
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

  // The two camp scenes bracket the music, and both are derived from the data
  // rather than from any named event: gates open before the first act starts,
  // and the site is packed up after the last one ends.
  const acts = data.events.filter((e) => e.kind !== "break");
  const actStarts = acts.map((e) => new Date(e.startsAt).getTime());
  const actEnds = acts.map((e) =>
    new Date(e.endsAt ?? e.startsAt).getTime(),
  );
  const firstActStart = actStarts.length ? Math.min(...actStarts) : null;
  const lastActEnd = actEnds.length ? Math.max(...actEnds) : null;

  // Opening: the camp goes up while the first acts are still teased below it.
  if (firstActStart != null && nowMs < firstActStart) {
    const cards: OpeningCard[] = stages
      .map((stage) => {
        const first = acts.find((e) => e.stageSlug === stage.slug);
        return first
          ? { stage, rows: [{ event: first, live: isLive(first, nowMs) }] }
          : null;
      })
      .filter((c): c is OpeningCard => c !== null);
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

  // Teardown: the last set is over but the festival window is still open —
  // the camp comes down instead of the grid. No countdown: when it's over,
  // it's over.
  if (lastActEnd != null && nowMs >= lastActEnd && nowMs < end) {
    return <TentStriking offline={offline} />;
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
  const { isFavorite } = useFavorites();
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
  // Per-category workshop icon (mirrors the grid); music / ceremony → speaker.
  const LiveKind = live ? EVENT_ICONS[eventIconKey(live)] : null;
  const NextKind = soonNext ? EVENT_ICONS[eventIconKey(soonNext)] : null;
  // Display-only favorite marks (slug may be missing on a stale cached payload).
  const favLive = Boolean(live?.slug && isFavorite(live.slug));
  const favNext = Boolean(soonNext?.slug && isFavorite(soonNext.slug));

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
              <div className="min-w-0 flex-1">
                {live.artist && (
                  <p className="truncate font-display text-sm font-medium text-cream-dim">
                    {live.artist}
                  </p>
                )}
                <FitText
                  prefix={
                    favLive ? (
                      <Heart
                        fill="currentColor"
                        className="mr-1 inline-block text-red-400"
                        style={{
                          width: "0.8em",
                          height: "0.8em",
                          verticalAlign: "-0.05em",
                        }}
                        aria-hidden="true"
                      />
                    ) : undefined
                  }
                  text={tx(live.title, locale)}
                  className="min-w-0 flex-1 font-display text-xl font-bold leading-tight text-cream"
                />
              </div>
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
              {soonNext.artist && (
                <p className="truncate font-display text-xs font-medium text-cream-faint">
                  {soonNext.artist}
                </p>
              )}
              <p className="font-display text-base font-semibold text-cream-dim">
                {favNext && (
                  <Heart
                    fill="currentColor"
                    className="mr-1 inline-block text-red-400"
                    style={{
                      width: "0.8em",
                      height: "0.8em",
                      verticalAlign: "-0.05em",
                    }}
                    aria-hidden="true"
                  />
                )}
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

/** Opening-day scene: a tent pitches itself while the camp fills up, with each
 *  stage's first act teased below it. */
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

/** Closing scene: the last act is done, so the tent comes back down. Runs until
 *  the festival window closes — deliberately with no countdown, because what it
 *  would count down to is nothing. */
function TentStriking({ offline }: { offline: boolean }) {
  const t = useTranslations("now.teardown");
  return (
    <div className="flex flex-col">
      {offline && <StatusBar kind="offline" />}
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <TentArt mode="strike" />
        <h2 className="mt-7 font-display text-2xl font-bold text-cream">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-cream-dim">
          {t("body")}
        </p>
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
  const HeaderIcon = EVENT_ICONS[rows[0] ? eventIconKey(rows[0].event) : "speaker"];
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
                <div className="min-w-0">
                  {event.artist && (
                    <p className="truncate font-display text-xs font-medium text-cream-dim">
                      {event.artist}
                    </p>
                  )}
                  <p className="font-display text-base font-semibold leading-tight text-cream">
                    {tx(event.title, locale)}
                  </p>
                </div>
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

/** Minimal line-art tent, looping in a slow cycle: `pitch` raises it (gates
 *  open), `strike` drops it back down (the site is packed up). The flag only
 *  flies while the camp is going up. */
function TentArt({ mode = "pitch" }: { mode?: "pitch" | "strike" }) {
  const striking = mode === "strike";
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
      {/* the tent rises from (or folds back into) the base, then resets */}
      <g className={striking ? "tent-strike" : "tent-pitch"}>
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
        {!striking && (
          <path className="flag-wave" d="M110 28 L128 32 L110 36 Z" fill="var(--color-ember)" />
        )}
      </g>
    </svg>
  );
}
