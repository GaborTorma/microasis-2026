/**
 * Generate the app's original (non-festival-logo) mandala icon and rasterize
 * PWA / favicon / apple-touch PNGs from it. Run: pnpm icons
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

function petals(count: number, ry: number, rx: number, offsetDeg: number, fill: string) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = offsetDeg + (360 / count) * i;
    out += `<ellipse cx="0" cy="${-(ry + 56)}" rx="${rx}" ry="${ry}" transform="rotate(${a})"/>`;
  }
  return `<g fill="${fill}">${out}</g>`;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#2a1812"/>
      <stop offset="100%" stop-color="#160c08"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256)">
    ${petals(12, 52, 17, 15, "#7a2e2e")}
    ${petals(12, 64, 21, 0, "#b5532f")}
    ${petals(12, 30, 12, 15, "#e8a04c")}
    <circle r="58" fill="#7a2e2e"/>
    <circle r="40" fill="#e8a04c"/>
    <circle r="15" fill="#160c08"/>
  </g>
</svg>`;

async function main() {
  mkdirSync("public/icons", { recursive: true });
  writeFileSync("public/icon.svg", SVG);
  const buf = Buffer.from(SVG);
  await sharp(buf).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(buf).resize(512, 512).png().toFile("public/icons/icon-512.png");
  await sharp(buf).resize(512, 512).png().toFile("public/icons/maskable-512.png");
  await sharp(buf).resize(180, 180).png().toFile("app/apple-icon.png");
  await sharp(buf).resize(48, 48).png().toFile("app/icon.png");
  console.log("Icons generated.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
