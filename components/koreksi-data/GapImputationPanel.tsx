"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  Sparkles,
  History,
  Database,
  Sun,
  Activity,
  RefreshCw,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Device } from "@/lib/FetchingDevice";
import { SensorDate } from "@/lib/FetchingSensorData";
import {
  ImputedGridPoint,
  ImputationSummary,
  getWibTimeComponents,
} from "@/lib/meteorologicalImputationEngine";
import { WeatherVarMeta, NumericInputField } from "./types";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <Skeleton className="h-[380px] w-full rounded-xl" />,
});

export interface GapImputationPanelProps {
  imputationResult: { summary: ImputationSummary; grid: ImputedGridPoint[] };
  gapImputeMethod: "auto_hybrid" | "self_history" | "companion_ridge" | "model_guided" | "pchip_spline";
  setGapImputeMethod: (method: "auto_hybrid" | "self_history" | "companion_ridge" | "model_guided" | "pchip_spline") => void;
  historyLookbackDays: 1 | 3 | 7;
  handleChangeHistoryLookback: (days: 1 | 3 | 7) => Promise<void> | void;
  loadingSelfHistory: boolean;
  selfHistoryRecords: SensorDate[];
  solarRefStationId: string;
  setSolarRefStationId: (val: string) => void;
  devices: Device[];
  sensorId: string;
  fetchRefStationData: (stationId: string) => Promise<void>;
  loadingRefStation: boolean;
  refStationRecords: SensorDate[];
  gapMicroLimitMinutes: number;
  setGapMicroLimitMinutes: (val: number) => void;
  enableGapBridging: boolean;
  setEnableGapBridging: (val: boolean) => void;
  enableGapPhysics: boolean;
  setEnableGapPhysics: (val: boolean) => void;
  gapChartOptions: any;
  isApplyingImputation: boolean;
  isFilterDirty: boolean;
  setShowImputationConfirmModal: (show: boolean) => void;
  selectedVar: WeatherVarMeta;
}

