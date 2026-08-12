import { APP_STORE_URL } from "@/lib/platform";

// Apple's official "Download on the App Store" badge (artwork supplied by the
// developer, public/appstore-badge.svg). One English badge is used on both locales
// for now. Per Apple's rules the artwork is never recoloured or animated.
const BADGE_AR = 120 / 40;

export function AppStoreButton({
  height = 46,
  className = "",
  pulse = false,
}: {
  height?: number;
  className?: string;
  pulse?: boolean;
}) {
  const width = Math.round(height * BADGE_AR);
  // No listing yet → no badge (Apple's artwork must not link anywhere else).
  if (!APP_STORE_URL) return null;
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download on the App Store"
      className={`inline-block transition active:scale-[0.97] ${pulse ? "badge-pulse" : ""} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/appstore-badge.svg"
        alt="Download on the App Store"
        width={width}
        height={height}
        style={{ height, width }}
        className="block"
      />
    </a>
  );
}
