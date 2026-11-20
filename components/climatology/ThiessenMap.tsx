// components/climatology/ThiessenMap.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Maximize2,
  Minimize2,
  Layers,
  MapPin,
  Compass,
  Check,
  X,
  Droplets,
  Info,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ThiessenAnalysisResult,
  ThiessenStationInput,
} from "@/lib/climatology/thiessenPolygon";

// Fix default leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom station circle icons
function createStationIcon(isActive: boolean, weightPercent: number = 0) {
  const bg = isActive ? "#2563eb" : "#94a3b8";
  const border = isActive ? "#ffffff" : "#475569";
  const size = isActive ? Math.max(22, Math.min(32, 20 + weightPercent * 0.8)) : 18;

  return L.divIcon({
    className: "custom-thiessen-station-icon",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${bg};
        border: 2px solid ${border};
        border-radius: 9999px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
      ">
        ${isActive ? "▲" : "✕"}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Controller component to handle map invalidation on viewport & fullscreen changes
function MapResizer({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();

  useEffect(() => {
    const trigger = () => map.invalidateSize({ pan: false });
    trigger();
    const t1 = setTimeout(trigger, 80);
    const t2 = setTimeout(trigger, 200);
    const t3 = setTimeout(trigger, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isFullscreen, map]);

  return null;
}

interface ThiessenMapProps {
  thiessenData: ThiessenAnalysisResult;
  stations: ThiessenStationInput[];
  onToggleStation: (stationId: string) => void;
  selectedStationId?: string;
  onSelectStation?: (stationId: string) => void;
}

export function ThiessenMap({
  thiessenData,
  stations,
  onToggleStation,
  selectedStationId,
  onSelectStation,
}: ThiessenMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [baseLayer, setBaseLayer] = useState<"streets" | "satellite" | "dark">("streets");
  const [showRivers, setShowRivers] = useState<boolean>(true);
  const [showBoundaries, setShowBoundaries] = useState<boolean>(true);
  const [riverGeoJson, setRiverGeoJson] = useState<any>(null);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<any>(null);

  // Fetch layer GeoJSON (sungai & batas kecamatan)
  useEffect(() => {
    fetch("/data/geo/sungai_kebumen.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setRiverGeoJson(data);
      })
      .catch((err) => console.warn("Sungai GeoJSON fetch warning:", err));

    fetch("/data/kebumen/kebumen_kecamatan.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBoundaryGeoJson(data);
      })
      .catch((err) => console.warn("Kecamatan GeoJSON fetch warning:", err));
  }, []);

  // Fullscreen toggle handler (Dual-Layer: CSS + Native Browser API)
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Tile layers definition
  const tileUrls = {
    streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  };

  const stationMapLookup = useMemo(() => {
    const map: Record<string, { weightPercent: number; active: boolean; rainfall: number }> = {};
    for (const cell of thiessenData.cells) {
      map[cell.stationId] = {
        weightPercent: cell.weightPercent,
        active: true,
        rainfall: cell.rainfall,
      };
    }
    return map;
  }, [thiessenData]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-md ${
        isFullscreen
          ? "fixed inset-0 z-[9999] w-screen h-screen rounded-none border-none bg-slate-950"
          : "w-full h-[520px] lg:h-[580px] bg-slate-100 dark:bg-slate-900"
      }`}
    >
      <MapContainer
        center={[-7.685, 109.655]}
        zoom={11}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
        className="z-0"
      >
        <MapResizer isFullscreen={isFullscreen} />

        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          url={tileUrls[baseLayer]}
        />

        {/* 1. Layer Batas Administrasi Kecamatan Kebumen */}
        {showBoundaries && boundaryGeoJson && (
          <GeoJSON
            key={`boundary-${baseLayer}`}
            data={boundaryGeoJson}
            style={() => ({
              color: baseLayer === "satellite" ? "#f8fafc" : "#94a3b8",
              weight: 1.2,
              fillColor: "transparent",
              fillOpacity: 0,
              dashArray: "3, 4",
            })}
          />
        )}

        {/* 2. Layer Overlay Poligon Thiessen */}
        {thiessenData.geoJson && (
          <GeoJSON
            key={`thiessen-${thiessenData.activeStationsCount}-${thiessenData.cells.map((c) => c.stationId).join("-")}`}
            data={thiessenData.geoJson as any}
            style={(feature: any) => {
              const p = feature?.properties;
              const isSelected = selectedStationId === p?.stationId;
              return {
                fillColor: p?.fillColor || "#3b82f6",
                fillOpacity: isSelected ? 0.45 : 0.25,
                color: isSelected ? "#1d4ed8" : "#2563eb",
                weight: isSelected ? 3 : 1.8,
                dashArray: isSelected ? undefined : "4, 4",
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const p = feature?.properties;
              if (!p) return;

              const tooltipHtml = `
                <div class="p-1 text-xs font-sans">
                  <div class="font-bold text-slate-800">${p.stationName}</div>
                  <div class="text-[11px] text-slate-600 mt-0.5">
                    Bobot Thiessen: <span class="font-bold text-blue-600">${p.weightPercentStr}</span> (${p.areaKm2} km²)
                  </div>
                  <div class="text-[11px] text-slate-600">
                    Curah Hujan Riil: <span class="font-bold text-emerald-600">${p.rainfall} mm</span>
                  </div>
                  <div class="text-[10px] text-slate-500 mt-0.5">
                    Kontribusi Areal: ${p.weightedRainfall} mm
                  </div>
                </div>
              `;
              layer.bindTooltip(tooltipHtml, { sticky: true });

              layer.on("click", () => {
                if (onSelectStation) {
                  onSelectStation(p.stationId);
                }
              });
            }}
          />
        )}

        {/* 3. Layer Aliran Sungai & Waduk Kebumen */}
        {showRivers && riverGeoJson && (
          <GeoJSON
            key="sungai-kebumen-layer"
            data={riverGeoJson}
            style={(feature) => {
              const pType = feature?.properties?.type;
              if (pType === "waterbody") {
                return {
                  fillColor: "#0284c7",
                  fillOpacity: 0.5,
                  color: "#0369a1",
                  weight: 1.5,
                };
              }
              if (pType === "main") {
                return {
                  color: "#0284c7",
                  weight: 2.5,
                  opacity: 0.85,
                };
              }
              return {
                color: "#38bdf8",
                weight: 1.2,
                opacity: 0.65,
                dashArray: "3, 3",
              };
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties;
              if (!p) return;
              const name = p.name || "Alur Sungai";
              const das = p.das || "Kabupaten Kebumen";
              layer.bindTooltip(
                `<div class="text-xs font-semibold text-sky-800">${name} (${das})</div>`,
                { sticky: true }
              );
            }}
          />
        )}

        {/* 4. Marker Stasiun Jaringan Kebumen */}
        {stations.map((st) => {
          const lookup = stationMapLookup[st.id];
          const isActive = st.active;
          const weightPct = lookup ? lookup.weightPercent : 0;
          const rain = lookup ? lookup.rainfall : st.rainfall;

          return (
            <Marker
              key={st.id}
              position={[st.lat, st.lng]}
              icon={createStationIcon(isActive, weightPct)}
            >
              <Popup className="custom-thiessen-popup">
                <div className="p-2 min-w-[220px] text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between gap-2 border-b pb-1 mb-1.5">
                    <span className="truncate">{st.name}</span>
                    <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] h-4">
                      {isActive ? "Aktif" : "Non-aktif"}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <div className="flex justify-between">
                      <span>Curah Hujan (R):</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {rain} mm
                      </span>
                    </div>
                    {isActive && (
                      <>
                        <div className="flex justify-between">
                          <span>Bobot Thiessen (w):</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {weightPct}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kontribusi (w·R):</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {(weightPct * 0.01 * rain).toFixed(2)} mm
                          </span>
                        </div>
                      </>
                    )}
                    <div className="text-[10px] text-slate-400 pt-1">
                      {st.lat.toFixed(4)}° S, {st.lng.toFixed(4)}° E
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t flex gap-1.5">
                    <Button
                      size="sm"
                      variant={isActive ? "destructive" : "default"}
                      className="w-full text-[11px] h-7"
                      onClick={() => onToggleStation(st.id)}
                    >
                      {isActive ? "Keluarkan dari Poligon" : "Sertakan di Poligon"}
                    </Button>
                    {onSelectStation && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] h-7 px-2"
                        onClick={() => onSelectStation(st.id)}
                      >
                        Analisis
                      </Button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating HUD: Kontrol Peta & Filter Layers (Backdrop Blur Ergonomics) */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2 max-w-[280px]">
        {/* Ringkasan Curah Hujan Wilayah Floating Badge */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Curah Hujan Wilayah (R_areal)</span>
            <Badge variant="outline" className="text-[9px] h-4 text-blue-600 border-blue-200">
              {thiessenData.activeStationsCount} Stasiun
            </Badge>
          </div>
          <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 flex items-baseline gap-1 mt-0.5">
            {thiessenData.arealRainfall}
            <span className="text-xs font-normal text-slate-500">mm (tertimbang)</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
            <span>Rerata Aritmatika:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {thiessenData.unweightedMeanRainfall} mm
            </span>
          </div>
        </div>

        {/* Layer Controls HUD */}
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-md text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
              <Waves className="h-3.5 w-3.5 text-sky-500" />
              Alur Sungai & Waduk
            </span>
            <Switch
              checked={showRivers}
              onCheckedChange={setShowRivers}
              className="scale-75 origin-right"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              Batas Kecamatan
            </span>
            <Switch
              checked={showBoundaries}
              onCheckedChange={setShowBoundaries}
              className="scale-75 origin-right"
            />
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex gap-1">
            <button
              onClick={() => setBaseLayer("streets")}
              className={`flex-1 py-1 text-[10px] rounded font-medium transition-colors ${
                baseLayer === "streets"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Jalan
            </button>
            <button
              onClick={() => setBaseLayer("satellite")}
              className={`flex-1 py-1 text-[10px] rounded font-medium transition-colors ${
                baseLayer === "satellite"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Satelit
            </button>
            <button
              onClick={() => setBaseLayer("dark")}
              className={`flex-1 py-1 text-[10px] rounded font-medium transition-colors ${
                baseLayer === "dark"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Gelap
            </button>
          </div>
        </div>
      </div>

      {/* Floating HUD Kanan Atas: Tombol Fullscreen */}
      <div className="absolute top-3 right-3 z-[400] flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={toggleFullscreen}
          className="h-9 px-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-md text-xs font-semibold flex items-center gap-1.5 hover:bg-white dark:hover:bg-slate-800"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5 text-amber-500" />
              Keluar Layar Penuh (Esc)
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5 text-blue-500" />
              Layar Penuh
            </>
          )}
        </Button>
      </div>

      {/* Floating Legend Bawah Kanan */}
      <div className="absolute bottom-3 right-3 z-[400] hidden sm:block">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-md text-[10px] space-y-1">
          <div className="font-bold text-slate-700 dark:text-slate-300">Legenda Poligon Thiessen</div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
            <span>Stasiun Aktif ({thiessenData.activeStationsCount})</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
            <span>Stasiun Non-aktif ({stations.length - thiessenData.activeStationsCount})</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span className="w-3 h-0.5 bg-sky-500 inline-block"></span>
            <span>Alur Sungai Luk Ulo & Kemit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
