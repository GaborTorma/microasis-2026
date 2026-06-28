import {
  Brain,
  Drama,
  Drum,
  Footprints,
  Hammer,
  type LucideProps,
  MicVocal,
  Sparkles,
  Volume2,
  Wind,
} from "lucide-react";
import type { ComponentType } from "react";
import type { EventDTO } from "./types";

/**
 * Singing bowl ("hangtál") with mallet + sound lines (bowl-and-chopstick design),
 * normalised to `currentColor` so it sits with the lucide set. The stroke width is
 * hardcoded because the artwork lives in its own (non-24) coordinate space.
 */
export function SingingBowl({ size = 24, color = "currentColor", className, style, ...rest }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 354 297"
      fill="none"
      stroke={color}
      strokeWidth={22}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...rest}
    >
      <path d="M58 143 C71 120 106 118 176 119 C247 118 281 120 296 143 C313 169 312 202 289 227 C264 253 224 268 177 270 C130 269 89 252 65 227 C42 202 42 169 58 143 Z" />
      <path d="M58 143 C72 165 116 178 176 178 C236 178 281 164 296 143" />
      <path d="M76 133 C99 120 131 119 176 119 C222 119 263 120 279 133 C261 146 223 151 177 151 C132 151 95 146 76 133 Z" />
      <path d="M78 230 C103 239 137 243 177 243 C217 243 251 239 276 230" />
      <path d="M202 146 L257 40 L281 54 L226 148 Z" />
      <path d="M108 110 L91 73" />
      <path d="M151 103 L151 62" />
      <path d="M193 105 L204 67" />
    </svg>
  );
}

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

/** Handpan seen from above — rim + seven tone fields. Used for the handpan category. */
export function Handpan({ size = 24, color = "currentColor", className, style, ...rest }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      stroke={color}
      strokeWidth={32}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...rest}
    >
      <circle cx="256" cy="256" r="238" />
      <circle cx="256" cy="115" r="56" />
      <circle cx="133" cy="185" r="56" />
      <circle cx="379" cy="185" r="56" />
      <circle cx="256" cy="257" r="56" />
      <circle cx="133" cy="328" r="56" />
      <circle cx="379" cy="328" r="56" />
      <circle cx="256" cy="398" r="56" />
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
  yoga: Meditation, // seated meditation / yoga figure
  wind: Wind, // chi kung / tai chi / breathwork
  dance: Footprints, // dance & somatic movement
  drama: Drama, // theatre & movement therapy
  mind: Brain, // meditation & presence
  build: Hammer, // sound sculpture building
  handpan: Handpan,
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
