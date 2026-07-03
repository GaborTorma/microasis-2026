"use client";

import { useEffect, useState } from "react";
import { isAndroid, isStandalone } from "@/lib/platform";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { AppStoreButton } from "./AppStoreButton";
import { AndroidInstallButton } from "./AndroidInstallButton";

// The single primary CTA for the hero and top bar: Apple's App Store badge,
// swapped for an "Install on Android" button on Android only (desktop Chrome
// can technically install the PWA too, but an "Androidra" label would mislead
// there — the button is deliberately Android-exclusive). Android is detected by
// UA (post-hydration state, so SSR stays the badge with no mismatch), NOT by
// `beforeinstallprompt` — in-app WebViews (Facebook & co.) never fire it, and
// exactly there the App Store badge used to show to Android users. The tap
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
  const { justInstalled, installAndroid } = useInstallPrompt();
  // Standalone = the user is inside the installed PWA (an installed WebAPK
  // captures shared /app links), so offering "install" there would be absurd;
  // justInstalled hides the button right after a successful native prompt.
  const [android, setAndroid] = useState(false);
  useEffect(() => setAndroid(isAndroid() && !isStandalone()), []);

  if (android && !justInstalled) {
    return (
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
