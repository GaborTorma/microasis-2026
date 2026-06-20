"use client";

import { ALargeSmall, Minus, Plus } from "lucide-react";
import { SCALE_LEVELS, useSettings } from "./settings/SettingsContext";

/**
 * Timetable text/width zoom. Steps through SCALE_LEVELS (−25% … +50%).
 * Only the act-name and time font sizes and the column width scale — the
 * vertical time grid, day selector and stage headers are unaffected.
 */
export function TextScaleControl() {
  const { scale, setScale } = useSettings();
  const i = SCALE_LEVELS.indexOf(scale as (typeof SCALE_LEVELS)[number]);
  const idx = i === -1 ? SCALE_LEVELS.indexOf(1) : i;
  const atMin = idx <= 0;
  const atMax = idx >= SCALE_LEVELS.length - 1;

  return (
    <div
      className="flex items-center rounded-full border border-line bg-ink-2/70 p-0.5"
      role="group"
      aria-label="Text size"
    >
      <button
        type="button"
        disabled={atMin}
        onClick={() => setScale(SCALE_LEVELS[Math.max(0, idx - 1)])}
        aria-label="Smaller"
        className="flex h-6 w-6 items-center justify-center rounded-full text-cream-dim transition-colors hover:text-cream disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <ALargeSmall size={15} className="mx-0.5 text-cream-faint" aria-hidden />
      <button
        type="button"
        disabled={atMax}
        onClick={() => setScale(SCALE_LEVELS[Math.min(SCALE_LEVELS.length - 1, idx + 1)])}
        aria-label="Larger"
        className="flex h-6 w-6 items-center justify-center rounded-full text-cream-dim transition-colors hover:text-cream disabled:opacity-30"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
