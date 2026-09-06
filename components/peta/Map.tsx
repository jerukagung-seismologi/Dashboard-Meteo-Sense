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
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Layers,
  Maximize2,
  Navigation,
  Compass,
  Sparkles,
  Info,
  Radio,
} from "lucide-react";
import { StationMarkerPopup, StationData } from "./StationMarkerPopup";
import { StationDetailDrawer } from "./StationDetailDrawer";

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

// Custom Controller for camera animations
function MapCameraController({
  targetPos,
  targetZoom,
}: {
  targetPos: [number, number] | null;
  targetZoom?: number;
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

  return null;
}

// Function to create sleek modern divIcon with live temperature badge
const createStationDivIcon = (station: StationData, isSelected: boolean = false) => {
  const isOnline = station.status !== "offline";
  const tempStr = station.temp !== undefined ? `${station.temp.toFixed(1)}°` : "📍";

  const borderColor = isSelected ? "#38bdf8" : "#6366f1";
  const bgColor = isSelected ? "#312e81" : "#1e1b4b";

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; position: relative;">
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 3px 8px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        border: 1.8px solid ${borderColor};
        background-color: ${bgColor};
        color: #ffffff;
        transform: ${isSelected ? "scale(1.18)" : "scale(1)"};
        transition: transform 0.2s ease;
      ">
        <span style="font-size: 10px; font-weight: 800; font-family: monospace; letter-spacing: -0.3px;">${tempStr}</span>
        <span style="
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background-color: ${isOnline ? "#10b981" : "#94a3b8"};
          display: inline-block;
          box-shadow: ${isOnline ? "0 0 5px #10b981" : "none"};
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
    iconSize: [60, 32],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
  });
};

interface MapProps {
  devices: StationData[];
  isDarkMode?: boolean;
}

const Map = ({ devices = [], isDarkMode = false }: MapProps) => {
  const [activeLayer, setActiveLayer] = useState<MapLayerType>("streets");
  const [targetPos, setTargetPos] = useState<[number, number] | null>(null);
  const [targetZoom, setTargetZoom] = useState<number>(DEFAULT_ZOOM);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

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
    // Calculate bounding box of all stations
    const lats = devices.map((d) => d.lat);
    const lngs = devices.map((d) => d.lng);
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    setTargetPos([avgLat, avgLng]);
    setTargetZoom(11);
  };

  const currentLayerConfig = MAP_LAYERS[activeLayer];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
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

      {/* Floating Control Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        {/* Layer Switcher Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Layers className="h-4 w-4 text-indigo-500" />
            <span>Peta: {currentLayerConfig.name}</span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-11 right-0 w-44 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((layerKey) => {
                const l = MAP_LAYERS[layerKey];
                const isSelected = activeLayer === layerKey;
                return (
                  <button
                    key={layerKey}
                    onClick={() => {
                      setActiveLayer(layerKey);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{l.name}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Location Action Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800">
          {/* Fokus Kebumen */}
          <button
            onClick={handleFocusKebumen}
            title="Fokus ke Wilayah Kebumen"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-rose-500" />
            <span>Kebumen</span>
          </button>

          {/* Fit Semua Stasiun */}
          <button
            onClick={handleFitAll}
            title="Tampilkan Semua Titik Stasiun"
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Network Indicator Pill (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[1000] px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 text-xs flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
            Jaringan Cuaca Kabupaten Kebumen
          </span>
          <span className="text-[10px] text-slate-400 block -mt-0.5">
            {devices.length} Stasiun Terpantau Real-time
          </span>
        </div>
      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={KEBUMEN_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <MapCameraController targetPos={targetPos} targetZoom={targetZoom} />

        {/* Dynamic Tile Layer based on active selection */}
        <TileLayer
          attribution={currentLayerConfig.attribution}
          url={currentLayerConfig.url}
          maxZoom={19}
        />

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
        {devices.map((station, idx) => {
          const isSelected = selectedStation?.id === station.id;
          return (
            <Marker
              key={station.id || idx}
              position={[station.lat, station.lng]}
              icon={createStationDivIcon(station, isSelected)}
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
    </div>
  );
};

export default Map;