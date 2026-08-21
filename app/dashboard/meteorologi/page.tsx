// app/dashboard/analisis/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  RefreshCw,
  Download,
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Map,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Custom Climatology components
import { SummaryCardsAnalysis } from "@/components/climatology/SummaryCardsAnalysis";
import { DailyAnalysis } from "@/components/climatology/DailyAnalysis";
import { WeeklyAnalysis } from "@/components/climatology/WeeklyAnalysis";
import { DistributionAnalysis } from "@/components/climatology/DistributionAnalysis";
import { HeatmapAnalysis } from "@/components/climatology/HeatmapAnalysis";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Gagal memuat data analisis.");
  }
  return res.json();
};

interface DeviceOption {
  label: string;
  value: string;
}

export default function AnalisisDashboardPage() {
  const { user } = useAuth();
  
  // State variables
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("daily");
  
  // Date selector states
  const [dailyDate, setDailyDate] = useState<Date>(() => new Date());
  const [weeklyStartDate, setWeeklyStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // Default 7 days period ending today
    return d;
  });
  const [periodDays, setPeriodDays] = useState<number>(7);

  function selectMingguan() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Senin
    const start = new Date(now);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    setWeeklyStartDate(start);
    setPeriodDays(7);
  }

  function selectDasarian() {
    const now = new Date();
    const date = now.getDate();
    const start = new Date(now);
    
    let days = 10;
    if (date <= 10) {
      start.setDate(1);
    } else if (date <= 20) {
      start.setDate(11);
    } else {
      start.setDate(21);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1, 0); // last day
      days = end.getDate() - 20; 
    }
    start.setHours(0, 0, 0, 0);
    setWeeklyStartDate(start);
    setPeriodDays(days);
  }

  function selectBulanan() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1); // Tanggal 1 bulan ini
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Hari terakhir bulan ini
    const days = end.getDate();
    setWeeklyStartDate(start);
    setPeriodDays(days);
  }

  const periodScopeLabel = useMemo(() => {
    if (periodDays === 7) return "Mingguan";
    if (periodDays >= 28 && periodDays <= 31) return "Bulanan";
    if (periodDays >= 8 && periodDays <= 11) return "Dasarian";
    return `${periodDays} Hari`;
  }, [periodDays]);

  // Daily Date Navigation Handlers (Maju - Mundur Tanggal Harian)
  const handlePrevDay = useCallback(() => {
    setDailyDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setDailyDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  }, []);

  const handleToday = useCallback(() => {
    setDailyDate(new Date());
  }, []);

  const isDailyToday = useMemo(() => {
    const today = new Date();
    return (
      dailyDate.getFullYear() === today.getFullYear() &&
      dailyDate.getMonth() === today.getMonth() &&
      dailyDate.getDate() === today.getDate()
    );
  }, [dailyDate]);

  // Weekly / Period Navigation Handlers (Maju - Mundur Periode)
  const handlePrevPeriod = useCallback(() => {
    setWeeklyStartDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - periodDays);
      return d;
    });
  }, [periodDays]);

  const handleNextPeriod = useCallback(() => {
    setWeeklyStartDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + periodDays);
      return d;
    });
  }, [periodDays]);

  const [isDarkMode, setIsDarkMode] = useState(false);

  // Monitor dark mode using MutationObserver
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Fetch available devices
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
          console.error("Gagal memuat daftar perangkat:", err);
        }
      };
      loadDevices();
    }
  }, [user]);

  // Helper date formatter YYYY-MM-DD
  const formatYmd = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // API query paths
  const dailyApiPath = useMemo(() => {
    if (!sensorId) return null;
    return `/api/analysis/daily?sensorId=${sensorId}&date=${formatYmd(dailyDate)}`;
  }, [sensorId, dailyDate]);

  const weeklyApiPath = useMemo(() => {
    if (!sensorId) return null;
    return `/api/analysis/weekly?sensorId=${sensorId}&startDate=${formatYmd(weeklyStartDate)}&days=${periodDays}`;
  }, [sensorId, weeklyStartDate, periodDays]);

  // SWR Hooks
  const {
    data: dailyData,
    error: dailyError,
    isLoading: dailyLoading,
    mutate: mutateDaily,
  } = useSWR(activeTab === "daily" ? dailyApiPath : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const {
    data: weeklyData,
    error: weeklyError,
    isLoading: weeklyLoading,
    mutate: mutateWeekly,
  } = useSWR(activeTab === "weekly" ? weeklyApiPath : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Derived load state & error
  const isLoading = activeTab === "daily" ? dailyLoading : weeklyLoading;
  const error = activeTab === "daily" ? dailyError : weeklyError;

  const handleRefresh = useCallback(() => {
    if (activeTab === "daily") {
      mutateDaily();
    } else {
      mutateWeekly();
    }
  }, [activeTab, mutateDaily, mutateWeekly]);

  // Export options
  const handleDownloadCsv = () => {
    if (activeTab === "daily") {
      if (!dailyData?.points || dailyData.points.length === 0) {
        alert("Tidak ada data analisis harian untuk diunduh.");
        return;
      }
      const headers = [
        "Waktu (WIB)",
        "Suhu Rata-rata (°C)",
        "Suhu Maks (°C)",
        "Suhu Min (°C)",
        "Kelembaban Rata-rata (%)",
        "Kelembaban Maks (%)",
        "Kelembaban Min (%)",
        "Tekanan Rata-rata (hPa)",
        "Tekanan Maks (hPa)",
        "Tekanan Min (hPa)",
      ];
      const rows = dailyData.points.map((p: any) =>
        `"${p.timeKeyWib}",${p.temperatureMean},${p.temperatureMax},${p.temperatureMin},${p.humidityMean},${p.humidityMax},${p.humidityMin},${p.pressureMean},${p.pressureMax},${p.pressureMin}`
      );
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `analisis_harian_${sensorId}_${formatYmd(dailyDate)}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    } else {
      if (!weeklyData?.points || weeklyData.points.length === 0) {
        alert("Tidak ada data analisis mingguan untuk diunduh.");
        return;
      }
      const headers = [
        "Tanggal (WIB)",
        "Waktu (WIB)",
        "Suhu Rata-rata (°C)",
        "Suhu Maks (°C)",
        "Suhu Min (°C)",
        "Kelembaban Rata-rata (%)",
        "Kelembaban Maks (%)",
        "Kelembaban Min (%)",
        "Tekanan Rata-rata (hPa)",
        "Tekanan Maks (hPa)",
        "Tekanan Min (hPa)",
      ];
      const rows = weeklyData.points.map((p: any) =>
        `"${p.dayLabelWib}","${p.timeKeyWib}",${p.temperatureMean},${p.temperatureMax},${p.temperatureMin},${p.humidityMean},${p.humidityMax},${p.humidityMin},${p.pressureMean},${p.pressureMax},${p.pressureMin}`
      );
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `analisis_berkala_${sensorId}_${formatYmd(weeklyStartDate)}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Analisis Meteorologi
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Eksplorasi cuaca mendalam dan analisis klimatologi berbasis agregasi server
          </p>
        </div>
      </div>

      {/* 2. Global Control Filter Bar */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Device selector */}
            <Select value={sensorId} onValueChange={setSensorId} disabled={devices.length === 0}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Pilih Stasiun Cuaca" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.value} value={device.value}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Pickers & Navigation Stepper based on active tab */}
            {activeTab === "daily" ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Tombol Mundur 1 Hari (<) */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevDay}
                  title="Hari Sebelumnya (-1 Hari)"
                  className="h-9 w-9 text-slate-700 dark:text-slate-200 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 dark:hover:text-orange-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Popover Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 min-w-[190px] justify-center text-center font-semibold text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-orange-500 shrink-0" />
                      {dailyDate ? format(dailyDate, "dd MMMM yyyy", { locale: id }) : <span>Pilih Tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dailyDate}
                      onSelect={(date) => date && setDailyDate(date)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Tombol Maju 1 Hari (>) */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextDay}
                  disabled={isDailyToday}
                  title="Hari Selanjutnya (+1 Hari)"
                  className="h-9 w-9 text-slate-700 dark:text-slate-200 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 dark:hover:text-orange-400 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Tombol Pintas 'Hari Ini' */}
                {!isDailyToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToday}
                    className="h-9 px-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                  >
                    Hari Ini
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Tombol Mundur Periode (<) */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevPeriod}
                  title={`Mundur ${periodDays} Hari`}
                  className="h-9 w-9 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Popover Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 min-w-[220px] justify-center text-center font-semibold text-slate-800 dark:text-slate-100"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-blue-500 shrink-0" />
                      {weeklyStartDate ? (
                        <>
                          Mulai: {format(weeklyStartDate, "dd MMM yyyy", { locale: id })} ({periodDays} Hari)
                        </>
                      ) : (
                        <span>Pilih Mulai Tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={weeklyStartDate}
                      onSelect={(date) => {
                        if (date) {
                          setWeeklyStartDate(date);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Tombol Maju Periode (>) */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextPeriod}
                  title={`Maju ${periodDays} Hari`}
                  className="h-9 w-9 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="flex gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-2 ml-1">
                  <Button variant="outline" size="sm" onClick={selectMingguan} className={cn("h-9 text-xs font-medium", periodDays === 7 && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-900 font-bold")}>Mingguan (Sen-Min)</Button>
                  <Button variant="outline" size="sm" onClick={selectDasarian} className={cn("h-9 text-xs font-medium", periodDays >= 8 && periodDays <= 11 && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-900 font-bold")}>Dasarian</Button>
                  <Button variant="outline" size="sm" onClick={selectBulanan} className={cn("h-9 text-xs font-medium", periodDays >= 28 && periodDays <= 31 && "bg-blue-50 text-blue-600 border-blue-200 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-900 font-bold")}>Bulanan</Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading || !sensorId}
            >
              <RefreshCw className={cn("h-4 w-4 text-slate-500", isLoading && "animate-spin")} />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={isLoading || !sensorId}
            className="text-slate-600 dark:text-slate-300 gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" /> Unduh CSV
          </Button>
        </CardContent>
      </Card>

      {/* 3. Global Summary Cards (Dynamic based on active tab) */}
      {!isLoading && !error && (
        <>
          {activeTab === "daily" && dailyData?.stats && (
            <SummaryCardsAnalysis stats={dailyData.stats} scopeLabel="Harian" />
          )}
          {activeTab === "weekly" && weeklyData?.stats && (
            <SummaryCardsAnalysis stats={weeklyData.stats} scopeLabel={periodScopeLabel} />
          )}
        </>
      )}

      {/* 4. Tab System & Visualizations */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between border-b pb-1 dark:border-slate-800">
          <TabsList className="bg-transparent gap-6 h-auto p-0 border-none">
            <TabsTrigger
              value="daily"
              className="px-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent text-sm font-semibold text-slate-500 dark:text-slate-400 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 transition-all"
            >
              Analisis Harian
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="px-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent text-sm font-semibold text-slate-500 dark:text-slate-400 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all"
            >
              Analisis Berkala & Distribusi
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content Display states */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-[350px] space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mengambil dan mengolah data meteorologi di sisi server...
            </p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-300">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div className="text-sm font-medium">{error.message || "Gagal memuat data."}</div>
          </div>
        ) : (
          <>
            {/* Daily Tab Content */}
            <TabsContent value="daily" className="space-y-6 outline-none">
              {dailyData?.points && dailyData.points.length > 0 ? (
                <DailyAnalysis
                  points={dailyData.points}
                  heatmaps={dailyData.heatmaps}
                  isDarkMode={isDarkMode}
                  selectedDate={dailyDate}
                  onPrevDay={handlePrevDay}
                  onNextDay={handleNextDay}
                  onToday={handleToday}
                  isToday={isDailyToday}
                />
              ) : (
                <div className="h-[250px] flex items-center justify-center border border-dashed rounded-lg text-slate-400 dark:text-slate-500">
                  Tidak ada observasi cuaca pada tanggal terpilih
                </div>
              )}
            </TabsContent>

            {/* Weekly Tab Content */}
            <TabsContent value="weekly" className="space-y-8 outline-none">
              {weeklyData?.points && weeklyData.points.length > 0 ? (
                <>
                  {/* Time Series section */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" /> Tren Waktu Jam-demi-Jam (Plotly)
                    </h3>
                    <WeeklyAnalysis points={weeklyData.points} isDarkMode={isDarkMode} />
                  </div>

                  {/* Distribution Frequency section */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-500" /> Analisis Distribusi Frekuensi (ECharts)
                    </h3>
                    <DistributionAnalysis
                      histograms={weeklyData.histograms}
                      isDarkMode={isDarkMode}
                    />
                  </div>

                  {/* 2D Heatmap Matrix section */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Map className="h-4 w-4 text-pink-500" /> Pola 2D Heatmap Diurnal (Plotly)
                    </h3>
                    <HeatmapAnalysis heatmaps={weeklyData.heatmaps} isDarkMode={isDarkMode} />
                  </div>
                </>
              ) : (
                <div className="h-[250px] flex items-center justify-center border border-dashed rounded-lg text-slate-400 dark:text-slate-500">
                  Tidak ada observasi cuaca pada periode terpilih
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
