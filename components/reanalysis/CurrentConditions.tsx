// components/reanalysis/CurrentConditions.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge, Wind, CloudRain, Navigation } from "lucide-react";

interface CurrentConditionsProps {
  current: {
    temperature: number;
    tempMax: number;
    tempMin: number;
    humidity: number;
    humMax: number;
    humMin: number;
    pressure: number;
    pressMax: number;
    pressMin: number;
    windSpeed: number;
    windGust: number;
    windDirection: number;
    rainHourly: number;
    rainAccumulated: number;
  };
}

export const CurrentConditions: React.FC<CurrentConditionsProps> = ({ current }) => {
  // Translate wind degrees to compass text
  const getWindDirectionLabel = (deg: number) => {
    const sectors = ["Uara", "utara-timur laut", "Timur Laut", "timur-timur laut", "Timur", "timur-tenggara", "Tenggara", "selatan-tenggara", "Selatan", "selatan-barat daya", "Barat Daya", "barat-barat daya", "Barat", "barat-barat laut", "Barat Laut", "utara-barat laut"];
    const idx = Math.round(((deg % 360) / 22.5)) % 16;
    return sectors[idx];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* 1. Temperature KPI */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50/70 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Suhu Udara (2m)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {current.temperature.toFixed(1)}°C
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Maks</span>
              <p className="font-bold text-red-600 dark:text-red-400">{current.tempMax.toFixed(1)}°C</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Min</span>
              <p className="font-bold text-blue-600 dark:text-blue-400">{current.tempMin.toFixed(1)}°C</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Humidity KPI */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50/70 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Kelembaban Udara
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {current.humidity.toFixed(0)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Maks</span>
              <p className="font-bold text-teal-600 dark:text-teal-400">{current.humMax.toFixed(0)}%</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Min</span>
              <p className="font-bold text-amber-600 dark:text-amber-400">{current.humMin.toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Pressure KPI */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-pink-50/70 to-rose-50/30 dark:from-pink-950/20 dark:to-rose-950/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-pink-500" /> Tekanan MSL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {current.pressure.toFixed(0)} hPa
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Maks</span>
              <p className="font-bold text-rose-600 dark:text-rose-400">{current.pressMax.toFixed(0)} hPa</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Min</span>
              <p className="font-bold text-indigo-600 dark:text-indigo-400">{current.pressMin.toFixed(0)} hPa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Wind KPI */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50/70 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Wind className="h-5 w-5 text-emerald-500" /> Kecepatan Angin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              {current.windSpeed.toFixed(1)} m/s
            </span>
          </div>
          <div className="border-t pt-2 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Hembusan (Gust):</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">{current.windGust.toFixed(1)} m/s</span>
            </div>
            <div className="flex justify-between items-center gap-1">
              <span className="flex items-center gap-1">
                <Navigation className="h-3 w-3 text-slate-400 rotate-[45deg]" /> Arah:
              </span>
              <span className="font-bold uppercase text-[10px]">{getWindDirectionLabel(current.windDirection)} ({current.windDirection}°)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Rainfall KPI */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50/70 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-purple-500" /> Curah Hujan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {current.rainHourly.toFixed(1)} mm
            </span>
            <span className="text-[10px] text-slate-400 ml-1">/jam</span>
          </div>
          <div className="border-t pt-2 text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
            <span>Akumulasi Hari Ini:</span>
            <span className="font-bold text-purple-700 dark:text-purple-300">{current.rainAccumulated.toFixed(1)} mm</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
