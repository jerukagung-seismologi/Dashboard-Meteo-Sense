// app/dashboard/klimatologi/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { Loader2, Sparkles, MapPin, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { SummaryCards } from "@/components/climatology/SummaryCards";
import { TemperatureCharts } from "@/components/climatology/TemperatureCharts";
import { RainfallCharts } from "@/components/climatology/RainfallCharts";
import { HumidityCharts } from "@/components/climatology/HumidityCharts";
import { PressureCharts } from "@/components/climatology/PressureCharts";

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
}

export default function KlimatologiPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [preset, setPreset] = useState<string>("weekly");

  // Filter selection states
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getUTCFullYear());

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

  // Construct API Query String
  const apiPath = useMemo(() => {
    if (!sensorId) return null;
    let queryParams = `sensorId=${sensorId}&preset=${preset}`;
    if (preset === "monthly") {
      queryParams += `&month=${selectedMonth}&year=${selectedYear}`;
    } else if (preset === "yearly") {
      queryParams += `&year=${selectedYear}`;
    }
    return `/api/climatology?${queryParams}`;
  }, [sensorId, preset, selectedMonth, selectedYear]);

  const { data, error, isLoading, mutate } = useSWR(apiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const renderLoading = () => (
    <div className="space-y-6">
      {/* 7 Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, idx) => (
          <Card key={idx} className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardContent className="p-4 flex flex-col justify-between h-[110px]">
              <div className="flex justify-between items-start">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
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
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
              Analisis Klimatologi
            </h2>
            <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse hidden sm:inline" />
          </div>
          <p className="text-muted-foreground dark:text-slate-400 mt-1">
            Kalkulasi klimatologi teragregasi server (UTC boundaries, WIB display conversion)
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

          {/* Preset, month, year selectors */}
          <PresetSelector
            preset={preset}
            setPreset={setPreset}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            isLoading={isLoading}
            onRefresh={() => mutate()}
          />
        </CardContent>
      </Card>

      {/* C. Render Loading, Error, or Main Content */}
      {isLoading ? (
        renderLoading()
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-semibold">{error.message || "Gagal memuat data klimatologi."}</p>
          </CardContent>
        </Card>
      ) : !data || !data.points || data.points.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 border rounded-xl shadow-sm text-center">
          <BarChart3 className="h-14 w-14 text-slate-400 dark:text-slate-600 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tidak Ada Data Klimatologi</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">
            Stasiun cuaca terpilih tidak mencatat weather logs dalam rentang waktu UTC yang ditentukan. Silakan sesuaikan pilihan periode Anda.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <SummaryCards stats={data.stats} />

          {/* Detailed Parameter Analytics Tabs */}
          <Tabs defaultValue="temperature" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-900 border rounded-lg">
              <TabsTrigger value="temperature" className="py-2.5">Temperatur</TabsTrigger>
              <TabsTrigger value="rainfall" className="py-2.5">Curah Hujan</TabsTrigger>
              <TabsTrigger value="humidity" className="py-2.5">Kelembapan</TabsTrigger>
              <TabsTrigger value="pressure" className="py-2.5">Tekanan Udara</TabsTrigger>
            </TabsList>

            {/* Temperature Tab */}
            <TabsContent value="temperature" className="mt-6">
              <TemperatureCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
                stdDev={data.stats.temperature.stdDev}
              />
            </TabsContent>

            {/* Rainfall Tab */}
            <TabsContent value="rainfall" className="mt-6">
              <RainfallCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
                totalRainfall={data.stats.rainfall.total}
              />
            </TabsContent>

            {/* Humidity Tab */}
            <TabsContent value="humidity" className="mt-6">
              <HumidityCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            {/* Pressure Tab */}
            <TabsContent value="pressure" className="mt-6">
              <PressureCharts
                points={data.points}
                preset={preset}
                isDarkMode={isDarkMode}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
