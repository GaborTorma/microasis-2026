/**
 * Base art for the festival map (viewBox 0 0 1000 1300), authored in the same
 * GPS-calibrated projected space as lib/mapConfig.ts (north up, ~1.7 px/m).
 * Big land-use zones — forest, parking, car/pedestrian camping, tipi camps,
 * soil-regeneration zones and the lake — are drawn as COLOURED AREAS with
 * labels (not icons). Point facilities/integration spaces/stages are layered
 * on top as DB-driven markers by MapCanvas.
 */

// Land-use colours (kept in sync with the matching DB category colours).
const GROUND = "#152619";
const FOREST = "#284b22";
const FOREST_DK = "#1f3a1a";
const SOIL = "#a9925c";
const SOIL_DK = "#8f7a49";
const LAKE = "#2c6f87";
const LAKE_EDGE = "#4d96ab";
const PARKING = "#8c8160";
const CAMP_CAR = "#9aa857";
const CAMP_PED = "#7f9c64";
const TIPI = "#5f7e44";
const ROAD = "#b5532f";
const PATH = "#e9dcc6";

const areaLabel = {
  fill: "#eaf2e8",
  fontWeight: 700,
} as const;

export function MapBaseArt() {
  return (
    <g>
      {/* ground */}
      <rect x={0} y={0} width={1000} height={1300} fill={GROUND} />

      {/* ── WEST FOREST: big curved arm hugging the left ── */}
      <path
        d="M -20,30 C 190,18 345,75 365,250 C 378,365 345,520 285,655 C 232,765 110,820 -20,812 Z"
        fill={FOREST}
      />
      {/* northern tree belt behind Field / Bowl */}
      <path
        d="M 320,70 C 470,45 650,55 720,140 C 758,195 735,265 675,285 C 545,312 410,300 350,235 C 320,190 312,118 320,70 Z"
        fill={FOREST_DK}
      />

      {/* ── EAST: ZONE 2 (NE) and ZONE 1 (S) soil-regeneration ── */}
      <path d="M 690,235 C 830,215 1010,225 1010,225 L 1010,650 C 900,665 770,650 700,600 C 660,500 660,330 690,235 Z" fill={SOIL} />
      <path d="M 705,700 C 850,675 1010,690 1010,690 L 1010,1300 L 560,1300 C 560,1180 600,1010 660,880 C 678,800 690,745 705,700 Z" fill={SOIL} />
      {/* soil texture + forest patches inside the zones */}
      <ellipse cx={880} cy={360} rx={70} ry={52} fill={FOREST_DK} opacity={0.8} />
      <ellipse cx={930} cy={520} rx={55} ry={70} fill={FOREST_DK} opacity={0.7} />
      <ellipse cx={800} cy={520} rx={42} ry={40} fill={SOIL_DK} opacity={0.6} />
      <ellipse cx={770} cy={820} rx={70} ry={58} fill={FOREST_DK} opacity={0.75} />
      <ellipse cx={930} cy={930} rx={70} ry={90} fill={SOIL_DK} opacity={0.55} />
      {/* Zone 1 loop path */}
      <ellipse cx={870} cy={1110} rx={95} ry={120} fill="none" stroke={PATH} strokeWidth={6} strokeDasharray="2 12" opacity={0.5} />
      {/* ZONE 3 (small, far NE) */}
      <path d="M 855,95 C 940,85 1010,95 1010,95 L 1010,235 C 940,240 875,225 850,185 C 845,150 848,118 855,95 Z" fill={SOIL} />
      <ellipse cx={935} cy={165} rx={42} ry={38} fill={FOREST_DK} opacity={0.7} />

      {/* ── SOUTH FOREST (between Portal and Zone 1) ── */}
      <path d="M 540,830 C 660,805 790,820 815,900 C 835,975 790,1060 700,1085 C 600,1108 520,1060 510,975 C 505,915 510,860 540,830 Z" fill={FOREST} opacity={0.96} />

      {/* ── NW + central PARKING (grey) ── */}
      <rect x={165} y={55} width={170} height={185} rx={12} fill={PARKING} />
      <rect x={415} y={205} width={110} height={120} rx={12} fill={PARKING} />
      <rect x={770} y={1095} width={185} height={165} rx={14} fill={PARKING} />

      {/* ── CAR + PEDESTRIAN CAMPING (olive areas) ── */}
      <path d="M 200,250 C 300,235 395,250 405,320 C 412,375 380,420 320,432 C 250,442 195,420 185,360 C 180,318 188,278 200,250 Z" fill={CAMP_CAR} />
      <path d="M 175,600 C 265,585 345,600 352,675 C 358,742 322,795 252,805 C 192,812 158,775 152,710 C 150,665 160,632 175,600 Z" fill={CAMP_PED} />

      {/* ── TIPI CAMPS (green areas) ── */}
      <rect x={330} y={400} width={150} height={115} rx={20} fill={TIPI} />
      <rect x={560} y={340} width={150} height={120} rx={20} fill={TIPI} />
      {/* reception nub on Main Tipi Camp */}
      <rect x={355} y={485} width={46} height={22} rx={6} fill="#46603a" />

      {/* ── LAKE (Kék-tó): main basin (SE of the hub) + smaller SW pool ── */}
      <path d="M 505,690 C 600,668 685,688 700,748 C 712,805 668,838 582,846 C 502,852 470,812 468,752 C 467,720 480,702 505,690 Z" fill={LAKE} />
      <path d="M 505,690 C 600,668 685,688 700,748 C 712,805 668,838 582,846 C 502,852 470,812 468,752 C 467,720 480,702 505,690 Z" fill="none" stroke={LAKE_EDGE} strokeWidth={4} />
      <ellipse cx={392} cy={862} rx={72} ry={46} fill={LAKE} transform="rotate(-14 392 862)" />
      <ellipse cx={392} cy={862} rx={72} ry={46} fill="none" stroke={LAKE_EDGE} strokeWidth={3.5} transform="rotate(-14 392 862)" />

      {/* ── ROADS (red) ── */}
      {/* car entrance (S) → up the east flank → loop into the centre → north */}
      <path
        d="M 800,1255 C 760,1130 720,1020 660,900 C 610,800 560,710 520,620 C 470,510 420,360 408,235"
        fill="none"
        stroke={ROAD}
        strokeWidth={13}
        strokeLinecap="round"
        opacity={0.92}
      />
      {/* eastern branch hugging Zone 1 / Zone 2 */}
      <path
        d="M 660,900 C 800,860 930,800 960,690 C 985,560 950,420 905,320"
        fill="none"
        stroke={ROAD}
        strokeWidth={11}
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* northern spur to the parking / Field / Bowl */}
      <path d="M 408,235 C 360,180 300,150 235,150" fill="none" stroke={ROAD} strokeWidth={10} strokeLinecap="round" opacity={0.8} />

      {/* ── PEDESTRIAN PATHS (dashed) ── */}
      <path
        d="M 150,895 C 270,800 360,720 440,650"
        fill="none"
        stroke={PATH}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="3 14"
        opacity={0.6}
      />
      <path
        d="M 440,650 C 520,610 600,600 700,580"
        fill="none"
        stroke={PATH}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeDasharray="3 14"
        opacity={0.5}
      />

      {/* ── AREA LABELS ── */}
      <text x={150} y={430} {...areaLabel} opacity={0.32} fontSize={28} letterSpacing={5} transform="rotate(-62 150 430)">
        WEST FOREST
      </text>
      <text x={250} y={350} {...areaLabel} opacity={0.6} fontSize={13} textAnchor="middle">CAR CAMPING</text>
      <text x={252} y={708} {...areaLabel} opacity={0.6} fontSize={13} textAnchor="middle">CAMPING</text>
      <text x={250} y={150} {...areaLabel} opacity={0.55} fontSize={13} textAnchor="middle" fill="#1a1208">PARKOLÓ</text>
      <text x={470} y={268} {...areaLabel} opacity={0.55} fontSize={12} textAnchor="middle" fill="#1a1208">PARKOLÓ</text>
      <text x={862} y={1182} {...areaLabel} opacity={0.55} fontSize={12} textAnchor="middle" fill="#1a1208">PARKOLÓ</text>
      <text x={405} y={462} {...areaLabel} opacity={0.85} fontSize={12} textAnchor="middle">MAIN TIPI CAMP</text>
      <text x={635} y={405} {...areaLabel} opacity={0.85} fontSize={12} textAnchor="middle">FOREST TIPI CAMP</text>
      <text x={855} y={450} {...areaLabel} opacity={0.42} fontSize={26} letterSpacing={4} textAnchor="middle">ZONE 2</text>
      <text x={800} y={1130} {...areaLabel} opacity={0.42} fontSize={26} letterSpacing={4} textAnchor="middle">ZONE 1</text>
      <text x={930} y={170} {...areaLabel} opacity={0.4} fontSize={14} letterSpacing={2} textAnchor="middle">ZONE 3</text>
      <text x={660} y={965} {...areaLabel} opacity={0.4} fontSize={15} letterSpacing={3} textAnchor="middle" transform="rotate(-12 660 965)">SOUTH FOREST</text>
      <text x={586} y={772} fill="#dff0f5" opacity={0.6} fontSize={18} fontStyle="italic" textAnchor="middle">Kék-tó</text>
    </g>
  );
}
