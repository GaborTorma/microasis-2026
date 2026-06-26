import type { ComponentType } from "react";
import { Reveal } from "./Reveal";

// Frosted card for a one-liner proof point (Android, offline, nearest stage …).
// Icon is any component taking size/strokeWidth — lucide icons or our AndroidIcon.
export function MiniFeature({
  Icon,
  title,
  body,
  accent = "var(--color-sun)",
  delay = 0,
}: {
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  body: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="card flex flex-col rounded-2xl p-5">
      <span
        className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)`, color: accent }}
      >
        <Icon size={18} strokeWidth={2.1} />
      </span>
      <h4 className="font-display text-lg font-bold text-cream">{title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">{body}</p>
    </Reveal>
  );
}
