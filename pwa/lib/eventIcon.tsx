import { Coffee, type LucideProps, Sparkles, Volume2 } from "lucide-react";
import type { ComponentType } from "react";
import type { EventDTO } from "./types";

/** Seated meditation / yoga figure (lucide-spec, 24×24). Used for the yoga category. */
export function Meditation({ size = 24, color = "currentColor", strokeWidth = 2, className, style, ...rest }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...rest}
    >
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="M8.2 9.4c1.2-.6 2.5-.9 3.8-.9s2.6.3 3.8.9" />
      <path d="M8.2 9.4c-.2 2.6-.6 5-1.6 6.5-.7 1-1.5 1.5-2.6 1.5" />
      <path d="M15.8 9.4c.2 2.6.6 5 1.6 6.5.7 1 1.5 1.5 2.6 1.5" />
      <path d="M8 9.6c.2 2.4.6 5 .4 6.8-.2 1.8-1.5 2.8-3 3.6l-1.8 1" />
      <path d="M16 9.6c-.2 2.4-.6 5-.4 6.8.2 1.8 1.5 2.8 3 3.6l1.8 1" />
      <path d="m3.6 21 8.4-3.1L20.4 21" />
      <path d="m8.8 19 3.2 1.4 3.2-1.4" />
    </svg>
  );
}

export type EventIconKey = "speaker" | "break" | "yoga" | "workshop";

/** Stable key → component map (module scope; never created during render). */
export const EVENT_ICONS: Record<EventIconKey, ComponentType<LucideProps>> = {
  speaker: Volume2, // DJ sets and live acts
  break: Coffee,
  yoga: Meditation, // seated meditation / yoga figure
  workshop: Sparkles, // anything else with a facilitator
};

/**
 * Map the event `kind` to a stable icon key. Returns a key into
 * {@link EVENT_ICONS} — never a component — so callers select an existing icon
 * rather than minting one in render. An unknown kind (the wire format is an open
 * string, so a new one can arrive before this map knows it) falls back to the
 * speaker, which is what the overwhelming majority of the programme is.
 */
const KIND_TO_ICON: Record<string, EventIconKey> = {
  music: "speaker",
  break: "break",
  yoga: "yoga",
  workshop: "workshop",
  ceremony: "workshop",
};

export function eventIconKey(event: Pick<EventDTO, "kind">): EventIconKey {
  return KIND_TO_ICON[event.kind] ?? "speaker";
}
