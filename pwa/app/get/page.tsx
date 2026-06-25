import type { Metadata } from "next";
import { GetRedirect } from "@/components/GetRedirect";

// /get is the URL the share QR / share sheet hands around, so it carries the
// richest metadata: a dedicated 1200×630 OpenGraph image (opengraph-image.tsx),
// plus title/description/Twitter card for the best preview when re-shared.
const title = "Guide for MANAS 2026 — nem hivatalos fesztivál app";
const description =
  "Teljes időrend, élő most-megy nézet és fesztiváltérkép a MANAS 2026-hoz. iPhone-on az App Store nyílik, minden máson a webapp. Nem hivatalos app — nem a fesztivál szoftvere.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "Guide for MANAS 2026",
    title,
    description,
    url: "/get",
    locale: "hu_HU",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function GetPage() {
  return <GetRedirect />;
}
