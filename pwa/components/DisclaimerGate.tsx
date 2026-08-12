"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

// First-visit disclaimer the festival organizers required. Shown once and must be
// acknowledged; the flag persists in localStorage (bumped if the wording changes).
const KEY = "microasis-disclaimer-v1";

export function DisclaimerGate() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center">
      <div className="card w-full max-w-sm rounded-2xl p-5 text-center">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cream/75">
          {t("app.guidefor")}
        </p>
        <h2 className="mt-0.5 bg-gradient-to-r from-cream via-sun to-ember bg-clip-text font-display text-2xl font-extrabold leading-none tracking-wide text-transparent">
          {t("app.title")}
        </h2>
        <p className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/50">
          {t("disclaimer.title")}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-cream/90">
          {t("settings.disclaimer")}
        </p>
        <button
          type="button"
          onClick={accept}
          className="mt-6 w-full rounded-xl bg-sun py-3 font-display font-bold text-ink"
        >
          {t("disclaimer.ok")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
