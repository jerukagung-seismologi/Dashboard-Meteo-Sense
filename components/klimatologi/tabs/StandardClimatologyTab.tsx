"use client";

import React from "react";
import {
  Globe,
  BarChart3,
  RefreshCw,
  Radio,
  Thermometer,
  CloudRain,
  Waves,
  Gauge,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PresetSelector } from "@/components/climatology/PresetSelector";
import { ClimateExtremesCards } from "@/components/climatology/ClimateExtremesCards";
import { TemperatureCharts } from "@/components/climatology/TemperatureCharts";
import { RainfallCharts } from "@/components/climatology/RainfallCharts";
import { HumidityCharts } from "@/components/climatology/HumidityCharts";
import { PressureCharts } from "@/components/climatology/PressureCharts";
import { TempDewComparisonCharts } from "@/components/climatology/TempDewComparisonCharts";
import { Era5ClimatologyCharts } from "@/components/climatology/Era5ClimatologyCharts";

export interface StandardClimatologyTabProps {
  locationMode: "station" | "region";
  setLocationMode: (mode: "station" | "region") => void;
  activeLocation: { name: string; [key: string]: any };
  activeCoords: { lat: number; lng: number };
  isEra5BaselineLoading: boolean;
  era5BaselineData: any;
  handleRefreshKlim: () => void;
  devices: any[];
  currentDevice: any;
  preset: string;
  setPreset: (preset: any) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedDasarian: number;
  setSelectedDasarian: (dasarian: number) => void;
  isKlimLoading: boolean;
  klimData: any;
  klimError: any;
  periodNormals: any;
  climateExtremes: any;
  isDarkMode: boolean;
  renderKlimLoading: () => React.ReactNode;
}

