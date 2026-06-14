"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Crosshair, Tent, Trash2, X } from "lucide-react";
import { useLocations } from "@/lib/useSchedule";
import { tx } from "@/lib/format";
import { geoToSvg, inBounds } from "@/lib/mapConfig";
import type { CategoryGroup } from "@/lib/types";
import { StatusBar } from "./StatusBar";
import { MapCanvas } from "./map/MapCanvas";

const GROUP_ORDER: CategoryGroup[] = ["stage", "facility", "integration", "area"];
const TENT_KEY = "manas-tent-v1";

export function MapView() {
  const { data, loading, offline, error } = useLocations();
  const locale = useLocale();
  const t = useTranslations();

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [tent, setTent] = useState<{ x: number; y: number } | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TENT_KEY);
      if (raw) setTent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const saveTent = (p: { x: number; y: number } | null) => {
    setTent(p);
    try {
      if (p) localStorage.setItem(TENT_KEY, JSON.stringify(p));
      else localStorage.removeItem(TENT_KEY);
    } catch {
      /* ignore */
    }
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeoError(true);
      return;
    }
    setGeoError(false);
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError(true),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
  };

  const categoriesBySlug = useMemo(
    () => Object.fromEntries((data?.categories ?? []).map((c) => [c.slug, c])),
    [data],
  );

  if (loading && !data)
    return <p className="p-6 text-center text-cream-faint">{t("common.loading")}</p>;
  if (error || !data)
    return <p className="p-6 text-center text-cream-faint">{t("common.error")}</p>;

  const visibleLocations = data.locations.filter((l) => !hidden.has(l.categorySlug));
  const userInside = userPos && inBounds(userPos.lat, userPos.lng);
  const userSvg = userInside ? geoToSvg(userPos.lat, userPos.lng) : null;
  const selected = data.locations.find((l) => l.id === selectedId) ?? null;
  const selectedCat = selected ? categoriesBySlug[selected.categorySlug] : null;

  return (
    <div className="flex flex-col gap-3 px-3 pt-3">
      {offline && <StatusBar kind="offline" />}

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={locate}
          className="flex items-center gap-1.5 rounded-full border border-line bg-ink-2/70 px-3 py-1.5 text-xs font-semibold text-cream-dim hover:text-cream"
        >
          <Crosshair size={14} />
          {t("map.locate")}
        </button>
        {tent ? (
          <button
            type="button"
            onClick={() => saveTent(null)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-ink-2/70 px-3 py-1.5 text-xs font-semibold text-cream-dim hover:text-cream"
          >
            <Trash2 size={14} />
            {t("map.clearTent")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPlacing((p) => !p)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              placing ? "bg-sun text-ink" : "border border-line bg-ink-2/70 text-cream-dim hover:text-cream"
            }`}
          >
            <Tent size={14} />
            {t("map.saveTent")}
          </button>
        )}
      </div>

      {placing && (
        <p className="rounded-lg bg-sun/15 px-3 py-1.5 text-xs text-sun">
          {t("map.saveTent")} — {t("map.tent")}…
        </p>
      )}
      {geoError && (
        <p className="text-xs text-cream-faint">{t("map.noGeo")}</p>
      )}
      {userPos && !userInside && (
        <p className="text-xs text-cream-faint">{t("map.outsideArea")}</p>
      )}

      <MapCanvas
        locations={visibleLocations}
        categoriesBySlug={categoriesBySlug}
        userSvg={userSvg}
        tentSvg={tent}
        placing={placing}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onPlace={(p) => {
          saveTent(p);
          setPlacing(false);
        }}
      />

      {/* Selected location info */}
      {selected && selectedCat && (
        <div className="card flex items-center justify-between gap-3 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2.5">
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: selectedCat.color }} />
            <div>
              <p className="text-sm font-semibold text-cream">
                {selected.name ? tx(selected.name, locale) : tx(selectedCat.name, locale)}
              </p>
              <p className="text-[0.66rem] text-cream-faint">
                {tx(selectedCat.name, locale)}
                {selected.requiresRegistration && ` · ${t("map.registration")}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label="Close"
            className="text-cream-faint hover:text-cream"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Legend (tap a category to toggle) */}
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-cream-faint">
          {t("map.legend")}
        </p>
        {GROUP_ORDER.map((group) => {
          const cats = data.categories.filter((c) => c.group === group);
          if (cats.length === 0) return null;
          return (
            <section key={group}>
              <h3 className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-cream-faint/70">
                {t(`groups.${group}`)}
              </h3>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {cats.map((c) => {
                  const off = hidden.has(c.slug);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setHidden((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.slug)) next.delete(c.slug);
                          else next.add(c.slug);
                          return next;
                        })
                      }
                      className={`flex items-center gap-2 rounded-lg bg-ink-2/55 px-2.5 py-1.5 text-left text-xs transition ${
                        off ? "opacity-35" : "text-cream-dim"
                      }`}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="truncate">{tx(c.name, locale)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
