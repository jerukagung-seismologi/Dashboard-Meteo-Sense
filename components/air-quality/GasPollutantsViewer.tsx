// components/air-quality/GasPollutantsViewer.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import ReactECharts from "echarts-for-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wind,
  Flame,
  Globe2,
  Factory,
  Sun,
  ShieldAlert,
  Activity,
  RefreshCw,
  MapPin,
  Info,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";

interface GasPollutantsViewerProps {
  isDarkMode?: boolean;
}

const PRESET_CITIES = [
  { label: "Jakarta (DKI Jakarta)", lat: -6.2088, lon: 106.8456 },
  { label: "Surabaya (Jawa Timur)", lat: -7.2575, lon: 112.7521 },
  { label: "Bandung (Jawa Barat)", lat: -6.9175, lon: 107.6191 },
  { label: "Semarang (Jawa Tengah)", lat: -7.0051, lon: 110.4381 },
  { label: "Medan (Sumatra Utara)", lat: 3.5952, lon: 98.6722 },
  { label: "Palembang (Sumatra Selatan)", lat: -2.9761, lon: 104.7754 },
  { label: "IKN Nusantara (Kalimantan Timur)", lat: -0.9733, lon: 116.7088 },
  { label: "Makassar (Sulawesi Selatan)", lat: -5.1477, lon: 119.4327 },
  { label: "Denpasar (Bali)", lat: -8.6705, lon: 115.2126 },
  { label: "Pontianak (Kalimantan Barat)", lat: -0.0263, lon: 109.3425 },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const GasPollutantsViewer: React.FC<GasPollutantsViewerProps> = ({
  isDarkMode = false,
}) => {
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<{
    label: string;
    lat: number;
    lon: number;
  }>(PRESET_CITIES[0]);
  const [userDevices, setUserDevices] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  const [activeTab, setActiveTab] = useState<string>("co_co2");

  // Load user IoT devices if available
  useEffect(() => {
    if (user?.uid) {
      const loadDevices = async () => {
        try {
          const devices = await fetchAllDevices(user.uid);
          const valid = devices
            .filter((d) => d.coordinates?.lat && d.coordinates?.lng)
            .map((d) => ({
              label: `Sensor: ${d.name}`,
              lat: d.coordinates!.lat,
              lon: d.coordinates!.lng,
            }));
          setUserDevices(valid);
        } catch (e) {
          console.error("Gagal memuat stasiun pengguna:", e);
        }
      };
      loadDevices();
    }
  }, [user]);

  const apiUrl = `/api/air-quality/data?lat=${selectedLocation.lat}&lon=${selectedLocation.lon}`;
  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const times: string[] = data?.hourly?.time || [];
  const current = data?.current || {};
  const hourly = data?.hourly || {};

  // Metrics
  const co = current.carbon_monoxide ?? 0;
  const co2 = current.carbon_dioxide ?? 0;
  const no2 = current.nitrogen_dioxide ?? 0;
  const so2 = current.sulphur_dioxide ?? 0;
  const o3 = current.ozone ?? 0;
  const pm25 = current.pm2_5 ?? 0;
  const pm10 = current.pm10 ?? 0;
  const aod = current.aerosol_optical_depth ?? 0;
  const aqi = data?.summary?.aqi ?? 0;
  const aqiCategory = data?.summary?.category ?? "Normal";

  // Chart theme colors
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.25)" : "rgba(203, 213, 225, 0.35)";

  // 1. CO & CO2 Dual-Axis Chart Option (scale: true on both axes)
  const coCo2ChartOption = useMemo(() => {
    if (!hourly.carbon_monoxide || !hourly.carbon_dioxide) return {};

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: ["Karbon Monoksida (CO)", "Karbon Dioksida (CO2)"],
      },
      grid: {
        top: 40,
        left: 55,
        right: 55,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: times,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (val: string) => {
            const d = new Date(val);
            return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:00`;
          },
        },
      },
      yAxis: [
        {
          type: "value",
          name: "CO (µg/m³)",
          scale: true, // Dynamic minimum from data
          position: "left",
          nameTextStyle: { color: "#f97316", fontSize: 11 },
          splitLine: { lineStyle: { color: gridColor } },
          axisLabel: {
            color: textColor,
            fontSize: 10,
          },
        },
        {
          type: "value",
          name: "CO2 (ppm)",
          scale: true, // Dynamic minimum from data
          position: "right",
          nameTextStyle: { color: "#06b6d4", fontSize: 11 },
          splitLine: { show: false },
          axisLabel: {
            color: textColor,
            fontSize: 10,
          },
        },
      ],
      series: [
        {
          name: "Karbon Monoksida (CO)",
          type: "line",
          yAxisIndex: 0,
          data: hourly.carbon_monoxide,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#f97316", width: 2.5 },
          itemStyle: { color: "#f97316" },
          areaStyle: {
            color: isDarkMode ? "rgba(249, 115, 22, 0.15)" : "rgba(249, 115, 22, 0.08)",
          },
        },
        {
          name: "Karbon Dioksida (CO2)",
          type: "line",
          yAxisIndex: 1,
          data: hourly.carbon_dioxide,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#06b6d4", width: 2.5 },
          itemStyle: { color: "#06b6d4" },
          areaStyle: {
            color: isDarkMode ? "rgba(6, 182, 212, 0.15)" : "rgba(6, 182, 212, 0.08)",
          },
        },
      ],
    };
  }, [hourly, times, isDarkMode, textColor, gridColor]);

  // 2. NO2 & SO2 Gas Oxides Chart Option (scale: true)
  const no2So2ChartOption = useMemo(() => {
    if (!hourly.nitrogen_dioxide || !hourly.sulphur_dioxide) return {};

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: ["Nitrogen Dioksida (NO2)", "Sulfur Dioksida (SO2)"],
      },
      grid: {
        top: 40,
        left: 55,
        right: 25,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: times,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (val: string) => {
            const d = new Date(val);
            return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:00`;
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Konsentrasi (µg/m³)",
        scale: true,
        nameTextStyle: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 },
      },
      series: [
        {
          name: "Nitrogen Dioksida (NO2)",
          type: "line",
          data: hourly.nitrogen_dioxide,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#ef4444", width: 2.5 },
          itemStyle: { color: "#ef4444" },
        },
        {
          name: "Sulfur Dioksida (SO2)",
          type: "line",
          data: hourly.sulphur_dioxide,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#eab308", width: 2.5 },
          itemStyle: { color: "#eab308" },
        },
      ],
    };
  }, [hourly, times, isDarkMode, textColor, gridColor]);

  // 3. Ozone & AOD Chart Option (scale: true)
  const ozoneAodChartOption = useMemo(() => {
    if (!hourly.ozone || !hourly.aerosol_optical_depth) return {};

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: ["Ozon Permukaan (O3)", "Ketebalan Optik Aerosol (AOD)"],
      },
      grid: {
        top: 40,
        left: 55,
        right: 55,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: times,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (val: string) => {
            const d = new Date(val);
            return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:00`;
          },
        },
      },
      yAxis: [
        {
          type: "value",
          name: "O3 (µg/m³)",
          scale: true,
          position: "left",
          nameTextStyle: { color: "#8b5cf6", fontSize: 11 },
          splitLine: { lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, fontSize: 10 },
        },
        {
          type: "value",
          name: "AOD (550nm)",
          scale: true,
          position: "right",
          nameTextStyle: { color: "#10b981", fontSize: 11 },
          splitLine: { show: false },
          axisLabel: { color: textColor, fontSize: 10 },
        },
      ],
      series: [
        {
          name: "Ozon Permukaan (O3)",
          type: "line",
          yAxisIndex: 0,
          data: hourly.ozone,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#8b5cf6", width: 2.5 },
          itemStyle: { color: "#8b5cf6" },
        },
        {
          name: "Ketebalan Optik Aerosol (AOD)",
          type: "line",
          yAxisIndex: 1,
          data: hourly.aerosol_optical_depth,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#10b981", width: 2.5 },
          itemStyle: { color: "#10b981" },
        },
      ],
    };
  }, [hourly, times, isDarkMode, textColor, gridColor]);

  // 4. PM2.5 vs PM10 Chart Option (scale: true)
  const particulatesChartOption = useMemo(() => {
    if (!hourly.pm2_5 || !hourly.pm10) return {};

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: ["Partikulat PM2.5 (Halus)", "Partikulat PM10 (Kasar)"],
      },
      grid: {
        top: 40,
        left: 55,
        right: 25,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: times,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (val: string) => {
            const d = new Date(val);
            return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:00`;
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Konsentrasi (µg/m³)",
        scale: true,
        nameTextStyle: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 10 },
      },
      series: [
        {
          name: "Partikulat PM2.5 (Halus)",
          type: "line",
          data: hourly.pm2_5,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#ef4444", width: 2.5 },
          itemStyle: { color: "#ef4444" },
          areaStyle: {
            color: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)",
          },
        },
        {
          name: "Partikulat PM10 (Kasar)",
          type: "line",
          data: hourly.pm10,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#3b82f6", width: 2.5 },
          itemStyle: { color: "#3b82f6" },
        },
      ],
    };
  }, [hourly, times, isDarkMode, textColor, gridColor]);

  const allLocations = [...PRESET_CITIES, ...userDevices];

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Flame className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Pemantauan Gas Polutan Atmosfer &amp; Kualitas Udara (CAMS)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Plot deret waktu dan analisis konsentrasi gas polutan: Karbon Monoksida (CO), Karbon Dioksida (CO2), NO2, SO2, Ozon, serta Partikulat PM2.5/PM10
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Select
              value={`${selectedLocation.lat},${selectedLocation.lon}`}
              onValueChange={(val) => {
                const [latStr, lonStr] = val.split(",");
                const lat = parseFloat(latStr);
                const lon = parseFloat(lonStr);
                const match = allLocations.find((l) => Math.abs(l.lat - lat) < 0.001 && Math.abs(l.lon - lon) < 0.001);
                if (match) setSelectedLocation(match);
              }}
            >
              <SelectTrigger className="w-[220px] h-8 text-xs bg-slate-50 dark:bg-slate-800">
                <MapPin className="h-3.5 w-3.5 mr-1 text-orange-500 shrink-0" />
                <SelectValue placeholder="Pilih Lokasi Wilayah" />
              </SelectTrigger>
              <SelectContent>
                {allLocations.map((loc, idx) => (
                  <SelectItem key={idx} value={`${loc.lat},${loc.lon}`} className="text-xs">
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* 1. Real-time Gas & Pollutant Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* CO */}
          <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500">Karbon Monoksida</span>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-orange-600 dark:text-orange-400 font-mono">
                {co.toFixed(0)} <span className="text-[10px] font-normal">µg/m³</span>
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] w-fit bg-orange-100 text-orange-800 border-orange-200">
              CO Emisi
            </Badge>
          </div>

          {/* CO2 */}
          <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500">Karbon Dioksida</span>
              <Globe2 className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                {co2.toFixed(0)} <span className="text-[10px] font-normal">ppm</span>
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] w-fit bg-cyan-100 text-cyan-800 border-cyan-200">
              CO2 Atmosfer
            </Badge>
          </div>

          {/* NO2 */}
          <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500">Nitrogen Dioksida</span>
              <Factory className="h-4 w-4 text-red-500" />
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-red-600 dark:text-red-400 font-mono">
                {no2.toFixed(1)} <span className="text-[10px] font-normal">µg/m³</span>
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] w-fit bg-red-100 text-red-800 border-red-200">
              NO2 Kendaraan
            </Badge>
          </div>

          {/* SO2 */}
          <div className="p-3 rounded-xl bg-yellow-50/60 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500">Sulfur Dioksida</span>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-yellow-600 dark:text-yellow-400 font-mono">
                {so2.toFixed(1)} <span className="text-[10px] font-normal">µg/m³</span>
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] w-fit bg-yellow-100 text-yellow-800 border-yellow-200">
              SO2 Industri
            </Badge>
          </div>

          {/* Ozone */}
          <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500">Ozon Permukaan</span>
              <Sun className="h-4 w-4 text-purple-500" />
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {o3.toFixed(0)} <span className="text-[10px] font-normal">µg/m³</span>
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] w-fit bg-purple-100 text-purple-800 border-purple-200">
              O3 Fotokimia
            </Badge>
          </div>

          {/* PM2.5 */}
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500">Partikulat PM2.5</span>
              <Wind className="h-4 w-4 text-rose-500" />
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {pm25.toFixed(1)} <span className="text-[10px] font-normal">µg/m³</span>
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] w-fit bg-rose-100 text-rose-800 border-rose-200">
              Debu Halus
            </Badge>
          </div>

          {/* AQI Score */}
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-500">Indeks AQI</span>
              <ShieldAlert className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="my-1">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {aqi}
              </span>
            </div>
            <Badge variant="outline" className="text-[9px] w-fit bg-emerald-100 text-emerald-800 border-emerald-200">
              {aqiCategory}
            </Badge>
          </div>
        </div>

        {/* 2. Interactive Pollutants Multi-Tab Plots */}
        <Tabs defaultValue="co_co2" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
            <TabsTrigger value="co_co2" className="py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" /> Karbon: CO &amp; CO2
            </TabsTrigger>
            <TabsTrigger value="oxides" className="py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Factory className="h-4 w-4 text-red-500" /> Oksida: NO2 &amp; SO2
            </TabsTrigger>
            <TabsTrigger value="ozone_aod" className="py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-purple-500" /> Ozon (O3) &amp; AOD
            </TabsTrigger>
            <TabsTrigger value="particulates" className="py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-rose-500" /> Partikulat: PM2.5 vs PM10
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="h-[340px] flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-xs text-slate-500">Memuat data polutan atmosfer CAMS...</p>
            </div>
          ) : error ? (
            <div className="h-[340px] flex items-center justify-center text-red-600 text-sm">
              Gagal memuat data polutan gas. Silakan periksa koneksi.
            </div>
          ) : (
            <>
              {/* Tab 1: CO & CO2 */}
              <TabsContent value="co_co2" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                    Prakiraan Konsentrasi Karbon Monoksida (CO) &amp; Karbon Dioksida (CO2) 7 Hari:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Oranye: CO (Sumbu Kiri) | Sian: CO2 (Sumbu Kanan)
                  </span>
                </div>
                <div className="h-[340px] w-full">
                  <ReactECharts
                    option={coCo2ChartOption}
                    notMerge={true}
                    lazyUpdate={true}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-orange-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> CO dihasilkan dari pembakaran tidak sempurna kendaraan/biomassa. CO2 mencerminkan konsentrasi gas rumah kaca atmosfer lokal. Sumbu grafik menggunakan skala dinamis aktual.
                  </span>
                </div>
              </TabsContent>

              {/* Tab 2: NO2 & SO2 */}
              <TabsContent value="oxides" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Factory className="h-3.5 w-3.5 text-red-500" />
                    Prakiraan Gas Oksida Asam: Nitrogen Dioksida (NO2) &amp; Sulfur Dioksida (SO2):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Merah: NO2 | Kuning: SO2
                  </span>
                </div>
                <div className="h-[340px] w-full">
                  <ReactECharts
                    option={no2So2ChartOption}
                    notMerge={true}
                    lazyUpdate={true}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-red-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> NO2 tinggi menandakan kepadatan lalu lintas dan aktivitas industri. SO2 bersumber dari emisi pembakaran batu bara, kilang minyak, dan aktivitas vulkanik.
                  </span>
                </div>
              </TabsContent>

              {/* Tab 3: Ozone & AOD */}
              <TabsContent value="ozone_aod" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sun className="h-3.5 w-3.5 text-purple-500" />
                    Prakiraan Ozon Permukaan (O3) &amp; Ketebalan Optik Aerosol (AOD):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ungu: O3 (Sumbu Kiri) | Hijau: AOD (Sumbu Kanan)
                  </span>
                </div>
                <div className="h-[340px] w-full">
                  <ReactECharts
                    option={ozoneAodChartOption}
                    notMerge={true}
                    lazyUpdate={true}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-purple-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> Ozon permukaan terbentuk dari reaksi fotokimia radiasi matahari dengan emisi gas buang pada siang hari. AOD mengukur kekeruhan atmosfer akibat partikel aerosol.
                  </span>
                </div>
              </TabsContent>

              {/* Tab 4: Particulates PM2.5 vs PM10 */}
              <TabsContent value="particulates" className="mt-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Wind className="h-3.5 w-3.5 text-rose-500" />
                    Prakiraan Partikulat Udara: PM2.5 (Debu Halus) vs PM10 (Debu Kasar):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Merah: PM2.5 | Biru: PM10
                  </span>
                </div>
                <div className="h-[340px] w-full">
                  <ReactECharts
                    option={particulatesChartOption}
                    notMerge={true}
                    lazyUpdate={true}
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                  <Info className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>
                    <strong>Catatan:</strong> PM2.5 dapat menembus saluran pernapasan dalam. Nilai &gt; 55 µg/m³ menandakan kualitas udara tidak sehat.
                  </span>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
