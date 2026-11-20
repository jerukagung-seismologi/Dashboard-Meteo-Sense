"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  Sprout,
  RefreshCw,
  Droplets,
  Thermometer,
  AlertTriangle,
  Sun,
  Activity,
  ThermometerSun,
  Gauge,
  Waves,
  CloudRain,
  Wind,
  Cloud,
  MapPin,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MonsoonAgrometSection } from "@/components/agromet/MonsoonAgrometSection";
import { EnsembleAgrometSection } from "@/components/agromet/EnsembleAgrometSection";
import { WaterBalanceDualChart } from "@/components/agromet/WaterBalanceDualChart";

const DynamicReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full min-h-[260px] rounded-lg" />,
});

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

export interface AgrometTabProps {
  activeLocation: { name: string; [key: string]: any };
  activeCoords: { lat: number; lng: number };
  isAgrometLoading: boolean;
  agrometData: any;
  agrometError: any;
  handleRefreshAgromet: () => void;
  isDarkMode: boolean;
  soilMoistureSurface: number;
  soilTempSurface: number;
  soilMoistureRoot: number;
  soilTempRoot: number;
  isHeatStress: boolean;
  isDroughtRisk: boolean;
  isDiseaseRisk: boolean;
  isVpdStress: boolean;
  agroHourlyData: any;
  agroDailyData: any;
  soilMoistureOption: any;
  solarOption: any;
  temp: number | string;
  tempMin: number | string;
  tempMax: number | string;
  apparentTemp: number | string;
  dewPoint: number;
  dewPointDepression: number | string;
  dewPointCondition: { className: string; label: string };
  surfacePressure: number;
  rh: number | string;
  vpd: number | string;
  rainToday: number | string;
  rain7d: number;
  et0Today: number;
  waterDeficit: number;
  solarCurrent: number | string;
  solarDaily: number | string;
  windSpeed: number | string;
  windDir: number;
  getCardinalDirection: (deg: number) => string;
  cloudCover: number | string;
  uvIndex: number | string;
}

