"use client";

import React, { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import type {
  AdminLevel,
  BasemapId,
  HujanRecord,
  KemarauRecord,
  UnifiedLayerDef,
} from "@/lib/seasonalPredictionTypes";

interface SeasonalLeafletCanvasProps {
  geojson: GeoJSON.FeatureCollection;
  records: (HujanRecord | KemarauRecord)[];
  adminLevel: AdminLevel;
  activeLayer: UnifiedLayerDef | null;
  basemap: BasemapId;
  opacity: number;
  selectedCode: string | null;
  onSelectCode: (code: string | null) => void;
  kabupatenName?: string;
  isDarkMode?: boolean;
  showRivers?: boolean;
}

const BASEMAP_CONFIGS: Record<
  BasemapId,
  {
    url: string;
    attribution: string;
    maxZoom: number;
  }
> = {
  jalan: {
    url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
  },
  satelit: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri World Imagery",
    maxZoom: 18,
  },
  topografi: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap (CC-BY-SA)",
    maxZoom: 17,
  },
};

export default function SeasonalLeafletCanvas({
  geojson,
  records,
  adminLevel,
  activeLayer,
  basemap,
  opacity,
  selectedCode,
  onSelectCode,
  kabupatenName = "Kabupaten Kebumen",
  showRivers = true,
}: SeasonalLeafletCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const riverLayerRef = useRef<L.GeoJSON | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const prevGeojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const onSelectRef = useRef(onSelectCode);

  onSelectRef.current = onSelectCode;

  const activeField =
    adminLevel === "desa" && activeLayer?.desaField ? activeLayer.desaField : activeLayer?.field;

  const recordMap = useMemo(() => {
    const map = new Map<string, HujanRecord | KemarauRecord>();
    for (const r of records) {
      const key = r.code || r.kecamatan;
      map.set(key, r);
    }
    return map;
  }, [records]);

  const legendItems = useMemo(() => {
    if (!activeLayer || !activeField || !activeLayer.colorMap) {
      return [];
    }
    const colorMap = activeLayer.colorMap;
    const orderList = activeLayer.order || [];
    const present = Array.from(
      new Set(
        records
          .map((r) => String((r as unknown as Record<string, unknown>)[activeField] ?? ""))
          .filter((v) => v && v !== "-" && v !== "null" && v !== "undefined")
      )
    );

    const getRank = (cat: string): number => {
      const exactIdx = orderList.indexOf(cat);
      if (exactIdx !== -1) return exactIdx;
      const base = cat.split(" ")[0];
      const baseIdx = orderList.indexOf(base);
      if (baseIdx !== -1) return baseIdx;
      const prefixIdx = orderList.findIndex((o) => o.startsWith(base) || base.startsWith(o));
      if (prefixIdx !== -1) return prefixIdx;
      return 999;
    };

    const sorted = [...present].sort((a, b) => {
      const rankA = getRank(a);
      const rankB = getRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b, "id", { numeric: true });
    });

    return sorted.map((cat) => ({
      label: cat,
      color: colorMap[cat] || colorMap[cat.split(" ")[0]] || "#94a3b8",
    }));
  }, [records, activeLayer, activeField]);

  // Inisialisasi peta Leaflet satu kali dengan kontrol zoom di kanan atas (gaya CEWS)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-7.66, 109.63],
      zoom: 11,
      minZoom: 9,
      maxZoom: 16,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    const initialGeo = L.geoJSON(geojson);
    const bounds = initialGeo.getBounds();
    if (bounds.isValid()) {
      boundsRef.current = bounds;
      map.fitBounds(bounds, { padding: [32, 32] });
    }

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      geoLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Perbarui Basemap Tile
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const cfg = BASEMAP_CONFIGS[basemap];
    const tile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tile;
  }, [basemap]);

  // Perbarui Poligon Wilayah (Kecamatan atau Desa/Kelurahan)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    const isDarkBasemap = basemap === "satelit";
    const defaultBorderColor = isDarkBasemap ? "#e2e8f0" : "#1e293b";
    const defaultWeight = adminLevel === "desa" ? 0.65 : 1.25;
    const isPolygonFill = Boolean(activeLayer && activeField);

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const props = (feature?.properties || {}) as Record<string, unknown>;
        const code = String(props.code || props.nm_kecamatan || props.name || "");
        const rec = recordMap.get(code);
        const catVal =
          isPolygonFill && rec && activeField
            ? String((rec as unknown as Record<string, unknown>)[activeField] ?? "")
            : "";
        const fillColor =
          isPolygonFill && activeLayer?.colorMap
            ? activeLayer.colorMap[catVal] || activeLayer.colorMap[catVal.split(" ")[0]] || "#94a3b8"
            : "transparent";
        const isSelected = code === selectedCode;

        return {
          fillColor,
          fillOpacity: isPolygonFill ? opacity : 0.05,
          color: isSelected ? "#0284c7" : defaultBorderColor,
          weight: isSelected ? 2.8 : defaultWeight,
          opacity: isSelected ? 1 : adminLevel === "desa" ? 0.72 : 0.85,
        };
      },
      onEachFeature: (feature, featureLayer) => {
        const props = (feature?.properties || {}) as Record<string, unknown>;
        const code = String(props.code || props.nm_kecamatan || props.name || "");
        const name = String(props.name || props.nm_kelurahan || props.nm_kecamatan || "");
        const parentKec = String(props.nm_kecamatan || "");
        const rec = recordMap.get(code);

        const titleHtml =
          adminLevel === "desa"
            ? `<div style="font-weight:700;color:#0f172a;">Desa/Kel. ${name}</div><div style="font-size:11px;font-weight:600;color:#334155;">Kec. ${rec?.kecamatan || parentKec}</div>`
            : `<div style="font-weight:700;color:#0f172a;">Kec. ${name}</div>`;

        let tooltipLine = "Klik untuk detail";
        if (rec && activeLayer && activeField) {
          const val = String((rec as unknown as Record<string, unknown>)[activeField] ?? "-");
          tooltipLine = `${activeLayer.label}: <strong style="color:#0f172a;">${val}</strong>`;
        }

        featureLayer.bindTooltip(
          `<div style="font-family:inherit;font-size:12px;line-height:1.4;color:#1e293b;padding:2px 4px;">
            ${titleHtml}
            <div style="margin-top:3px;color:#334155;">${tooltipLine}</div>
          </div>`,
          { sticky: true, direction: "auto", opacity: 0.98 }
        );

        featureLayer.on({
          mouseover: (e) => {
            const target = e.target as L.Path;
            target.setStyle({
              weight: adminLevel === "desa" ? 2.2 : 2.8,
              color: "#0ea5e9",
              fillOpacity: isPolygonFill ? Math.min(opacity + 0.12, 1) : 0.14,
            });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              target.bringToFront();
            }
          },
          mouseout: (e) => {
            layer.resetStyle(e.target);
          },
          click: () => {
            if (code) onSelectRef.current(code);
          },
        });
      },
    }).addTo(map);

    geoLayerRef.current = layer;
    const b = layer.getBounds();
    if (b.isValid()) {
      boundsRef.current = b;
      if (prevGeojsonRef.current !== geojson) {
        prevGeojsonRef.current = geojson;
        map.fitBounds(b, { padding: [32, 32] });
      }
    }
  }, [geojson, recordMap, adminLevel, activeLayer, activeField, basemap, opacity, selectedCode]);

  // Perbarui Overlay Jaringan Sungai Kebumen
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (riverLayerRef.current) {
      map.removeLayer(riverLayerRef.current);
      riverLayerRef.current = null;
    }

    if (showRivers && (kabupatenName || "").toLowerCase().includes("kebumen")) {
      fetch("/data/geo/sungai_kebumen.geojson")
        .then((res) => {
          if (!res.ok) throw new Error("Gagal mengambil data sungai");
          return res.json();
        })
        .then((rData) => {
          if (!mapRef.current) return;
          const rLayer = L.geoJSON(rData, {
            style: (feature) => {
              const pType = feature?.properties?.type;
              if (pType === "waterbody") {
                return {
                  color: "#0284c7",
                  fillColor: "#38bdf8",
                  fillOpacity: 0.35,
                  weight: 1.5,
                  opacity: 0.9,
                };
              }
              const isMain = pType === "main";
              return {
                color: isMain ? "#0284c7" : "#38bdf8",
                weight: isMain ? 3.0 : 1.5,
                opacity: isMain ? 0.92 : 0.65,
                lineCap: "round",
                lineJoin: "round",
              };
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              layer.bindTooltip(
                `<div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 2px 4px; line-height: 1.35;">
                  <div style="font-weight: 800; color: #0369a1;">${p.name || "Alur Sungai"}</div>
                  <div style="font-size: 10px; color: #64748b;">DAS: ${p.das || "Kabupaten Kebumen"}</div>
                  ${p.dis_m3s ? `<div style="font-size: 9.5px; color: #0284c7; font-weight: 600;">Debit: ${p.dis_m3s} m³/s</div>` : ""}
                </div>`,
                { sticky: true, direction: "top", offset: [0, -4] }
              );
            },
          });
          rLayer.addTo(mapRef.current);
          riverLayerRef.current = rLayer;
        })
        .catch((err) => console.warn("River overlay error:", err));
    }
  }, [showRivers, kabupatenName]);

  const handleResetView = () => {
    if (mapRef.current && boundsRef.current) {
      mapRef.current.fitBounds(boundsRef.current, { padding: [32, 32] });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Tombol Reset Posisi tepat di bawah Zoom (+/-) kanan atas */}
      <button
        type="button"
        onClick={handleResetView}
        title={`Fokus ke ${kabupatenName}`}
        aria-label={`Fokus ke ${kabupatenName}`}
        className="absolute top-[78px] right-[10px] z-[500] w-[34px] h-[34px] flex items-center justify-center rounded bg-white dark:bg-gray-900 border-2 border-black/20 dark:border-gray-600 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <LocateFixed className="h-4 w-4 text-gray-700 dark:text-gray-200" />
      </button>

      {/* Legenda Gaya CEWS di Pojok Kanan Bawah */}
      {activeLayer && legendItems.length > 0 && (
        <div className="absolute bottom-6 right-3 z-[500] min-w-[170px] max-w-[245px] rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 shadow-xl p-3 text-xs">
          <div className="space-y-2">
            <p className="font-bold text-xs leading-tight text-slate-900 dark:text-slate-100">
              {activeLayer.label}
            </p>
            <div className="flex flex-col gap-1.5">
              {legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-xs">
                  <span
                    className="inline-block w-6 h-4 rounded shrink-0 border border-slate-400 dark:border-slate-500 shadow-xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
