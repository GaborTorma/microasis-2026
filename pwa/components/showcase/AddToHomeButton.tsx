"use client";

import { useTranslations } from "next-intl";

// "Add to Home Screen" CTA for non-Apple, installable devices. Styled to echo the
// App Store badge — white pill, black text + icon, two-line label — so the two
// primary buttons read as a matched pair. Sizes scale off `height` like the badge.
export function AddToHomeButton({
  height = 46,
  className = "",
  pulse = false,
  onClick,
}: {
  height?: number;
  className?: string;
  pulse?: boolean;
  onClick?: () => void;
}) {
  const t = useTranslations("showcase.install");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("aria")}
      style={{
        height,
        // The glyph carries ~0.16h of built-in left whitespace, so a small left
        // pad lands its optical edge nearer the rim than the App Store logo. The
        // right pad is sized to match that optical gap on the text side.
        paddingLeft: Math.round(height * 0.08),
        paddingRight: Math.round(height * 0.24),
        borderRadius: Math.round(height * 0.17),
        gap: Math.round(height * 0.18),
      }}
      className={`inline-flex items-center whitespace-nowrap border border-black bg-white text-black transition active:scale-[0.97] ${
        pulse ? "badge-pulse" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        width={Math.round(height * 0.52)}
        height={Math.round(height * 0.52)}
        aria-hidden="true"
      >
        <path d="M19 1H9c-1.1 0-2 .9-2 2v3h2V4h10v16H9v-2H7v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-7.01 6L7 11.99h3V18h2v-6.01h3L11.99 7z" />
      </svg>
      <span className="flex flex-col items-start text-left leading-none">
        <span style={{ fontSize: Math.round(height * 0.21) }} className="font-medium">
          {t("addToHome1")}
        </span>
        <span
          style={{ fontSize: Math.round(height * 0.32), marginTop: Math.round(height * 0.04) }}
          className="font-semibold tracking-tight"
        >
          {t("addToHome2")}
        </span>
      </span>
    </button>
  );
}
