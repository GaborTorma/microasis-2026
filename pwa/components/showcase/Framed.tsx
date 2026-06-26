// A pre-framed device image (real frame baked in by build_landing_images.py).
// Served as a plain <img> of a small .webp — deliberately NOT next/image: the
// optimizer cached stale copies that survived server restarts, and these are
// already sized + cache-busted via the ?v= query in the src. Intrinsic width/
// height keep the aspect ratio (no CLS); the caller sets the display width via
// `className`; a CSS drop-shadow hugs the device silhouette.
const DIM = {
  phone: [720, 1419],
  watch: [506, 574],
  hero: [907, 1487],
} as const;

export function Framed({
  kind,
  src,
  alt,
  className = "",
  priority = false,
  glow,
  sizes,
}: {
  kind: keyof typeof DIM;
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  glow?: string;
  sizes?: string;
}) {
  const [w, h] = DIM[kind];
  return (
    <div className={`relative ${className}`}>
      {glow && (
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 h-[58%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: glow, opacity: 0.4 }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        sizes={sizes}
        className="relative h-auto w-full [filter:drop-shadow(0_24px_44px_rgba(0,0,0,0.45))]"
      />
    </div>
  );
}
