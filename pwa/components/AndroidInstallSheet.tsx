"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { chromeIntentUrl, isInAppBrowser } from "@/lib/platform";
import { openAndroidInstallHelp, useAndroidInstallHelp } from "@/lib/useInstallPrompt";
import { AndroidIcon } from "./showcase/AndroidIcon";

// Fallback bottom sheet for Android browsers where one-tap install is not
// available (no `beforeinstallprompt`): offers a jump to Chrome plus the manual
// menu path. Opened through the module-level store in useInstallPrompt, so the
// hero CTA, top bar, CTA band and the banner all drive this single instance
// (mounted once per page by AppShell).
export function AndroidInstallSheet() {
  const t = useTranslations("install.sheet");
  const { open, close } = useAndroidInstallHelp();

  // A Chrome-less device follows the intent's fallback URL, which reloads this
  // same page with ?install-help=1 — reopen the sheet here (the navigation wiped
  // the in-page state) and strip the marker from the address bar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("install-help") !== "1") return;
    params.delete("install-help");
    const qs = params.toString();
    // Keep history.state intact — the App Router stores its tree there and a
    // null state corrupts client-side back/forward navigation.
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );
    openAndroidInstallHelp();
  }, []);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button type="button" aria-label={t("dismiss")} onClick={close} className="absolute inset-0 bg-black/60" />
      <div
        className="card relative m-3 w-full max-w-md rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
        style={{ marginBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold text-cream">{t("title")}</p>
            <p className="mt-1.5 text-sm leading-snug text-cream-dim">{t("body")}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("dismiss")}
            className="shrink-0 rounded-lg p-1 text-cream-faint hover:text-cream-dim"
          >
            <X size={18} />
          </button>
        </div>
        <a
          href={chromeIntentUrl("/app")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sun px-4 py-2.5 font-display text-sm font-bold text-ink"
        >
          <AndroidIcon size={17} />
          {t("chrome")}
        </a>
        {/* In-app WebViews (FB/IG/Messenger) have no "Add to Home screen" — their
            menu offers "Open in external browser" instead, so the copy differs. */}
        <p className="mt-3 text-xs leading-snug text-cream-faint">
          {t(isInAppBrowser() ? "manualInApp" : "manual")}
        </p>
        <p className="mt-1 text-xs leading-snug text-cream-faint">{t("installed")}</p>
      </div>
    </div>,
    document.body,
  );
}
