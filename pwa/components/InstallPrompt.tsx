"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Download, Plus, X } from "lucide-react";
import { APP_STORE_URL, isAndroid, isIOS, isIOSSafari, isStandalone } from "@/lib/platform";

// Dismissed once, hidden for good (bump the key if the wording changes).
const KEY = "manas-install-v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "ios" | "android" | null;

// First-load install suggestion. On iOS we only step in where Apple's native
// Smart App Banner (the `itunes` meta tag in layout) won't show — in-app browsers
// and non-Safari iOS browsers. On Android we surface the browser's own install
// prompt as a tappable button.
export function InstallPrompt() {
  const t = useTranslations("install");
  const [mode, setMode] = useState<Mode>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (dismissed || isStandalone()) return;

    if (isIOS()) {
      if (!isIOSSafari()) setMode("ios");
      return;
    }

    if (isAndroid()) {
      const onPrompt = (e: Event) => {
        e.preventDefault();
        setDeferred(e as BeforeInstallPromptEvent);
        setMode("android");
      };
      const onInstalled = () => {
        try {
          localStorage.setItem(KEY, "1");
        } catch {
          /* ignore */
        }
        setMode(null);
      };
      window.addEventListener("beforeinstallprompt", onPrompt);
      window.addEventListener("appinstalled", onInstalled);
      return () => {
        window.removeEventListener("beforeinstallprompt", onPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setMode(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!mode) return null;
  const ios = mode === "ios";

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-3"
      style={{ paddingBottom: "calc(var(--safe-bottom) + var(--nav-h) + 0.6rem)" }}
    >
      <div className="card flex w-full max-w-md items-center gap-3 rounded-2xl p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-cream">
            {t(ios ? "ios.title" : "android.title")}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-cream-dim">
            {t(ios ? "ios.body" : "android.body")}
          </p>
        </div>
        {ios ? (
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
