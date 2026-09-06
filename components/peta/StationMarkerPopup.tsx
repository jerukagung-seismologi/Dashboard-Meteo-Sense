// components/peta/StationMarkerPopup.tsx
"use client";

import React, { useState } from "react";
import {
  Thermometer,
  Droplets,
  CloudRain,
  Gauge,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Radio,
  Zap,
  Navigation,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OneHourTrendChart, ChartMetricType, SensorDataPoint } from "./OneHourTrendChart";

export interface StationData {
  id: string;
  name: string;
  location?: string;
  lat: number;
  lng: number;
  temp?: number;
  hum?: number;
  pressure?: number;
  rainfall?: number;
  rainrate?: number;
  windSpeed?: number;
  windDirection?: number;
  lux?: number;
  status?: "online" | "offline";
  lastUpdate?: string;
  batteryVolt?: number;
  history1h?: SensorDataPoint[];
  stationType?: "user_device" | "reference_station";
}

function getCardinalDirection(deg: number = 0): string {
  const directions = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
}

interface StationMarkerPopupProps {
  station: StationData;
  onOpenDetail?: (station: StationData) => void;
  isDarkMode?: boolean;
}

export const StationMarkerPopup: React.FC<StationMarkerPopupProps> = ({
  station,
  onOpenDetail,
  isDarkMode = false,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<ChartMetricType>("temperature");

  const isOnline = station.status !== "offline";
  const historyData = station.history1h || [];

  return (
    <div className="w-[310px] sm:w-[340px] text-slate-800 dark:text-slate-100 p-0 font-sans space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isOnline ? "bg-emerald-500 animate-ping" : "bg-slate-400"
              }`}
            />
            <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 line-clamp-1">
              {station.name}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
            <span className="truncate">
              {station.location || `Kebumen (${station.lat.toFixed(4)}°, ${station.lng.toFixed(4)}°)`}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant="outline"
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
          >
            Stasiun Cuaca
          </Badge>
          <span className="text-[9px] text-slate-400 font-mono">
            {isOnline ? "Telemetri Aktif" : "Offline"}
          </span>
        </div>
      </div>

      {/* 4 Metric Badges Grid */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        {/* Suhu */}
        <button
          onClick={() => setSelectedMetric("temperature")}
          className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center cursor-pointer ${
            selectedMetric === "temperature"
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 shadow-xs"
              : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Thermometer className="h-3.5 w-3.5 text-rose-500 mb-0.5" />
          <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
            {station.temp !== undefined ? `${station.temp.toFixed(1)}°` : "--"}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Suhu</span>
        </button>

        {/* Kelembapan */}
        <button
          onClick={() => setSelectedMetric("humidity")}
          className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center cursor-pointer ${
            selectedMetric === "humidity"
              ? "bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 shadow-xs"
              : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Droplets className="h-3.5 w-3.5 text-sky-500 mb-0.5" />
          <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
            {station.hum !== undefined ? `${Math.round(station.hum)}%` : "--"}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">RH</span>
        </button>

        {/* Curah Hujan */}
        <button
          onClick={() => setSelectedMetric("rainfall")}
          className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center cursor-pointer ${
            selectedMetric === "rainfall"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs"
              : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CloudRain className="h-3.5 w-3.5 text-emerald-500 mb-0.5" />
          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
            {station.rainfall !== undefined ? `${station.rainfall.toFixed(1)}` : "0.0"}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Hujan</span>
        </button>

        {/* Arah & Kecepatan Angin */}
        <button
          onClick={() => setSelectedMetric("wind")}
          title={`Kecepatan: ${station.windSpeed ?? 0} km/h, Arah: ${station.windDirection ?? 0}°`}
          className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center cursor-pointer ${
            selectedMetric === "wind"
              ? "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-700 shadow-xs"
              : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <div
            className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 mb-0.5 flex items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${station.windDirection ?? 0}deg)` }}
          >
            <Navigation className="h-3 w-3 fill-current" />
          </div>
          <span className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">
            {station.windSpeed !== undefined ? `${station.windSpeed.toFixed(1)}` : "0.0"}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
            {station.windDirection !== undefined ? `${getCardinalDirection(station.windDirection)} ${station.windDirection}°` : "Angin"}
          </span>
        </button>
      </div>

      {/* 1-Hour Trend Chart Container */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5 font-medium">
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
            <Sparkles className="h-3 w-3" />
            Grafik 1 Jam Terakhir
          </span>
          <span className="text-[10px] text-slate-400">
            {historyData.length} Poin Observasi
          </span>
        </div>

        <OneHourTrendChart
          data={historyData}
          metric={selectedMetric}
          isDarkMode={isDarkMode}
          width={310}
          height={100}
        />
      </div>

      {/* Footer Details & Action Button */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>Update: {station.lastUpdate || "Baru saja"}</span>
          </div>

          {onOpenDetail && (
            <button
              onClick={() => onOpenDetail(station)}
              className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              <span>Analisis Detail</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center justify-between pt-0.5">
          <span>Jaringan Stasiun Kebumen</span>
          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">● Live Stream</span>
        </div>
      </div>
    </div>
  );
};
