"use client";

import { useSyncExternalStore } from "react";
import { chromeIntentUrl, isAndroid, isInAppBrowser, isStandalone } from "./platform";

// Shared Android/PWA install state. A single module-level listener captures the
// browser's `beforeinstallprompt` and preventDefault()s it, so the browser's own
// (aggressive) install mini-infobar never pops up — we surface explicit buttons
// instead. Several components (showcase hero, top bar, closing CTA, the
// InstallPrompt banner) read the same captured event via this hook.
//
// Only Chromium fires the event. Where it never arrives — Android in-app WebViews
// (Facebook, Instagram, Messenger) and Firefox — `installAndroid()` degrades
// gracefully: it reopens the page in Chrome via an intent:// URL, or opens the
// module-level help sheet (rendered once by AppShell) with manual steps.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// What happened when the user tapped an Android install button: the native
// prompt was shown, we are escaping the WebView into Chrome, or the help sheet
// opened (no native path available).
export type AndroidInstallOutcome = "prompted" | "escaping" | "help";

let deferred: BeforeInstallPromptEvent | null = null;
let consumed = false;
let installed = false;
let helpOpen = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

let wired = false;
function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  // "Already installed" detection, best effort: standalone display-mode means we
  // ARE the installed app; on Android Chrome getInstalledRelatedApps() reports
  // the WebAPK across sessions (via manifest.related_applications). Elsewhere the
  // only signal is a same-session `appinstalled` below.
  if (isStandalone()) installed = true;
  if (isAndroid()) {
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<{ platform: string }[]>;
    };
    nav
      .getInstalledRelatedApps?.()
      .then((apps) => {
        if (apps.length > 0) {
          installed = true;
          notify();
        }
      })
      .catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    consumed = false;
    // Chrome only fires this when the app is NOT installed — authoritative,
    // overrides any stale "installed" conclusion (e.g. after an uninstall).
    installed = false;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    consumed = true;
    installed = true;
    helpOpen = false;
    notify();
  });
}

function subscribe(cb: () => void): () => void {
  wire();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Stable boolean snapshots (server render → false, so SSR/hydration is
// consistent; buttons only switch behaviour once the client is live).
const installSnapshot = () => deferred !== null && !consumed;
const installedSnapshot = () => installed;
const helpSnapshot = () => helpOpen;

// Exported so AndroidInstallSheet can open itself when the page is (re)loaded
// with the ?install-help=1 marker (the intent fallback URL for Chrome-less
// devices — the navigation wipes the in-page state, so the marker carries it).
export function openAndroidInstallHelp() {
  helpOpen = true;
  notify();
}

// Resolve true as soon as a beforeinstallprompt is captured, false after `ms`.
// Needed because the Android CTAs are UA-gated and tappable before Chrome's
// installability checks finish on a first visit — without the grace period an
// early tap would fall through to the help sheet in the one browser where the
// native prompt is about to become available.
function waitForDeferred(ms: number): Promise<boolean> {
  if (deferred) return Promise.resolve(true);
  return new Promise((resolve) => {
    const settle = (v: boolean) => {
      listeners.delete(peek);
      clearTimeout(timer);
      resolve(v);
    };
    const peek = () => {
      if (deferred) settle(true);
    };
    listeners.add(peek);
    const timer = setTimeout(() => settle(false), ms);
  });
}

export function useInstallPrompt() {
  const ready = useSyncExternalStore(subscribe, installSnapshot, () => false);
  const installed = useSyncExternalStore(subscribe, installedSnapshot, () => false);
  const canInstall = ready && !isStandalone();

  async function promptInstall() {
    if (!deferred) return;
    const event = deferred;
    // Consume immediately — the event is single-use and shared across components.
    deferred = null;
    consumed = true;
    notify();
    await event.prompt();
    await event.userChoice;
  }

  // The one-tap Android install action, in order of preference:
  // 1. captured `beforeinstallprompt` → native install dialog (Chrome/Edge/Samsung),
  //    waiting out a short grace period first — on a first Chrome visit the event
  //    lands only after the SW registers, seconds after the CTA is tappable;
  // 2. in-app WebView → intent:// jump to Chrome's /app page, where 1. works
  //    (if the WebView swallows the intent, the page stays visible and we fall
  //    back to the help sheet after a grace period);
  // 3. anything else (Firefox, already-installed Chrome) → help sheet.
  async function installAndroid(): Promise<AndroidInstallOutcome> {
    if (isInAppBrowser() && !deferred) {
      window.location.href = chromeIntentUrl("/app");
      setTimeout(() => {
        if (document.visibilityState === "visible") openAndroidInstallHelp();
      }, 1600);
      return "escaping";
    }
    if (await waitForDeferred(2000)) {
      await promptInstall();
      return "prompted";
    }
    openAndroidInstallHelp();
    return "help";
  }

  return { canInstall, installed, promptInstall, installAndroid };
}

// The Android help sheet's open state — a module-level singleton so every
// trigger (hero CTA, top bar, CTA band, banner) drives the one sheet that
// AppShell mounts per page.
export function useAndroidInstallHelp() {
  const open = useSyncExternalStore(subscribe, helpSnapshot, () => false);
  return {
    open,
    close: () => {
      helpOpen = false;
      notify();
    },
  };
}
