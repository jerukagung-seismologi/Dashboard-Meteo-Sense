import React from "react";
import {
  Wrench,
  SlidersHorizontal,
  Activity,
  ShieldAlert,
  Sparkles,
  Sun,
  Sliders,
  History,
  Database,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Device } from "@/lib/FetchingDevice";
import {
  WeatherVarMeta,
  CorrectionMethod,
  InterpolationSubMethod,
  NumericInputField,
} from "./types";

export interface MethodConfigPanelProps {
  selectedVar: WeatherVarMeta;
  correctionMethod: CorrectionMethod;
  setCorrectionMethod: (method: CorrectionMethod) => void;
  offsetValue: number;
  setOffsetValue: (val: number) => void;
  driftStart: number;
  setDriftStart: (val: number) => void;
  driftEnd: number;
  setDriftEnd: (val: number) => void;
  clampMin: number;
  setClampMin: (val: number) => void;
  clampMax: number;
  setClampMax: (val: number) => void;
  scaleFactor: number;
  setScaleFactor: (val: number) => void;
  onlyAnomalies: boolean;
  setOnlyAnomalies: (val: boolean) => void;
  enableSolarAnomalyCheck: boolean;
  setEnableSolarAnomalyCheck: (val: boolean) => void;
  anomaliesCount: number;
  interpolationSubMethod: InterpolationSubMethod;
  setInterpolationSubMethod: (sub: InterpolationSubMethod) => void;
  solarRefSource: "self_history" | "station_aws" | "model_ecmwf";
  setSolarRefSource: (source: "self_history" | "station_aws" | "model_ecmwf") => void;
  historyLookbackDays: 1 | 3 | 7;
  handleChangeHistoryLookback: (days: 1 | 3 | 7) => void;
  selfHistoryRecords: any[];
  loadingSelfHistory: boolean;
  fetchSelfHistoryData: (id?: string) => void;
  selfHistorySelectedProfile: any;
  solarRefStationId: string;
  setSolarRefStationId: (id: string) => void;
  refStationRecords: any[];
  loadingRefStation: boolean;
  fetchRefStationData: (id?: string) => void;
  devices: Device[];
  sensorId: string;
  referenceModelType: "ecmwf_ifs" | "era5";
  setReferenceModelType: (type: "ecmwf_ifs" | "era5") => void;
  referenceModelName: string;
  referenceGuidePoints: any[];
  loadingReference: boolean;
  fetchReferenceGuide: () => void;
  solarThreshold: number;
  setSolarThreshold: (val: number) => void;
  syncRhRecovery: boolean;
  setSyncRhRecovery: (val: boolean) => void;
  handleApplySolarOverheatingPreset: () => void;
  activeNodeAdapter: any;
  baselineNightOffset: number;
}

