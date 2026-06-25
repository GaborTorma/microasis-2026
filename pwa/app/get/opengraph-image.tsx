import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Guide for MANAS 2026 — unofficial festival companion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dedicated 1200×630 link-preview card for the shared /get URL: the high-res
// mandala logo over the brand gradient with the wordmark. Generated at the edge
// via next/og so there's no static asset to keep in sync.
export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/icons/icon-512.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          backgroundColor: "#0c1611",
          backgroundImage: "linear-gradient(135deg, #16261b 0%, #0c1611 55%)",
          color: "#edf4ec",
        }}
      >
        <img src={logoSrc} width={200} height={200} style={{ borderRadius: 40 }} alt="" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 30, letterSpacing: 10, color: "#aec8b6", fontWeight: 700 }}>
            GUIDE FOR
          </div>
          <div style={{ fontSize: 112, fontWeight: 800, color: "#5ec98a", letterSpacing: 2 }}>
            MANAS 2026
          </div>
          <div style={{ fontSize: 30, letterSpacing: 4, color: "#aec8b6" }}>
            Psychedelic Tribal Gathering
          </div>
        </div>
        <div style={{ fontSize: 24, letterSpacing: 8, color: "#46b3a3", fontWeight: 700 }}>
          UNOFFICIAL · NEM HIVATALOS
        </div>
      </div>
    ),
    size,
  );
}
