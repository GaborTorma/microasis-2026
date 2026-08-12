"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Download, Plus, X } from "lucide-react";
import { APP_STORE_URL, isAndroid, isIOS, isIOSSafari, isStandalone } from "@/lib/platform";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

// Dismissed once, hidden for good (bump the key if the wording changes).
const KEY = "microasis-install-v1";

type Mode = "ios" | "android" | null;

// First-load install suggestion. On iOS we only step in where Apple's native
// Smart App Banner (the `itunes` meta tag in layout) won't show — in-app browsers
// and non-Safari iOS browsers (suppressible via `ios` where the page already IS
// the App Store pitch, i.e. /app). On Android the banner shows in EVERY browser —
// UA-based, not gated on `beforeinstallprompt`, which in-app WebViews never fire —
// and the button walks the shared installAndroid() ladder: native prompt →
// Chrome intent escape → help sheet. `aboveNav` lifts it over the bottom nav on
// the app routes; the showcase has no nav.
export function InstallPrompt({
  ios = true,
  aboveNav = true,
}: {
  ios?: boolean;
  aboveNav?: boolean;
}) {
  const t = useTranslations("install");
  const { installed, installAndroid } = useInstallPrompt();
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (dismissed || isStandalone()) return;

    if (isIOS()) {
      if (ios && !isIOSSafari()) setMode("ios");
      return;
    }

    if (isAndroid()) {
      setMode("android");
      const onInstalled = () => {
        try {
          localStorage.setItem(KEY, "1");
        } catch {
          /* ignore */
        }
        setMode(null);
      };
      window.addEventListener("appinstalled", onInstalled);
      return () => window.removeEventListener("appinstalled", onInstalled);
    }
  }, [ios]);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setMode(null);
  };

  const install = async () => {
    if ((await installAndroid()) === "prompted") dismiss();
  };

  if (!mode) return null;
  // Detected as already installed (getInstalledRelatedApps / appinstalled /
  // standalone) — an install banner would be noise.
  if (mode === "android" && installed) return null;
  const iosMode = mode === "ios";
  // The iOS banner's only action is the App Store, so it needs a listing URL.
  if (iosMode && !APP_STORE_URL) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-3"
      style={{
        paddingBottom: aboveNav
          ? "calc(var(--safe-bottom) + var(--nav-h) + 0.6rem)"
          : "calc(var(--safe-bottom) + 0.75rem)",
      }}
    >
      <div className="card flex w-full max-w-md items-center gap-3 rounded-2xl p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-cream">
            {t(iosMode ? "ios.title" : "android.title")}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-cream-dim">
            {t(iosMode ? "ios.body" : "android.body")}
          </p>
        </div>
        {iosMode && APP_STORE_URL ? (
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sun px-3 py-2 font-display text-sm font-bold text-ink"
          >
            <Download size={16} strokeWidth={2.4} />
            {t("ios.cta")}
          </a>
        ) : (
          <button
            type="button"
            onClick={install}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sun px-3 py-2 font-display text-sm font-bold text-ink"
          >
            <Plus size={16} strokeWidth={2.6} />
            {t("android.cta")}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="shrink-0 rounded-lg p-1 text-cream-faint hover:text-cream-dim"
        >
          <X size={18} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
