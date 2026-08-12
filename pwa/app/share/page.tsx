import type { Metadata } from "next";
import { ShareView } from "@/components/ShareView";

export const metadata: Metadata = {
  title: "Share — Guide for MicrOasis 2026",
  description: "Share the Guide for MicrOasis 2026 app with a friend via QR code.",
};

export default function SharePage() {
  return <ShareView />;
}