export function AgrometTab({
  activeLocation,
  activeCoords,
  isAgrometLoading,
  agrometData,
  agrometError,
  handleRefreshAgromet,
  isDarkMode,
  soilMoistureSurface,
  soilTempSurface,
  soilMoistureRoot,
  soilTempRoot,
  isHeatStress,
  isDroughtRisk,
  isDiseaseRisk,
  isVpdStress,
  agroHourlyData,
  agroDailyData,
  soilMoistureOption,
  solarOption,
  temp,
  tempMin,
  tempMax,
  apparentTemp,
  dewPoint,
  dewPointDepression,
  dewPointCondition,
  surfacePressure,
  rh,
  vpd,
  rainToday,
  rain7d,
  et0Today,
  waterDeficit,
  solarCurrent,
  solarDaily,
  windSpeed,
  windDir,
  getCardinalDirection,
  cloudCover,
  uvIndex,
}: AgrometTabProps) {
  return (
    <div className="space-y-8">
      {/* Tab Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
        <div>
          <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
            <Sprout className="h-5 w-5 text-emerald-500" />
            Analisis Agroklimatologi, Neraca Air Lahan & Proyeksi Ekosistem
          </h2>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
            Ketercukupan air lahan (P vs ET0) · Profil perakaran tanah · Prediksi ensemble ECMWF IFS &amp; Google WeatherNext 2 AI (64 Skenario) untuk <strong>{activeLocation.name}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAgromet}
          disabled={isAgrometLoading}
          className="h-8 px-3 text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isAgrometLoading ? "animate-spin" : ""}`} /> Perbarui
        </Button>
      </div>

      {isAgrometLoading && !agrometData ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs text-slate-500">Mengambil data agrometeorologi & ensemble untuk {activeLocation.name}...</p>
        </div>
      ) : agrometError ? (
        <div className="p-4 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-2xl border border-red-200 dark:border-red-900 text-sm">
          Gagal memuat data agrometeorologi. Silakan periksa koneksi atau klik tombol perbarui.
        </div>
      ) : (
        <>
          {/* 1a. Neraca Air Lahan & Profil Tanah (Agroclimate Core) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {/* Profil Lapisan Tanah */}
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader className="pb-3 border-b dark:border-slate-800">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sprout className="h-5 w-5 text-emerald-500" /> Profil Lapisan Tanah Bertingkat
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Monitoring kelembapan & suhu perakaran tanah</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-5">
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Lapisan Permukaan (0–1 cm)</span>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-blue-500" /> Kelembapan</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{soilMoistureSurface.toFixed(1)}%</span>
                      </div>
                      <Progress value={soilMoistureSurface} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-red-500" /> Suhu Tanah</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{soilTempSurface.toFixed(1)}°C</span>
                      </div>
                      <Progress value={Math.min(Math.max((soilTempSurface / 50) * 100, 0), 100)} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-red-500" />
                    </div>
                  </div>
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Zona Perakaran Aktif (9–27 cm)</span>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-emerald-500" /> Kelembapan Akar</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{soilMoistureRoot.toFixed(1)}%</span>
                      </div>
                      <Progress value={soilMoistureRoot} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-orange-500" /> Suhu Zona Akar</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{soilTempRoot.toFixed(1)}°C</span>
                      </div>
                      <Progress value={Math.min(Math.max((soilTempRoot / 50) * 100, 0), 100)} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deteksi Risiko Iklim Mikro */}
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader className="pb-3 border-b dark:border-slate-800">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" /> Deteksi Risiko Iklim Mikro
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                  {[
                    { label: "Stres Panas (Heat Stress)", active: isHeatStress, activeLabel: "⚠️ Tinggi", inactiveLabel: "Aman" },
                    { label: "Risiko Kekeringan Perakaran", active: isDroughtRisk, activeLabel: "⚠️ Kering", inactiveLabel: "Kecukupan Baik" },
                    { label: "Risiko Jamur & Penyakit Daun", active: isDiseaseRisk, activeLabel: "⚠️ Waspada Spora", inactiveLabel: "Rendah" },
                    { label: "Stres Transpirasi (VPD)", active: isVpdStress, activeLabel: "⚠️ Stomata Tertutup", inactiveLabel: "Optimal" },
                  ].map(({ label, active, activeLabel, inactiveLabel }) => (
                    <div key={label} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
                      <Badge variant="outline" className={`text-[10px] font-bold ${active ? "bg-red-100 text-red-700 border-red-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"}`}>
                        {active ? activeLabel : inactiveLabel}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Water Balance & Charts (Right Column) */}
            <div className="lg:col-span-2 space-y-6">
              <WaterBalanceDualChart hourly={agroHourlyData} daily={agroDailyData} isDarkMode={isDarkMode} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                  <CardHeader className="pb-2 border-b dark:border-slate-800">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Droplets className="h-4 w-4 text-purple-500" /> Dinamika Kelembapan Tanah (24 Jam)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 flex-grow h-[260px]">
                    <DynamicReactECharts option={soilMoistureOption} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={true} />
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                  <CardHeader className="pb-2 border-b dark:border-slate-800">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Sun className="h-4 w-4 text-yellow-500" /> Fluks Radiasi Surya Aktif (24 Jam)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 flex-grow h-[260px]">
                    <DynamicReactECharts option={solarOption} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={true} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* 1b. 10-Variabel Parameter Cuaca Mikro */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Activity className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Parameter Cuaca Mikro & Dinamika Lahan ({activeLocation.name})
              </h3>
              <span className="text-xs text-slate-400 ml-auto">Pembaruan: Real-Time</span>
            </div>

            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {/* Suhu Udara */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Suhu Udara (2m)</span>
                    <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-500"><ThermometerSun className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{temp}°C</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Min: {tempMin}° | Max: {tempMax}°</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">Terasa: {apparentTemp}°C</Badge>
                </CardContent>
              </Card>

              {/* Titik Embun */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Titik Embun (Td)</span>
                    <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-500"><Droplets className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">{dewPoint.toFixed(1)}°C</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Depresi T-Td: {dewPointDepression}°C</div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] w-fit font-bold ${dewPointCondition.className}`}>
                    {dewPointCondition.label}
                  </Badge>
                </CardContent>
              </Card>

              {/* Tekanan Barometrik */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Tekanan Barometrik</span>
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500"><Gauge className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{surfacePressure.toFixed(0)} <span className="text-xs font-normal">hPa</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Tingkat Permukaan Lahan</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{surfacePressure < 1008 ? "Sistem Rendah" : "Stabil Normal"}</Badge>
                </CardContent>
              </Card>

              {/* Kelembapan Relatif */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Kelembapan Udara</span>
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-500"><Waves className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{rh}%</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Kondisi Kanopi Lahan</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{Number(rh) > 85 ? "Sangat Lembap" : Number(rh) < 50 ? "Kering" : "Optimal"}</Badge>
                </CardContent>
              </Card>

              {/* VPD */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Defisit Uap (VPD)</span>
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500"><Sprout className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{vpd} <span className="text-xs font-normal">kPa</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Transpirasi Stomata</div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] w-fit font-bold ${Number(vpd) >= 0.8 && Number(vpd) <= 1.5 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : Number(vpd) > 1.5 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-blue-100 text-blue-800 border-blue-300"}`}>
                    {Number(vpd) >= 0.8 && Number(vpd) <= 1.5 ? "Transpirasi Ideal" : Number(vpd) > 1.5 ? "Stres Transpirasi" : "Transpirasi Rendah"}
                  </Badge>
                </CardContent>
              </Card>

              {/* Curah Hujan */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Curah Hujan Hari Ini</span>
                    <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-500"><CloudRain className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{rainToday} <span className="text-xs font-normal">mm</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Akumulasi 7 Hari: {rain7d.toFixed(1)} mm</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{Number(rainToday) > 20 ? "Hujan Lebat" : Number(rainToday) > 5 ? "Hujan Sedang" : "Nihil / Ringan"}</Badge>
                </CardContent>
              </Card>

              {/* ET0 */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Evapotranspirasi (ET0)</span>
                    <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-500"><Sun className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">{et0Today.toFixed(1)} <span className="text-xs font-normal">mm</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">FAO Penman-Monteith</div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] w-fit font-bold ${waterDeficit >= 0 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"}`}>
                    {waterDeficit >= 0 ? `Surplus +${waterDeficit.toFixed(1)}mm` : `Defisit ${waterDeficit.toFixed(1)}mm`}
                  </Badge>
                </CardContent>
              </Card>

              {/* Radiasi Surya */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Radiasi Surya</span>
                    <div className="p-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/60 text-yellow-600"><Sun className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400 font-mono">{solarCurrent} <span className="text-xs font-normal">W/m²</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Total Harian: {solarDaily} MJ/m²</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">Fotosintesis Aktif</Badge>
                </CardContent>
              </Card>

              {/* Angin */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Angin (10m)</span>
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Wind className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{windSpeed} <span className="text-xs font-normal">m/s</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Arah: {windDir}° ({getCardinalDirection(windDir)})</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{Number(windSpeed) > 5 ? "Angin Kencang" : "Angin Tenang"}</Badge>
                </CardContent>
              </Card>

              {/* Tutupan Awan & UV */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Tutupan Awan & UV</span>
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600"><Cloud className="h-4 w-4" /></div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">{cloudCover}%</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Indeks UV Maks: {uvIndex}</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{Number(cloudCover) > 75 ? "Mendung Tebal" : Number(cloudCover) > 30 ? "Sebagian Berawan" : "Cerah Terbuka"}</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 1c. Prediksi Ensemble Multi-Model & Google WeatherNext 2 AI */}
          <EnsembleAgrometSection lat={activeCoords.lat} lon={activeCoords.lng} isDarkMode={isDarkMode} />

          {/* 1d. Dinamika Monsun & Kalender Tanam BMKG */}
          <MonsoonAgrometSection isDarkMode={isDarkMode} />

          {/* 1e. Peta Lahan & Distribusi Agregasi Waktu */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm dark:bg-slate-900 bg-white lg:col-span-1 flex flex-col h-full overflow-hidden">
              <CardHeader className="pb-2 border-b dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" /> Koordinat Analisis Wilayah
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-grow h-[380px] relative z-0">
                <MapContainer
                  key={`${activeCoords.lat}-${activeCoords.lng}`}
                  center={[activeCoords.lat, activeCoords.lng]}
                  zoom={12}
                  style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[activeCoords.lat, activeCoords.lng]}>
                    <Popup>
                      <strong>{activeLocation.name}</strong><br />
                      Lat: {activeCoords.lat.toFixed(4)}, Lon: {activeCoords.lng.toFixed(4)}
                    </Popup>
                  </Marker>
                </MapContainer>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prakiraan Per Jam 24 Jam */}
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                <CardHeader className="pb-2 border-b dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Activity className="h-4 w-4 text-teal-500" /> Prakiraan Per Jam (24 Jam)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow h-[340px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5">Jam</th>
                        <th className="px-3 py-2.5">Suhu / Td</th>
                        <th className="px-3 py-2.5">Hujan</th>
                        <th className="px-3 py-2.5">Kel. Akar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agroHourlyData.time?.slice(0, 24).map((timeStr: string, idx: number) => (
                        <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-medium">{timeStr.substring(11, 16)}</td>
                          <td className="px-3 py-2 font-mono">{agroHourlyData.temperature_2m[idx]}° <span className="text-teal-600 text-[10px]">({agroHourlyData.dew_point_2m?.[idx] ?? "-"}°)</span></td>
                          <td className="px-3 py-2 text-cyan-600 font-semibold">{agroHourlyData.precipitation[idx]} mm</td>
                          <td className="px-3 py-2 text-emerald-600 font-semibold">{(agroHourlyData.soil_moisture_9_to_27cm[idx] * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Ringkasan Harian 7 Hari */}
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                <CardHeader className="pb-2 border-b dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Calendar className="h-4 w-4 text-emerald-500" /> Ringkasan Harian (7 Hari)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow h-[340px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5">Tanggal</th>
                        <th className="px-3 py-2.5">Min / Max</th>
                        <th className="px-3 py-2.5">Hujan</th>
                        <th className="px-3 py-2.5">ET0</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agroDailyData.time?.slice(0, 7).map((timeStr: string, idx: number) => (
                        <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-medium">{timeStr.substring(5, 10)}</td>
                          <td className="px-3 py-2 font-mono">{agroDailyData.temperature_2m_min[idx]}° – {agroDailyData.temperature_2m_max[idx]}°</td>
                          <td className="px-3 py-2 text-cyan-600 font-semibold">{agroDailyData.precipitation_sum[idx]} mm</td>
                          <td className="px-3 py-2 text-orange-600 font-semibold">{agroDailyData.et0_fao_evapotranspiration_sum?.[idx]?.toFixed(1) ?? "-"} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
