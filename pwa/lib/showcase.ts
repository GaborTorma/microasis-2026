// Shared constants for the /app showcase / landing page. It presents the native
// iOS + watchOS apps with real device-framed screenshots, an above-the-fold App
// Store CTA, and bilingual HU/EN copy — reusing the PWA's tokens, fonts, i18n and
// lib/platform.

import type { Locale } from "@/i18n/config";
import { LANDING_IMG_V } from "./landing-version";

// The marketing route whose chrome (Header / BottomNav / Disclaimer / Install) is
// suppressed so the showcase gets a full-bleed canvas. Kept in one place so
// AppShell agrees.
export const SHOWCASE_PATHS = ["/app"] as const;

export function isShowcasePath(pathname: string): boolean {
  return SHOWCASE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Screenshot keys → file basename under public/landing/framed/<locale>/. The HU and
// EN folders hold the same basenames with localized UI, so locale is a folder swap.
export const PHONE_SHOTS = {
  timetableThu: "iphone-01-timetable-thursday",
  timetableFri: "iphone-02-timetable-friday",
  now: "iphone-03-now-friday",
  terrace: "iphone-04-timetable-terrace",
  settings: "iphone-05-settings",
} as const;

export const WATCH_SHOTS = {
  nowPortal: "watch-01-now-portal",
  nowTerrace: "watch-02-now-terrace",
  nowMandala: "watch-03-now-mandala",
  widgetPortal: "watch-04-widget-portal",
  widgetField: "watch-05-widget-field",
} as const;

export type PhoneShot = keyof typeof PHONE_SHOTS;
export type WatchShot = keyof typeof WATCH_SHOTS;

// Served as plain <img> (no next/image optimizer cache); the ?v= query is bumped
// by build_landing_images.py on every regen so stale copies are never shown.
export function framedPhone(locale: Locale, key: PhoneShot): string {
  return `/landing/framed/${locale}/${PHONE_SHOTS[key]}.webp?v=${LANDING_IMG_V}`;
}

export function framedWatch(locale: Locale, key: WatchShot): string {
  return `/landing/framed/${locale}/${WATCH_SHOTS[key]}.webp?v=${LANDING_IMG_V}`;
}

// The hero composite (iPhone + rotated Apple Watch as one image), per locale.
export function framedHero(locale: Locale): string {
  return `/landing/framed/${locale}/hero.webp?v=${LANDING_IMG_V}`;
}

// Stage slug → the exact DB accent color from scripts/seed.ts — used for the
// faint per-stage glow on the watch widget cards.
export const STAGE_ACCENTS: Record<string, string> = {
  portal: "#e8a04c",
  field: "#4fb3a6",
  bowl: "#d98c3a",
  terrace: "#93c06a",
  mandala: "#b79be0",
};
