"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { APP_STORE_URL, isIOS } from "@/lib/platform";

// Client-side redirect for the shared /get link: iPhones to the App Store,
// everything else to the PWA. Kept in JS (not a server 302) so link-preview
// crawlers, which don't run JS, still read /get's rich metadata. The plain links
// cover the no-JS / slow case. Text shows in the device language (a fresh visitor
// has no locale cookie, so the layout falls back to Accept-Language).
export function GetRedirect() {
  const t = useTranslations("get");

  useEffect(() => {
    window.location.replace(isIOS() ? APP_STORE_URL : "/");
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-8 text-center">
      <p className="text-cream-dim">{t("redirecting")}</p>
      <div className="flex w-56 flex-col gap-3">
        <a
          href={APP_STORE_URL}
          className="w-full rounded-full bg-sun px-5 py-2.5 text-center font-display font-bold text-ink"
        >
          App Store
        </a>
        <Link
          href="/"
          className="w-full rounded-full border border-line/70 px-5 py-2.5 text-center font-semibold text-cream"
        >
          Web
        </Link>
      </div>
    </div>
  );
}
