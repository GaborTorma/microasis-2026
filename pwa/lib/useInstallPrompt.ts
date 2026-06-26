"use client";

import { useSyncExternalStore } from "react";
import { isStandalone } from "./platform";

// Shared "Add to Home Screen" state for the /app showcase. A single module-level
// listener captures the browser's `beforeinstallprompt` and preventDefault()s it,
// so the browser's own (aggressive) install mini-infobar never pops up on the
// showcase — we surface an explicit button instead. Several components
// (hero, top bar, closing CTA) read the same captured event via this hook.
//
// Chromium-on-Android only: iOS Safari and Firefox never fire the event, so
// `canInstall` stays false there (iOS users get the native App Store app anyway).

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let consumed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

let wired = false;
function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    consumed = false;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    consumed = true;
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

// Stable boolean snapshot (server render → false, so SSR/hydration is consistent;
// the button only appears once the event fires on the client).
const getSnapshot = () => deferred !== null && !consumed;

export function useInstallPrompt() {
  const ready = useSyncExternalStore(subscribe, getSnapshot, () => false);
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

  return { canInstall, promptInstall };
}
