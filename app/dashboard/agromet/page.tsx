// app/dashboard/agromet/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  RefreshCw,
  ThermometerSun,
  Droplets,
  Wind,
  Sprout,
  CloudRain,
  Sun,
  Thermometer,
  MapPin,
  AlertTriangle,
  Info,
  Gauge,
  Activity,
  Waves,
  Sparkles,
  Cloud,
  Layers,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import ReactECharts from "echarts-for-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonsoonAgrometSection } from "@/components/agromet/MonsoonAgrometSection";
import { EnsembleAgrometSection } from "@/components/agromet/EnsembleAgrometSection";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic imports for Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

// Setup Leaflet default icon
if (typeof window !== "undefined") {
  import("leaflet").then((L) => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  });
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SensorOption {
  label: string;
  value: string;
  lat: number;
  lng: number;
}

export default function AgrometPage() {
  const { user } = useAuth();
  const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<SensorOption | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    window.addEventListener("resize", checkDarkMode);
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("resize", checkDarkMode);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (user?.uid) {
      const loadUserDevices = async () => {
        try {
          const devices = await fetchAllDevices(user.uid);
          const options = devices
            .filter((device) => device.authToken && device.coordinates)
            .map((device) => ({
              label: device.name,
              value: device.authToken!,
              lat: device.coordinates?.lat || -6.2,
              lng: device.coordinates?.lng || 106.8,
            }));
          setSensorOptions(options);
          if (options.length > 0) setSelectedSensor(options[0]);
        } catch (err) {
          console.error("Gagal memuat daftar perangkat.", err);
        }
      };
      loadUserDevices();
    }
  }, [user]);

  const [refreshKey, setRefreshKey] = useState<number>(0);

  const apiUrl = selectedSensor
    ? `/api/weather/agromet?lat=${selectedSensor.lat}&lon=${selectedSensor.lng}${refreshKey ? `&_t=${refreshKey}` : ""}`
    : null;
  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 300000,
    dedupingInterval: 0,
  });

  const handleRefresh = () => {
    setRefreshKey(Date.now());
    mutate();
  };

  const getCardinalDirection = (deg: number) => {
    const directions = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
    return directions[Math.round(deg / 45) % 8];
  };

  const current = data?.current || {};
  const daily = data?.daily || {};
  const hourly = data?.hourly || {};

  // Meteorological & Agrometeorological Parameters
  const temp = current.temperature_2m ?? 0;
  const tempMin = daily.temperature_2m_min?.[0] ?? "-";
  const tempMax = daily.temperature_2m_max?.[0] ?? "-";
  const apparentTemp = current.apparent_temperature ?? temp;

  const rh = current.relative_humidity_2m ?? 0;
  const dewPoint = current.dew_point_2m ?? (temp - (100 - rh) / 5);
  const dewPointDepression = Math.max(0, Number((temp - dewPoint).toFixed(1)));

  const surfacePressure = current.surface_pressure ?? 1012;
  const vpd = current.vapour_pressure_deficit ?? Number((0.61078 * Math.exp((17.27 * temp) / (temp + 237.3)) * (1 - rh / 100)).toFixed(2));

  const rainToday = daily.precipitation_sum?.[0] || 0;
  const rain7d = daily.precipitation_sum?.slice(0, 7).reduce((a: number, b: number) => a + b, 0) || 0;

  const solarCurrent = current.shortwave_radiation ?? 0;
  const solarDaily = daily.shortwave_radiation_sum?.[0] ?? 0;
  const cloudCover = current.cloud_cover ?? 0;
  const uvIndex = daily.uv_index_max?.[0] ?? "-";

  const windSpeed = current.wind_speed_10m ? (current.wind_speed_10m / 3.6).toFixed(1) : "0.0";
  const windDir = current.wind_direction_10m ?? 0;

  // Soil & Water Balance Data
  const soilMoistureSurface = hourly.soil_moisture_0_to_1cm?.[0] ? hourly.soil_moisture_0_to_1cm[0] * 100 : 0;
  const soilMoistureRoot = hourly.soil_moisture_9_to_27cm?.[0] ? hourly.soil_moisture_9_to_27cm[0] * 100 : 0;
  const soilTempSurface = hourly.soil_temperature_0cm?.[0] || 0;
  const soilTempRoot = hourly.soil_temperature_18cm?.[0] || 0;

  const et0Today = daily.et0_fao_evapotranspiration_sum?.[0] || 0;
  const waterDeficit = rainToday - et0Today;

  // Agricultural Stress Indicators
  const isHeatStress = temp > 35 && rh < 40;
  const isDroughtRisk = soilMoistureRoot < 15 && rain7d < 10;
  const isDiseaseRisk = rh > 85 && temp > 20 && temp < 30 && (rainToday > 0 || dewPointDepression <= 1.5);
  const isVpdStress = vpd > 2.0;

  // Chart Colors
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Water Balance Option (Dynamic scale)
  const waterBalanceOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: { data: ["Curah Hujan", "Evapotranspirasi (ET0)"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: { type: "category", data: daily.time?.slice(0, 7), axisLabel: { color: textColor } },
      yAxis: {
        type: "value",
        name: "mm",
        scale: true,
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        { name: "Curah Hujan", type: "bar", data: daily.precipitation_sum?.slice(0, 7), itemStyle: { color: "#3b82f6" } },
        { name: "Evapotranspirasi (ET0)", type: "line", data: daily.et0_fao_evapotranspiration_sum?.slice(0, 7), itemStyle: { color: "#f59e0b" }, smooth: true },
      ],
    }),
    [daily, textColor, gridColor]
  );

  // Soil Moisture Option (Dynamic scale, not starting at 0)
  const soilMoistureOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: { data: ["Permukaan (0-1cm)", "Zona Akar (9-27cm)"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: { type: "category", data: hourly.time?.slice(0, 24).map((t: string) => t.substring(11, 16)), axisLabel: { color: textColor } },
      yAxis: {
        type: "value",
        name: "%",
        scale: true,
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        { name: "Permukaan (0-1cm)", type: "line", data: hourly.soil_moisture_0_to_1cm?.slice(0, 24).map((v: number) => Number((v * 100).toFixed(1))), itemStyle: { color: "#8b5cf6" }, smooth: true },
        { name: "Zona Akar (9-27cm)", type: "line", data: hourly.soil_moisture_9_to_27cm?.slice(0, 24).map((v: number) => Number((v * 100).toFixed(1))), itemStyle: { color: "#10b981" }, smooth: true },
      ],
    }),
    [hourly, textColor, gridColor]
  );

  // Solar Radiation Option (Dynamic scale)
  const solarOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: "4%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: { type: "category", data: hourly.time?.slice(0, 24).map((t: string) => t.substring(11, 16)), axisLabel: { color: textColor } },
      yAxis: {
        type: "value",
        name: "W/m²",
        scale: true,
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        { name: "Radiasi Surya", type: "line", areaStyle: { opacity: 0.3 }, data: hourly.shortwave_radiation?.slice(0, 24), itemStyle: { color: "#fcd34d" }, smooth: true },
      ],
    }),
    [hourly, textColor, gridColor]
  );

  if (sensorOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-3">
        <Sprout className="h-10 w-10 text-emerald-500 animate-bounce" />
        <p className="text-sm text-slate-500">Memuat konfigurasi stasiun sensor agrometeorologi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header Banner & Location Selector */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs py-0.5 px-2.5">
                <Sprout className="h-3.5 w-3.5 mr-1" /> Agrometeorologi &amp; Iklim Mikro Lahan
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-white/20 text-[11px]">
                ECMWF IFS Ensemble
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Monitoring Lingkungan Tanaman dan Prediksi Agrometeorologi
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Pemantauan kondisi cuaca mikro pertanian, profil perakaran tanah, neraca air, dan prediksi ensemble 50 anggota.
            </p>
          </div>

          {/* Location & Controls Box */}
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-3 shrink-0 self-stretch md:self-auto min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">Lokasi Stasiun Lahan</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-white hover:bg-white/10"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                Perbarui
              </Button>
            </div>

            <Select
              value={selectedSensor?.value}
              onValueChange={(val) => {
                const sensor = sensorOptions.find((s) => s.value === val);
                if (sensor) setSelectedSensor(sensor);
              }}
            >
              <SelectTrigger className="w-full bg-slate-900/80 border-white/20 text-white text-xs h-9">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-400 shrink-0" />
                <SelectValue placeholder="Pilih Lokasi Lahan" />
              </SelectTrigger>
              <SelectContent>
                {sensorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-[11px] text-emerald-200/80 flex items-center justify-between pt-1 border-t border-white/10">
              <span>Koordinat GPS:</span>
              <span className="font-mono font-bold text-white">
                {selectedSensor?.lat.toFixed(4)}, {selectedSensor?.lng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs text-slate-500">Mengambil data agrometeorologi &amp; ensemble...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-2xl border border-red-200 dark:border-red-900 text-sm">
          Gagal memuat data agrometeorologi. Silakan periksa koneksi atau klik tombol perbarui.
        </div>
      ) : (
        <>
          {/* 2. Structured 10-Variable Agrometeorology Metrics Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Activity className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Parameter Cuaca Mikro &amp; Dinamika Tanaman Terkini
                </h2>
              </div>
              <span className="text-xs text-slate-400">Pembaruan: Real-Time</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {/* 1. Suhu Udara */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Suhu Udara (2m)</span>
                    <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-500">
                      <ThermometerSun className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{temp}°C</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Min: {tempMin}° | Max: {tempMax}°
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">
                    Terasa: {apparentTemp}°C
                  </Badge>
                </CardContent>
              </Card>

              {/* 2. Titik Embun (Dew Point) */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Titik Embun (Td)</span>
                    <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-500">
                      <Droplets className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">{dewPoint.toFixed(1)}°C</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Depresi T-Td: {dewPointDepression}°C
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] w-fit font-bold ${
                      dewPointDepression <= 1.5
                        ? "bg-teal-100 text-teal-800 border-teal-300"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {dewPointDepression <= 1.5 ? "💧 Embun Pekat" : "Embun Ringan"}
                  </Badge>
                </CardContent>
              </Card>

              {/* 3. Tekanan Udara Permukaan */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Tekanan Barometrik</span>
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500">
                      <Gauge className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{surfacePressure.toFixed(0)} <span className="text-xs font-normal">hPa</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Tingkat Permukaan Lahan
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">
                    {surfacePressure < 1008 ? "Sistem Rendah" : "Stabil Normal"}
                  </Badge>
                </CardContent>
              </Card>

              {/* 4. Kelembapan Relatif (RH) */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Kelembapan Udara</span>
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-500">
                      <Waves className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{rh}%</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Kondisi Kanopi Lahan
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">
                    {rh > 85 ? "Sangat Lembap" : rh < 50 ? "Kering" : "Optimal"}
                  </Badge>
                </CardContent>
              </Card>

              {/* 5. Defisit Tekanan Uap (VPD) */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Defisit Uap (VPD)</span>
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500">
                      <Sprout className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{vpd} <span className="text-xs font-normal">kPa</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Transpirasi Stomata
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] w-fit font-bold ${
                      vpd >= 0.8 && vpd <= 1.5
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : vpd > 1.5
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-blue-100 text-blue-800 border-blue-300"
                    }`}
                  >
                    {vpd >= 0.8 && vpd <= 1.5 ? "Transpirasi Ideal" : vpd > 1.5 ? "Stres Transpirasi" : "Transpirasi Rendah"}
                  </Badge>
                </CardContent>
              </Card>

              {/* 6. Curah Hujan */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Curah Hujan Hari Ini</span>
                    <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-500">
                      <CloudRain className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{rainToday} <span className="text-xs font-normal">mm</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Akumulasi 7 Hari: {rain7d.toFixed(1)} mm
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">
                    {rainToday > 20 ? "Hujan Lebat" : rainToday > 5 ? "Hujan Sedang" : "Nihil / Ringan"}
                  </Badge>
                </CardContent>
              </Card>

              {/* 7. Evapotranspirasi (ET0) */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Evapotranspirasi (ET0)</span>
                    <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-500">
                      <Sun className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">{et0Today.toFixed(1)} <span className="text-xs font-normal">mm</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      FAO Penman-Monteith
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] w-fit font-bold ${
                      waterDeficit >= 0
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}
                  >
                    {waterDeficit >= 0 ? `Surplus +${waterDeficit.toFixed(1)}mm` : `Defisit ${waterDeficit.toFixed(1)}mm`}
                  </Badge>
                </CardContent>
              </Card>

              {/* 8. Radiasi Matahari */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Radiasi Surya</span>
                    <div className="p-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/60 text-yellow-600">
                      <Sun className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400 font-mono">{solarCurrent} <span className="text-xs font-normal">W/m²</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Total Harian: {solarDaily} MJ/m²
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">
                    Fotosintesis Aktif
                  </Badge>
                </CardContent>
              </Card>

              {/* 9. Angin Permukaan (10m) */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Angin (10m)</span>
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Wind className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{windSpeed} <span className="text-xs font-normal">m/s</span></span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Arah: {windDir}° ({getCardinalDirection(windDir)})
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">
                    {Number(windSpeed) > 5 ? "Angin Kencang" : "Angin Tenang"}
                  </Badge>
                </CardContent>
              </Card>

              {/* 10. Tutupan Awan & UV */}
              <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">Tutupan Awan &amp; UV</span>
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600">
                      <Cloud className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">{cloudCover}%</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Indeks UV Maks: {uvIndex}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">
                    {cloudCover > 75 ? "Mendung Tebal" : cloudCover > 30 ? "Sebagian Berawan" : "Cerah Terbuka"}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 3. 50-Member Ensemble Prediction Suite (Temperature, Dew Point, Surface Pressure) */}
          {selectedSensor && (
            <EnsembleAgrometSection
              lat={selectedSensor.lat}
              lon={selectedSensor.lng}
              isDarkMode={isDarkMode}
            />
          )}

          {/* 4. Soil Profile & Water Balance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 4A. Soil & Agricultural Risk Status (Left Column) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader className="pb-3 border-b dark:border-slate-800">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sprout className="h-5 w-5 text-emerald-500" /> Profil Lapisan Tanah Bertingkat
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Monitoring kelembapan &amp; suhu perakaran tanah
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-5">
                  {/* Lapisan Permukaan 0-1cm */}
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Lapisan Permukaan (0–1 cm)
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Droplets className="h-3.5 w-3.5 text-blue-500" /> Kelembapan
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{soilMoistureSurface.toFixed(1)}%</span>
                      </div>
                      <Progress value={soilMoistureSurface} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-blue-500" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Thermometer className="h-3.5 w-3.5 text-red-500" /> Suhu Tanah
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{soilTempSurface.toFixed(1)}°C</span>
                      </div>
                      <Progress
                        value={Math.min(Math.max((soilTempSurface / 50) * 100, 0), 100)}
                        className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-red-500"
                      />
                    </div>
                  </div>

                  {/* Lapisan Zona Akar 9-27cm */}
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Zona Perakaran Aktif (9–27 cm)
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Droplets className="h-3.5 w-3.5 text-emerald-500" /> Kelembapan Akar
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{soilMoistureRoot.toFixed(1)}%</span>
                      </div>
                      <Progress value={soilMoistureRoot} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-emerald-500" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Thermometer className="h-3.5 w-3.5 text-orange-500" /> Suhu Zona Akar
                        </span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{soilTempRoot.toFixed(1)}°C</span>
                      </div>
                      <Progress
                        value={Math.min(Math.max((soilTempRoot / 50) * 100, 0), 100)}
                        className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-orange-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Indikator Risiko Pertanian */}
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader className="pb-3 border-b dark:border-slate-800">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" /> Deteksi Risiko Iklim Mikro
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Stres Panas (Heat Stress)</span>
                    <Badge variant="outline" className={`text-[10px] font-bold ${isHeatStress ? "bg-red-100 text-red-700 border-red-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"}`}>
                      {isHeatStress ? "⚠️ Tinggi" : "Aman"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Risiko Kekeringan Perakaran</span>
                    <Badge variant="outline" className={`text-[10px] font-bold ${isDroughtRisk ? "bg-red-100 text-red-700 border-red-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"}`}>
                      {isDroughtRisk ? "⚠️ Kering" : "Kecukupan Baik"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Risiko Jamur &amp; Penyakit Daun</span>
                    <Badge variant="outline" className={`text-[10px] font-bold ${isDiseaseRisk ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"}`}>
                      {isDiseaseRisk ? "⚠️ Waspada Spora" : "Rendah"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Stres Transpirasi (VPD)</span>
                    <Badge variant="outline" className={`text-[10px] font-bold ${isVpdStress ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"}`}>
                      {isVpdStress ? "⚠️ Stomata Tertutup" : "Optimal"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 4B. Visualisasi Neraca Air & Kelembapan Tanah (Right Column) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader className="pb-2 border-b dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Neraca Air Lahan: Hujan vs Evapotranspirasi (7 Hari)</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Perbandingan input air hujan dengan output evapotranspirasi potensial Penman-Monteith
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 h-[290px]">
                  <ReactECharts option={waterBalanceOption} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={true} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                  <CardHeader className="pb-2 border-b dark:border-slate-800">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Droplets className="h-4 w-4 text-purple-500" /> Dinamika Kelembapan Tanah (24 Jam)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 flex-grow h-[260px]">
                    <ReactECharts option={soilMoistureOption} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={true} />
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                  <CardHeader className="pb-2 border-b dark:border-slate-800">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Sun className="h-4 w-4 text-yellow-500" /> Fluks Radiasi Surya Aktif (24 Jam)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 flex-grow h-[260px]">
                    <ReactECharts option={solarOption} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={true} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* 5. Map & Detailed Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm dark:bg-slate-900 bg-white lg:col-span-1 flex flex-col h-full overflow-hidden">
              <CardHeader className="pb-2 border-b dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" /> Peta Koordinat Lahan Pertanian
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-grow h-[380px] relative z-0">
                {selectedSensor && (
                  <MapContainer
                    center={[selectedSensor.lat, selectedSensor.lng]}
                    zoom={13}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[selectedSensor.lat, selectedSensor.lng]}>
                      <Popup>
                        <strong>{selectedSensor.label}</strong> <br />
                        Lat: {selectedSensor.lat.toFixed(4)}, Lon: {selectedSensor.lng.toFixed(4)}
                      </Popup>
                    </Marker>
                  </MapContainer>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tabel Prakiraan 24 Jam */}
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                <CardHeader className="pb-2 border-b dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-teal-500" /> Prakiraan Per Jam (24 Jam)
                  </CardTitle>
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
                      {hourly.time?.slice(0, 24).map((timeStr: string, idx: number) => (
                        <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-medium">{timeStr.substring(11, 16)}</td>
                          <td className="px-3 py-2 font-mono">
                            {hourly.temperature_2m[idx]}° <span className="text-teal-600 text-[10px]">({hourly.dew_point_2m?.[idx] ?? "-"}°)</span>
                          </td>
                          <td className="px-3 py-2 text-cyan-600 font-semibold">{hourly.precipitation[idx]} mm</td>
                          <td className="px-3 py-2 text-emerald-600 font-semibold">
                            {(hourly.soil_moisture_9_to_27cm[idx] * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Tabel Prakiraan 7 Hari */}
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                <CardHeader className="pb-2 border-b dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-500" /> Ringkasan Harian (7 Hari)
                  </CardTitle>
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
                      {daily.time?.slice(0, 7).map((timeStr: string, idx: number) => (
                        <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-medium">{timeStr.substring(5, 10)}</td>
                          <td className="px-3 py-2 font-mono">
                            {daily.temperature_2m_min[idx]}° – {daily.temperature_2m_max[idx]}°
                          </td>
                          <td className="px-3 py-2 text-cyan-600 font-semibold">{daily.precipitation_sum[idx]} mm</td>
                          <td className="px-3 py-2 text-orange-600 font-semibold">
                            {daily.et0_fao_evapotranspiration_sum?.[idx]?.toFixed(1) ?? "-"} mm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 6. Dedicated Indonesian Monsoon & Crop Calendar Section */}
          <MonsoonAgrometSection isDarkMode={isDarkMode} />
        </>
      )}
    </div>
  );
}
