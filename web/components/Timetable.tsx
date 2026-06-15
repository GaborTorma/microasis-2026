"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Coffee, Sparkles, Volume2 } from "lucide-react";
import { useSchedule } from "@/lib/useSchedule";
import { useNow } from "@/lib/useNow";
import { hhmm, mmdd, tx, weekdayLong } from "@/lib/format";
import { orderedVisibleStages } from "@/lib/stageSettings";
import type { EventDTO, StageDTO } from "@/lib/types";
import { StatusBar } from "./StatusBar";
import { useSettings } from "./settings/SettingsContext";

const PX_PER_HOUR = 64;
const HOUR = 3_600_000;
const GUTTER = 64; // px, fixed time axis (hour labels + 2-line day marker)
const MIN_COL = 100; // px, min stage-column width → ~3 columns fit a phone
const SNAP = 12; // px, day-detection tolerance (compensates scroll padding)
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" });
const festivalDay = (d: Date) => dayFmt.format(d);
const floorHour = (ms: number) => Math.floor(ms / HOUR) * HOUR;
const ceilHour = (ms: number) => Math.ceil(ms / HOUR) * HOUR;

// Language coding, matching the printed poster's legend colours:
// both = yellow (EN+HU), English only = purple, Hungarian only = turquoise,
// Ø = grey (language-neutral). Only workshop slots carry a chip.
const LANG_CHIPS: Record<string, { labels: string[]; bg: string; fg: string }> = {
  both: { labels: ["EN+HU"], bg: "#e0b93a", fg: "#160c08" },
  en: { labels: ["EN"], bg: "#9d6fc4", fg: "#ffffff" },
  hu: { labels: ["HU"], bg: "#46b3a3", fg: "#0c1611" },
  none: { labels: ["Ø"], bg: "#5e6b63", fg: "#e9efe9" },
};