export function MethodConfigPanel({
  selectedVar,
  correctionMethod,
  setCorrectionMethod,
  offsetValue,
  setOffsetValue,
  driftStart,
  setDriftStart,
  driftEnd,
  setDriftEnd,
  clampMin,
  setClampMin,
  clampMax,
  setClampMax,
  scaleFactor,
  setScaleFactor,
  onlyAnomalies,
  setOnlyAnomalies,
  enableSolarAnomalyCheck,
  setEnableSolarAnomalyCheck,
  anomaliesCount,
  interpolationSubMethod,
  setInterpolationSubMethod,
  solarRefSource,
  setSolarRefSource,
  historyLookbackDays,
  handleChangeHistoryLookback,
  selfHistoryRecords,
  loadingSelfHistory,
  fetchSelfHistoryData,
  selfHistorySelectedProfile,
  solarRefStationId,
  setSolarRefStationId,
  refStationRecords,
  loadingRefStation,
  fetchRefStationData,
  devices,
  sensorId,
  referenceModelType,
  setReferenceModelType,
  referenceModelName,
  referenceGuidePoints,
  loadingReference,
  fetchReferenceGuide,
  solarThreshold,
  setSolarThreshold,
  syncRhRecovery,
  setSyncRhRecovery,
  handleApplySolarOverheatingPreset,
  activeNodeAdapter,
  baselineNightOffset,
}: MethodConfigPanelProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-4 px-5 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-indigo-500" />
              Metode Rekonstruksi &amp; Koreksi
            </CardTitle>
            <CardDescription className="text-xs">
              Pilih algoritma pemulihan atau penyesuaian nilai parameter observasi
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedVar.key === "temperature" && (
              <div className="flex items-center space-x-2 bg-amber-500/10 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/30">
                <Switch
                  id="enableSolarAnomalySwitch"
                  checked={enableSolarAnomalyCheck}
                  onCheckedChange={setEnableSolarAnomalyCheck}
                />
                <Label
                  htmlFor="enableSolarAnomalySwitch"
                  className="text-xs font-medium cursor-pointer text-amber-900 dark:text-amber-200"
                >
                  Deteksi Overheating Surya
                </Label>
              </div>
            )}
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Switch
                id="onlyAnomaliesSwitch"
                checked={onlyAnomalies}
                onCheckedChange={setOnlyAnomalies}
              />
              <Label htmlFor="onlyAnomaliesSwitch" className="text-xs font-medium cursor-pointer">
                Hanya Koreksi Titik Anomali ({anomaliesCount} Terdeteksi)
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {/* Radio-like Methods Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              id: "offset",
              title: "Offset Tetap (Δ)",
              desc: "Penyesuaian seragam",
              icon: SlidersHorizontal,
            },
            {
              id: "drift",
              title: "Pergeseran Linier",
              desc: "Koreksi drift waktu",
              icon: Activity,
            },
            {
              id: "clamp",
              title: "Batas Fisik (Clamp)",
              desc: "Penjepitan batas WMO",
              icon: ShieldAlert,
            },
            {
              id: "scale",
              title: "Faktor Skala (k)",
              desc: "Pengali rasio sensor",
              icon: Activity,
            },
            {
              id: "interpolate",
              title: "Interpolasi & Pola Node",
              desc: "Pola Node / AWS / Model",
              icon: Sparkles,
            },
          ].map((m) => {
            const IconComp = m.icon;
            const isActive = correctionMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const next = m.id as CorrectionMethod;
                  if (next !== correctionMethod) {
                    if (next === "interpolate" || next === "clamp") {
                      setOnlyAnomalies(true);
                    } else if (correctionMethod === "interpolate" || correctionMethod === "clamp") {
                      setOnlyAnomalies(false);
                    }
                  }
                  setCorrectionMethod(next);
                }}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComp className={`h-4 w-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                  <span className={`text-xs font-semibold ${isActive ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}>
                    {m.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{m.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Sub-panel Parameter Input Based on Method */}
        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80">
          {/* 1. Offset Tetap */}
          {correctionMethod === "offset" && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Offset (Δ): {offsetValue > 0 ? `+${offsetValue}` : offsetValue} {selectedVar.unit}
              </Label>
              <div className="flex items-center gap-3">
                <NumericInputField
                  step={selectedVar.step}
                  value={offsetValue}
                  onCommit={setOffsetValue}
                  className="w-32 h-9 text-xs"
                />
                <input
                  type="range"
                  min={-10 * selectedVar.step * 10}
                  max={10 * selectedVar.step * 10}
                  step={selectedVar.step}
                  value={offsetValue}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setOffsetValue(v);
                  }}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => setOffsetValue(0)}
                >
                  Reset 0
                </Button>
              </div>
            </div>
          )}

          {/* 2. Linear Drift */}
          {correctionMethod === "drift" && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Linear Drift Sepanjang Rentang
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-500">
                    Offset Awal (δ₀): {driftStart > 0 ? `+${driftStart}` : driftStart} {selectedVar.unit}
                  </Label>
                  <NumericInputField
                    step={selectedVar.step}
                    value={driftStart}
                    onCommit={setDriftStart}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-500">
                    Offset Akhir (δ₁): {driftEnd > 0 ? `+${driftEnd}` : driftEnd} {selectedVar.unit}
                  </Label>
                  <NumericInputField
                    step={selectedVar.step}
                    value={driftEnd}
                    onCommit={setDriftEnd}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Clamp WMO */}
          {correctionMethod === "clamp" && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Batas Penjepitan (Min / Max)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-500">
                    Batas Bawah (Min):
                  </Label>
                  <NumericInputField
                    step={selectedVar.step}
                    value={clampMin}
                    onCommit={setClampMin}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-500">
                    Batas Atas (Max):
                  </Label>
                  <NumericInputField
                    step={selectedVar.step}
                    value={clampMax}
                    onCommit={setClampMax}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Multiplicative Scaling Factor */}
          {correctionMethod === "scale" && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Faktor Pengali (k): {scaleFactor.toFixed(3)}x
              </Label>
              <div className="flex items-center gap-3">
                <NumericInputField
                  step={0.01}
                  min={0.1}
                  max={5.0}
                  value={scaleFactor}
                  onCommit={setScaleFactor}
                  className="w-32 h-9 text-xs"
                />
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.005}
                  value={scaleFactor}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setScaleFactor(v);
                  }}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => setScaleFactor(1.0)}
                >
                  Reset 1.0
                </Button>
              </div>
            </div>
          )}

          {/* 5. Meteorological Interpolation & Node Reference Guide */}
          {correctionMethod === "interpolate" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Metode Rekonstruksi
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplySolarOverheatingPreset}
                    className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold gap-1.5 h-8"
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Preset Radiasi Surya
                  </Button>
                </div>
              </div>

              {/* Radio Grid for 5 Sub-methods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {/* 1. Reference-Guided */}
                <button
                  type="button"
                  onClick={() => setInterpolationSubMethod("model_guided")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    interpolationSubMethod === "model_guided"
                      ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/30 ring-1 ring-cyan-500"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-cyan-700 dark:text-cyan-300 mb-0.5">
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Terpandu Acuan
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Pola Node / AWS / Model
                  </div>
                </button>

                {/* 2. Cubic Hermite PCHIP */}
                <button
                  type="button"
                  onClick={() => setInterpolationSubMethod("cubic_pchip")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    interpolationSubMethod === "cubic_pchip"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-700 dark:text-indigo-300 mb-0.5">
                    <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                    Kubik PCHIP
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Bebas osilasi palsu
                  </div>
                </button>

                {/* 3. Akima Sub-Spline */}
                <button
                  type="button"
                  onClick={() => setInterpolationSubMethod("akima")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    interpolationSubMethod === "akima"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-700 dark:text-emerald-300 mb-0.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" />
                    Akima Sub-Spline
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Stabil di perubahan tajam
                  </div>
                </button>

                {/* 4. Time-Weighted Linear */}
                <button
                  type="button"
                  onClick={() => setInterpolationSubMethod("time_linear")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    interpolationSubMethod === "time_linear"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-500"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-purple-700 dark:text-purple-300 mb-0.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-purple-500" />
                    Linier Berbobot
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Berbasis delta waktu
                  </div>
                </button>

                {/* 5. Cosine-Hermite Solar Radiation + Magnus RH */}
                <button
                  type="button"
                  onClick={() => {
                    setInterpolationSubMethod("solar_cosine_hermite");
                    if (solarRefSource === "self_history" && selfHistoryRecords.length === 0) {
                      fetchSelfHistoryData(sensorId);
                    } else if (solarRefSource === "station_aws" && refStationRecords.length === 0) {
                      fetchRefStationData(solarRefStationId);
                    } else if (solarRefSource === "model_ecmwf" && referenceGuidePoints.length === 0) {
                      fetchReferenceGuide();
                    }
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    interpolationSubMethod === "solar_cosine_hermite"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-500"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-700 dark:text-amber-300 mb-0.5">
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Kosinus-Hermite
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Kurva S + Magnus RH
                  </div>
                </button>
              </div>

              {/* Unified Reference Source & Lookback Configuration */}
              {(interpolationSubMethod === "model_guided" ||
                interpolationSubMethod === "solar_cosine_hermite") && (
                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Sumber Acuan &amp; Adaptasi Pola Node
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeNodeAdapter && solarRefSource !== "self_history" && (
                        <Badge
                          variant="outline"
                          className="border-indigo-400 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] py-0.5"
                        >
                          {activeNodeAdapter.mode === "spatial_ridge"
                            ? `Ridge (k=${activeNodeAdapter.slope.toFixed(2)}, n=${activeNodeAdapter.sampleCount})`
                            : `Bias (${activeNodeAdapter.bias >= 0 ? "+" : ""}${activeNodeAdapter.bias.toFixed(2)})`}
                        </Badge>
                      )}
                      {baselineNightOffset !== 0 && (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-700 dark:text-amber-300 font-mono text-[10px] py-0.5"
                        >
                          Δ Malam: {baselineNightOffset > 0 ? `+${baselineNightOffset.toFixed(2)}` : baselineNightOffset.toFixed(2)} °C
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                    {/* Source Buttons + Lookback */}
                    <div className="lg:col-span-7 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={solarRefSource === "self_history" ? "default" : "outline"}
                          className={`h-8 text-xs ${solarRefSource === "self_history" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                          onClick={() => {
                            setSolarRefSource("self_history");
                            if (selfHistoryRecords.length === 0) {
                              fetchSelfHistoryData(sensorId);
                            }
                          }}
                        >
                          <History className="h-3.5 w-3.5 mr-1" /> Pola Node (H-1..N)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={solarRefSource === "station_aws" ? "default" : "outline"}
                          className={`h-8 text-xs ${solarRefSource === "station_aws" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
                          onClick={() => {
                            setSolarRefSource("station_aws");
                            if (refStationRecords.length === 0) {
                              fetchRefStationData(solarRefStationId);
                            }
                          }}
                        >
                          <Database className="h-3.5 w-3.5 mr-1" /> AWS Tetangga
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={solarRefSource === "model_ecmwf" ? "default" : "outline"}
                          className={`h-8 text-xs ${solarRefSource === "model_ecmwf" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : ""}`}
                          onClick={() => {
                            setSolarRefSource("model_ecmwf");
                            if (referenceGuidePoints.length === 0) {
                              fetchReferenceGuide();
                            }
                          }}
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" /> Model ECMWF
                        </Button>

                        <div className="flex items-center gap-1 ml-auto bg-white/70 dark:bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500">Histori:</span>
                          {([1, 3, 7] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleChangeHistoryLookback(d)}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                                historyLookbackDays === d
                                  ? "bg-indigo-600 text-white font-semibold"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                              }`}
                            >
                              {d}H
                            </button>
                          ))}
                        </div>
                      </div>

                      {solarRefSource === "self_history" ? (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">
                            {loadingSelfHistory ? (
                              <span className="text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
                                <RefreshCw className="h-3 w-3 animate-spin" /> Memuat histori {historyLookbackDays} hari...
                              </span>
                            ) : selfHistorySelectedProfile ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ✓ {selfHistorySelectedProfile.sourceRecordCount} titik historis ({historyLookbackDays} hari terakhir)
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">
                                ⚠ Riwayat pola node kosong (fallback ke acuan lain jika tersedia)
                              </span>
                            )}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => fetchSelfHistoryData(sensorId)}
                            disabled={loadingSelfHistory}
                            className="h-7 text-xs px-2"
                          >
                            <RefreshCw className={`h-3 w-3 ${loadingSelfHistory ? "animate-spin" : ""}`} />
                          </Button>
                        </div>
                      ) : solarRefSource === "station_aws" ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Select
                              value={solarRefStationId}
                              onValueChange={(val) => {
                                setSolarRefStationId(val);
                                fetchRefStationData(val);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder="Pilih Stasiun Acuan" />
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
                              <RefreshCw className={`h-3 w-3 ${loadingRefStation ? "animate-spin" : ""}`} />
                            </Button>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {loadingRefStation ? (
                              <span className="text-amber-600">Memuat {solarRefStationId}...</span>
                            ) : refStationRecords.length > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ✓ {refStationRecords.length} titik ({solarRefStationId})
                              </span>
                            ) : (
                              <span className="text-amber-600">Belum ada data acuan.</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Select
                              value={referenceModelType}
                              onValueChange={(val: "ecmwf_ifs" | "era5") => {
                                setReferenceModelType(val);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ecmwf_ifs">ECMWF IFS (9 km)</SelectItem>
                                <SelectItem value="era5">ERA5 Reanalysis (31 km)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => fetchReferenceGuide()}
                              disabled={loadingReference}
                              className="h-8 text-xs px-2.5"
                            >
                              <RefreshCw className={`h-3 w-3 ${loadingReference ? "animate-spin" : ""}`} />
                            </Button>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {loadingReference ? (
                              <span className="text-cyan-600">Memuat {referenceModelName}...</span>
                            ) : referenceGuidePoints.length > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ✓ {referenceGuidePoints.length} titik ({referenceModelName})
                              </span>
                            ) : (
                              <span className="text-amber-600">Model belum termuat.</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Solar Excess Threshold */}
                    {(interpolationSubMethod === "solar_cosine_hermite" || enableSolarAnomalyCheck) && (
                      <div className="lg:col-span-5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Ambang ΔT Surya: +{solarThreshold.toFixed(1)} °C
                          </Label>
                          <span className="text-[10px] text-slate-400 font-mono">09:00–17:30 WIB</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <NumericInputField
                            step={0.1}
                            min={0.5}
                            max={10.0}
                            value={solarThreshold}
                            onCommit={setSolarThreshold}
                            className="w-20 h-8 text-xs font-mono"
                          />
                          <input
                            type="range"
                            min={0.5}
                            max={8.0}
                            step={0.1}
                            value={solarThreshold}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v)) setSolarThreshold(v);
                            }}
                            className="flex-1 accent-amber-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedVar.key === "temperature" && (
          <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-900/50">
            <Switch
              id="syncRhRecoverySwitch"
              checked={syncRhRecovery}
              onCheckedChange={setSyncRhRecovery}
            />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Label htmlFor="syncRhRecoverySwitch" className="text-xs font-semibold cursor-pointer text-cyan-900 dark:text-cyan-200">
                Pulihkan RH Simultan (Magnus-Tetens)
              </Label>
              <span className="text-[11px] text-slate-500">
                Hitung ulang field <code className="font-mono text-indigo-600 dark:text-indigo-400">humidity</code> dari T<sub>d</sub> dan suhu terkoreksi.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
