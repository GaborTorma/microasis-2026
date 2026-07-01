// Client-only platform detection for the install / share prompts. Every helper is
// SSR-safe (returns false on the server) so it can be called from "use client"
// components without guarding each call site.

// Canonical public origin (CNAME → manas2026.vercel.app). Use this for any URL we
// hand out (share, QR, metadata) so it reads as our own domain, not the Vercel host.
export const SITE_URL = "https://manas.torma.ai";

export const APP_STORE_URL = "https://apps.apple.com/app/id6782099675";

// The native share sheet hands out the /app showcase landing page; the QR (and the
// printed/copied link beneath it) use /get, which routes the scanner: iPhone → App
// Store, anything else → the web app.
export const SHARE_URL = `${SITE_URL}/app`;
export const QR_URL = `${SITE_URL}/get`;

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

// Any Apple platform — iPhone/iPad/iPod (incl. iPadOS masquerade via isIOS) *and*
// macOS. The /app showcase points every Apple device at the native App Store app;
// only non-Apple installable devices get the PWA "Add to Home Screen" button. A
// real Mac reports a "Macintosh" UA with 0 touch points, so isIOS() alone misses
// it and Chrome-on-Mac (which fires beforeinstallprompt) wrongly got the PWA CTA.
export function isApple(): boolean {
  return isIOS() || /macintosh|mac os x/i.test(ua());
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
