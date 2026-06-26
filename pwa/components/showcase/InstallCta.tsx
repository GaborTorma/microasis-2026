"use client";

import { isIOS } from "@/lib/platform";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { AppStoreButton } from "./AppStoreButton";
import { AddToHomeButton } from "./AddToHomeButton";

// The single primary CTA for the hero and top bar: Apple's App Store badge,
// swapped for an "Add to Home Screen" button on non-Apple devices where the PWA
// is installable. Until the install event fires (and on Apple / SSR) it's the
// App Store badge, so there's no hydration flicker.
export function InstallCta({
  height,
  className = "",
  pulse = false,
}: {
  height: number;
  className?: string;
  pulse?: boolean;
}) {
  const { canInstall, promptInstall } = useInstallPrompt();
  if (canInstall && !isIOS()) {
    return (
      <AddToHomeButton height={height} className={className} pulse={pulse} onClick={promptInstall} />
    );
  }
  return <AppStoreButton height={height} className={className} pulse={pulse} />;
}
