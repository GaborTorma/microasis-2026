"use client";

import { useLocale, useTranslations } from "next-intl";
import { MapPin, Sparkles, Volume2 } from "lucide-react";
import { useSchedule } from "@/lib/useSchedule";
import { useNow } from "@/lib/useNow";
import { useNearestStage } from "@/lib/useNearestStage";
import { hhmm, tx } from "@/lib/format";
import { orderedVisibleStages } from "@/lib/stageSettings";
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

  if (nowMs >= end) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-display text-2xl font-bold text-sun">
          {t("now.ended")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3 pt-3">
      {offline && <StatusBar kind="offline" />}
      {stages.map((stage) => (
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
          <h2 className="font-display text-lg font-bold text-cream">{stage.name}</h2>
          {near && (
            <MapPin
              size={15}
              className="shrink-0 text-cream"
              aria-label={t("common.youAreHere")}
            />
          )}
        </div>
        {LiveKind && <LiveKind size={18} className="shrink-0 text-cream/90" />}
      </div>

      <div className="px-4 py-3">
        {live ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-2xl font-bold leading-tight text-cream">
                {tx(live.title, locale)}
              </p>
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
