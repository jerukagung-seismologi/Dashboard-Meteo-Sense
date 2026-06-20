// app/dashboard/analisis-klimatologi/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  Thermometer,
  CloudRain,
  Droplets,
  Gauge,
  Wind,
  Calendar as CalendarIcon,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Loader2,
  Sparkles,
  MapPin,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

// Dynamically import ECharts to optimize bundle size and prevent SSR hydration mismatches
const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      Memuat grafik...
    </div>
  )
});

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Gagal memuat data dari server.");
  }
  return res.json();
};

interface DeviceOption {
  label: string;
  value: string;
}

export default function ClimatologyPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [range, setRange] = useState<string>("30d");

  // Selection states
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().substring(0, 7); // Default to current month: YYYY-MM
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return String(new Date().getFullYear()); // Default to current year: YYYY
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return { from, to };
  });

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

  // Fetch devices owned/administered by the current user
  useEffect(() => {
    if (user?.uid) {
      const loadDevices = async () => {
        try {
          const fetched = await fetchAllDevices(user.uid);
          const options = fetched
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
          console.error("Gagal memuat daftar perangkat:", err);
        }
      };
      loadDevices();
    }
  }, [user]);

  // Construct API query path based on states
  const apiPath = useMemo(() => {
    if (!sensorId) return null;
    let params = `sensorId=${sensorId}&range=${range}`;
    if (range === "monthly") {
      params += `&startDate=${selectedMonth}`;
    } else if (range === "yearly") {
      params += `&startDate=${selectedYear}`;
    } else if (range === "custom" && dateRange?.from && dateRange?.to) {
      params += `&startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;
    }
    return `/api/climatology?${params}`;
  }, [sensorId, range, selectedMonth, selectedYear, dateRange]);

  const { data, error, isLoading, mutate } = useSWR(apiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => String(current - i));
  }, []);

  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // ECharts Configurations
  const chartOptions = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) return null;

    const points = data.points;
    const stats = data.stats;
    const timeKeys = points.map((p: any) => p.timeKey);

    // Temperature Chart Option
    const temperature = {
      tooltip: { trigger: "axis" },
      legend: { data: ["Suhu Maksimum", "Suhu Rata-rata", "Suhu Minimum"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "5%", containLabel: true },
      xAxis: { type: "category", data: timeKeys, axisLabel: { color: textColor } },
      yAxis: {
        type: "value",
        name: "°C",
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
        scale: true
      },
      series: [
        {
          name: "Suhu Maksimum",
          type: "line",
          data: points.map((p: any) => p.temperatureMax),
          itemStyle: { color: "#f87171" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true
        },
        {
          name: "Suhu Rata-rata",
          type: "line",
          data: points.map((p: any) => p.temperatureMean),
          itemStyle: { color: "#14b8a6" },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(20, 184, 166, 0.25)" },
                { offset: 1, color: "rgba(20, 184, 166, 0.0)" }
              ]
            }
          },
          smooth: true
        },
        {
          name: "Suhu Minimum",
          type: "line",
          data: points.map((p: any) => p.temperatureMin),
          itemStyle: { color: "#60a5fa" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true
        }
      ]
    };

    // Rainfall Chart Option
    let accumulatedTotal = 0;
    const cumulativeRainData = points.map((p: any) => {
      accumulatedTotal += p.rainfallAccumulation;
      return Math.round(accumulatedTotal * 10) / 10;
    });

    const rainfall = {
      tooltip: { trigger: "axis" },
      legend: { data: ["Curah Hujan Periodik", "Curah Hujan Akumulatif"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "5%", containLabel: true },
      xAxis: { type: "category", data: timeKeys, axisLabel: { color: textColor } },
      yAxis: [
        {
          type: "value",
          name: "Interval (mm)",
          axisLabel: { color: textColor },
          splitLine: { lineStyle: { color: gridColor } }
        },
        {
          type: "value",
          name: "Total Kumulatif (mm)",
          axisLabel: { color: textColor },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: "Curah Hujan Periodik",
          type: "bar",
          data: points.map((p: any) => p.rainfallAccumulation),
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#3b82f6" },
                { offset: 1, color: "#60a5fa" }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          }
        },
        {
          name: "Curah Hujan Akumulatif",
          type: "line",
          yAxisIndex: 1,
          data: cumulativeRainData,
          itemStyle: { color: "#c084fc" },
          lineStyle: { width: 3 },
          smooth: true
        }
      ]
    };

    // Humidity Chart Option
    const humidity = {
      tooltip: { trigger: "axis" },
      legend: { data: ["Kelembapan Maksimum", "Kelembapan Rata-rata", "Kelembapan Minimum"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "5%", containLabel: true },
      xAxis: { type: "category", data: timeKeys, axisLabel: { color: textColor } },
      yAxis: {
        type: "value",
        name: "%",
        max: 100,
        min: 0,
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } }
      },
      series: [
        {
          name: "Kelembapan Maksimum",
          type: "line",
          data: points.map((p: any) => p.humidityMax),
          itemStyle: { color: "#10b981" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true
        },
        {
          name: "Kelembapan Rata-rata",
          type: "line",
          data: points.map((p: any) => p.humidityMean),
          itemStyle: { color: "#059669" },
          lineStyle: { width: 3 },
          smooth: true
        },
        {
          name: "Kelembapan Minimum",
          type: "line",
          data: points.map((p: any) => p.humidityMin),
          itemStyle: { color: "#f59e0b" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true
        }
      ]
    };

    // Pressure Chart Option
    const pressure = {
      tooltip: { trigger: "axis" },
      legend: { data: ["Tekanan Udara Maksimum", "Tekanan Rata-rata", "Tekanan Minimum"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "5%", containLabel: true },
      xAxis: { type: "category", data: timeKeys, axisLabel: { color: textColor } },
      yAxis: {
        type: "value",
        name: "hPa",
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
        scale: true
      },
      series: [
        {
          name: "Tekanan Udara Maksimum",
          type: "line",
          data: points.map((p: any) => p.pressureMax),
          itemStyle: { color: "#f43f5e" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true
        },
        {
          name: "Tekanan Rata-rata",
          type: "line",
          data: points.map((p: any) => p.pressureMean),
          itemStyle: { color: "#ec4899" },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(236, 72, 153, 0.2)" },
                { offset: 1, color: "rgba(236, 72, 153, 0.0)" }
              ]
            }
          },
          smooth: true
        },
        {
          name: "Tekanan Minimum",
          type: "line",
          data: points.map((p: any) => p.pressureMin),
          itemStyle: { color: "#ec4899" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true
        }
      ]
    };

    // Wind Speed Option
    const windSpeed = {
      tooltip: { trigger: "axis" },
      legend: { data: ["Kecepatan Rata-rata", "Hembusan Maksimum"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "5%", containLabel: true },
      xAxis: { type: "category", data: timeKeys, axisLabel: { color: textColor } },
      yAxis: {
        type: "value",
        name: "m/s",
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } }
      },
      series: [
        {
          name: "Kecepatan Rata-rata",
          type: "line",
          data: points.map((p: any) => p.windSpeedMean),
          itemStyle: { color: "#64748b" },
          lineStyle: { width: 3 },
          smooth: true
        },
        {
          name: "Hembusan Maksimum",
          type: "line",
          data: points.map((p: any) => p.windSpeedMax),
          itemStyle: { color: "#f59e0b" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true
        }
      ]
    };

    // Wind Rose Option (Polar Coordinate Plot)
    const windRoseDirs = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
    const windRoseData = windRoseDirs.map((dir) => stats.wind.distribution[dir] || 0);

    const windRose = {
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} data ({d}%)"
      },
      polar: {
        radius: "70%"
      },
      angleAxis: {
        type: "category",
        data: windRoseDirs,
        boundaryGap: false,
        startAngle: 90,
        axisLabel: { color: textColor, interval: 0, fontWeight: "bold" }
      },
      radiusAxis: {
        min: 0,
        axisLabel: { color: textColor, show: true }
      },
      series: [
        {
          coordinateSystem: "polar",
          name: "Frekuensi Arah Angin",
          type: "bar",
          data: windRoseData,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#6366f1" },
                { offset: 1, color: "#4f46e5" }
              ]
            }
          }
        }
      ]
    };

    return { temperature, rainfall, humidity, pressure, windSpeed, windRose };
  }, [data, textColor, gridColor]);

  // Loading skeleton representing five cards and charts
  const renderLoading = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx} className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardContent className="p-4 flex flex-col justify-between h-[110px]">
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3.5 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2 border-b">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="p-8 h-[400px] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400 font-medium">Melakukan kalkulasi & agregasi data di server...</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
              Analisis Klimatologi
            </h2>
            <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse hidden sm:inline" />
          </div>
          <p className="text-muted-foreground dark:text-slate-400 mt-1">
            Kalkulasi statistika & klimatologi jangka panjang weather station (fully aggregated server-side)
          </p>
        </div>
      </div>

      {/* 2. Global Filters Bar */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          {/* Station Selector */}
          <div className="flex flex-col gap-1 w-full sm:w-[220px]">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Stasiun</span>
            <Select value={sensorId} onValueChange={setSensorId} disabled={devices.length === 0}>
              <SelectTrigger className="bg-white dark:bg-slate-900">
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

          {/* Time Range Selector */}
          <div className="flex flex-col gap-1 w-full sm:w-[150px]">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rentang Waktu</span>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="bg-white dark:bg-slate-900">
                <SelectValue placeholder="Rentang Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12 Jam Terakhir</SelectItem>
                <SelectItem value="24h">24 Jam Terakhir</SelectItem>
                <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
                <SelectItem value="custom">Kustom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Picker Inputs */}
          {range === "monthly" && (
            <div className="flex flex-col gap-1 w-full sm:w-[180px]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Bulan</span>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white dark:bg-slate-900 h-10"
              />
            </div>
          )}

          {range === "yearly" && (
            <div className="flex flex-col gap-1 w-full sm:w-[150px]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Tahun</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((yr) => (
                    <SelectItem key={yr} value={yr}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {range === "custom" && (
            <div className="flex flex-col gap-1 w-full sm:w-[260px]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Filter Tanggal</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal bg-white dark:bg-slate-900 h-10",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {dateRange.from.toLocaleDateString("id-ID", { month: "short", day: "2-digit", year: "numeric" })} -{" "}
                          {dateRange.to.toLocaleDateString("id-ID", { month: "short", day: "2-digit", year: "numeric" })}
                        </>
                      ) : (
                        dateRange.from.toLocaleDateString("id-ID", { month: "short", day: "2-digit", year: "numeric" })
                      )
                    ) : (
                      <span>Pilih rentang tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    autoFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex items-end h-full mt-auto">
            <Button
              variant="outline"
              onClick={() => mutate()}
              disabled={isLoading || !sensorId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Perbarui Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Main Content Rendering */}
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
            Stasiun cuaca terpilih tidak mencatat weather logs dalam rentang waktu terpilih. Coba pilih stasiun cuaca lain atau sesuaikan filter Anda.
          </p>
        </div>
      ) : (
        <>
          {/* A. Summary Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 1. Temperature Card */}
            <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-orange-50 to-red-50 dark:from-red-950/20 dark:to-orange-950/10">
              <CardContent className="p-4 flex flex-col justify-between h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Temperatur Rata-rata</span>
                  <Thermometer className="h-5 w-5 text-orange-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                    {data.stats.temperature.mean.toFixed(1)}<span className="text-xl">°C</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Min: {data.stats.temperature.min}°C</span>
                  <span>Max: {data.stats.temperature.max}°C</span>
                </div>
              </CardContent>
            </Card>

            {/* 2. Rainfall Card */}
            <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/10">
              <CardContent className="p-4 flex flex-col justify-between h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Curah Hujan</span>
                  <CloudRain className="h-5 w-5 text-blue-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                    {data.stats.rainfall.total.toFixed(1)}<span className="text-xl">mm</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    Hari Hujan: {data.stats.rainfall.rainDaysCount} hari
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 3. Humidity Card */}
            <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10">
              <CardContent className="p-4 flex flex-col justify-between h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Kelembapan Rerata</span>
                  <Droplets className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                    {data.stats.humidity.mean.toFixed(1)}<span className="text-xl">%</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Min: {data.stats.humidity.min}%</span>
                  <span>Max: {data.stats.humidity.max}%</span>
                </div>
              </CardContent>
            </Card>

            {/* 4. Atmospheric Pressure Card */}
            <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/10">
              <CardContent className="p-4 flex flex-col justify-between h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">Tekanan Rata-rata</span>
                  <Gauge className="h-5 w-5 text-pink-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                    {data.stats.pressure.mean.toFixed(0)}<span className="text-xl">hPa</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Min: {data.stats.pressure.min.toFixed(0)}</span>
                  <span>Max: {data.stats.pressure.max.toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* 5. Wind Card */}
            <Card className="hover:shadow-md transition-all duration-200 border-none bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-950/20 dark:to-indigo-950/5">
              <CardContent className="p-4 flex flex-col justify-between h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Kecepatan Angin</span>
                  <Wind className="h-5 w-5 text-slate-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                    {data.stats.wind.meanSpeed.toFixed(1)}<span className="text-xl">m/s</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Maks: {data.stats.wind.maxSpeed.toFixed(1)} m/s</span>
                  <span className="font-semibold text-indigo-500">Arah: {data.stats.wind.dominantDirection}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* B. Detailed Analytics Charts Tabs */}
          <Tabs defaultValue="temperature" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-slate-100 dark:bg-slate-900 border rounded-lg">
              <TabsTrigger value="temperature" className="py-2.5">Temperatur</TabsTrigger>
              <TabsTrigger value="rainfall" className="py-2.5">Curah Hujan</TabsTrigger>
              <TabsTrigger value="humidity" className="py-2.5">Kelembapan</TabsTrigger>
              <TabsTrigger value="pressure" className="py-2.5">Tekanan Udara</TabsTrigger>
              <TabsTrigger value="wind" className="py-2.5">Data Angin</TabsTrigger>
            </TabsList>

            {/* Suhu Tabs */}
            <TabsContent value="temperature" className="mt-6">
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Tren Temperatur
                  </CardTitle>
                  <CardDescription>
                    Perbandingan suhu maksimum harian/jam, nilai rata-rata, dan minimum beserta standard deviasi (±{data.stats.temperature.stdDev}°C).
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] p-2">
                  {chartOptions && (
                    <ReactECharts
                      option={chartOptions.temperature}
                      style={{ height: "100%", width: "100%" }}
                      theme={chartTheme}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Curah Hujan Tabs */}
            <TabsContent value="rainfall" className="mt-6">
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <CloudRain className="h-5 w-5 text-blue-500" /> Profil Curah Hujan & Distribusi
                  </CardTitle>
                  <CardDescription>
                    Histogram curah hujan periodik (bar) digabungkan dengan garis kenaikan kumulatif (line) di sumbu kanan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] p-2">
                  {chartOptions && (
                    <ReactECharts
                      option={chartOptions.rainfall}
                      style={{ height: "100%", width: "100%" }}
                      theme={chartTheme}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Kelembapan Tabs */}
            <TabsContent value="humidity" className="mt-6">
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-emerald-500" /> Analisis Variabilitas Kelembapan
                  </CardTitle>
                  <CardDescription>
                    Memantau batas atas (maksimum), fluktuasi rata-rata harian/jam, dan batas bawah (minimum) kelembapan udara.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] p-2">
                  {chartOptions && (
                    <ReactECharts
                      option={chartOptions.humidity}
                      style={{ height: "100%", width: "100%" }}
                      theme={chartTheme}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tekanan Udara Tabs */}
            <TabsContent value="pressure" className="mt-6">
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-pink-500" /> Dinamika Tekanan Atmosfer
                  </CardTitle>
                  <CardDescription>
                    Tren tekanan udara rata-rata untuk memantau indikasi perubahan front cuaca atau pola meteorologi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] p-2">
                  {chartOptions && (
                    <ReactECharts
                      option={chartOptions.pressure}
                      style={{ height: "100%", width: "100%" }}
                      theme={chartTheme}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Angin Tabs (Speed & Wind Rose Side-by-Side) */}
            <TabsContent value="wind" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Wind Speed Trend */}
                <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-slate-500" /> Tren Kecepatan Angin
                    </CardTitle>
                    <CardDescription>
                      Perbandingan kecepatan angin rata-rata harian dengan kecepatan gust/hembusan maksimum.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[380px] p-2">
                    {chartOptions && (
                      <ReactECharts
                        option={chartOptions.windSpeed}
                        style={{ height: "100%", width: "100%" }}
                        theme={chartTheme}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Wind Rose Circular Chart */}
                <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Wind className="h-5 w-5 text-indigo-500 animate-spin-slow" /> Mawar Angin (Wind Rose)
                    </CardTitle>
                    <CardDescription>
                      Distribusi persentase arah angin dominan ke 8 arah mata angin (Utara, Timur Laut, dll.).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[380px] p-2 flex items-center justify-center">
                    {chartOptions && (
                      <div className="w-[350px] h-[350px]">
                        <ReactECharts
                          option={chartOptions.windRose}
                          style={{ height: "100%", width: "100%" }}
                          theme={chartTheme}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
