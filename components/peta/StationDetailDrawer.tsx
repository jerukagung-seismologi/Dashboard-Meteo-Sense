// components/peta/StationDetailDrawer.tsx
"use client";

import React, { useState } from "react";
import {
  X,
  MapPin,
  Clock,
  Thermometer,
  Droplets,
  CloudRain,
  Gauge,
  Zap,
  Radio,
  ExternalLink,
  Sliders,
  BarChart3,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StationData } from "./StationMarkerPopup";
import { OneHourTrendChart, ChartMetricType } from "./OneHourTrendChart";
import Link from "next/link";

interface StationDetailDrawerProps {
  station: StationData | null;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const StationDetailDrawer: React.FC<StationDetailDrawerProps> = ({
  station,
  onClose,
  isDarkMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<ChartMetricType>("temperature");

  if (!station) return null;

  const isOnline = station.status !== "offline";
  const history = station.history1h || [];

  return (
    <div className="absolute top-4 right-4 z-[1000] w-[340px] sm:w-[400px] max-h-[calc(100%-32px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200">
      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-gradient-to-r from-indigo-50/50 via-transparent to-sky-50/50 dark:from-indigo-950/20 dark:to-transparent">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              {station.name}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{station.location || "Kabupaten Kebumen"}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer Body (Scrollable) */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge className="bg-indigo-600 text-white border-indigo-700 font-bold">
            Stasiun Cuaca Kebumen
          </Badge>
          <Badge
            variant="outline"
            className={
              isOnline
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 font-semibold"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }
          >
            {isOnline ? "Telemetri Aktif" : "Offline"}
          </Badge>
          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
            ID: {station.id.substring(0, 16)}
          </Badge>
        </div>

        {/* Real-time Current Values Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Suhu */}
          <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-1">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <span>Suhu Udara</span>
              <Thermometer className="h-4 w-4" />
            </div>
            <div className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono">
              {station.temp !== undefined ? `${station.temp.toFixed(1)} °C` : "--"}
            </div>
          </div>

          {/* Kelembapan */}
          <div className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-1">
            <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 text-xs font-semibold">
              <span>Kelembapan</span>
              <Droplets className="h-4 w-4" />
            </div>
            <div className="text-xl font-black text-sky-700 dark:text-sky-300 font-mono">
              {station.hum !== undefined ? `${Math.round(station.hum)} %` : "--"}
            </div>
          </div>

          {/* Curah Hujan */}
          <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span>Curah Hujan</span>
              <CloudRain className="h-4 w-4" />
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {station.rainfall !== undefined ? `${station.rainfall.toFixed(1)} mm` : "0.0 mm"}
            </div>
          </div>

          {/* Tekanan Udara */}
          <div className="p-3 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 space-y-1">
            <div className="flex items-center justify-between text-violet-600 dark:text-violet-400 text-xs font-semibold">
              <span>Tekanan</span>
              <Gauge className="h-4 w-4" />
            </div>
            <div className="text-xl font-black text-violet-700 dark:text-violet-300 font-mono">
              {station.pressure !== undefined ? `${Math.round(station.pressure)} hPa` : "--"}
            </div>
          </div>
        </div>

        {/* 1-Hour Interactive Trend Section */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              Dinamika 1 Jam Terakhir:
            </span>
          </div>

          {/* Tabs for Trend Metric */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            {(["temperature", "humidity", "rainfall", "pressure"] as ChartMetricType[]).map((m) => {
              const labels: Record<ChartMetricType, string> = {
                temperature: "Suhu",
                humidity: "RH",
                rainfall: "Hujan",
                pressure: "Tekanan",
              };
              return (
                <button
                  key={m}
                  onClick={() => setActiveTab(m)}
                  className={`py-1 rounded-lg text-center font-bold text-[11px] transition-all ${
                    activeTab === m
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {labels[m]}
                </button>
              );
            })}
          </div>

          <OneHourTrendChart
            data={history}
            metric={activeTab}
            isDarkMode={isDarkMode}
            width={340}
            height={115}
          />
        </div>

        {/* Hardware & Telemetry Details */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2">
          <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
            Telemetri &amp; Catu Daya
          </span>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Tegangan Baterai
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {station.batteryVolt ? `${station.batteryVolt.toFixed(2)} V` : "3.95 V (Normal)"}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              Pembaruan Terakhir
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {station.lastUpdate || "Real-time stream"}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              Koordinat GPS
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {station.lat.toFixed(4)}°, {station.lng.toFixed(4)}°
            </span>
          </div>
        </div>

        {/* Action Links */}
        <div className="pt-2 flex flex-col gap-2">
          <Link
            href={`/dashboard/validasi-bias?station=${station.id}`}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <span>Buka Analisis Validasi Bias ERA5</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <Link
            href={`/dashboard/data?device=${station.id}`}
            className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <span>Lihat Basis Data Lengkap</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
