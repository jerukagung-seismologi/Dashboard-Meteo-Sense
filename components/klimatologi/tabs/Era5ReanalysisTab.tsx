"use client";

import React from "react";
import {
  Sparkles,
  Compass,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CurrentConditions } from "@/components/reanalysis/CurrentConditions";
import { TimeSeriesCharts } from "@/components/reanalysis/TimeSeriesCharts";
import { HovmollerDiagram } from "@/components/reanalysis/HovmollerDiagram";
import { DistributionAnalysis } from "@/components/reanalysis/DistributionAnalysis";
import { DiurnalCycle } from "@/components/reanalysis/DiurnalCycle";
import { WeeklyAnalysis } from "@/components/reanalysis/WeeklyAnalysis";
import { MonthlyAnalysis } from "@/components/reanalysis/MonthlyAnalysis";
import { AnnualAnalysis } from "@/components/reanalysis/AnnualAnalysis";
import { WindRose } from "@/components/reanalysis/WindRose";
import { ForecastDiagnostics } from "@/components/reanalysis/ForecastDiagnostics";

export interface Era5ReanalysisTabProps {
  activeLocation: { name: string; [key: string]: any };
  timePreset: string;
  setTimePreset: (val: string) => void;
  mutateEra5: () => void;
  isEra5Loading: boolean;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  maxEndDate: string;
  dateRangeValidation: { isValid: boolean; message?: string };
  era5Data: any;
  era5Error: any;
  isDarkMode: boolean;
  renderEra5Loading: () => React.ReactNode;
}

