"use client";

import { useRef, useState } from "react";
import { Minus, Plus, Tent } from "lucide-react";
import { MAP_H, MAP_W } from "@/lib/mapConfig";
import type { CategoryDTO, LocationDTO } from "@/lib/types";
import { MapBaseArt } from "./MapBaseArt";
import { iconFor } from "./iconRegistry";

type View = { scale: number; tx: number; ty: number };
type Point = { x: number; y: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function MapCanvas({
  locations,
  categoriesBySlug,
  userSvg,
  tentSvg,
  placing,
  selectedId,
  onSelect,
  onPlace,
}: {
  locations: LocationDTO[];
  categoriesBySlug: Record<string, CategoryDTO>;
  userSvg: Point | null;
  tentSvg: Point | null;
  placing: boolean;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onPlace: (p: Point) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const pointers = useRef<Map<number, Point>>(new Map());
  const pan = useRef<{ x: number; y: number; moved: number } | null>(null);
  const pinchDist = useRef<number | null>(null);

  /** viewBox units per client pixel (uniform: svg keeps the viewBox aspect). */
  const kPerPx = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return r ? MAP_W / r.width : 1;
  };

  const clampView = (v: View): View => {
    const s = clamp(v.scale, 1, 6);
    return {
      scale: s,
      tx: clamp(v.tx, MAP_W - s * MAP_W, 0),
      ty: clamp(v.ty, MAP_H - s * MAP_H, 0),
    };
  };

  const clientToWorld = (cx: number, cy: number): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    const k = MAP_W / r.width;
    const vbX = (cx - r.left) * k;
    const vbY = (cy - r.top) * k;
    return { x: (vbX - view.tx) / view.scale, y: (vbY - view.ty) / view.scale };
  };

  const zoomAround = (factor: number, cx: number, cy: number) => {
    setView((v) => {
      const r = svgRef.current!.getBoundingClientRect();
      const k = MAP_W / r.width;
      const vbX = (cx - r.left) * k;
      const vbY = (cy - r.top) * k;
      const worldX = (vbX - v.tx) / v.scale;
      const worldY = (vbY - v.ty) / v.scale;
      const scale = clamp(v.scale * factor, 1, 6);
      return clampView({ scale, tx: vbX - worldX * scale, ty: vbY - worldY * scale });
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY, moved: 0 };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchDist.current != null) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAround(dist / pinchDist.current, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinchDist.current = dist;
      return;
    }

    if (pan.current && pointers.current.size === 1) {
      const k = kPerPx();
      const dx = e.clientX - pan.current.x;
      const dy = e.clientY - pan.current.y;
      pan.current.moved += Math.abs(dx) + Math.abs(dy);
      pan.current.x = e.clientX;
      pan.current.y = e.clientY;
      setView((v) => clampView({ ...v, tx: v.tx + dx * k, ty: v.ty + dy * k }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasTap = pan.current != null && pan.current.moved < 8 && pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
    if (pointers.current.size === 0) {
      if (wasTap) {
        if (placing) onPlace(clientToWorld(e.clientX, e.clientY));
        else onSelect(null);
      }
      pan.current = null;
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[520px] touch-none overflow-hidden rounded-2xl border border-line">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        style={{ width: "100%", aspectRatio: `${MAP_W} / ${MAP_H}`, display: "block", cursor: placing ? "crosshair" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => zoomAround(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY)}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          <MapBaseArt />

          {locations.map((loc) => {
            const cat = categoriesBySlug[loc.categorySlug];
            if (!cat) return null;
            const isStage = cat.group === "stage";
            const isSelected = loc.id === selectedId;
            const Icon = iconFor(cat.icon);

            if (isStage) {
              return (
                <g
                  key={loc.id}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(loc.id);
                  }}
                >
                  <circle cx={loc.x} cy={loc.y} r={11} fill={cat.color} stroke="#160c08" strokeWidth={2.5} />
                  <text
                    x={loc.x}
                    y={loc.y - 16}
                    textAnchor="middle"
                    fontSize={22}
                    fontWeight={800}
                    fill="#f4e9d8"
                    stroke="#160c08"
                    strokeWidth={4}
                    paintOrder="stroke"
                    style={{ pointerEvents: "none" }}
                  >
                    {loc.name?.en ?? ""}
                  </text>
                </g>
              );
            }

            return (
              <g
                key={loc.id}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(loc.id);
                }}
              >
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r={isSelected ? 15 : 12}
                  fill={cat.color}
                  stroke={isSelected ? "#f4e9d8" : "#160c08"}
                  strokeWidth={isSelected ? 3 : 1.8}
                />
                {loc.refCode ? (
                  <text x={loc.x} y={loc.y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff" style={{ pointerEvents: "none" }}>
                    {loc.refCode}
                  </text>
                ) : (
                  <g transform={`translate(${loc.x - 8} ${loc.y - 8})`} style={{ pointerEvents: "none" }}>
                    <Icon size={16} color="#fff" strokeWidth={2.2} />
                  </g>
                )}
              </g>
            );
          })}

          {/* tent pin */}
          {tentSvg && (
            <g transform={`translate(${tentSvg.x} ${tentSvg.y})`} style={{ pointerEvents: "none" }}>
              <circle r={16} fill="#e8a04c" stroke="#160c08" strokeWidth={2.5} />
              <g transform="translate(-9 -9)">
                <Tent size={18} color="#160c08" strokeWidth={2.4} />
              </g>
            </g>
          )}

          {/* you are here */}
          {userSvg && (
            <g style={{ pointerEvents: "none" }}>
              <circle cx={userSvg.x} cy={userSvg.y} r={26} fill="#4fb3ff" opacity={0.18}>
                <animate attributeName="r" values="18;30;18" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx={userSvg.x} cy={userSvg.y} r={9} fill="#4fb3ff" stroke="#fff" strokeWidth={3} />
            </g>
          )}
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        {[
          { Icon: Plus, f: 1.4 },
          { Icon: Minus, f: 0.71 },
        ].map(({ Icon, f }, i) => (
          <button
            key={i}
            type="button"
            aria-label={f > 1 ? "Zoom in" : "Zoom out"}
            onClick={() => {
              const r = svgRef.current?.getBoundingClientRect();
              if (r) zoomAround(f, r.left + r.width / 2, r.top + r.height / 2);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-ink/80 text-cream backdrop-blur hover:bg-ink-2"
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}
