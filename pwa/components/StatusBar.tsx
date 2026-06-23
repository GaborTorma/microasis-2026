"use client";

import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";

export function StatusBar({ kind }: { kind: "offline" }) {
  const t = useTranslations("common");
  return (
    <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-line bg-ink-2/70 px-3 py-1.5 text-[0.72rem] text-cream-dim">
      <WifiOff size={13} />
      {t(kind)}
    </div>
  );
}
