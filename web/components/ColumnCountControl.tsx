"use client";

import { Columns3, Minus, Plus } from "lucide-react";
import { useSchedule } from "@/lib/useSchedule";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { effectiveColumns, orderedVisibleStages } from "@/lib/stageSettings";
import { MAX_COLUMNS, useSettings } from "./settings/SettingsContext";

/**
 * Portrait-mobile column-count zoom: choose how many stage columns fill the
 * width (1…min(MAX_COLUMNS, visible stages)); the rest page horizontally.
 * Fewer columns = wider, more detail. Hidden on landscape / desktop / fine
 * pointer, where the timetable shows every stage (like iOS landscape).
 */
export function ColumnCountControl() {
  const portraitMobile = useMediaQuery(
    "(orientation: portrait) and (max-width: 768px)",
  );
  const { columns, setColumns, order, hidden } = useSettings();
  const { data } = useSchedule();

  const visibleCount = data
    ? orderedVisibleStages(data.stages, order, hidden).length
    : 0;
  // Nothing to page when only one column can ever fit.
  if (!portraitMobile || visibleCount <= 1) return null;

  const max = Math.max(1, Math.min(MAX_COLUMNS, visibleCount));
  const eff = effectiveColumns(columns, visibleCount, MAX_COLUMNS);

  return (
    <div
      className="flex items-center rounded-full border border-line bg-ink-2/70 p-0.5"
      role="group"
      aria-label="Stage columns"
    >
      <button
        type="button"
        disabled={eff <= 1}
        onClick={() => setColumns(Math.max(1, eff - 1))}
        aria-label="Fewer columns"
        className="flex h-6 w-6 items-center justify-center rounded-full text-cream-dim transition-colors hover:text-cream disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <Columns3 size={14} className="mx-0.5 text-cream-faint" aria-hidden />
      <button
        type="button"
        disabled={eff >= max}
        onClick={() => setColumns(Math.min(max, eff + 1))}
        aria-label="More columns"
        className="flex h-6 w-6 items-center justify-center rounded-full text-cream-dim transition-colors hover:text-cream disabled:opacity-30"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