export function StandardClimatologyTab({
  locationMode,
  setLocationMode,
  activeLocation,
  activeCoords,
  isEra5BaselineLoading,
  era5BaselineData,
  handleRefreshKlim,
  devices,
  currentDevice,
  preset,
  setPreset,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  selectedDasarian,
  setSelectedDasarian,
  isKlimLoading,
  klimData,
  klimError,
  periodNormals,
  climateExtremes,
  isDarkMode,
  renderKlimLoading,
}: StandardClimatologyTabProps) {
  if (locationMode === "region") {
    return (
      <div className="space-y-6">
        {/* Regional Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 text-[10px] font-bold">
                <Globe className="h-3 w-3 mr-1 text-indigo-500" /> Analisis Spasial Regional
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-[10px]">
                ECMWF ERA5-Land (~9 km)
              </Badge>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px]">
                WMO Standard Normal 1991–2020
              </Badge>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Klimatologi Grid &amp; Distribusi Statistik: {activeLocation.name}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Sintesis multidekade komprehensif tanpa memerlukan sensor fisik in-situ: Siklus 12-bulan, fluktuasi diurnal 24-jam, distribusi persentil statistik WMO (Boxplot, ECDF, Fan Chart), dan rentang ekstremitas iklim regional.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshKlim}
              disabled={isEra5BaselineLoading}
              className="h-8 text-xs border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isEra5BaselineLoading ? "animate-spin" : ""}`} /> Perbarui Data Grid
            </Button>
            {devices.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocationMode("station")}
                className="h-8 text-xs border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50"
              >
                <Radio className="h-3.5 w-3.5 mr-1.5 text-teal-500" /> Ke Stasiun Sensor IoT
              </Button>
            )}
          </div>
        </div>

        {/* High-Resolution Regional ERA5 & WMO Climatology Charts */}
        <Era5ClimatologyCharts
          era5Data={era5BaselineData}
          isLoading={isEra5BaselineLoading}
          stationPoints={[]}
          stationName={activeLocation.name}
          coordinates={activeCoords}
          isDarkMode={isDarkMode}
          selectedYear={selectedYear}
        />
      </div>
    );
  }

  // Branch 2: Station Mode
  return (
    <div className="space-y-6">
      {/* Station Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 rounded-xl border border-teal-200 dark:border-teal-900/50">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold">
              <Radio className="h-3 w-3 mr-1 text-emerald-500" /> Stasiun Telemetri In-Situ
            </Badge>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-[10px]">
              Sensor ID: {currentDevice?.value ?? "-"}
            </Badge>
          </div>
          <h2 className="text-base font-bold text-teal-950 dark:text-teal-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            Observasi Sensor Fisik vs Normal WMO 1991–2020 &amp; Sifat Hujan BMKG
          </h2>
          <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
            Evaluasi data pengamatan sensor fisik <strong>{activeLocation.name}</strong> terhadap acuan normal 30-tahun WMO &amp; Sifat Hujan BMKG (AN &gt;115%, N 85–115%, BN &lt;85%).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocationMode("region")}
            className="h-8 text-xs border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
          >
            <Globe className="h-3.5 w-3.5 mr-1 text-indigo-500" /> Jelajahi Wilayah Lain
          </Button>
        </div>
      </div>

      {/* Preset & Filter Controls */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <PresetSelector
            preset={preset}
            setPreset={setPreset}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedDasarian={selectedDasarian}
            setSelectedDasarian={setSelectedDasarian}
            isLoading={isKlimLoading}
            onRefresh={handleRefreshKlim}
          />
        </CardContent>
      </Card>

      {/* Persistent Station vs WMO Normal Comparative KPI Bar */}
      {klimData?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-red-500" /> Rerata Suhu Observasi
            </span>
            <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
              {klimData.stats.temperature.mean.toFixed(1)}°C
            </div>
            <div className="text-[10px] text-slate-500">
              Normal WMO: <strong className="text-slate-700 dark:text-slate-300">{periodNormals?.temperature.mean?.toFixed(1) ?? "-"}°C</strong>
              {periodNormals?.temperature.mean && (
                <span className={`ml-1 font-bold ${klimData.stats.temperature.mean - periodNormals.temperature.mean > 0 ? "text-rose-500" : "text-sky-500"}`}>
                  ({klimData.stats.temperature.mean - periodNormals.temperature.mean > 0 ? "+" : ""}
                  {(klimData.stats.temperature.mean - periodNormals.temperature.mean).toFixed(1)}°)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
              <CloudRain className="h-3.5 w-3.5 text-cyan-500" /> Akumulasi Curah Hujan
            </span>
            <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
              {klimData.stats.rainfall.total.toFixed(1)} mm
            </div>
            <div className="text-[10px] text-slate-500">
              Normal WMO: <strong className="text-slate-700 dark:text-slate-300">{periodNormals?.rainfall.normal?.toFixed(1) ?? "-"} mm</strong>
              {periodNormals?.rainfall.normal && periodNormals.rainfall.normal > 0 && (
                <span className="ml-1 font-bold text-cyan-600 dark:text-cyan-400">
                  ({((klimData.stats.rainfall.total / periodNormals.rainfall.normal) * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
              <Waves className="h-3.5 w-3.5 text-blue-500" /> Rerata Kelembaban
            </span>
            <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
              {klimData.stats.humidity.mean.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500">
              Normal ERA5: <strong className="text-slate-700 dark:text-slate-300">{periodNormals?.humidity.mean?.toFixed(1) ?? "-"}%</strong>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-indigo-500" /> Rerata Tekanan Barometrik
            </span>
            <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
              {klimData.stats.pressure.mean.toFixed(1)} hPa
            </div>
            <div className="text-[10px] text-slate-500">
              Normal ERA5: <strong className="text-slate-700 dark:text-slate-300">{periodNormals?.pressure.mean?.toFixed(1) ?? "-"} hPa</strong>
            </div>
          </div>
        </div>
      )}

      {/* Station Data Rendering */}
      {isKlimLoading ? (
        renderKlimLoading()
      ) : klimError ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-semibold">{klimError.message || "Gagal memuat data iklim stasiun."}</p>
          </CardContent>
        </Card>
      ) : !klimData || !klimData.points || klimData.points.length === 0 ? (
        <div className="space-y-4 p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
          <Activity className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Tidak Ada Rekaman Telemetri Sensor untuk Periode Ini
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Stasiun <strong>{activeLocation.name}</strong> tidak mengirimkan data log telemetri pada rentang waktu yang dipilih ({preset}). Silakan pilih bulan/dasarian/tahun lain atau ubah ke <strong>Mode Pencarian Wilayah</strong> untuk menganalisis data reanalisis grid.
          </p>
        </div>
      ) : (
        <>
          {/* Climate Extremes KPI Cards */}
          <ClimateExtremesCards extremes={climateExtremes} stats={klimData.stats} />

          {/* Detailed Parameter Analytics Tabs */}
          <Tabs defaultValue="temperature" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1 bg-slate-100 dark:bg-slate-900 border rounded-lg">
              <TabsTrigger value="temperature" className="py-2.5">Suhu Udara</TabsTrigger>
              <TabsTrigger value="comparison" className="py-2.5">Titik Embun</TabsTrigger>
              <TabsTrigger value="humidity" className="py-2.5">Kelembaban Relatif</TabsTrigger>
              <TabsTrigger value="rainfall" className="py-2.5">Curah Hujan</TabsTrigger>
              <TabsTrigger value="pressure" className="py-2.5">Tekanan Udara</TabsTrigger>
              <TabsTrigger value="era5_normal" className="py-2.5 font-medium flex items-center justify-center gap-1.5">
                <span>Normal ERA5</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">Iklim</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="temperature" className="mt-6">
              <TemperatureCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} stdDev={klimData.stats.temperature.stdDev} observedMean={klimData.stats.temperature.mean} era5NormalTemp={periodNormals?.temperature.mean} monthlyNormals={periodNormals?.temperature.monthly} />
            </TabsContent>
            <TabsContent value="rainfall" className="mt-6">
              <RainfallCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} totalRainfall={klimData.stats.rainfall.total} era5NormalRain={periodNormals?.rainfall.normal} monthlyNormals={periodNormals?.rainfall.monthly} />
            </TabsContent>
            <TabsContent value="humidity" className="mt-6">
              <HumidityCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} stdDev={klimData.stats.humidity.stdDev} observedMean={klimData.stats.humidity.mean} era5NormalHum={periodNormals?.humidity.mean} monthlyNormals={periodNormals?.humidity.monthly} />
            </TabsContent>
            <TabsContent value="pressure" className="mt-6">
              <PressureCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} stdDev={klimData.stats.pressure.stdDev} observedMean={klimData.stats.pressure.mean} era5NormalPress={periodNormals?.pressure.mean} monthlyNormals={periodNormals?.pressure.monthly} />
            </TabsContent>
            <TabsContent value="comparison" className="mt-6">
              <TempDewComparisonCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} />
            </TabsContent>
            <TabsContent value="era5_normal" className="mt-6">
              <Era5ClimatologyCharts era5Data={era5BaselineData} isLoading={isEra5BaselineLoading} stationPoints={klimData.points} stationName={activeLocation.name} coordinates={activeCoords} isDarkMode={isDarkMode} selectedYear={selectedYear} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