export function Timetable() {
  const { data, loading, offline, error } = useSchedule();
  const now = useNow(30_000);
  const locale = useLocale();
  const t = useTranslations();
  const { order, hidden, scale } = useSettings();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const headScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);

  const grid = useMemo(() => {
    if (!data || data.events.length === 0) return null;
    const starts = data.events.map((e) => new Date(e.startsAt).getTime());
    const ends = data.events.map((e) =>
      e.endsAt ? new Date(e.endsAt).getTime() : 0,
    );
    const gridStart = floorHour(Math.min(...starts));
    const gridEnd = ceilHour(Math.max(...starts.map((s, i) => Math.max(s + HOUR, ends[i]))));
    const height = ((gridEnd - gridStart) / HOUR) * PX_PER_HOUR;
    const yFor = (ms: number) => ((ms - gridStart) / HOUR) * PX_PER_HOUR;

    const hours: { y: number; label: string; midnight: boolean }[] = [];
    for (let m = gridStart; m <= gridEnd; m += HOUR) {
      const label = hhmm(new Date(m).toISOString(), locale);
      hours.push({ y: yFor(m), label, midnight: label === "00:00" });
    }
    const dividers: { y: number; day: string }[] = [
      { y: 0, day: festivalDay(new Date(gridStart)) },
    ];
    for (let m = gridStart; m <= gridEnd; m += HOUR) {
      if (hhmm(new Date(m).toISOString(), locale) === "00:00")
        dividers.push({ y: yFor(m), day: festivalDay(new Date(m)) });
    }
    return { gridStart, gridEnd, height, yFor, hours, dividers };
  }, [data, locale]);

  const scrollToY = (y: number) => {
    if (!gridRef.current) return;
    const top = gridRef.current.getBoundingClientRect().top + window.scrollY;
    const tb = toolbarRef.current?.offsetHeight ?? 0;
    window.scrollTo({ top: Math.max(0, y + top - tb - 8), behavior: "smooth" });
    // Smooth scroll is ignored in some embedded browsers; ensure the jump lands.
    window.scrollTo(0, Math.max(0, y + top - tb - 8));
  };

  const yForDay = (day: string) => {
    if (!grid) return 0;
    const ms = new Date(`${day}T00:00:00+02:00`).getTime();
    return Math.max(0, grid.yFor(Math.max(ms, grid.gridStart)));
  };

  // Keep the stage-header row's horizontal scroll in sync with the grid body.
  const syncScroll = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (from && to && to.scrollLeft !== from.scrollLeft)
      to.scrollLeft = from.scrollLeft;
  };

  // Track which day is at the top of the viewport.
  useEffect(() => {
    if (!grid || !gridRef.current) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = gridRef.current;
        if (!el) return; // component may have unmounted before the frame ran
        const top = el.getBoundingClientRect().top + window.scrollY;
        const tb = toolbarRef.current?.offsetHeight ?? 0;
        // +SNAP compensates the scrollToY(-8) padding so a day's top edge
        // detects that day (not 7-8 min of the previous day above it).
        const yTop = window.scrollY + tb - top + SNAP;
        const ms = grid.gridStart + (yTop / PX_PER_HOUR) * HOUR;
        setActiveDay(festivalDay(new Date(Math.max(grid.gridStart, ms))));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [grid]);

  // On first load, jump to now (or stay at the start if outside the festival).
  useEffect(() => {
    if (!grid || didInit.current) return;
    didInit.current = true;
    const nowMs = now.getTime();
    requestAnimationFrame(() => {
      if (nowMs >= grid.gridStart && nowMs <= grid.gridEnd) {
        scrollToY(grid.yFor(nowMs) - 120);
      }
    });
  }, [grid, now]);

  if (loading && !data)
    return <p className="p-6 text-center text-cream-faint">{t("common.loading")}</p>;
  if (error || !data || !grid)
    return <p className="p-6 text-center text-cream-faint">{t("common.error")}</p>;

  const nowMs = now.getTime();
  const showNow = nowMs >= grid.gridStart && nowMs <= grid.gridEnd;
  const todayStr = festivalDay(now);
  const stages = orderedVisibleStages(data.stages, order, hidden);
  // The "zoom" only widens columns + enlarges act/time text — the vertical
  // time grid and the headers stay fixed.
  const colW = MIN_COL * scale;
  const colsMinWidth = stages.length * colW;
  const colStyle: React.CSSProperties = {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 0,
    minWidth: colW,
  };

  return (
    <div className="flex flex-col">
      {offline && <StatusBar kind="offline" />}

      {/* Sticky toolbar: full-width day jumper + (scrollable) stage headers */}
      <div ref={toolbarRef} className="sticky top-0 z-20 bg-ink/85 backdrop-blur-md">
        <div className="flex gap-1 px-2 pt-2">
          {data.days.map((d) => {
            const active = d === activeDay;
            return (
              <button
                key={d}
                type="button"
                onClick={() => scrollToY(yForDay(d))}
                className={`flex flex-1 flex-col items-center rounded-md px-1 py-1.5 leading-tight transition-colors ${
                  active ? "bg-sun text-ink" : "bg-ink-2/60 text-cream-dim hover:text-cream"
                }`}
              >
                <span className="font-display text-base font-bold tabular-nums">
                  {mmdd(d)}
                </span>
                <span
                  className={`text-[0.6rem] font-medium ${active ? "text-ink/70" : "text-cream-faint"}`}
                >
                  {weekdayLong(d, locale)}
                </span>
                {d === todayStr && (
                  <span className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-ink" : "bg-sun"}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Stage header row: fixed gutter spacer + horizontally-scrolling headers */}
        <div className="flex px-2 pb-1.5 pt-2">
          <div style={{ width: GUTTER }} className="shrink-0" />
          <div
            ref={headScrollRef}
            onScroll={() => syncScroll(headScrollRef.current, bodyScrollRef.current)}
            className="no-scrollbar flex-1 overflow-x-auto"
          >
            <div className="flex" style={{ minWidth: colsMinWidth, width: "100%" }}>
              {stages.map((s) => (
                <div key={s.id} style={colStyle} className="px-0.5">
                  <div
                    className="truncate rounded-lg px-2 py-1 text-center font-display text-sm font-bold text-cream"
                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}bb)` }}
                  >
                    {s.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Proportional time grid: fixed gutter + horizontally-scrolling columns */}
      <div className="flex px-2">
        {/* Fixed gutter — hour labels + day-change chips, always visible */}
        <div className="relative shrink-0" style={{ width: GUTTER, height: grid.height }}>
          {grid.hours.map((h, i) =>
            !h.midnight && i !== 0 ? (
              <span
                key={i}
                className="absolute left-1 -translate-y-1/2 font-mono tabular-nums text-cream-faint"
                style={{ top: h.y, fontSize: `${0.6 * scale}rem` }}
              >
                {h.label}
              </span>
            ) : null,
          )}
          {grid.dividers.map((d, i) => (
            <div
              key={i}
              className={`absolute left-0 flex flex-col items-start rounded-md bg-ink/85 px-1 py-0.5 leading-none ${
                i === 0 ? "top-1" : "-translate-y-1/2"
              }`}
              style={{ width: GUTTER, top: d.y }}
            >
              <span className="font-display text-[0.72rem] font-bold text-sun">
                {mmdd(d.day)}
              </span>
              <span className="mt-0.5 w-full truncate text-[0.55rem] font-medium text-cream-dim">
                {weekdayLong(d.day, locale)}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable columns */}
        <div
          ref={bodyScrollRef}
          onScroll={() => syncScroll(bodyScrollRef.current, headScrollRef.current)}
          className="flex-1 overflow-x-auto"
        >
          <div
            ref={gridRef}
            className="relative"
            style={{ height: grid.height, minWidth: colsMinWidth, width: "100%" }}
          >
            {/* hour lines (full content width) */}
            {grid.hours.map((h, i) => (
              <div
                key={i}
                className="pointer-events-none absolute inset-x-0 h-px"
                style={{ top: h.y, background: h.midnight ? "transparent" : "rgba(43,71,54,0.3)" }}
              />
            ))}

            {/* columns with event blocks */}
            <div className="absolute inset-0 flex">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  style={colStyle}
                  className="relative border-l border-line/20 px-0.5"
                >
                  {data.events
                    .filter((e) => e.stageSlug === stage.slug)
                    .map((e) => (
                      <EventBlock
                        key={e.id}
                        event={e}
                        stage={stage}
                        yFor={grid.yFor}
                        nowMs={nowMs}
                        locale={locale}
                        scale={scale}
                      />
                    ))}
                </div>
              ))}
            </div>

            {/* overlay: day-divider lines + now line (above blocks) */}
            <div className="pointer-events-none absolute inset-0">
              {grid.dividers.map((d, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 h-px"
                  style={{ top: d.y, borderTop: "1px dashed rgba(94,201,138,0.55)" }}
                />
              ))}
              {showNow && (
                <div className="absolute inset-x-0" style={{ top: grid.yFor(nowMs) }}>
                  <div className="h-0.5 w-full" style={{ background: "#ff5d6c", boxShadow: "0 0 8px #ff5d6c" }} />
                  <span className="absolute -top-2 left-0 h-2 w-2 rounded-full" style={{ background: "#ff5d6c", boxShadow: "0 0 8px #ff5d6c" }} />
                  <span className="absolute left-3 -top-2 rounded bg-[#ff5d6c] px-1 py-0.5 text-[0.55rem] font-bold uppercase text-white">
                    {t("now.title")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventBlock({
  event,
  stage,
  yFor,
  nowMs,
  locale,
  scale,
}: {
  event: EventDTO;
  stage: StageDTO;
  yFor: (ms: number) => number;
  nowMs: number;
  locale: string;
  scale: number;
}) {
  const t = useTranslations();
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + HOUR;
  const top = yFor(start);
  const height = Math.max(yFor(end) - top, 15);
  const live = start <= nowMs && end > nowMs;
  const past = end <= nowMs;
  // When the block is too short, drop the time row but always keep the act name.
  const tight = height < 34;
  // Only workshops carry a language chip; Ø (grey) marks language-neutral ones.
  const chip = event.kind === "workshop" ? LANG_CHIPS[event.langAvailability ?? "none"] : null;

  if (event.kind === "break") {
    return (
      <div
        className="absolute inset-x-0.5 flex items-center justify-center overflow-hidden rounded-md border border-dashed border-line/50 text-[0.6rem] uppercase tracking-wider text-cream-faint"
        style={{ top, height }}
      >
        {height >= 22 && (
          <span className="flex items-center gap-1">
            <Coffee size={11} /> {t("common.break")}
          </span>
        )}
      </div>
    );
  }

  // Workshops show sparkles; everything else (music / ceremony) a loud speaker.
  const KindIcon = event.kind === "workshop" ? Sparkles : Volume2;
  const iconPx = Math.round(11 * scale);

  return (
    <div
      className={`absolute inset-x-0.5 flex flex-col overflow-hidden rounded-md border-l-2 ${
        tight ? "px-1 py-0" : "px-1.5 py-0.5"
      } ${live ? "ring-1 ring-offset-0" : ""} ${past ? "opacity-45" : ""}`}
      style={{
        top,
        height,
        borderLeftColor: stage.accent,
        background: live
          ? `linear-gradient(135deg, ${stage.color}dd, ${stage.color}99)`
          : `${stage.color}40`,
        ...(live ? ({ "--tw-ring-color": stage.accent } as React.CSSProperties) : {}),
      }}
    >
      {!tight && (
        <div className="flex items-center gap-1">
          <span
            className="font-mono font-semibold tabular-nums"
            style={{ color: stage.accent, fontSize: `${0.58 * scale}rem` }}
          >
            {hhmm(event.startsAt, locale)}
          </span>
          {live && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sun" />}
          <KindIcon size={iconPx} className="ml-auto shrink-0" style={{ color: stage.accent }} />
        </div>
      )}
      <div className="flex items-start gap-1 leading-[1.05]">
        {tight && live && <span className="pulse-dot mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sun" />}
        <span
          className={`font-display font-semibold ${
            tight || event.kind === "music" ? "text-cream" : "text-cream-dim"
          }`}
          style={{ fontSize: `${(tight ? 0.62 : event.kind === "music" ? 0.8 : 0.72) * scale}rem` }}
        >
          {tx(event.title, locale)}
        </span>
      </div>
      {chip && (
        <div className="mt-auto flex justify-end gap-1 pt-0.5">
          {chip.labels.map((l) => (
            <span
              key={l}
              className="rounded px-1 text-[0.5rem] font-bold leading-tight"
              style={{ background: chip.bg, color: chip.fg }}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
