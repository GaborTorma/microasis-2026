export function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal">{eyebrow}</p>
      )}
      <h2 className="font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 max-w-xl text-base leading-relaxed text-cream-dim">{sub}</p>
      )}
    </div>
  );
}
