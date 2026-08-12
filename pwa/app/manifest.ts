import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/platform";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guide for MicrOasis 2026",
    short_name: "MicrOasis 2026",
    // Lets navigator.getInstalledRelatedApps() report the installed WebAPK, so
    // the install CTAs can flip to a "Telepítve" state across sessions. Note:
    // no prefer_related_applications — this must NOT suppress the install prompt.
    related_applications: [
      { platform: "webapp", url: `${SITE_URL}/manifest.webmanifest` },
    ],
    description:
      "Unofficial timetable and now-playing view for the MicrOasis 2026 gathering.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#170c0b",
    theme_color: "#170c0b",
    categories: ["music", "travel", "events"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
