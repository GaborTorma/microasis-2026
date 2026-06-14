import type { StageDTO } from "./types";

function ranker(stages: StageDTO[], order: string[]) {
  return (slug: string) => {
    const i = order.indexOf(slug);
    return i === -1 ? 100 + stages.findIndex((s) => s.slug === slug) : i;
  };
}

/** All stages in the user's chosen order (visible + hidden). For settings UI. */
export function orderedAllStages(stages: StageDTO[], order: string[]): StageDTO[] {
  const rank = ranker(stages, order);
  return [...stages].sort((a, b) => rank(a.slug) - rank(b.slug));
}

/** Visible stages in the user's chosen order. For the timetable / now views. */
export function orderedVisibleStages(
  stages: StageDTO[],
  order: string[],
  hidden: string[],
): StageDTO[] {
  return orderedAllStages(stages, order).filter((s) => !hidden.includes(s.slug));
}
