"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Coffee, MapPin, Sparkles, Volume2 } from "lucide-react";
import { useSchedule } from "@/lib/useSchedule";
import { useNow, currentNow } from "@/lib/useNow";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useNearestStage } from "@/lib/useNearestStage";
import { hhmm, mmdd, tx, weekdayLong } from "@/lib/format";
import {
  effectiveColumns,
  orderedVisibleStages,
} from "@/lib/stageSettings";
import type { EventDTO, StageDTO } from "@/lib/types";
import { StatusBar } from "./StatusBar";
import { MAX_COLUMNS, useSettings } from "./settings/SettingsContext";

const BASE_PX_PER_HOUR = 64; // at scale 1; grows with the text scale
const HOUR = 3_600_000;
const GUTTER = 64; // px, fixed time axis (hour labels + 2-line day marker)
const MIN_COL = 100; // px, min stage-column width (non-paged layout)
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

const startMs = (e: EventDTO) => new Date(e.startsAt).getTime();
const isLiveAt = (e: EventDTO, ms: number) => {
  const s = startMs(e);
  const end = e.endsAt ? new Date(e.endsAt).getTime() : s + HOUR;
  return s <= ms && end > ms;
};

export function Timetable() {
  const { data, loading, offline, error } = useSchedule();
  const now = useNow(30_000);
  const locale = useLocale();
  const t = useTranslations();
  const { order, hidden, scale, columns } = useSettings();
  // Phone-sized portrait → column-zoom + paging (touch not required). Landscape
  // and wide screens show every stage, like the iOS app in landscape.
  const portraitMobile = useMediaQuery(
    "(orientation: portrait) and (max-width: 768px)",
  );

  const toolbarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const headScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);
  const didSelectNearest = useRef(false);
  const topMsRef = useRef(0); // festival ms at the viewport top (for scale re-anchor)
  const prevScaleRef = useRef(scale);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [viewW, setViewW] = useState(0); // body scroller width (for paged colW)
  const [leadingIndex, setLeadingIndex] = useState(0); // left-most paged column

  const stages = useMemo(
    () => (data ? orderedVisibleStages(data.stages, order, hidden) : []),
    [data, order, hidden],
  );
  const nearestSlug = useNearestStage(stages);

  // Portrait-mobile column-count zoom: fit exactly effCols columns to the width
  // and page the rest. Elsewhere (landscape / desktop) show every stage.
  const effCols = portraitMobile
    ? effectiveColumns(columns, stages.length, MAX_COLUMNS)
    : Math.max(stages.length, 1);
  // On phone-portrait the chosen column count always drives the layout (colW =
  // width / effCols); only the leftover stages page. Picking N == visible stages
  // simply fills the width with N columns (no paging) instead of falling back.
  const paged = portraitMobile;
  const canPage = paged && effCols < stages.length;
  const colW = paged && viewW > 0 ? viewW / effCols : MIN_COL * scale;
  const trackW = stages.length * colW;
  const colStyle: React.CSSProperties = paged
    ? { width: colW, flexGrow: 0, flexShrink: 0, scrollSnapAlign: "start" }
    : { flexBasis: 0, flexGrow: 1, flexShrink: 0, minWidth: colW };
  const trackStyle: React.CSSProperties = paged
    ? { minWidth: trackW, width: trackW }
    : { minWidth: trackW, width: "100%" };

  const grid = useMemo(() => {
    if (!data || data.events.length === 0) return null;
    const pxPerHour = BASE_PX_PER_HOUR * scale;
    const starts = data.events.map((e) => new Date(e.startsAt).getTime());
    const ends = data.events.map((e) =>
      e.endsAt ? new Date(e.endsAt).getTime() : 0,
    );
    const gridStart = floorHour(Math.min(...starts));
    const gridEnd = ceilHour(Math.max(...starts.map((s, i) => Math.max(s + HOUR, ends[i]))));
    const height = ((gridEnd - gridStart) / HOUR) * pxPerHour;
    const yFor = (ms: number) => ((ms - gridStart) / HOUR) * pxPerHour;

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
    return { gridStart, gridEnd, height, yFor, hours, dividers, pxPerHour };
  }, [data, locale, scale]);

  // Total pinned height at the viewport top: sticky app header + sticky toolbar.
  const stickyOffset = () => {
    const headerH =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--header-h"),
      ) || 0;
    return headerH + (toolbarRef.current?.offsetHeight ?? 0);
  };

  const scrollToY = useCallback((y: number) => {
    if (!gridRef.current) return;
    const top = gridRef.current.getBoundingClientRect().top + window.scrollY;
    const tb = stickyOffset();
    window.scrollTo({ top: Math.max(0, y + top - tb - 8), behavior: "smooth" });
    // Smooth scroll is ignored in some embedded browsers; ensure the jump lands.
    window.scrollTo(0, Math.max(0, y + top - tb - 8));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Body scroll: mirror to the header and (when paged) track the leading column.
  const onBodyScroll = () => {
    syncScroll(bodyScrollRef.current, headScrollRef.current);
    if (paged && colW > 0) {
      const li = Math.round((bodyScrollRef.current?.scrollLeft ?? 0) / colW);
      const clamped = Math.min(Math.max(0, li), Math.max(0, stages.length - effCols));
      setLeadingIndex((prev) => (prev === clamped ? prev : clamped));
    }
  };

  // Jump so the act on now (earliest live, else the next act) sits at the top.
  const jumpToNow = useCallback(() => {
    if (!grid || !data) return;
    const nowMs = currentNow().getTime();
    const liveStarts = data.events.filter((e) => isLiveAt(e, nowMs)).map(startMs);
    const futureStarts = data.events.filter((e) => startMs(e) > nowMs).map(startMs);
    const target = liveStarts.length
      ? Math.min(...liveStarts)
      : futureStarts.length
        ? Math.min(...futureStarts)
        : nowMs;
    if (target < grid.gridStart || target > grid.gridEnd) return;
    // Two frames: the first lets the grid's full height land in layout (on a
    // cold load the column heights apply a frame late), the second scrolls.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollToY(grid.yFor(target))),
    );
  }, [grid, data, scrollToY]);

  // Measure the body scroller so paged column width = width / effCols.
  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, [grid]);

  // Track which day is at the top of the viewport, and remember the top hour.
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
        const tb = stickyOffset();
        // +SNAP compensates the scrollToY(-8) padding so a day's top edge
        // detects that day (not 7-8 min of the previous day above it).
        const yTop = window.scrollY + tb - top + SNAP;
        const ms = grid.gridStart + (yTop / grid.pxPerHour) * HOUR;
        topMsRef.current = Math.max(grid.gridStart, ms);
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
    jumpToNow();
  }, [grid, jumpToNow]);

  // Re-centre on the current time whenever the tab/PWA returns to foreground.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible") jumpToNow();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
    };
  }, [jumpToNow]);

  // Text-size change resizes every hour row; keep the same hour at the top so
  // the view doesn't jump off the time you were looking at.
  useEffect(() => {
    if (prevScaleRef.current === scale) return;
    prevScaleRef.current = scale;
    if (!grid || !didInit.current) return;
    requestAnimationFrame(() => scrollToY(grid.yFor(topMsRef.current)));
  }, [scale, grid, scrollToY]);

  // Re-snap the pager to a whole column when the column count or width changes,
  // so zooming/rotating while scrolled never leaves a half-column showing.
  useEffect(() => {
    if (!paged || !bodyScrollRef.current || colW <= 0) return;
    const li = Math.min(leadingIndex, Math.max(0, stages.length - effCols));
    const left = li * colW;
    bodyScrollRef.current.scrollLeft = left;
    if (headScrollRef.current) headScrollRef.current.scrollLeft = left;
    // Intentionally excludes leadingIndex: re-snap only on count/width change,
    // not on every manual page (which would fight the user's scroll).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effCols, viewW, paged]);

  // Once GPS resolves, page the stage you're standing at into view as the left
  // column — but only on the first fix, so it never fights manual paging after.
  useEffect(() => {
    if (!paged || !nearestSlug || didSelectNearest.current || colW <= 0) return;
    const idx = stages.findIndex((s) => s.slug === nearestSlug);
    if (idx < 0) return;
    didSelectNearest.current = true;
    const li = Math.min(idx, Math.max(0, stages.length - effCols));
    if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = li * colW;
    if (headScrollRef.current) headScrollRef.current.scrollLeft = li * colW;
    setLeadingIndex(li);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged, nearestSlug, colW, effCols]);

  if (loading && !data)
    return <p className="p-6 text-center text-cream-faint">{t("common.loading")}</p>;
  if (error || !data || !grid)
    return <p className="p-6 text-center text-cream-faint">{t("common.error")}</p>;

  const nowMs = now.getTime();
  const showNow = nowMs >= grid.gridStart && nowMs <= grid.gridEnd;

  return (
    <div className="flex flex-col">
      {offline && <StatusBar kind="offline" />}

      {/* Sticky toolbar: full-width day jumper + (scrollable) stage headers */}
      <div
        ref={toolbarRef}
        style={{ top: "var(--header-h, 0px)" }}
        className="sticky z-20 bg-ink/95 backdrop-blur-md"
      >
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
              </button>
            );
          })}
        </div>

        {/* Position dots — which stages of the set are in view (when paging) */}
        {canPage && (
          <div className="flex px-2 pt-1.5">
            <div style={{ width: GUTTER }} className="shrink-0" />
            <div className="flex flex-1 items-center justify-center gap-1.5">
              {stages.map((s, i) => {
                const on = i >= leadingIndex && i < leadingIndex + effCols;
                return (
                  <span
                    key={s.id}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: on ? 14 : 5,
                      background: on ? "var(--color-sun)" : "rgba(109,140,121,0.4)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Stage header row: fixed gutter spacer + horizontally-scrolling headers */}
        <div className="flex px-2 pb-1.5 pt-2">
          <div style={{ width: GUTTER }} className="shrink-0" />
          <div
            ref={headScrollRef}
            onScroll={() => syncScroll(headScrollRef.current, bodyScrollRef.current)}
            style={{ scrollSnapType: paged ? "x mandatory" : undefined }}
            className="no-scrollbar flex-1 overflow-x-auto overflow-y-clip"
          >
            <div className="flex" style={trackStyle}>
              {stages.map((s) => (
                <div key={s.id} style={colStyle} className="px-0.5">
                  <div
                    className="flex items-center justify-center gap-1 truncate rounded-lg px-2 py-1 text-center font-display text-sm font-bold text-cream"
                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}bb)` }}
                  >
                    {nearestSlug === s.slug && (
                      <MapPin size={12} className="shrink-0" aria-label={t("common.youAreHere")} />
                    )}
                    <span className="truncate">{s.name}</span>
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
          {/* now time — a glowing red chip that covers the hour label beneath it */}
          {showNow && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{ top: grid.yFor(nowMs) }}
            >
              <div className="h-0.5 w-full" style={{ background: "#ff5d6c", boxShadow: "0 0 8px #ff5d6c" }} />
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 rounded px-1.5 py-px font-mono font-bold tabular-nums text-white"
                style={{ background: "#ff5d6c", boxShadow: "0 0 6px #ff5d6c", fontSize: `${0.62 * scale}rem` }}
              >
                {hhmm(now.toISOString(), locale)}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable columns */}
        <div
          ref={bodyScrollRef}
          onScroll={onBodyScroll}
          style={{ scrollSnapType: paged ? "x mandatory" : undefined }}
          className="no-scrollbar flex-1 overflow-x-auto overflow-y-clip"
        >
          <div
            ref={gridRef}
            className="relative"
            style={{ height: grid.height, ...trackStyle }}
          >
            {/* hour lines (full content width) */}
            {grid.hours.map((h, i) => (
              <div
                key={i}
                className="pointer-events-none absolute inset-x-0 h-px"
                style={{ top: h.y, background: h.midnight ? "transparent" : "rgba(43,71,54,0.3)" }}
              />
            ))}

            {/* now line — BEHIND the blocks so it never strikes through titles */}
            {showNow && (
              <div
                className="pointer-events-none absolute inset-x-0 h-0.5"
                style={{ top: grid.yFor(nowMs), background: "#ff5d6c", boxShadow: "0 0 8px #ff5d6c" }}
              />
            )}

            {/* columns with event blocks */}
            <div className="absolute inset-0 flex">
              {stages.map((stage) => {
                const evs = data.events.filter((e) => e.stageSlug === stage.slug);
                return (
                  <div
                    key={stage.id}
                    style={colStyle}
                    className="relative border-l border-line/20 px-0.5"
                  >
                    {evs.map((e, i) => (
                      <EventBlock
                        key={e.id}
                        event={e}
                        stage={stage}
                        yFor={grid.yFor}
                        nowMs={nowMs}
                        locale={locale}
                        scale={scale}
                        compact={colW < 140}
                        nextStart={i + 1 < evs.length ? evs[i + 1].startsAt : null}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* overlay above blocks: day-divider lines + now dot/label */}
            <div className="pointer-events-none absolute inset-0">
              {grid.dividers.map((d, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 h-px"
                  style={{ top: d.y, borderTop: "1px dashed rgba(94,201,138,0.55)" }}
                />
              ))}
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
  compact,
  nextStart,
}: {
  event: EventDTO;
  stage: StageDTO;
  yFor: (ms: number) => number;
  nowMs: number;
  locale: string;
  scale: number;
  compact: boolean;
  nextStart: string | null;
}) {
  const t = useTranslations();
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + HOUR;
  const top = yFor(start);
  // Grow a short act to one title line so its name isn't clipped — but never
  // past the next act's start, so a 15-min slot can't overlap the one below.
  const avail = nextStart ? yFor(new Date(nextStart).getTime()) - top : Infinity;
  const height = Math.max(yFor(end) - top, Math.min(18 * scale + 4, avail));
  const live = start <= nowMs && end > nowMs;
  const past = end <= nowMs;
  // When the block is too short, drop the time row but always keep the act name.
  const tight = height < 32 * scale;
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
            className="whitespace-nowrap font-mono font-semibold tabular-nums"
            style={{ color: stage.accent, fontSize: `${0.58 * scale}rem` }}
          >
            {hhmm(event.startsAt, locale)}
            {!compact && event.endsAt ? ` – ${hhmm(event.endsAt, locale)}` : ""}
          </span>
          {live && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-now" />}
          <KindIcon size={iconPx} className="ml-auto shrink-0" style={{ color: stage.accent }} />
        </div>
      )}
      <div className="flex items-start gap-1 leading-[1.05]">
        {tight && live && <span className="pulse-dot mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-now" />}
        <span
          className={`font-display font-semibold ${
            tight || event.kind === "music" ? "text-cream" : "text-cream-dim"
          }`}
          style={{ fontSize: `${(tight ? 0.62 : event.kind === "music" ? 0.8 : 0.72) * scale}rem` }}
        >
          {tx(event.title, locale)}
        </span>
      </div>
      {/* Language chip as a faint watermark — overlaid, reserves no height. */}
      {chip && (
        <div className="pointer-events-none absolute bottom-0.5 right-0.5 flex gap-0.5 opacity-50">
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
