"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSchedule } from "@/lib/useSchedule";
import { useNow } from "@/lib/useNow";
import { hhmm, tx } from "@/lib/format";
import { orderedVisibleStages } from "@/lib/stageSettings";
import type { EventDTO, StageDTO } from "@/lib/types";
import { StatusBar } from "./StatusBar";
import { useSettings } from "./settings/SettingsContext";

export function NowView() {
  const { data, loading, offline, error } = useSchedule();
  const now = useNow(1000);
  const locale = useLocale();
  const t = useTranslations();
  const { order, hidden } = useSettings();

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

  const stages = orderedVisibleStages(data.stages, order, hidden);

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
}: {
  stage: StageDTO;
  events: EventDTO[];
  nowMs: number;
  locale: string;
}) {
  const t = useTranslations();
  const playable = events.filter((e) => e.kind !== "break");
  const live = playable.find(
    (e) =>
      new Date(e.startsAt).getTime() <= nowMs &&
      (e.endsAt ? new Date(e.endsAt).getTime() > nowMs : false),
  );
  const next = playable.find((e) => new Date(e.startsAt).getTime() > nowMs);

  return (
    <article
      className="card overflow-hidden rounded-2xl"
      style={{ boxShadow: live ? `0 0 0 1.5px ${stage.accent}55` : undefined }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: `linear-gradient(135deg, ${stage.color}, ${stage.color}bb)` }}
      >
        <h2 className="font-display text-lg font-bold text-cream">{stage.name}</h2>
        {live && (
          <span className="flex items-center gap-1.5 rounded-full bg-sun px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-ink">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink" />
            {t("now.live")}
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        {live ? (
          <>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cream-faint">
              {t("now.playingNow")}
            </p>
            <p className="mt-0.5 font-display text-2xl font-bold leading-tight text-cream">
              {tx(live.title, locale)}
            </p>
            {live.endsAt && (
              <p className="mt-0.5 text-xs text-cream-dim">
                {t("now.until", { time: hhmm(live.endsAt, locale) })}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-cream-faint">{t("now.nothing")}</p>
        )}

        {next && (
          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2">
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cream-faint">
                {t("now.upNext")}
              </p>
              <p className="font-display text-base font-semibold text-cream-dim">
                {tx(next.title, locale)}
              </p>
            </div>
            <span
              className="font-mono text-sm font-semibold tabular-nums"
              style={{ color: stage.accent }}
            >
              {hhmm(next.startsAt, locale)}
            </span>
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