export function GapImputationPanel({
  imputationResult,
  gapImputeMethod,
  setGapImputeMethod,
  historyLookbackDays,
  handleChangeHistoryLookback,
  loadingSelfHistory,
  selfHistoryRecords,
  solarRefStationId,
  setSolarRefStationId,
  devices,
  sensorId,
  fetchRefStationData,
  loadingRefStation,
  refStationRecords,
  gapMicroLimitMinutes,
  setGapMicroLimitMinutes,
  enableGapBridging,
  setEnableGapBridging,
  enableGapPhysics,
  setEnableGapPhysics,
  gapChartOptions,
  isApplyingImputation,
  isFilterDirty,
  setShowImputationConfirmModal,
  selectedVar,
}: GapImputationPanelProps) {
  return (
    <div className="space-y-6">
      {/* 1. Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="border shadow-2xs bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Grid Waktu Target
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {imputationResult.summary.totalExpectedMinutes.toLocaleString("id-ID")} Menit
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Resolusi Kontinu 1-Menit (1440/hari)
            </span>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Observasi Riil
            </span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {imputationResult.summary.originalAvailableCount.toLocaleString("id-ID")} Menit
            </div>
            <span className="text-[10px] text-emerald-600/80 mt-0.5 block">
              {(
                (imputationResult.summary.originalAvailableCount /
                  Math.max(1, imputationResult.summary.totalExpectedMinutes)) *
                100
              ).toFixed(1)}
              % Terisi Aktual
            </span>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Celah Kosong (Gaps)
            </span>
            <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
              {imputationResult.summary.originalMissingCount.toLocaleString("id-ID")} Menit
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {imputationResult.summary.microGapsCount} Mikro (≤15m) • {imputationResult.summary.macroGapsCount} Makro (&gt;15m)
            </span>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Kelengkapan Imputasi
            </span>
            <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {imputationResult.summary.completenessPercent}%
            </div>
            <span className="text-[10px] text-indigo-600/80 mt-0.5 block">
              100% Kontinu Tanpa Celah
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 2. Method Configuration Panel for Imputation */}
      <Card className="border shadow-sm">
        <CardHeader className="py-4 px-5 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Algoritma Imputasi Celah
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Grid 5 Methods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {[
              {
                id: "auto_hybrid",
                title: "2-Fase Hibrida",
                desc: "Mikro PCHIP + adaptasi node",
                icon: Sparkles,
              },
              {
                id: "self_history",
                title: "Pola Node (H-1..N)",
                desc: "Profil diurnal stasiun ini",
                icon: History,
              },
              {
                id: "companion_ridge",
                title: "AWS Tetangga (Ridge)",
                desc: "Adaptasi kurva stasiun sebelah",
                icon: Database,
              },
              {
                id: "model_guided",
                title: "Model ECMWF / ERA5",
                desc: "Penuntun atmosfer Open-Meteo",
                icon: Sun,
              },
              {
                id: "pchip_spline",
                title: "Kubik PCHIP",
                desc: "Kurva monoton internal",
                icon: Activity,
              },
            ].map((m) => {
              const IconComp = m.icon;
              const isActive = gapImputeMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGapImputeMethod(m.id as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isActive
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-500"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-purple-700 dark:text-purple-300 mb-0.5">
                    <IconComp className="h-3.5 w-3.5 text-purple-500" />
                    {m.title}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {m.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Imputation Settings Bar */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* Lookback window */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Histori Pola Node (H-1..N):
              </Label>
              <div className="flex items-center gap-1.5">
                {([1, 3, 7] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={historyLookbackDays === d ? "default" : "outline"}
                    onClick={() => handleChangeHistoryLookback(d)}
                    className={`h-8 text-xs flex-1 font-mono ${
                      historyLookbackDays === d
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : ""
                    }`}
                  >
                    {d} Hari
                  </Button>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {loadingSelfHistory
                  ? "Memuat histori node..."
                  : selfHistoryRecords.length > 0
                    ? `✓ ${selfHistoryRecords.length} titik historis siap`
                    : "Histori node kosong"}
              </span>
            </div>

            {/* Companion station selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Stasiun Pendamping:
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={solarRefStationId}
                  onValueChange={(val) => {
                    setSolarRefStationId(val);
                    fetchRefStationData(val);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Pilih Stasiun" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices
                      .filter((d) => (d.authToken || d.id) !== sensorId)
                      .map((device) => {
                        const devVal = (device.authToken || device.id) as string;
                        return (
                          <SelectItem key={device.id} value={devVal}>
                            {device.name} ({devVal})
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fetchRefStationData(solarRefStationId)}
                  disabled={loadingRefStation}
                  className="h-8 text-xs px-2.5"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${loadingRefStation ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {refStationRecords.length > 0
                  ? `✓ ${refStationRecords.length} titik siap`
                  : "Opsional untuk Ridge spasial"}
              </span>
            </div>

            {/* Micro-gap threshold slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Batas Celah Mikro: {gapMicroLimitMinutes}m
                </Label>
                <span className="text-[10px] text-slate-400 font-mono">
                  ≤{gapMicroLimitMinutes}m PCHIP
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={Math.min(60, Math.max(5, gapMicroLimitMinutes))}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setGapMicroLimitMinutes(v);
                  }}
                  className="flex-1 accent-purple-600 cursor-pointer"
                />
                <NumericInputField
                  min={5}
                  max={120}
                  step={5}
                  value={gapMicroLimitMinutes}
                  onCommit={(v) => setGapMicroLimitMinutes(Math.round(v))}
                  className="w-16 h-7 text-xs font-mono text-right px-2"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 flex flex-col justify-center">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableBridgingSwitch"
                  checked={enableGapBridging}
                  onCheckedChange={setEnableGapBridging}
                />
                <Label
                  htmlFor="enableBridgingSwitch"
                  className="cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                >
                  Boundary Bridging
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enablePhysicsSwitch"
                  checked={enableGapPhysics}
                  onCheckedChange={setEnableGapPhysics}
                />
                <Label
                  htmlFor="enablePhysicsSwitch"
                  className="cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                >
                  Filter Fisika WMO
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. ECharts Gap Imputation Visualizer */}
      <Card className="border shadow-sm">
        <CardHeader className="py-4 px-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              Pratinjau Grid 1-Menit
            </CardTitle>
            <CardDescription className="text-xs">
              Hijau: Observasi | Ungu: Imputasi | Area: Celah
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="border-purple-500/40 text-purple-600 dark:text-purple-400 text-xs"
          >
            {imputationResult.grid.length} Menit Kontinu
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          {imputationResult.grid.length === 0 ? (
            <div className="h-[360px] flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Database className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm">
                Silakan pilih stasiun dan rentang waktu lalu klik &quot;Ambil Data Target&quot;
              </p>
            </div>
          ) : (
            <ReactECharts
              option={gapChartOptions}
              notMerge={true}
              style={{ height: "380px", width: "100%" }}
              opts={{ renderer: "canvas" }}
            />
          )}
        </CardContent>

        <CardFooter className="py-3 px-5 border-t bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
            <div>
              <span>Total Celah Diisi: </span>
              <strong className="text-purple-600 dark:text-purple-400 font-mono">
                {imputationResult.summary.originalMissingCount} Menit
              </strong>
            </div>
            <div>
              <span>Fase 1 (Mikro): </span>
              <strong className="font-mono text-amber-600">
                {imputationResult.summary.filledMicroCount} m
              </strong>
            </div>
            <div>
              <span>Fase 2 (Makro): </span>
              <strong className="font-mono text-purple-600">
                {imputationResult.summary.filledMacroCount} m
              </strong>
            </div>
          </div>

          <Button
            onClick={() => setShowImputationConfirmModal(true)}
            disabled={
              imputationResult.summary.originalMissingCount === 0 ||
              isApplyingImputation ||
              isFilterDirty
            }
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm h-9 px-4 ml-auto"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Tuliskan Data Imputasi ke Firebase ({imputationResult.summary.originalMissingCount} Menit)
          </Button>
        </CardFooter>
      </Card>

      {/* 4. Table of Gap Segments */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-5 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            Daftar Segmen Celah Data yang Terdeteksi &amp; Terisi (
            {imputationResult.summary.segments.length} Segmen)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-60">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5 pl-5 font-semibold">Segmen ID</th>
                  <th className="p-2.5 font-semibold">Waktu Mulai (WIB)</th>
                  <th className="p-2.5 font-semibold">Waktu Selesai (WIB)</th>
                  <th className="p-2.5 font-semibold">Durasi</th>
                  <th className="p-2.5 font-semibold">Kategori</th>
                  <th className="p-2.5 font-semibold">Nilai Batas (Start → End)</th>
                  <th className="p-2.5 pr-5 font-semibold">Metode Rekonstruksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {imputationResult.summary.segments.map((seg, idx) => (
                  <tr
                    key={seg.id || idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  >
                    <td className="p-2.5 pl-5 font-mono text-slate-500">#{idx + 1}</td>
                    <td className="p-2.5 font-mono">
                      {getWibTimeComponents(seg.startTs).dateFormatted}
                    </td>
                    <td className="p-2.5 font-mono">
                      {getWibTimeComponents(seg.endTs).dateFormatted}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-200">
                      {seg.durationMinutes} Menit
                    </td>
                    <td className="p-2.5">
                      {seg.type === "micro" ? (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-600 dark:text-amber-400 text-[10px] py-0 px-1.5"
                        >
                          Mikro (≤{gapMicroLimitMinutes}m)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-purple-400 text-purple-600 dark:text-purple-400 text-[10px] py-0 px-1.5"
                        >
                          Makro (&gt;{gapMicroLimitMinutes}m)
                        </Badge>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-slate-500">
                      {seg.valBefore !== null
                        ? `${seg.valBefore} ${selectedVar.unit}`
                        : "Awal Rentang"}{" "}
                      ➔{" "}
                      {seg.valAfter !== null
                        ? `${seg.valAfter} ${selectedVar.unit}`
                        : "Akhir Rentang"}
                    </td>
                    <td className="p-2.5 pr-5">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {seg.type === "micro"
                          ? "Fase 1 (Spline Hermite)"
                          : `Fase 2 (${gapImputeMethod.toUpperCase()})`}
                      </span>
                    </td>
                  </tr>
                ))}
                {imputationResult.summary.segments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-6 text-slate-400">
                      Tidak ditemukan celah data kosong pada rentang waktu ini. Observasi 100% lengkap!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
