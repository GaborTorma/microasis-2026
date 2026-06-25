"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Share2 } from "lucide-react";
import { SHARE_PATH } from "@/lib/platform";

// Refined pill shared by the share / copy primary actions.
const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-sun to-leaf px-6 py-2.5 font-display text-sm font-bold text-ink shadow-[0_8px_24px_-6px_rgba(94,201,138,0.55)] transition active:scale-95";

// The /share page: a big QR a friend just points their phone at. The code encodes
// the /get redirect, which sends iPhones to the App Store and everything else to
// the PWA. On devices with the native share sheet (iOS / macOS / Android) the
// primary action opens it and a small copy button sits next to the URL; elsewhere
// the primary action copies the link (so no separate inline copy is needed).
export function ShareView() {
  const t = useTranslations("share");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Build the absolute URL on the client so it works on prod, preview and local,
  // and feature-detect the Web Share API (only available client-side, post-mount).
  useEffect(() => {
    setUrl(window.location.origin + SHARE_PATH);
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "MANAS 2026", text: t("invite"), url });
    } catch {
      /* user cancelled, or share unsupported for this payload */
    }
  };

  const pretty = url.replace(/^https?:\/\//, "");

  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cream/75">
        {t("kicker")}
      </p>
      <h2 className="mt-1 font-display text-2xl font-extrabold text-cream">{t("title")}</h2>
      <p className="mt-2 max-w-xs text-sm leading-snug text-cream-dim">{t("body")}</p>

      <div className="mt-6 rounded-3xl bg-cream p-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        {url ? (
          <QRCodeSVG value={url} size={248} bgColor="#edf4ec" fgColor="#0c1611" level="M" />
        ) : (
          <div className="h-[248px] w-[248px]" />
        )}
      </div>

      {canShare ? (
        <button type="button" onClick={share} className={`mt-6 ${PRIMARY_BTN}`}>
          <Share2 size={16} strokeWidth={2.4} />
          {t("share")}
        </button>
      ) : (
        <button type="button" onClick={copy} className={`mt-6 ${PRIMARY_BTN}`}>
          {copied ? <Check size={16} strokeWidth={2.6} /> : <Copy size={16} strokeWidth={2.4} />}
          {copied ? t("copied") : t("copy")}
        </button>
      )}

      {/* URL below the action. Inline copy only when the big button isn't copy. */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="break-all font-mono text-xs text-cream-dim">{pretty}</span>
        {canShare && (
          <button
            type="button"
            onClick={copy}
            aria-label={t("copy")}
            className="shrink-0 rounded-md p-1.5 text-cream-faint transition-colors hover:bg-cream/5 hover:text-cream-dim"
          >
            {copied ? <Check size={15} strokeWidth={2.6} /> : <Copy size={15} strokeWidth={2.2} />}
          </button>
        )}
      </div>
    </div>
  );
}
