/**
 * Generate the app's original (non-festival-logo) oasis mark and rasterize
 * every icon from it — PWA / favicon / apple-touch, plus the iOS and watchOS
 * app icons under ../apple. Run: pnpm icons
 *
 * The mark is a spring seen from above: a solid core ringed by broken ripples.
 * The breaks (stroke-dasharray) echo the carved, hand-drawn line work on the
 * printed posters without copying the festival's own logo. It is deliberately
 * geometric so it still reads at 48 px and as a watch complication.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

/** One broken ripple: `segments` arcs of equal length separated by `gapDeg`. */
function ripple(r: number, width: number, color: string, segments: number, gapDeg: number, rotate: number, opacity = 1) {
  const circumference = 2 * Math.PI * r;
  const gap = (circumference * gapDeg) / 360;
  const dash = circumference / segments - gap;
  return (
    `<circle r="${r}" stroke="${color}" stroke-width="${width}" opacity="${opacity}"` +
    ` stroke-dasharray="${dash.toFixed(1)} ${gap.toFixed(1)}" transform="rotate(${rotate})"/>`
  );
}

const frame = (rings: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="#2b1a15"/>
      <stop offset="100%" stop-color="#170c0b"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256)" fill="none" stroke-linecap="round">
    ${rings}
  </g>
</svg>`;

const SVG = frame(`${ripple(198, 9, "#645145", 5, 13, 8, 0.75)}
    ${ripple(154, 12, "#8fa69b", 4, 15, -34, 0.7)}
    ${ripple(110, 15, "#b5764a", 3, 17, 21, 0.95)}
    <circle r="56" fill="#c89468" stroke="none"/>`);

/** Small sizes (favicon) lose thin strokes to downsampling: fewer, fatter,
 *  fully-opaque rings and a bigger core so the mark still reads at 48 px. */
const SVG_COMPACT = frame(`${ripple(206, 22, "#8fa69b", 4, 16, -30)}
    ${ripple(140, 28, "#b5764a", 3, 18, 20)}
    <circle r="76" fill="#c89468" stroke="none"/>`);

async function main() {
  mkdirSync("public/icons", { recursive: true });
  writeFileSync("public/icon.svg", SVG);
  const buf = Buffer.from(SVG);
  const compact = Buffer.from(SVG_COMPACT);
  await sharp(buf).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(buf).resize(512, 512).png().toFile("public/icons/icon-512.png");
  await sharp(buf).resize(512, 512).png().toFile("public/icons/maskable-512.png");
  await sharp(buf).resize(180, 180).png().toFile("app/apple-icon.png");
  await sharp(compact).resize(48, 48).png().toFile("app/icon.png");

  // The iOS + watchOS app icons come from the same mark. App Store assets must
  // be opaque RGB — an alpha channel fails validation on upload.
  const appIcon = await sharp(buf)
    .resize(1024, 1024)
    .flatten({ background: "#170c0b" })
    .removeAlpha()
    .png()
    .toBuffer();
  for (const target of ["MicrOasis-iOS", "MicrOasis-watch"]) {
    const dir = `../apple/Sources/${target}/Assets.xcassets/AppIcon.appiconset`;
    if (existsSync(dir)) writeFileSync(`${dir}/icon-1024.png`, appIcon);
  }
  console.log("Icons generated (web + apple).");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
