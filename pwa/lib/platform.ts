// Client-only platform detection for the install / share prompts. Every helper is
// SSR-safe (returns false on the server) so it can be called from "use client"
// components without guarding each call site.

export const APP_STORE_URL = "https://apps.apple.com/app/id6782099675";

// QR / share target. A scanned phone lands here and `/get` decides where to go.
export const SHARE_PATH = "/get";

function ua(): string {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS 13+ masquerades as a Mac ("Macintosh" UA); touch points disambiguate
  // it from a real Mac (which reports 0).
  const iPadOS = /macintosh/i.test(ua()) && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua()) || iPadOS;
}

export function isAndroid(): boolean {
  return /android/i.test(ua());
}

// Running as an installed PWA (home-screen), not in a browser tab.
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari exposes this non-standard flag for home-screen apps.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Common in-app browsers (Instagram / Facebook / Messenger / etc.) where Apple's
// native Smart App Banner never shows — there we fall back to our own banner.
export function isInAppBrowser(): boolean {
  return /fban|fbav|fb_iab|instagram|messenger|line\/|micromessenger|twitter|gsa\//i.test(ua());
}

// Real Safari on iOS — the only place the Smart App Banner appears. Chrome (CriOS),
// Firefox (FxiOS), Edge (EdgiOS) and in-app webviews are excluded, so our custom
// banner covers exactly the cases the native one misses.
export function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  const u = ua();
  return /safari/i.test(u) && !/crios|fxios|edgios/i.test(u) && !isInAppBrowser();
}
