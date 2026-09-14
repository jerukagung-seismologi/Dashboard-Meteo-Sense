// app/dashboard/klimatologi/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import { Loader2, Sparkles, MapPin, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import { Card, CardContent, CardHeader} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PresetSelector } from "@/components/climatology/PresetSelector";
import { ClimateExtremesCards } from "@/components/climatology/ClimateExtremesCards";
import { computeClimateExtremes } from "@/lib/climatology/climateExtremes";
import { TemperatureCharts } from "@/components/climatology/TemperatureCharts";
import { RainfallCharts } from "@/components/climatology/RainfallCharts";
import { HumidityCharts } from "@/components/climatology/HumidityCharts";
import { PressureCharts } from "@/components/climatology/PressureCharts";
import { TempDewComparisonCharts } from "@/components/climatology/TempDewComparisonCharts";
import { Era5ClimatologyCharts } from "@/components/climatology/Era5ClimatologyCharts";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Gagal memuat data dari server.");
  }
  return res.json();
};

interface DeviceOption {
  label: string;
  value: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  location?: string;
}

export default function KlimatologiPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [preset, setPreset] = useState<string>("monthly");

  // Filter selection states
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getUTCFullYear());
  const [selectedDasarian, setSelectedDasarian] = useState<number>(1);

  const [isDarkMode, setIsDarkMode] = useState(false);

  // Monitor dark mode changes using MutationObserver
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Fetch devices administered by the current user
  useEffect(() => {
    if (user?.uid) {
      const loadDevices = async () => {
        try {
          const res = await fetchAllDevices(user.uid);
          const options = res
            .filter((d) => d.authToken)
            .map((d) => ({
              label: d.name,
              value: d.authToken!,
              coordinates: d.coordinates,
              location: d.location,
            }));
          setDevices(options);
          if (options.length > 0) {
            setSensorId(options[0].value);
          }
        } catch (err) {
          console.error("Gagal memuat stasiun perangkat:", err);
        }
      };
      loadDevices();
    }
  }, [user]);

  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Active station details & geographic coordinates
  const currentDevice = useMemo(() => {
    return devices.find((d) => d.value === sensorId);
  }, [devices, sensorId]);

  const currentCoords = useMemo(() => {
    if (
      currentDevice?.coordinates &&
      (currentDevice.coordinates.lat !== 0 || currentDevice.coordinates.lng !== 0)
    ) {
      return currentDevice.coordinates;
    }
    // Fallback coordinates (AWS Jerukagung, Central Java)
    return { lat: -7.5361, lng: 110.2312 };
  }, [currentDevice]);

  // Construct API Query String for station sensor observations
  const apiPath = useMemo(() => {
    if (!sensorId) return null;
    let queryParams = `sensorId=${sensorId}&preset=${preset}&calibration=true`;
    if (preset === "monthly") {
      queryParams += `&month=${selectedMonth}&year=${selectedYear}`;
    } else if (preset === "dasarian") {
      queryParams += `&month=${selectedMonth}&year=${selectedYear}&dasarian=${selectedDasarian}`;
    } else if (preset === "yearly") {
      queryParams += `&year=${selectedYear}`;
    }
    if (refreshKey) {
      queryParams += `&_t=${refreshKey}`;
    }
    return `/api/climatology?${queryParams}`;
  }, [sensorId, preset, selectedMonth, selectedYear, selectedDasarian, refreshKey]);

  const { data, error, isLoading, mutate } = useSWR(apiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 0,
  });

  // Construct API Query String for ERA5 Climatological Baseline
  const era5QueryPath = useMemo(() => {
    if (!currentCoords?.lat || !currentCoords?.lng) return null;
    const targetYear = selectedYear || new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;
    let url = `/api/reanalysis/data?latitude=${currentCoords.lat}&longitude=${currentCoords.lng}&startDate=${startDate}&endDate=${endDate}`;
    if (refreshKey) {
      url += `&_t=${refreshKey}`;
    }
    return url;
  }, [currentCoords, selectedYear, refreshKey]);

  const {
    data: era5Data,
    isLoading: isEra5Loading,
    error: era5Error,
    mutate: mutateEra5,
  } = useSWR(era5QueryPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Calculate period-specific climatological normal benchmark from ERA5
  const periodNormals = useMemo(() => {
    if (!era5Data || !era5Data.monthly) return null;
    const mIdx = Math.max(0, Math.min(11, (selectedMonth || 1) - 1));

    let normalTemp = era5Data.stats.temperature.mean;
    let normalHum = era5Data.stats.humidity.mean;
    let normalPress = era5Data.stats.pressure.mean;
    let normalRain = era5Data.monthly.rain.reduce((a: number, b: number) => a + b, 0) / 12;

    if (preset === "monthly") {
      normalTemp = era5Data.monthly.temperature.mean[mIdx] ?? normalTemp;
      normalHum = era5Data.monthly.humidity.mean[mIdx] ?? normalHum;
      normalPress = era5Data.monthly.pressure.mean[mIdx] ?? normalPress;
      normalRain = era5Data.monthly.rain[mIdx] ?? normalRain;
    } else if (preset === "dasarian") {
      normalTemp = era5Data.monthly.temperature.mean[mIdx] ?? normalTemp;
      normalHum = era5Data.monthly.humidity.mean[mIdx] ?? normalHum;
      normalPress = era5Data.monthly.pressure.mean[mIdx] ?? normalPress;
      normalRain = (era5Data.monthly.rain[mIdx] ?? normalRain) / 3;
    } else if (preset === "weekly") {
      const currentM = new Date().getMonth();
      normalTemp = era5Data.monthly.temperature.mean[currentM] ?? normalTemp;
      normalHum = era5Data.monthly.humidity.mean[currentM] ?? normalHum;
      normalPress = era5Data.monthly.pressure.mean[currentM] ?? normalPress;
      normalRain = (era5Data.monthly.rain[currentM] ?? normalRain) / 4;
    } else if (preset === "yearly") {
      normalTemp = era5Data.stats.temperature.mean;
      normalHum = era5Data.stats.humidity.mean;
      normalPress = era5Data.stats.pressure.mean;
      normalRain = era5Data.monthly.rain.reduce((a: number, b: number) => a + b, 0);
    }

    return {
      temperature: {
        mean: normalTemp,
        monthly: era5Data.monthly.temperature.mean,
      },
      humidity: {
        mean: normalHum,
        monthly: era5Data.monthly.humidity.mean,
      },
      pressure: {
        mean: normalPress,
        monthly: era5Data.monthly.pressure.mean,
      },
      rainfall: {
        normal: normalRain,
        monthly: era5Data.monthly.rain,
      },
    };
  }, [era5Data, preset, selectedMonth]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(Date.now());
    mutate();
    mutateEra5();
  }, [mutate, mutateEra5]);

  // Compute climate extremes from station points & ERA5 reanalysis
  const climateExtremes = useMemo(() => {
    return computeClimateExtremes(data?.points || [], era5Data || null);
  }, [data?.points, era5Data]);

  const renderLoading = () => (
    <div className="space-y-6">
      {/* 6 Extreme Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Card key={idx} className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardContent className="p-3.5 flex flex-col justify-between h-[155px]">
              <div className="flex justify-between items-start">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Skeleton */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2 border-b">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80 mt-1" />
        </CardHeader>
        <CardContent className="p-8 h-[400px] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400 font-medium">Melakukan perhitungan & agregasi data klimatologi (UTC) di server...</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* A. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
              Analisis Klimatologi
            </h2>
            <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse hidden sm:inline" />
          </div>
          <p className="text-muted-foreground dark:text-slate-400 mt-1">
            Analisis Nilai Ekstrem Klimatologi & Sintesis Data Jangka Panjang (Sensor Stasiun & ERA5 Reanalysis)
          </p>
        </div>
      </div>

      {/* B. Controls Bar */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          {/* Station Selector */}
          <div className="flex flex-col gap-1 w-full sm:w-[220px]">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Stasiun</span>
            <Select value={sensorId} onValueChange={setSensorId} disabled={devices.length === 0}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                <SelectValue placeholder="Pilih Sensor/Device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preset, month, year, dasarian selectors */}
          <PresetSelector
            preset={preset}
            setPreset={setPreset}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedDasarian={selectedDasarian}
            setSelectedDasarian={setSelectedDasarian}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        </CardContent>
      </Card>

      {/* C. Render Loading, Error, or Main Content */}
      {isLoading ? (
        renderLoading()
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-semibold">{error.message || "Gagal memuat data iklim."}</p>
          </CardContent>
        </Card>
      ) : !data || !data.points || data.points.length === 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Tidak ada rekaman sensor stasiun untuk periode ini.</span>
                <span className="ml-1 text-amber-700/80 dark:text-amber-300/80">
                  Anda tetap dapat menganalisis acuan Normal Klimatologis ERA5 untuk lokasi ini di bawah.
                </span>
              </div>
            </div>
          </div>

          {/* Normal Klimatologis ERA5 Chart */}
          <Era5ClimatologyCharts
            era5Data={era5Data}
            isLoading={isEra5Loading}
            stationPoints={[]}
            stationName={currentDevice?.label || "Stasiun Terpilih"}
            coordinates={currentCoords}
            isDarkMode={isDarkMode}
            selectedYear={selectedYear}
          />
        </div>
      ) : (
        <>
          {/* Climate Extremes KPI Cards */}
          <ClimateExtremesCards extremes={climateExtremes} stats={data.stats} />

          {/* Detailed Parameter Analytics Tabs */}
          <Tabs defaultValue="temperature" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1 bg-slate-100 dark:bg-slate-900 border rounded-lg">
              <TabsTrigger value="temperature" className="py-2.5">Suhu Udara</TabsTrigger>
              <TabsTrigger value="comparison" className="py-2.5">Titik Embun</TabsTrigger>
              <TabsTrigger value="humidity" className="py-2.5">Kelembaban Relatif</TabsTrigger>
              <TabsTrigger value="rainfall" className="py-2.5">Curah Hujan</TabsTrigger>
              <TabsTrigger value="pressure" className="py-2.5">Tekanan Udara</TabsTrigger>
              <TabsTrigger value="era5_climatology" className="py-2.5 font-medium flex items-center justify-center gap-1.5">
                <span>Normal ERA5</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">Iklim</span>
              </TabsTrigger>
            </TabsList>

            {/* Temperature Tab */}
            <TabsContent value="temperature" className="mt-6">
              <TemperatureCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
                stdDev={data.stats.temperature.stdDev}
                observedMean={data.stats.temperature.mean}
                era5NormalTemp={periodNormals?.temperature.mean}
                monthlyNormals={periodNormals?.temperature.monthly}
              />
            </TabsContent>

            {/* Rainfall Tab */}
            <TabsContent value="rainfall" className="mt-6">
              <RainfallCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
                totalRainfall={data.stats.rainfall.total}
                era5NormalRain={periodNormals?.rainfall.normal}
                monthlyNormals={periodNormals?.rainfall.monthly}
              />
            </TabsContent>

            {/* Humidity Tab */}
            <TabsContent value="humidity" className="mt-6">
              <HumidityCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
                stdDev={data.stats.humidity.stdDev}
                observedMean={data.stats.humidity.mean}
                era5NormalHum={periodNormals?.humidity.mean}
                monthlyNormals={periodNormals?.humidity.monthly}
              />
            </TabsContent>

            {/* Pressure Tab */}
            <TabsContent value="pressure" className="mt-6">
              <PressureCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
                stdDev={data.stats.pressure.stdDev}
                observedMean={data.stats.pressure.mean}
                era5NormalPress={periodNormals?.pressure.mean}
                monthlyNormals={periodNormals?.pressure.monthly}
              />
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="mt-6">
              <TempDewComparisonCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            {/* ERA5 Climatological Normals Tab */}
            <TabsContent value="era5_climatology" className="mt-6">
              <Era5ClimatologyCharts
                era5Data={era5Data}
                isLoading={isEra5Loading}
                stationPoints={data.points}
                stationName={currentDevice?.label || "Stasiun Terpilih"}
                coordinates={currentCoords}
                isDarkMode={isDarkMode}
                selectedYear={selectedYear}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
