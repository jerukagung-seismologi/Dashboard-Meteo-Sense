"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Activity, Database, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeatherVarMeta, LoadedDataContext } from "./types";
import { SensorDate } from "@/lib/FetchingSensorData";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <Skeleton className="h-[380px] w-full rounded-xl" />,
});

export interface CorrectionChartPanelProps {
  chartOptions: any;
  rawRecords: SensorDate[];
  selectedVar: WeatherVarMeta;
  showReferenceGuide: boolean;
  setShowReferenceGuide: (val: boolean) => void;
  activeRefLabel: string;
  solarRefSource: "self_history" | "station_aws" | "model_ecmwf";
  referenceModelType: "ecmwf_ifs" | "era5";
  setReferenceModelType: (val: "ecmwf_ifs" | "era5") => void;
  fetchReferenceGuide: (dev?: any, s?: string, e?: string, m?: any) => void;
  loadedContext: LoadedDataContext | null;
  startDateStr: string;
  endDateStr: string;
  stats: any;
  syncRhRecovery: boolean;
  setShowConfirmModal: (val: boolean) => void;
  modifiedItemsCount: number;
  isApplying: boolean;
  isFilterDirty: boolean;
}

export function CorrectionChartPanel({
  chartOptions,
  rawRecords,
  selectedVar,
  showReferenceGuide,
  setShowReferenceGuide,
  activeRefLabel,
  solarRefSource,
  referenceModelType,
  setReferenceModelType,
  fetchReferenceGuide,
  loadedContext,
  startDateStr,
  endDateStr,
  stats,
  syncRhRecovery,
  setShowConfirmModal,
  modifiedItemsCount,
  isApplying,
  isFilterDirty,
}: CorrectionChartPanelProps) {
  return (
    <Card className="border shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="py-4 px-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Pratinjau Koreksi
          </CardTitle>
          <CardDescription className="text-xs">
            Merah: Raw | Hijau: Terkoreksi
            {showReferenceGuide && ` | Cyan: ${activeRefLabel}`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Switch
              id="toggle-ref-guide"
              checked={showReferenceGuide}
              onCheckedChange={setShowReferenceGuide}
            />
            <Label htmlFor="toggle-ref-guide" className="text-xs font-medium cursor-pointer text-cyan-600 dark:text-cyan-400">
              Garis Acuan
            </Label>
          </div>
          {solarRefSource === "model_ecmwf" && (
            <Select
              value={referenceModelType}
              onValueChange={(val: "ecmwf_ifs" | "era5") => {
                setReferenceModelType(val);
                fetchReferenceGuide(
                  undefined,
                  loadedContext?.startDateStr || startDateStr,
                  loadedContext?.endDateStr || endDateStr,
                  val
                );
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ecmwf_ifs">ECMWF IFS</SelectItem>
                <SelectItem value="era5">ERA5 Reanalysis</SelectItem>
              </SelectContent>
            </Select>
          )}
          {stats && stats.modifiedCount === 0 && rawRecords.length > 0 && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs">
              Δ=0 • Belum ada koreksi
            </Badge>
          )}
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs">
            {rawRecords.length} Titik Observasi
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {rawRecords.length === 0 ? (
          <div className="h-[360px] flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Database className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm">Silakan pilih stasiun dan rentang waktu lalu klik &quot;Ambil Data Target&quot;</p>
          </div>
        ) : (
          <ReactECharts
            option={chartOptions}
            notMerge={true}
            style={{ height: "380px", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        )}
      </CardContent>

      {/* Statistical Impact Metrics */}
      {stats && (
        <CardFooter className="py-3 px-5 border-t bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 w-full md:w-auto">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Titik Terkoreksi:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {stats.modifiedCount} / {stats.count} ({stats.modifiedPercent}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Rata-rata (μ):</span>
              <span className="font-mono font-medium">
                {stats.rawMean} → <strong className="text-emerald-600 dark:text-emerald-400">{stats.corrMean}</strong> {selectedVar.unit}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Rentang [Min, Max]:</span>
              <span className="font-mono font-medium">
                [{stats.corrMin}, {stats.corrMax}] {selectedVar.unit}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Deviasi Standar (σ):</span>
              <span className="font-mono font-medium">
                {stats.rawStd} → {stats.corrStd}
              </span>
            </div>
            {syncRhRecovery && selectedVar.key === "temperature" && (stats.rhModifiedCount ?? 0) > 0 && (
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Pemulihan RH (Magnus):</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {Number(stats.meanRhRecovery) > 0 ? `+${stats.meanRhRecovery}` : stats.meanRhRecovery}% ({stats.rhModifiedCount} titik)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={() => setShowConfirmModal(true)}
              disabled={modifiedItemsCount === 0 || isApplying || isFilterDirty}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm h-9 px-4"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Terapkan Koreksi ({modifiedItemsCount} Titik)
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
