"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Share2 } from "lucide-react";
import { QR_URL, SHARE_URL } from "@/lib/platform";

// Refined pill shared by the share / copy primary actions.
const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-sun to-leaf px-6 py-2.5 font-display text-sm font-bold text-ink shadow-[0_8px_24px_-6px_rgba(94,201,138,0.55)] transition active:scale-95";

// The /share page: a big QR a friend just points their phone at. The QR (and the
// printed/copied link) encodes /get, which routes the scanner: iPhone → App Store,
// anything else → the web app. The native share button hands out the /app showcase
// page instead. On devices with the share sheet (iOS / macOS / Android) the primary
// action opens it and a small copy button sits next to the URL; elsewhere the
// primary action copies the link (so no separate inline copy is needed).
export function ShareView() {
  const t = useTranslations("share");
  const url = QR_URL;
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Feature-detect the Web Share API (only available client-side, post-mount).
  useEffect(() => {
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
      await navigator.share({ title: "MicrOasis 2026", text: t("invite"), url: SHARE_URL });
    } catch {
      /* user cancelled, or share unsupported for this payload */
    }
  };

  const pretty = url.replace(/^https?:\/\//, "");

  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <h2 className="font-display text-2xl font-extrabold text-cream">{t("title")}</h2>
      <p className="mt-2 max-w-xs whitespace-pre-line text-sm leading-snug text-cream-dim">
        {t("body")}
      </p>

      <div className="mt-6 rounded-3xl bg-cream p-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        <QRCodeSVG value={url} size={248} bgColor="#f2e7d8" fgColor="#170c0b" level="M" />
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
