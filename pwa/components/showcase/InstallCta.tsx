"use client";

import { useEffect, useState } from "react";
import { isAndroid } from "@/lib/platform";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { AppStoreButton } from "./AppStoreButton";
import { AndroidInstallButton } from "./AndroidInstallButton";
import { AndroidInstalledBadge } from "./AndroidInstalledBadge";

// The single primary CTA for the hero and top bar: Apple's App Store badge,
// swapped for an "Install on Android" button on Android only (desktop Chrome
// can technically install the PWA too, but an "Androidra" label would mislead
// there — the button is deliberately Android-exclusive). Android is detected by
// UA (post-hydration state, so SSR stays the badge with no mismatch), NOT by
// `beforeinstallprompt` — in-app WebViews (Facebook & co.) never fire it, and
// gating on it would show the App Store badge to Android users there. The tap
// itself degrades gracefully via installAndroid(): native prompt → Chrome
// intent escape → help sheet.
export function InstallCta({
  height,
  className = "",
  pulse = false,
}: {
  height: number;
  className?: string;
  pulse?: boolean;
}) {
  const { installed, installAndroid } = useInstallPrompt();
  const [android, setAndroid] = useState(false);
  useEffect(() => setAndroid(isAndroid()), []);

  // `installed` covers standalone (we're inside the installed app), a fresh
  // appinstalled, and Chrome's getInstalledRelatedApps across sessions — the
  // pill replaces the button instead of falling back to the App Store badge.
  if (android) {
    return installed ? (
      <AndroidInstalledBadge height={height} className={className} />
    ) : (
      <AndroidInstallButton
        height={height}
        className={className}
        pulse={pulse}
        onClick={() => void installAndroid()}
      />
    );
  }
  return <AppStoreButton height={height} className={className} pulse={pulse} />;
}
