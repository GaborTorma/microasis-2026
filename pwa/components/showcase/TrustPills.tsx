"use client";

import { useTranslations } from "next-intl";
import { Ban, Gift, ShieldCheck, UserX } from "lucide-react";

// The app's real positioning stands in for social proof it doesn't have yet:
// free / no account / no ads / no tracking, as small frosted pills.
const PILLS = [
  { key: "free", Icon: Gift, tint: "var(--color-sun)" },
  { key: "noAccount", Icon: UserX, tint: "var(--color-teal)" },
  { key: "noAds", Icon: Ban, tint: "var(--color-ember)" },
  { key: "noTracking", Icon: ShieldCheck, tint: "var(--color-sun)" },
] as const;

export function TrustPills({ className = "" }: { className?: string }) {
  const t = useTranslations("showcase.trust");
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`}>
      {PILLS.map(({ key, Icon, tint }) => (
        <li
          key={key}
          className="card inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-cream-dim"
        >
          <Icon size={14} strokeWidth={2.2} style={{ color: tint }} />
          {t(key)}
        </li>
      ))}
    </ul>
  );
}
