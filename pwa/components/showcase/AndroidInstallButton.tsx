"use client";

import { useTranslations } from "next-intl";
import { AndroidIcon } from "./AndroidIcon";

// "Install on Android" CTA. Styled to echo the App Store badge — white pill,
// black robot + two-line label — so the two primary buttons read as a matched
// pair. Sizes scale off `height` like the badge.
export function AndroidInstallButton({
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
        paddingLeft: Math.round(height * 0.2),
        paddingRight: Math.round(height * 0.24),
        borderRadius: Math.round(height * 0.17),
        gap: Math.round(height * 0.16),
      }}
      className={`inline-flex items-center whitespace-nowrap border border-black bg-white text-black transition active:scale-[0.97] ${
        pulse ? "badge-pulse" : ""
      } ${className}`}
    >
      <AndroidIcon size={Math.round(height * 0.46)} />
      <span className="flex flex-col items-start text-left leading-none">
        <span style={{ fontSize: Math.round(height * 0.21) }} className="font-medium">
          {t("android1")}
        </span>
        <span
          style={{ fontSize: Math.round(height * 0.32), marginTop: Math.round(height * 0.04) }}
          className="font-semibold tracking-tight"
        >
          {t("android2")}
        </span>
      </span>
    </button>
  );
}
