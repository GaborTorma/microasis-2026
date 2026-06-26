/**
 * GROUNDING Days — the post-festival integration gathering at the Blue Lake
 * (grounding.manasfestival.eu). Web-only NowView feature; not part of the
 * web↔apple wire contract. The window starts the moment the last festival
 * programs end (12 Jul 19:00) and runs to 15 Jul 12:00. Offset literals match
 * the `+02:00` convention used in `festival.ts`.
 */
export const GROUNDING = {
  url: "https://grounding.manasfestival.eu",
  startsAt: "2026-07-12T19:00:00+02:00",
  endsAt: "2026-07-15T12:00:00+02:00",
} as const;
