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
      viewBox="0 0 298 266"
      fill="none"
      stroke={color}
      strokeWidth={16}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...rest}
    >
      <path d="M30 121 C43 98 78 96 148 97 C219 96 253 98 268 121 C285 147 284 180 261 205 C236 231 196 246 149 248 C102 247 61 230 37 205 C14 180 14 147 30 121 Z" />
      <path d="M30 121 C44 143 88 156 148 156 C208 156 253 142 268 121" />
      <path d="M48 111 C71 98 103 97 148 97 C194 97 235 98 251 111 C233 124 195 129 149 129 C104 129 67 124 48 111 Z" />
      <path d="M50 208 C75 217 109 221 149 221 C189 221 223 217 248 208" />
      <path d="M174 124 L229 18 L253 32 L198 126 Z" />
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
      viewBox="0 0 530 530"
      fill="none"
      stroke={color}
      strokeWidth={26}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      {...rest}
    >
      <circle cx="265" cy="265" r="242" />
      <path d="M404 108 C361 70 314 55 264 55 C140 55 49 149 49 270 C49 390 144 485 264 485 C383 485 480 389 480 270 C480 219 462 171 428 131" />
      <circle cx="265" cy="145" r="28" />
      <circle cx="144" cy="232" r="28" />
      <circle cx="385" cy="232" r="28" />
      <circle cx="265" cy="271" r="38" />
      <circle cx="340" cy="374" r="28" />
      <path d="M194 401 C181.99 403.01 170.06 397.03 164.49 386.20 C158.92 375.38 160.98 362.19 169.58 353.58 C178.19 344.98 191.38 342.92 202.20 348.49 C213.03 354.06 219.01 365.99 217 378" />
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
