/** Map SVG coordinate space (must match the coords used in scripts/seed.ts). */
export const MAP_W = 1000;
export const MAP_H = 1300;

/**
 * Local equirectangular projection of the festival grounds (Lengyeltóti /
 * Kék-tó), calibrated against six on-site GPS reference points (XY1–XY5 +
 * Mandala) supplied by the organiser. North is up; 1 metre ≈ PX_PER_M svg
 * units. This makes the "you are here" overlay land accurately on the drawn
 * map, and the base art + markers are authored in the same projected space.
 *
 * Reference points → svg (for re-checking the calibration):
 *   XY1 46.674096,17.660530 → (474, 448)
 *   XY2 46.673350,17.660154 → (425, 588)
 *   XY3 46.675584,17.660955 → (529, 166)   (Bowl)
 *   XY4 46.671683,17.658008 → (146, 904)   (Pedestrian entrance)
 *   XY5 46.671862,17.663088 → (806, 870)
 *   Mandala 46.673795,17.659082 → (286, 504)
 */
const LAT0 = 46.6735;
const LNG0 = 17.6605;
const M_PER_DEG_LAT = 111200;
const M_PER_DEG_LNG = 76386; // 111320 · cos(46.6735°)
const PX_PER_M = 1.7;
const ORIGIN_X = 470;
const ORIGIN_Y = 560;

export function geoToSvg(lat: number, lng: number) {
  const xm = (lng - LNG0) * M_PER_DEG_LNG;
  const ym = (LAT0 - lat) * M_PER_DEG_LAT;
  return { x: ORIGIN_X + xm * PX_PER_M, y: ORIGIN_Y + ym * PX_PER_M };
}

/** True when the position falls within (a small margin around) the drawn map. */
export function inBounds(lat: number, lng: number) {
  const { x, y } = geoToSvg(lat, lng);
  const m = 90;
  return x >= -m && x <= MAP_W + m && y >= -m && y <= MAP_H + m;
}
