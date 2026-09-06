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
  lux?: number;
  status?: "online" | "offline";
  lastUpdate?: string;
  batteryVolt?: number;
  history1h?: SensorDataPoint[];
  stationType?: "user_device" | "reference_station";
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
  const isUserDevice = station.stationType === "user_device";
  const historyData = station.history1h || [];

  return (
    <div className="w-[310px] sm:w-[340px] text-slate-800 dark:text-slate-100 p-0 font-sans space-y-3">
      {/* Prominent Station Classification Banner */}
      <div
        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-between border shadow-xs ${
          isUserDevice
            ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200"
            : "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{isUserDevice ? "⚡" : "🌐"}</span>
          <span>
            {isUserDevice
              ? "Perangkat Saya (Hardware AWS Riil)"
              : "Stasiun Referensi (Benchmark Wilayah)"}
          </span>
        </div>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
            isUserDevice
              ? "bg-indigo-600 text-white"
              : "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
          }`}
        >
          {isUserDevice ? "IoT Live" : "Spasial"}
        </span>
      </div>

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
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
              isUserDevice
                ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700"
            }`}
          >
            {isUserDevice ? "⚡ Riil" : "🌐 Referensi"}
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
          className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center ${
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
          className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center ${
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
          className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center ${
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

        {/* Tekanan Udara */}
        <button
          onClick={() => setSelectedMetric("pressure")}
          className={`p-1.5 rounded-xl border transition-all text-center flex flex-col items-center ${
            selectedMetric === "pressure"
              ? "bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 shadow-xs"
              : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Gauge className="h-3.5 w-3.5 text-violet-500 mb-0.5" />
          <span className="font-mono font-bold text-xs text-violet-600 dark:text-violet-400">
            {station.pressure !== undefined ? `${Math.round(station.pressure)}` : "--"}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Tekanan</span>
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
        <div className="text-[9px] text-slate-400 dark:text-slate-500 italic flex items-center justify-between pt-0.5">
          <span>{isUserDevice ? "✓ Sensor Telemetri Lapangan (RTDB)" : "ℹ Jaringan Riset Wilayah Kebumen"}</span>
          <span className="font-mono font-semibold">{isUserDevice ? "Hardware Riil" : "Benchmark"}</span>
        </div>
      </div>
    </div>
  );
};
