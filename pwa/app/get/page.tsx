"use client";

import { useEffect } from "react";
import Link from "next/link";
import { APP_STORE_URL, isIOS } from "@/lib/platform";

// QR / share landing page. Phones that scan the share QR (or open manas2026…/get)
// arrive here: iPhones go to the App Store, everything else to the PWA home. The
// plain links below cover the no-JS / slow-redirect case.
export default function GetPage() {
  useEffect(() => {
    window.location.replace(isIOS() ? APP_STORE_URL : "/");
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-8 text-center">
      <p className="text-cream-dim">Átirányítás… / Redirecting…</p>
      <div className="flex gap-3">
        <a
          href={APP_STORE_URL}
          className="rounded-xl bg-sun px-4 py-2 font-display font-bold text-ink"
        >
          App Store
        </a>
        <Link
          href="/"
          className="rounded-xl border border-leaf/40 px-4 py-2 font-semibold text-cream"
        >
          Web
        </Link>
      </div>
    </div>
  );
}
