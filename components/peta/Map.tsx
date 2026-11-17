// components/peta/Map.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  LayersControl,
  Circle,
  GeoJSON,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Layers,
  Maximize2,
  Minimize2,
  Crosshair,
  Search,
  Navigation,
  Compass,
  Sparkles,
  Info,
  Radio,
  Wind,
  Thermometer,
  CloudRain,
  CalendarDays,
  Loader2,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { StationMarkerPopup, StationData } from "./StationMarkerPopup";
import { StationDetailDrawer } from "./StationDetailDrawer";
import {
  KecamatanDetailDrawer,
  KecamatanSeasonalData,
} from "./KecamatanDetailDrawer";
import { getSeasonData } from "@/lib/SeasonalFirestoreService";

// Fix default leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Default Kebumen Center Coordinates (Regency Center / Jerukagung Klirong Corridor)
const KEBUMEN_CENTER: [number, number] = [-7.685, 109.655];
const DEFAULT_ZOOM = 12;

type MapLayerType = "streets" | "satellite" | "dark" | "terrain";
export type MapDisplayMetric = "wind" | "temperature" | "rainfall";

const MAP_LAYERS: Record<MapLayerType, { name: string; url: string; attribution: string }> = {
  streets: {
    name: "Jalan Standar",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    name: "Citra Satelit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
  dark: {
    name: "Mode Gelap",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  terrain: {
    name: "Topografi",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};

// Custom Controller for camera animations & map size invalidation
function MapCameraController({
  targetPos,
  targetZoom,
  isFullscreen,
}: {
  targetPos: [number, number] | null;
  targetZoom?: number;
  isFullscreen: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetPos) {
      map.flyTo(targetPos, targetZoom || 14, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [targetPos, targetZoom, map]);

  // Safely trigger Leaflet invalidateSize when switching fullscreen or resizing
  useEffect(() => {
    const triggerInvalidate = () => {
      map.invalidateSize({ pan: false });
    };

    triggerInvalidate();
    const t1 = setTimeout(triggerInvalidate, 80);
    const t2 = setTimeout(triggerInvalidate, 250);
    const t3 = setTimeout(triggerInvalidate, 500);

    window.addEventListener("resize", triggerInvalidate);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", triggerInvalidate);
    };
  }, [isFullscreen, map]);

  return null;
}

// Function to create sleek modern divIcon with dynamic metric badge & wind arrow
const createStationDivIcon = (
  station: StationData,
  isSelected: boolean = false,
  displayMetric: MapDisplayMetric = "wind"
) => {
  const isOnline = station.status !== "offline";

  let badgeContent = "";
  let borderColor = isSelected ? "#38bdf8" : "#6366f1";
  let bgColor = isSelected ? "#1e1b4b" : "#0f172a";
  let iconWidth = 64;
  const iconHeight = 32;

  if (displayMetric === "wind") {
    // Mode Arah & Kecepatan Angin (Aerodinamis dengan Panah Vektor Aliran Angin)
    const speed = station.windSpeed !== undefined ? station.windSpeed.toFixed(1) : "0.0";
    const originDir = station.windDirection ?? 0;
    // Konvensi meteorologi: originDir adalah arah DARI MANA angin datang.
    // Panah visual menunjuk KE MANA angin bertiup (flow direction): (originDir + 180) % 360.
    const flowDir = (originDir + 180) % 360;

    borderColor = isSelected ? "#38bdf8" : "#06b6d4";
    bgColor = isSelected ? "#083344" : "#042f2e";
    iconWidth = 78;

    badgeContent = `
      <div style="display: flex; align-items: center; gap: 4px;" title="Angin: ${speed} km/h, Dari: ${originDir}° (bertiup ke ${flowDir}°)">
        <div style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          transform: rotate(${flowDir}deg);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          color: #38bdf8;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
        <span style="font-size: 10.5px; font-weight: 800; font-family: monospace; letter-spacing: -0.3px; color: #f8fafc;">
          ${speed}
        </span>
        <span style="font-size: 8px; color: #67e8f9; font-weight: 700; margin-left: -2px;">k/h</span>
      </div>
    `;
  } else if (displayMetric === "rainfall") {
    // Mode Curah Hujan
    const rain = station.rainfall !== undefined ? station.rainfall.toFixed(1) : "0.0";
    borderColor = isSelected ? "#34d399" : "#10b981";
    bgColor = isSelected ? "#064e3b" : "#022c22";
    iconWidth = 68;

    badgeContent = `
      <div style="display: flex; align-items: center; gap: 3px;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
          <path d="M16 14v6"></path>
          <path d="M8 14v6"></path>
          <path d="M12 16v6"></path>
        </svg>
        <span style="font-size: 10.5px; font-weight: 800; font-family: monospace; letter-spacing: -0.3px; color: #f8fafc;">
          ${rain}
        </span>
        <span style="font-size: 8px; color: #6ee7b7; font-weight: 700;">mm</span>
      </div>
    `;
  } else {
    // Mode Suhu Udara
    const tempStr = station.temp !== undefined ? `${station.temp.toFixed(1)}°` : "📍";
    borderColor = isSelected ? "#fda4af" : "#f43f5e";
    bgColor = isSelected ? "#4c0519" : "#1c1917";
    iconWidth = 62;

    badgeContent = `
      <span style="font-size: 10.5px; font-weight: 800; font-family: monospace; letter-spacing: -0.3px; color: #f8fafc;">
        ${tempStr}
      </span>
    `;
  }

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; position: relative;">
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 3px 8px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.45);
        border: 1.8px solid ${borderColor};
        background-color: ${bgColor};
        color: #ffffff;
        transform: ${isSelected ? "scale(1.18)" : "scale(1)"};
        transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
      ">
        ${badgeContent}
        <span style="
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background-color: ${isOnline ? "#10b981" : "#94a3b8"};
          display: inline-block;
          box-shadow: ${isOnline ? "0 0 5px #10b981" : "none"};
          margin-left: 2px;
        "></span>
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid ${borderColor};
        margin-top: -1px;
      "></div>
    </div>
  `;

  return L.divIcon({
    className: "custom-station-marker",
    html,
    iconSize: [iconWidth, iconHeight],
    iconAnchor: [iconWidth / 2, iconHeight],
    popupAnchor: [0, -iconHeight],
  });
};

export interface MapStats {
  avgTemp: number;
  avgHum: number;
  activeCount: number;
}

interface MapProps {
  devices: StationData[];
  isDarkMode?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  stats?: MapStats;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  initialShowSeasonal?: boolean;
}

const Map = ({
  devices = [],
  isDarkMode = false,
  isFullscreen: externalIsFullscreen,
  onToggleFullscreen,
  stats,
  searchQuery,
  onSearchChange,
  initialShowSeasonal = false,
}: MapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = externalIsFullscreen !== undefined ? externalIsFullscreen : internalFullscreen;

  const [activeLayer, setActiveLayer] = useState<MapLayerType>("streets");
  const [displayMetric, setDisplayMetric] = useState<MapDisplayMetric>("wind");
  const [targetPos, setTargetPos] = useState<[number, number] | null>(null);
  const [targetZoom, setTargetZoom] = useState<number>(DEFAULT_ZOOM);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  // Layer Overlay Tematik (Sungai, Batas Wilayah, Stasiun, Prakiraan Musim)
  const [showRivers, setShowRivers] = useState<boolean>(true);
  const [riverGeoJson, setRiverGeoJson] = useState<any>(null);
  const [showBoundaries, setShowBoundaries] = useState<boolean>(true);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<any>(null);
  const [showStations, setShowStations] = useState<boolean>(true);

  // Lapisan Prakiraan Musim & Iklim (Choropleth dari Cloud Firestore)
  const [showSeasonal, setShowSeasonal] = useState<boolean>(initialShowSeasonal);
  const [seasonalMetric, setSeasonalMetric] = useState<"amh" | "sh" | "curah">("amh");
  const [seasonalRecords, setSeasonalRecords] = useState<Record<string, KecamatanSeasonalData>>({});
  const [seasonalLoading, setSeasonalLoading] = useState<boolean>(false);
  const [selectedKecamatan, setSelectedKecamatan] = useState<KecamatanSeasonalData | null>(null);

  useEffect(() => {
    if (initialShowSeasonal !== undefined) {
      setShowSeasonal(initialShowSeasonal);
    }
  }, [initialShowSeasonal]);

  // Muat data prediksi musim dari Firestore jika lapisan diaktifkan
  useEffect(() => {
    if (showSeasonal && Object.keys(seasonalRecords).length === 0) {
      setSeasonalLoading(true);
      getSeasonData("2026_2027", "", "kebumen")
        .then((res) => {
          const recMap: Record<string, KecamatanSeasonalData> = {};
          const hujanList = res.kecDataset?.hujan || [];
          for (const item of hujanList) {
            const key = (item.kecamatan || "").toLowerCase().trim();
            const code = item.code || "";
            recMap[key] = item;
            if (code) recMap[code] = item;
          }
          setSeasonalRecords(recMap);
        })
        .catch((err) => console.warn("Gagal memuat data musiman:", err))
        .finally(() => setSeasonalLoading(false));
    }
  }, [showSeasonal, seasonalRecords]);

  // Kalkulasi Pewarnaan Poligon Berdasarkan Metrik Musim Terpilih
  const getSeasonalColor = (record?: KecamatanSeasonalData) => {
    if (!record) return "#94a3b8";
    if (seasonalMetric === "amh") {
      const status = (record.perbandingan_amh_thd_normal || "").toLowerCase();
      if (status.includes("maju")) return "#2563eb"; // Biru
      if (status.includes("mundur")) return "#ea580c"; // Oranye
      return "#16a34a"; // Hijau (Sama)
    }
    if (seasonalMetric === "sh") {
      const sh = (record.sifat_hujan || "").toLowerCase();
      if (sh.includes("atas")) return "#0891b2"; // Cyan
      if (sh.includes("bawah")) return "#ef4444"; // Merah
      return "#22c55e"; // Hijau (Normal)
    }
    if (seasonalMetric === "curah") {
      const ch = record.prakiraan_curah_hujan_total || 0;
      if (ch >= 3000) return "#1e1b4b";
      if (ch >= 2500) return "#1d4ed8";
      if (ch >= 2000) return "#0284c7";
      if (ch >= 1500) return "#059669";
      return "#d97706";
    }
    return "#94a3b8";
  };

  useEffect(() => {
    // 1. Fetch Jaringan Sungai & Hidrologi DAS
    fetch("/data/geo/sungai_kebumen.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data jaringan sungai");
        return res.json();
      })
      .then((data) => setRiverGeoJson(data))
      .catch((err) => console.warn("Informasi layer sungai:", err));

    // 2. Fetch Batas Administrasi Kecamatan
    fetch("/data/kebumen/kebumen_kecamatan.json")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data batas kecamatan");
        return res.json();
      })
      .then((data) => setBoundaryGeoJson(data))
      .catch((err) => console.warn("Informasi batas wilayah:", err));
  }, []);

  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalFullscreen((prev) => !prev);
    }
  };

  // Lock body scroll when fullscreen is active
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // Support Escape key to exit fullscreen smoothly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (onToggleFullscreen) {
          onToggleFullscreen();
        } else {
          setInternalFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  // Focus to Kebumen
  const handleFocusKebumen = () => {
    setTargetPos(KEBUMEN_CENTER);
    setTargetZoom(DEFAULT_ZOOM);
  };

  // Fit all devices in bounds
  const handleFitAll = () => {
    if (devices.length === 0) {
      handleFocusKebumen();
      return;
    }
    const lats = devices.map((d) => d.lat);
    const lngs = devices.map((d) => d.lng);
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    setTargetPos([avgLat, avgLng]);
    setTargetZoom(11);
  };

  const currentLayerConfig = MAP_LAYERS[activeLayer];

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] w-screen h-screen bg-slate-950 overflow-hidden flex flex-col font-sans"
          : "relative h-full w-full overflow-hidden rounded-2xl"
      }
    >
      {/* Global CSS for Leaflet Popup Modernization */}
      <style jsx global>{`
        .custom-station-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          padding: 12px 14px !important;
          border-radius: 20px !important;
          box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.25), 0 0 1px 1px rgba(0, 0, 0, 0.05) !important;
          background: #ffffff !important;
        }
        .dark .leaflet-popup-content-wrapper {
          background: #0f172a !important;
          border: 1px solid #334155 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.4 !important;
        }
        .leaflet-popup-tip {
          background: #ffffff !important;
        }
        .dark .leaflet-popup-tip {
          background: #0f172a !important;
        }
        .leaflet-container {
          font-family: inherit !important;
          z-index: 10 !important;
        }
      `}</style>

      {/* Floating Display Mode Switcher (Top Left) */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center p-1 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800 gap-1">
        {isFullscreen && (
          <div className="hidden lg:flex items-center gap-2 pl-2 pr-3 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            <span>Sistem Informasi Geografis</span>
          </div>
        )}

        <button
          onClick={() => setDisplayMetric("wind")}
          title="Tampilkan Arah dan Kecepatan Angin"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            displayMetric === "wind"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Wind className="h-3.5 w-3.5" />
          <span>Arah & Angin</span>
        </button>

        <button
          onClick={() => setDisplayMetric("temperature")}
          title="Tampilkan Suhu Udara"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            displayMetric === "temperature"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Thermometer className="h-3.5 w-3.5" />
          <span>Suhu</span>
        </button>

        <button
          onClick={() => setDisplayMetric("rainfall")}
          title="Tampilkan Curah Hujan"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            displayMetric === "rainfall"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CloudRain className="h-3.5 w-3.5" />
          <span> Curah Hujan</span>
        </button>
      </div>

      {/* Floating Control Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {/* Quick Search in Fullscreen */}
          {isFullscreen && onSearchChange && (
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari stasiun/wilayah..."
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-800 shadow-xl w-48 focus:outline-hidden focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400 h-9"
              />
            </div>
          )}

          {/* Layer Switcher Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer h-9"
            >
              <Layers className="h-4 w-4 text-indigo-500" />
              <span className="hidden sm:inline">Peta: {currentLayerConfig.name}</span>
            </button>

            {showLayerMenu && (
              <div className="absolute top-11 right-0 w-64 sm:w-72 p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in zoom-in-95 duration-150 z-[1100]">
                {/* 1. LAPISAN INFORMASI (DATA & TEMATIK) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 pb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Lapisan Informasi</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLayerMenu(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Toggle Stasiun & Node Sensor Cuaca */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Stasiun &amp; Sensor ({devices.length})</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Node sensor telemetri riil</p>
                    </div>
                    <Switch
                      checked={showStations}
                      onCheckedChange={setShowStations}
                      className="scale-90 data-[state=checked]:bg-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Toggle Prakiraan Musim (Iklim) */}
                  <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                          <span>Prakiraan Musim</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Choropleth iklim 26 kecamatan</p>
                      </div>
                      <Switch
                        checked={showSeasonal}
                        onCheckedChange={setShowSeasonal}
                        className="scale-90 data-[state=checked]:bg-sky-600 cursor-pointer"
                      />
                    </div>

                    {/* Sub-selector indikator saat lapisan musim aktif */}
                    {showSeasonal && (
                      <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          Metrik Prakiraan Musim:
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => setSeasonalMetric("amh")}
                            className={`py-1 px-1 text-[10px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                              seasonalMetric === "amh"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                            }`}
                          >
                            Awal MH
                          </button>
                          <button
                            type="button"
                            onClick={() => setSeasonalMetric("sh")}
                            className={`py-1 px-1 text-[10px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                              seasonalMetric === "sh"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                            }`}
                          >
                            Sifat Hujan
                          </button>
                          <button
                            type="button"
                            onClick={() => setSeasonalMetric("curah")}
                            className={`py-1 px-1 text-[10px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                              seasonalMetric === "curah"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                            }`}
                          >
                            Curah Hujan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toggle Aliran Sungai & Waduk */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Aliran Sungai &amp; Waduk
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">DAS Luk Ulo, Kemit, Sempor</p>
                    </div>
                    <Switch
                      checked={showRivers}
                      onCheckedChange={setShowRivers}
                      className="scale-90 data-[state=checked]:bg-sky-600 cursor-pointer"
                    />
                  </div>

                  {/* Toggle Batas Administrasi Kecamatan */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Batas Kecamatan
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Batas wilayah administrasi</p>
                    </div>
                    <Switch
                      checked={showBoundaries}
                      onCheckedChange={setShowBoundaries}
                      className="scale-90 data-[state=checked]:bg-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. PETA DASAR (BASEMAP) - DIPISAH TEGAS DI BAWAH SESUAI STANDAR DASHBOARD JERUKAGUNG */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                    Peta Dasar (Basemap)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((layerKey) => {
                      const l = MAP_LAYERS[layerKey];
                      const isSelected = activeLayer === layerKey;
                      return (
                        <button
                          key={layerKey}
                          onClick={() => setActiveLayer(layerKey)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer ${
                            isSelected
                              ? "bg-blue-700 border-blue-700 text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          {l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location & Fullscreen Actions Group */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800 h-9">
            {/* Fokus Kebumen */}
            <button
              onClick={handleFocusKebumen}
              title="Fokus ke Wilayah Kebumen"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              <span className="hidden sm:inline">Kebumen</span>
            </button>

            {/* Fit Semua Stasiun */}
            <button
              onClick={handleFitAll}
              title="Bidikan Semua Titik Stasiun"
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Crosshair className="h-3.5 w-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Keluar Layar Penuh (Esc)" : "Tampilan Layar Penuh"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isFullscreen
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? "Keluar" : "Layar Penuh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Network Indicator Pill (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[1000] px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800 text-xs flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
            Sistem Informasi Geografis
          </span>
          <span className="text-[10px] text-slate-400 block -mt-0.5">
            {showStations ? `${devices.length} Stasiun` : "Stasiun Nonaktif"}
            {showRivers ? " • Sungai/DAS" : ""}
            {showBoundaries ? " • Batas Wilayah" : ""}
            {showSeasonal ? ` • Musim (${seasonalMetric.toUpperCase()})` : ""}
          </span>
        </div>
      </div>

      {/* Floating Seasonal Legend Badge */}
      {showSeasonal && (
        <div className="absolute bottom-4 right-4 z-[1000] p-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-sky-500" />
              <span>
                {seasonalMetric === "amh"
                  ? "Awal Musim Hujan 2026/27"
                  : seasonalMetric === "sh"
                  ? "Sifat Hujan 2026/27"
                  : "Akumulasi Hujan Total"}
              </span>
            </span>
            {seasonalLoading && <Loader2 className="h-3 w-3 animate-spin text-sky-500" />}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold">
            {seasonalMetric === "amh" && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span>
                  <span>Maju</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>
                  <span>Sama</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-600"></span>
                  <span>Mundur</span>
                </span>
              </>
            )}
            {seasonalMetric === "sh" && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-600"></span>
                  <span>Atas Normal</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>
                  <span>Normal</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-600"></span>
                  <span>Bawah Normal</span>
                </span>
              </>
            )}
            {seasonalMetric === "curah" && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1e1b4b]"></span>
                  <span>&gt;3000</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-700"></span>
                  <span>2500-3000</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-600"></span>
                  <span>2000-2500</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-600"></span>
                  <span>&lt;2000 mm</span>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Telemetry HUD Badges (Bottom Right) */}
      {isFullscreen && stats && (
        <div className="absolute bottom-4 right-4 z-[1000] hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200/80 dark:border-slate-800 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Rerata Suhu:</span>
            <span className="font-mono font-black text-rose-600 dark:text-rose-400">{stats.avgTemp}°C</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Kelembapan:</span>
            <span className="font-mono font-black text-sky-600 dark:text-sky-400">{stats.avgHum}%</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Telemetri:</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{stats.activeCount} Online</span>
          </div>
        </div>
      )}

      {/* Leaflet Map Container */}
      <MapContainer
        center={KEBUMEN_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <MapCameraController targetPos={targetPos} targetZoom={targetZoom} isFullscreen={isFullscreen} />

        {/* Dynamic Tile Layer based on active selection */}
        <TileLayer
          attribution={currentLayerConfig.attribution}
          url={currentLayerConfig.url}
          maxZoom={19}
        />

        {/* Overlay Batas Administrasi / Prakiraan Musim Kecamatan */}
        {(showBoundaries || showSeasonal) && boundaryGeoJson && (
          <GeoJSON
            key={`batas-kecamatan-${showSeasonal ? seasonalMetric : "standard"}`}
            data={boundaryGeoJson}
            style={(feature) => {
              if (showSeasonal) {
                const p = feature?.properties || {};
                const nameKey = (p.name || p.nm_kecamatan || p.kecamatan || "").toLowerCase().trim();
                const codeKey = p.kemendagri_code || p.code || "";
                const rec = seasonalRecords[nameKey] || (codeKey ? seasonalRecords[codeKey] : undefined);
                const fillColor = getSeasonalColor(rec);
                return {
                  color: "#ffffff",
                  weight: 1.5,
                  opacity: 0.9,
                  fillColor,
                  fillOpacity: 0.65,
                };
              }
              return {
                color: isDarkMode ? "#38bdf8" : "#4f46e5",
                weight: 1.6,
                opacity: 0.65,
                fillColor: isDarkMode ? "#38bdf8" : "#6366f1",
                fillOpacity: 0.03,
                dashArray: "4 4",
              };
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties || {};
              const name = p.name || p.nm_kecamatan || p.kecamatan || "Kecamatan";
              const code = p.kemendagri_code || p.code || "";
              const nameKey = name.toLowerCase().trim();
              const rec = seasonalRecords[nameKey] || (code ? seasonalRecords[code] : undefined);

              let tooltipExtra = "";
              if (showSeasonal && rec) {
                if (seasonalMetric === "amh") {
                  tooltipExtra = `<div style="margin-top:2px;font-size:10px;color:#1e293b;">Awal MH: <strong>${rec.prakiraan_amh || "-"}</strong> (${rec.perbandingan_amh_thd_normal || "Sama"})</div>`;
                } else if (seasonalMetric === "sh") {
                  tooltipExtra = `<div style="margin-top:2px;font-size:10px;color:#1e293b;">Sifat Hujan: <strong>${rec.sifat_hujan || "Normal"}</strong></div>`;
                } else if (seasonalMetric === "curah") {
                  tooltipExtra = `<div style="margin-top:2px;font-size:10px;color:#1e293b;">Total Curah Hujan: <strong>${rec.prakiraan_curah_hujan_total?.toLocaleString("id-ID") || "-"} mm</strong></div>`;
                }
              }

              layer.bindTooltip(
                `<div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; padding: 2px 4px; line-height: 1.3;">
                  <div style="font-weight: 800; color: #4338ca; font-size: 11.5px;">Kecamatan ${name}</div>
                  ${code ? `<div style="font-size: 9.5px; color: #64748b;">Kode Kemendagri: ${code}</div>` : ""}
                  ${tooltipExtra}
                </div>`,
                { sticky: true, direction: "center" }
              );

              layer.on("click", () => {
                if (rec) {
                  setSelectedKecamatan(rec);
                } else {
                  setSelectedKecamatan({
                    kecamatan: name,
                    code,
                  });
                }
              });
            }}
          />
        )}

        {/* Overlay Jaringan Sungai & Hidrologi Kebumen */}
        {showRivers && riverGeoJson && (
          <GeoJSON
            key="sungai-kebumen-vector-layer"
            data={riverGeoJson}
            style={(feature) => {
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
                weight: isMain ? 3.4 : 1.6,
                opacity: isMain ? 0.92 : 0.65,
                lineCap: "round",
                lineJoin: "round",
              };
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties || {};
              layer.bindTooltip(
                `<div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; padding: 2px 4px; line-height: 1.35;">
                  <div style="font-weight: 800; color: #0369a1; font-size: 11.5px;">${p.name || "Alur Sungai"}</div>
                  <div style="font-size: 10px; color: #64748b;">Wilayah: ${p.das || "Kabupaten Kebumen"}</div>
                  ${
                    p.dis_m3s
                      ? `<div style="font-size: 9.5px; color: #0284c7; font-weight: 600; margin-top: 1px;">Debit Rerata: ${p.dis_m3s} m³/detik &bull; Pjg: ${p.length_km} km</div>`
                      : ""
                  }
                  ${
                    p.detail
                      ? `<div style="font-size: 9px; color: #0d9488; font-style: italic; margin-top: 1px;">${p.detail}</div>`
                      : ""
                  }
                </div>`,
                { sticky: true, direction: "top", offset: [0, -4] }
              );
            }}
          />
        )}

        {/* Kebumen Area Subtle Focus Circle */}
        <Circle
          center={KEBUMEN_CENTER}
          radius={14000}
          pathOptions={{
            color: "#6366f1",
            fillColor: "#6366f1",
            fillOpacity: 0.02,
            weight: 1,
            dashArray: "4 4",
          }}
        />

        {/* Station Markers */}
        {showStations &&
          devices.map((station, idx) => {
            const isSelected = selectedStation?.id === station.id;
            return (
              <Marker
                key={station.id || idx}
                position={[station.lat, station.lng]}
                icon={createStationDivIcon(station, isSelected, displayMetric)}
                eventHandlers={{
                  click: () => {
                    setTargetPos([station.lat, station.lng]);
                  },
                }}
              >
                <Popup minWidth={310} maxWidth={350} autoPan={true}>
                  <StationMarkerPopup
                    station={station}
                    isDarkMode={isDarkMode}
                    onOpenDetail={(st) => setSelectedStation(st)}
                  />
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Slide-out Detailed Station Inspector Drawer */}
      <StationDetailDrawer
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
        isDarkMode={isDarkMode}
      />

      {/* Slide-out Detailed Kecamatan Seasonal Forecast & KATAM Drawer */}
      <KecamatanDetailDrawer
        data={selectedKecamatan}
        onClose={() => setSelectedKecamatan(null)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default Map;