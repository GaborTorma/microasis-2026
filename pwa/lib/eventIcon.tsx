import {
  Brain,
  Disc3,
  Drama,
  Drum,
  Footprints,
  Hammer,
  type LucideProps,
  MicVocal,
  PersonStanding,
  Sparkles,
  Volume2,
  Wind,
} from "lucide-react";
import type { ComponentType } from "react";
import type { EventDTO } from "./types";

/**
 * Singing bowl ("hangtál") — drawn to the lucide spec (24×24 viewBox, 2px
 * stroke, round caps, `currentColor`) so it sits visually with the rest of the
 * lucide icon set. lucide has no singing-bowl glyph of its own.
 */
export function SingingBowl({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
  style,
  ...rest
}: LucideProps) {
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
      <path d="M4 11h16" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M16 3l-3 7" />
      <circle cx="16.6" cy="2.6" r="1.2" />
    </svg>
  );
}

export type EventIconKey =
  | "speaker"
  | "bowl"
  | "voice"
  | "drum"
  | "yoga"
  | "wind"
  | "dance"
  | "drama"
  | "mind"
  | "build"
  | "handpan"
  | "workshop";

/** Stable key → component map (module scope; never created during render). */
export const EVENT_ICONS: Record<EventIconKey, ComponentType<LucideProps>> = {
  speaker: Volume2, // music / ceremony
  bowl: SingingBowl, // sound bath & journey
  voice: MicVocal, // singing & mantra
  drum: Drum,
  yoga: PersonStanding,
  wind: Wind, // chi kung / tai chi / breathwork
  dance: Footprints, // dance & somatic movement
  drama: Drama, // theatre & movement therapy
  mind: Brain, // meditation & presence
  build: Hammer, // sound sculpture building
  handpan: Disc3,
  workshop: Sparkles, // ceremonies + uncategorised fallback
};

/**
 * Map the event `kind` (the seed already refined workshops into fine categories)
 * to a stable icon key. Returns a key into {@link EVENT_ICONS} — never a
 * component — so callers select an existing icon rather than minting one in
 * render. Unknown/forward-compat kinds fall back to the workshop sparkle.
 */
const KIND_TO_ICON: Record<string, EventIconKey> = {
  music: "speaker",
  ceremony: "workshop",
  workshop: "workshop",
  break: "speaker",
  "sound-bath": "bowl",
  voice: "voice",
  drum: "drum",
  yoga: "yoga",
  wind: "wind",
  dance: "dance",
  drama: "drama",
  mind: "mind",
  build: "build",
  handpan: "handpan",
};

export function eventIconKey(event: Pick<EventDTO, "kind">): EventIconKey {
  return KIND_TO_ICON[event.kind] ?? "workshop";
}
