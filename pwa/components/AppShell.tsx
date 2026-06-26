"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { DisclaimerGate } from "./DisclaimerGate";
import { InstallPrompt } from "./InstallPrompt";
import { isShowcasePath } from "@/lib/showcase";

// Wraps the app's chrome (Header, the max-width container, BottomNav, the
// disclaimer + install prompts) so it can be dropped on the showcase/landing
// routes. Those marketing pages want a full-bleed canvas and an unbroken
// position:sticky scroll act — the max-w-6xl container and bottom-nav padding
// would otherwise cap the layout and clip sticky ancestors. The root layout
// still owns <html>/<body>, the intl + settings providers and the service
// worker, so everything else is unchanged.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isShowcasePath(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
        <Header />
        <main className="flex-1 pb-[calc(var(--nav-h)+var(--safe-bottom)+0.5rem)]">
          {children}
        </main>
      </div>
      <BottomNav />
      <DisclaimerGate />
      <InstallPrompt />
    </>
  );
}
