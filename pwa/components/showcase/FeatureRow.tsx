import { Framed } from "./Framed";
import { Reveal } from "./Reveal";

// Alternating screenshot ⇄ copy row. Flexbox (not grid) so it renders the same in
// Safari and Chromium; `flip` swaps the sides via order. The phone sits at one
// edge, the text block at the other.
export function FeatureRow({
  src,
  alt,
  title,
  body,
  index,
  flip = false,
}: {
  src: string;
  alt: string;
  title: string;
  body: string;
  index: number;
  flip?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
      <Reveal className={`flex shrink-0 justify-center ${flip ? "sm:order-2" : ""}`}>
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 h-[55%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: "var(--color-sun)", opacity: 0.13 }}
          />
          <Framed kind="phone" src={src} alt={alt} className="w-[62vw] max-w-[250px] md:max-w-[300px]" />
        </div>
      </Reveal>
      <Reveal delay={100} className={`max-w-md ${flip ? "sm:order-1" : ""}`}>
        <span className="font-display text-sm font-bold text-teal">{`0${index}`}</span>
        <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-cream sm:text-[1.8rem]">
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-cream-dim sm:text-[1.05rem]">{body}</p>
      </Reveal>
    </div>
  );
}