export function Era5ReanalysisTab({
  activeLocation,
  timePreset,
  setTimePreset,
  mutateEra5,
  isEra5Loading,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  maxEndDate,
  dateRangeValidation,
  era5Data,
  era5Error,
  isDarkMode,
  renderEra5Loading,
}: Era5ReanalysisTabProps) {
  return (
    <div className="space-y-6">
      {/* ERA5 Top Control & Period Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Reanalisis Global ECMWF ERA5 (1940–sekarang)
            </span>
            <span className="text-[11px] text-slate-500">Resolusi Grid 0.25° (~25–31 km)</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Compass className="h-4 w-4 text-purple-500" /> Profil Reanalisis Atmosfer: {activeLocation.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Deret waktu multi-level, diagram kontur Hovmöller, siklus diurnal, analisis mawar angin, dan energi konvektif atmosfer (CAPE).
          </p>
        </div>

        {/* Rentang Waktu Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border rounded-lg p-0.5 bg-white dark:bg-slate-950 dark:border-slate-800 text-xs">
            {[
              ["1y", "1 Tahun"],
              ["6m", "6 Bulan"],
              ["3m", "3 Bulan"],
              ["30d", "30 Hari"],
              ["custom", "Kustom"],
            ].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setTimePreset(val)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition duration-150 ${
                  timePreset === val
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => mutateEra5()}
            disabled={isEra5Loading}
            className="h-8 text-xs border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isEra5Loading ? "animate-spin" : ""}`} />
            Perbarui
          </Button>
        </div>
      </div>

      {/* Custom Date Pickers if timePreset === 'custom' */}
      {timePreset === "custom" && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Mulai:</span>
              <Input
                type="date"
                max={maxEndDate}
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs w-36 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Selesai:</span>
              <Input
                type="date"
                max={maxEndDate}
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs w-36 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            {!dateRangeValidation.isValid && (
              <span className="text-red-500 text-xs flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {dateRangeValidation.message}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* ERA5 Content */}
      {isEra5Loading ? (
        renderEra5Loading()
      ) : era5Error ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Gagal Memproses Reanalisis ERA5
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {era5Error.message || "Kesalahan koneksi atau format respon."}
            </p>
            <Button
              onClick={() => mutateEra5()}
              variant="outline"
              size="sm"
              className="mt-2 text-xs border-red-200 hover:bg-red-100 text-red-700"
            >
              Ulangi Request
            </Button>
          </CardContent>
        </Card>
      ) : !era5Data ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 border rounded-xl shadow-sm text-center">
          <Compass className="h-14 w-14 text-indigo-400 dark:text-indigo-600 mb-4 animate-spin-slow" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Memuat Data Reanalisis...</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">
            Menghubungi Open-Meteo Archive untuk koordinat {activeLocation.name}...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Location Info Metadata Banner */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 text-xs font-semibold border dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="h-4 w-4 text-purple-500" />
              <span className="text-slate-900 dark:text-slate-100 font-bold">{activeLocation.name}</span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">
                {era5Data.latitude.toFixed(4)}°N, {era5Data.longitude.toFixed(4)}°E
              </span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-slate-700 dark:text-slate-300">
                Ketinggian: <strong>{era5Data.elevation} m dpl</strong>
              </span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-slate-700 dark:text-slate-300">Zona Waktu: {era5Data.timezone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 font-normal">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span>Periode Analisis: </span>
              <strong className="text-slate-800 dark:text-slate-200 font-bold">
                {era5Data.startDate} s.d. {era5Data.endDate}
              </strong>
            </div>
          </div>

          {/* Current Conditions Summary */}
          <CurrentConditions current={era5Data.current} />

          {/* Full Width ERA5 Analysis Tabs */}
          <Tabs defaultValue="time-series" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1 bg-slate-100 dark:bg-slate-950 border dark:border-slate-800 rounded-xl text-xs gap-1">
              <TabsTrigger value="time-series" className="py-2.5 font-bold">Deret Waktu</TabsTrigger>
              <TabsTrigger value="hovmoller" className="py-2.5 font-bold">Diagram Hovmöller</TabsTrigger>
              <TabsTrigger value="diurnal" className="py-2.5 font-bold">Siklus Distribusi</TabsTrigger>
              <TabsTrigger value="climatology" className="py-2.5 font-bold">Tren Klimatologi</TabsTrigger>
              <TabsTrigger value="wind-diagnostics" className="py-2.5 font-bold">Mawar Angin &amp; Diagnostik</TabsTrigger>
            </TabsList>

            <TabsContent value="time-series" className="mt-6 space-y-6">
              <TimeSeriesCharts
                times={era5Data.hourly.times}
                temperature={era5Data.hourly.temperature}
                humidity={era5Data.hourly.humidity}
                pressure={era5Data.hourly.pressure}
                rain={era5Data.hourly.rain}
                windSpeed={era5Data.hourly.windSpeed}
                windGust={era5Data.hourly.windGust}
                radiation={era5Data.hourly.radiation}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            <TabsContent value="hovmoller" className="mt-6">
              <HovmollerDiagram
                days={era5Data.hovmoller.days}
                hours={era5Data.hovmoller.hours}
                temperature={era5Data.hovmoller.temperature}
                humidity={era5Data.hovmoller.humidity}
                pressure={era5Data.hovmoller.pressure}
                rain={era5Data.hovmoller.rain}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            <TabsContent value="diurnal" className="mt-6 space-y-6">
              <DiurnalCycle data={era5Data.diurnal} isDarkMode={isDarkMode} />
              <DistributionAnalysis
                temperature={era5Data.hourly.temperature}
                humidity={era5Data.hourly.humidity}
                pressure={era5Data.hourly.pressure}
                windSpeed={era5Data.hourly.windSpeed}
                rain={era5Data.hourly.rain}
                stats={era5Data.stats}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            <TabsContent value="climatology" className="mt-6 space-y-6">
              <WeeklyAnalysis
                days={era5Data.weekly.days}
                temperature={era5Data.weekly.temperature}
                humidity={era5Data.weekly.humidity}
                pressure={era5Data.weekly.pressure}
                windSpeed={era5Data.weekly.windSpeed}
                isDarkMode={isDarkMode}
              />
              <MonthlyAnalysis
                months={era5Data.monthly.months}
                temperature={era5Data.monthly.temperature}
                humidity={era5Data.monthly.humidity}
                pressure={era5Data.monthly.pressure}
                rain={era5Data.monthly.rain}
                isDarkMode={isDarkMode}
              />
              <AnnualAnalysis
                days={era5Data.annual.days}
                temperatureMean={era5Data.annual.temperatureMean}
                humidityMean={era5Data.annual.humidityMean}
                pressureMean={era5Data.annual.pressureMean}
                rainAccumulated={era5Data.annual.rainAccumulated}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            <TabsContent value="wind-diagnostics" className="mt-6 space-y-6">
              <WindRose
                data={era5Data.windRose}
                isDarkMode={isDarkMode}
                windSpeedStats={era5Data.stats.windSpeed}
              />
              <ForecastDiagnostics
                scatter={era5Data.scatter}
                radiation={era5Data.radiation}
                cape={era5Data.cape}
                diagnostics={era5Data.diagnostics}
                isDarkMode={isDarkMode}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
