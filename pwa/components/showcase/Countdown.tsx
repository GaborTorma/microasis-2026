"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FESTIVAL } from "@/lib/festival";

type Parts = { d: number; h: number; m: number; live: boolean } | null;

function diffToStart(): Parts {
  const ms = new Date(FESTIVAL.startsAt).getTime() - Date.now();
  if (ms <= 0) return { d: 0, h: 0, m: 0, live: true };
  const m = Math.floor(ms / 60000);
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60, live: false };
}

// Inline live countdown to the festival, in a monospaced face. Lives in the centre
// of the top bar (desktop only).
export function Countdown({ className = "" }: { className?: string }) {
  const t = useTranslations("showcase.countdown");
  const [p, setP] = useState<Parts>(null);

  useEffect(() => {
    setP(diffToStart());
    const id = setInterval(() => setP(diffToStart()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`countdown-pulse ${className}`}>
      {p?.live ? (
        <span className="font-semibold text-now">{t("live")}</span>
      ) : (
        <span className="font-mono tabular-nums tracking-tight">
          {p ? `${p.d} ${t("days")} · ${p.h} ${t("hours")} · ${p.m} ${t("mins")}` : "—"}
        </span>
      )}
    </span>
  );
}
