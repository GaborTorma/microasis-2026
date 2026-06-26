import { LanguageToggle } from "@/components/LanguageToggle";
import { InstallCta } from "./InstallCta";
import { Countdown } from "./Countdown";
import { Wordmark } from "./Wordmark";

// Always-on fixed top bar: wordmark + the live countdown (centre, desktop) +
// language toggle / install action. The page reserves top padding for it.
//
// `showInstall` is driven by the hero's CTA visibility: while the hero button is
// on screen the bar shows just the language toggle; once it scrolls away the
// install CTA slides in — replacing the toggle on mobile, sitting beside it on
// desktop.
export function ShowcaseTopBar({ showInstall }: { showInstall: boolean }) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-ink/85 backdrop-blur-md"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="relative mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2">
        <img src="/icon.svg" alt="" width={28} height={28} className="shrink-0 rounded-lg" />
        <Wordmark />
        <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 md:block">
          <Countdown className="text-sm text-cream-dim" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className={`w-28 ${showInstall ? "hidden sm:block" : "block"}`}>
            <LanguageToggle />
          </div>
          {showInstall && (
            <div className="slide-in-top">
              {/* 42px matches the language toggle's height so they sit flush. */}
              <InstallCta height={42} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
