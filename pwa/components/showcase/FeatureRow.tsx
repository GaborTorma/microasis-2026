import type { CSSProperties } from "react";
import { Framed } from "./Framed";
import { Reveal } from "./Reveal";

// Alternating screenshot ⇄ copy row. Flexbox (not grid) so it renders the same in
// Safari and Chromium; `flip` swaps the sides via order. The phone sits near one
// edge (pulled slightly inward on desktop), the text block at the other, and the
// device gently floats like the hero.
export function FeatureRow({
  src,
  alt,
  title,
  body,
  flip = false,
  rotate = "",
  bodyClass = "",
  floatStyle,
}: {
  src: string;
  alt: string;
  title: string;
  body: string;
  flip?: boolean;
  // Desktop-only tilt applied to the device image (e.g. "md:-rotate-[8deg]").
  rotate?: string;
  // Desktop-only nudge for the copy block (e.g. "md:-mt-[200px]").
  bodyClass?: string;
  // Per-row float overrides (--float-amp / --float-dur / --float-delay) so the
  // devices bob out of sync.
  floatStyle?: CSSProperties;
}) {
  // Pull the phone in ~50px from the page edge on desktop (the side it sits on
  // depends on `flip`); on mobile it's centred, so no inset.
  const edgeInset = flip ? "md:mr-[50px]" : "md:ml-[50px]";
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
      <Reveal className={`flex shrink-0 justify-center ${edgeInset} ${flip ? "sm:order-2" : ""}`}>
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 h-[55%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: "var(--color-sun)", opacity: 0.13 }}
          />
          <Framed
            kind="phone"
            src={src}
            alt={alt}
            className={`float-soft w-[62vw] max-w-[250px] md:max-w-[300px] ${rotate}`}
            style={floatStyle}
          />
        </div>
      </Reveal>
      <Reveal delay={100} className={`max-w-md ${bodyClass} ${flip ? "sm:order-1" : ""}`}>
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-cream sm:text-[1.8rem]">
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-cream-dim sm:text-[1.05rem]">{body}</p>
      </Reveal>
    </div>
  );
}
