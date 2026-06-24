"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Settings as Gear,
  X,
} from "lucide-react";
import { useSchedule } from "@/lib/useSchedule";
import { orderedAllStages } from "@/lib/stageSettings";
import { LanguageToggle } from "../LanguageToggle";
import { useSettings } from "./SettingsContext";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const { order, hidden, setOrder, toggleHidden } = useSettings();
  const { data } = useSchedule();

  const stages = data ? orderedAllStages(data.stages, order) : [];

  const move = (idx: number, dir: -1 | 1) => {
    const slugs = stages.map((s) => s.slug);
    const j = idx + dir;
    if (j < 0 || j >= slugs.length) return;
    [slugs[idx], slugs[j]] = [slugs[j], slugs[idx]];
    setOrder(slugs);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("settings.title")}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-ink-2/70 text-cream-dim hover:text-cream"
      >
        <Gear size={16} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(false)}
          >
          <div
            className="card max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-cream">
                {t("settings.title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("settings.done")}
                className="text-cream-faint hover:text-cream"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white/45">
              {t("lang.switch")}
            </p>
            <div className="mb-4">
              <LanguageToggle />
            </div>

            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white/45">
              {t("settings.stages")}
            </p>
            <p className="mb-3 text-xs text-white/45">{t("settings.hint")}</p>

            <ul className="flex flex-col gap-1.5">
              {stages.map((s, i) => {
                const off = hidden.includes(s.slug);
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg bg-ink-2/60 px-2.5 py-2"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span
                      className={`flex-1 truncate font-display font-semibold ${
                        off ? "text-cream-faint line-through" : "text-cream"
                      }`}
                    >
                      {s.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={t("settings.moveUp")}
                      className="rounded p-1 text-cream-dim hover:text-cream disabled:opacity-25"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === stages.length - 1}
                      aria-label={t("settings.moveDown")}
                      className="rounded p-1 text-cream-dim hover:text-cream disabled:opacity-25"
                    >
                      <ChevronDown size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHidden(s.slug)}
                      aria-label={off ? t("settings.show") : t("settings.hide")}
                      className={`rounded p-1 ${off ? "text-cream-faint" : "text-sun"}`}
                    >
                      {off ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white/45">
                {t("settings.about")}
              </p>
              <p className="text-xs leading-relaxed text-white/55">
                {t("settings.disclaimer")}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                {t("settings.madeprefix")}{" "}
                <a
                  href="https://torma.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/55 underline underline-offset-2 hover:text-white/80"
                >
                  {t("settings.makername")}
                </a>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-cream underline underline-offset-2 hover:text-white"
                >
                  {t("settings.privacy")}
                </a>
                <a
                  href="/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-cream underline underline-offset-2 hover:text-white"
                >
                  {t("settings.support")}
                </a>
              </div>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
