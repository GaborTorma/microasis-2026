"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { AndroidIcon } from "./AndroidIcon";

// Non-interactive "Installed" state pill, shown where AndroidInstallButton would
// be once the PWA is detected as installed. Same white-pill geometry so the swap
// is seamless; the green check carries the state, the text confirms it.
export function AndroidInstalledBadge({
  height = 46,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  const t = useTranslations("showcase.install");
  return (
    <div
      role="status"
      aria-label={t("installedAria")}
      style={{
        height,
        paddingLeft: Math.round(height * 0.2),
        paddingRight: Math.round(height * 0.24),
        borderRadius: Math.round(height * 0.17),
        gap: Math.round(height * 0.16),
      }}
      className={`inline-flex items-center whitespace-nowrap border border-black bg-white text-black ${className}`}
    >
      <AndroidIcon size={Math.round(height * 0.46)} />
      <span className="flex flex-col items-start text-left leading-none">
        <span style={{ fontSize: Math.round(height * 0.21) }} className="font-medium">
          {t("installed1")}
        </span>
        <span
          style={{ fontSize: Math.round(height * 0.32), marginTop: Math.round(height * 0.04) }}
          className="font-semibold tracking-tight"
        >
          {t("installed2")}
        </span>
      </span>
      <Check
        size={Math.round(height * 0.4)}
        strokeWidth={3}
        style={{ color: "var(--color-sun)" }}
        aria-hidden
      />
    </div>
  );
}
