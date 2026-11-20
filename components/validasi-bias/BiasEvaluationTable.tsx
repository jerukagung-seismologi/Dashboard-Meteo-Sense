// components/validasi-bias/BiasEvaluationTable.tsx
"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  ShieldAlert,
  BarChart2,
  SlidersHorizontal,
} from "lucide-react";
import {
  ComparativeValidationResult,
  CorrectionMethod,
} from "@/lib/bias-correction/types";
import {
  calculateHydrologicalMetrics,
} from "@/lib/bias-correction/statistics/hydrologicalMetrics";
import {
  calculateCategoricalMetrics,
  calculateCategoricalMetricsForClass,
  BMKG_RAINFALL_THRESHOLDS,
  BMKG_INTENSITY_CLASSES,
  BMKGRainfallClass,
} from "@/lib/bias-correction/statistics/categoricalMetrics";

interface BiasEvaluationTableProps {
  result: ComparativeValidationResult;
  selectedMethod: CorrectionMethod;
  unit: string;
}

const METHOD_LABELS: Record<CorrectionMethod, string> = {
  mean_bias: "Mean Bias Correction (Additive)",
  diurnal_mbe: "Diurnal Hourly MBE (Profil 24-Jam)",
  linear_regression: "Linear Regression (OLS)",
  quantile_mapping: "Empirical Quantile Mapping (EQM)",
  zero_aware_rain: "Zero-Aware Precipitation Correction",
  circular_wind: "Circular Wind Direction & Speed EQM",
  polynomial_regression: "Polynomial Regression (Derajat 2)",
  robust_huber: "Robust Huber Regression (Tahan Outlier)",
  quantile_delta_mapping: "Quantile Delta Mapping (QDM Standar IPCC)",
  power_law: "Power Law Scaling (y = a · x^b)",
  two_point: "Two-Point Interpolation Calibration",
};

function getRatingBadgeVariant(rating?: string) {
  switch (rating) {
    case "Sangat Baik":
      return "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800";
    case "Baik":
      return "bg-blue-600/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800";
    case "Memuaskan":
      return "bg-amber-600/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800";
    default:
      return "bg-rose-600/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800";
  }
}

export const BiasEvaluationTable: React.FC<BiasEvaluationTableProps> = ({
  result,
  selectedMethod,
  unit,
}) => {
  const {
    rawEra5,
    correctedEra5,
    maeImprovementPercent,
    rmseImprovementPercent,
    isDegraded,
    degradationWarning,
  } = result;

  const [activeTab, setActiveTab] = useState<string>("error_metrics");
  const [catMode, setCatMode] = useState<"threshold" | "class">("threshold");
  const [catThreshold, setCatThreshold] = useState<number>(
    result.categorical?.threshold ?? 0.1
  );
  const [selectedClass, setSelectedClass] = useState<BMKGRainfallClass>("RINGAN");

  // Fallback hydrological metrics if not already populated
  const hydroMetrics = result.hydrological ?? {
    raw: calculateHydrologicalMetrics([]),
    corrected: calculateHydrologicalMetrics([]),
  };

  const homogeneity = result.homogeneity;
  const sampleAdequacy = homogeneity?.sampleAdequacy;

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Evaluasi Metrik Sebelum vs Sesudah Koreksi
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Metode: <strong>{METHOD_LABELS[selectedMethod] || selectedMethod}</strong> • Data uji:{" "}
              {result.provenance.validationPeriod.from} s/d {result.provenance.validationPeriod.to} (
              {result.provenance.validationPeriod.sampleCount} sampel).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDegraded ? (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Degradasi Validasi Terdeteksi
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 text-white text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Performa Meningkat (+{rmseImprovementPercent}%)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 space-y-3">
        {/* Degradation Warning Banner */}
        {isDegraded && degradationWarning && (
          <Alert variant="destructive" className="bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 py-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <AlertTitle className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Peringatan Keandalan Model
            </AlertTitle>
            <AlertDescription className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
              {degradationWarning}
            </AlertDescription>
          </Alert>
        )}

        {/* Sample Adequacy Warning Banner if < 504 hours */}
        {sampleAdequacy && !sampleAdequacy.isAdequate && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 py-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Kecukupan Sampel Terbatas
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              {sampleAdequacy.warningMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Modular Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg gap-1">
            <TabsTrigger
              value="error_metrics"
              className="text-xs py-1.5 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 mr-1 text-blue-500" />
              Error & Korelasi
            </TabsTrigger>
            <TabsTrigger
              value="hydrological"
              className="text-xs py-1.5 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              Hidrometeorologi
            </TabsTrigger>
            <TabsTrigger
              value="categorical"
              className="text-xs py-1.5 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
            >
              <BarChart2 className="w-3.5 h-3.5 mr-1 text-violet-500" />
              Kategorikal Hujan
            </TabsTrigger>
            <TabsTrigger
              value="homogeneity"
              className="text-xs py-1.5 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Uji Kualitas Data
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ERROR & CORRELATION METRICS */}
          <TabsContent value="error_metrics" className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold">Parameter Statistik</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Raw ERA5 (Sebelum)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Corrected ERA5 (Sesudah)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Peningkatan / Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {/* MAE */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      Mean Absolute Error (MAE)
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {rawEra5.mae.toFixed(2)} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {correctedEra5.mae.toFixed(2)} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-flex items-center gap-1 font-bold ${maeImprovementPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {maeImprovementPercent >= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                        {maeImprovementPercent >= 0 ? `+${maeImprovementPercent}%` : `${maeImprovementPercent}%`}
                      </span>
                    </td>
                  </tr>

                  {/* RMSE */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      Root Mean Square Error (RMSE)
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {rawEra5.rmse.toFixed(2)} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {correctedEra5.rmse.toFixed(2)} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-flex items-center gap-1 font-bold ${rmseImprovementPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {rmseImprovementPercent >= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                        {rmseImprovementPercent >= 0 ? `+${rmseImprovementPercent}%` : `${rmseImprovementPercent}%`}
                      </span>
                    </td>
                  </tr>

                  {/* Mean Bias */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      Mean Bias (AWS - ERA5)
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {rawEra5.meanBias > 0 ? `+${rawEra5.meanBias.toFixed(2)}` : rawEra5.meanBias.toFixed(2)} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {correctedEra5.meanBias > 0 ? `+${correctedEra5.meanBias.toFixed(2)}` : correctedEra5.meanBias.toFixed(2)} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-sans text-[11px]">
                      ΔBias: {(Math.abs(correctedEra5.meanBias) - Math.abs(rawEra5.meanBias)).toFixed(2)} {unit}
                    </td>
                  </tr>

                  {/* Pearson Correlation r & R2 */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      Korelasi Pearson (r) / R²
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {rawEra5.pearsonR.toFixed(2)} (R²: {rawEra5.rSquared.toFixed(2)})
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {correctedEra5.pearsonR.toFixed(2)} (R²: {correctedEra5.rSquared.toFixed(2)})
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${correctedEra5.pearsonR >= rawEra5.pearsonR ? "text-emerald-600" : "text-amber-600"}`}>
                        Δr: {(correctedEra5.pearsonR - rawEra5.pearsonR).toFixed(3)}
                      </span>
                    </td>
                  </tr>

                  {/* Residual Standard Deviation */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      Standar Deviasi Residual (σ)
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {rawEra5.stdResidual.toFixed(2)} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {correctedEra5.stdResidual.toFixed(2)} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-sans text-[11px]">
                      Jumlah Sampel: {correctedEra5.sampleCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 2: HYDROLOGICAL METRICS (NSE, RSR, NRMSE, KGE) */}
          <TabsContent value="hydrological" className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold">Metrik Hidrometeorologi</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Raw ERA5</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Corrected ERA5</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Perubahan Skor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {/* NSE */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      <div>Nash-Sutcliffe Efficiency (NSE)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Optimal: 1.0 (Moriasi et al., 2007)</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="text-slate-700 dark:text-slate-300">{hydroMetrics.raw.nse.toFixed(3)}</div>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 mt-0.5 border ${getRatingBadgeVariant(hydroMetrics.raw.nseRating)}`}>
                        {hydroMetrics.raw.nseRating}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <div className="text-slate-900 dark:text-slate-100">{hydroMetrics.corrected.nse.toFixed(3)}</div>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 mt-0.5 border ${getRatingBadgeVariant(hydroMetrics.corrected.nseRating)}`}>
                        {hydroMetrics.corrected.nseRating}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${hydroMetrics.corrected.nse >= hydroMetrics.raw.nse ? "text-emerald-600" : "text-rose-600"}`}>
                        ΔNSE: {(hydroMetrics.corrected.nse - hydroMetrics.raw.nse).toFixed(3)}
                      </span>
                    </td>
                  </tr>

                  {/* KGE */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      <div>Kling-Gupta Efficiency (KGE)</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        r={hydroMetrics.corrected.kgeComponents.r.toFixed(2)}, α={hydroMetrics.corrected.kgeComponents.alpha.toFixed(2)}, β={hydroMetrics.corrected.kgeComponents.beta.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="text-slate-700 dark:text-slate-300">{hydroMetrics.raw.kge.toFixed(3)}</div>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 mt-0.5 border ${getRatingBadgeVariant(hydroMetrics.raw.kgeRating)}`}>
                        {hydroMetrics.raw.kgeRating}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <div className="text-slate-900 dark:text-slate-100">{hydroMetrics.corrected.kge.toFixed(3)}</div>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 mt-0.5 border ${getRatingBadgeVariant(hydroMetrics.corrected.kgeRating)}`}>
                        {hydroMetrics.corrected.kgeRating}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${hydroMetrics.corrected.kge >= hydroMetrics.raw.kge ? "text-emerald-600" : "text-rose-600"}`}>
                        ΔKGE: {(hydroMetrics.corrected.kge - hydroMetrics.raw.kge).toFixed(3)}
                      </span>
                    </td>
                  </tr>

                  {/* RSR */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      <div>RMSE-Observations SD Ratio (RSR)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Optimal: 0.0 (&lt; 0.50 Sangat Baik)</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="text-slate-700 dark:text-slate-300">{hydroMetrics.raw.rsr.toFixed(3)}</div>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 mt-0.5 border ${getRatingBadgeVariant(hydroMetrics.raw.rsrRating)}`}>
                        {hydroMetrics.raw.rsrRating}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <div className="text-slate-900 dark:text-slate-100">{hydroMetrics.corrected.rsr.toFixed(3)}</div>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 mt-0.5 border ${getRatingBadgeVariant(hydroMetrics.corrected.rsrRating)}`}>
                        {hydroMetrics.corrected.rsrRating}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${hydroMetrics.corrected.rsr <= hydroMetrics.raw.rsr ? "text-emerald-600" : "text-rose-600"}`}>
                        ΔRSR: {(hydroMetrics.corrected.rsr - hydroMetrics.raw.rsr).toFixed(3)}
                      </span>
                    </td>
                  </tr>

                  {/* NRMSE */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                      <div>Normalized RMSE (NRMSE)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Dihitung terhadap rentang observasi (max - min)</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="text-slate-700 dark:text-slate-300">{(hydroMetrics.raw.nrmseRange * 100).toFixed(1)}%</div>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 mt-0.5 border ${getRatingBadgeVariant(hydroMetrics.raw.nrmseRating)}`}>
                        {hydroMetrics.raw.nrmseRating}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <div className="text-slate-900 dark:text-slate-100">{(hydroMetrics.corrected.nrmseRange * 100).toFixed(1)}%</div>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 mt-0.5 border ${getRatingBadgeVariant(hydroMetrics.corrected.nrmseRating)}`}>
                        {hydroMetrics.corrected.nrmseRating}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${hydroMetrics.corrected.nrmseRange <= hydroMetrics.raw.nrmseRange ? "text-emerald-600" : "text-rose-600"}`}>
                        {((hydroMetrics.raw.nrmseRange - hydroMetrics.corrected.nrmseRange) * 100).toFixed(1)}% poin
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 3: CATEGORICAL RAINFALL VERIFICATION */}
          <TabsContent value="categorical" className="mt-3 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCatMode("threshold")}
                  className={`text-[11px] px-2 py-1 rounded transition-colors ${
                    catMode === "threshold"
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Ambang Kumulatif (≥ T)
                </button>
                <button
                  type="button"
                  onClick={() => setCatMode("class")}
                  className={`text-[11px] px-2 py-1 rounded transition-colors ${
                    catMode === "class"
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Kelas Intensitas BMKG
                </button>
              </div>

              {catMode === "threshold" ? (
                <div className="flex flex-wrap gap-1">
                  {BMKG_RAINFALL_THRESHOLDS.map(cfg => (
                    <button
                      key={cfg.id}
                      type="button"
                      onClick={() => setCatThreshold(cfg.threshold)}
                      className={`text-[11px] px-2 py-1 rounded transition-colors ${
                        catThreshold === cfg.threshold
                          ? "bg-blue-600 text-white font-bold shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {BMKG_INTENSITY_CLASSES.filter(c => c.id !== "BERAWAN").map(cls => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClass(cls.id)}
                      className={`text-[11px] px-2 py-1 rounded transition-colors ${
                        selectedClass === cls.id
                          ? "bg-violet-600 text-white font-bold shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {cls.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(() => {
              let catRaw: any;
              let catCorrected: any;

              if (catMode === "threshold") {
                // 1. Check precomputed byThreshold
                const precomputed = result.categorical?.byThreshold?.[catThreshold];
                catRaw = precomputed?.raw;
                catCorrected = precomputed?.corrected;

                // 2. Check if default matches
                if (!catRaw && result.categorical && result.categorical.threshold === catThreshold) {
                  catRaw = result.categorical.raw;
                  catCorrected = result.categorical.corrected;
                }

                // 3. Dynamic calculation if validationPairs exist
                if (!catRaw && result.validationPairs && result.validationPairs.length > 0) {
                  catRaw = calculateCategoricalMetrics(
                    result.validationPairs.map(p => ({ observed: p.aws, forecast: p.era5Raw })),
                    catThreshold
                  );
                  catCorrected = calculateCategoricalMetrics(
                    result.validationPairs.map(p => ({ observed: p.aws, forecast: p.era5Corrected })),
                    catThreshold
                  );
                }

                // 4. Fallback to existing or empty
                catRaw = catRaw ?? result.categorical?.raw ?? calculateCategoricalMetrics([], catThreshold);
                catCorrected = catCorrected ?? result.categorical?.corrected ?? calculateCategoricalMetrics([], catThreshold);
              } else {
                // Class-based evaluation
                const precomputedClass = result.categorical?.byIntensityClass?.[selectedClass];
                catRaw = precomputedClass?.raw;
                catCorrected = precomputedClass?.corrected;

                if (!catRaw && result.validationPairs && result.validationPairs.length > 0) {
                  catRaw = calculateCategoricalMetricsForClass(
                    result.validationPairs.map(p => ({ observed: p.aws, forecast: p.era5Raw })),
                    selectedClass
                  );
                  catCorrected = calculateCategoricalMetricsForClass(
                    result.validationPairs.map(p => ({ observed: p.aws, forecast: p.era5Corrected })),
                    selectedClass
                  );
                }

                catRaw = catRaw ?? calculateCategoricalMetricsForClass([], selectedClass);
                catCorrected = catCorrected ?? calculateCategoricalMetricsForClass([], selectedClass);
              }

              return (
                <div className="space-y-3">
                  {/* 2x2 Matrix Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 mb-2">Matriks Kontingensi 2x2 (Sebelum Koreksi)</div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-900/50">
                          <div className="text-[10px] text-emerald-600 font-semibold">Hits (a)</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{catRaw.table.hits}</div>
                        </div>
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-900/50">
                          <div className="text-[10px] text-rose-600 font-semibold">False Alarms (b)</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{catRaw.table.falseAlarms}</div>
                        </div>
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900/50">
                          <div className="text-[10px] text-amber-600 font-semibold">Misses (c)</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{catRaw.table.misses}</div>
                        </div>
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-500 font-semibold">Correct Neg (d)</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{catRaw.table.correctNegatives}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
                      <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-2">Matriks Kontingensi 2x2 (Sesudah Koreksi)</div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-900/50">
                          <div className="text-[10px] text-emerald-600 font-semibold">Hits (a)</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{catCorrected.table.hits}</div>
                        </div>
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-900/50">
                          <div className="text-[10px] text-rose-600 font-semibold">False Alarms (b)</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{catCorrected.table.falseAlarms}</div>
                        </div>
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900/50">
                          <div className="text-[10px] text-amber-600 font-semibold">Misses (c)</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{catCorrected.table.misses}</div>
                        </div>
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-500 font-semibold">Correct Neg (d)</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{catCorrected.table.correctNegatives}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Categorical Scores Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500">
                          <th className="py-2.5 px-3 font-semibold">Metrik Keterampilan (Skill Scores)</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Sebelum</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Sesudah</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Perubahan Skor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                            Probability of Detection (POD / Hit Rate)
                          </td>
                          <td className="py-2 px-3 text-right">{(catRaw.pod * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {(catCorrected.pod * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`font-bold ${catCorrected.pod >= catRaw.pod ? "text-emerald-600" : "text-rose-600"}`}>
                              {((catCorrected.pod - catRaw.pod) * 100).toFixed(1)}% poin
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                            False Alarm Ratio (FAR)
                          </td>
                          <td className="py-2 px-3 text-right">{(catRaw.far * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {(catCorrected.far * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`font-bold ${catCorrected.far <= catRaw.far ? "text-emerald-600" : "text-rose-600"}`}>
                              {((catCorrected.far - catRaw.far) * 100).toFixed(1)}% poin
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                            Frequency of Hit (FOH / Success Ratio)
                          </td>
                          <td className="py-2 px-3 text-right">{(catRaw.foh * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {(catCorrected.foh * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`font-bold ${catCorrected.foh >= catRaw.foh ? "text-emerald-600" : "text-rose-600"}`}>
                              {((catCorrected.foh - catRaw.foh) * 100).toFixed(1)}% poin
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                            Critical Success Index (CSI / Threat Score)
                          </td>
                          <td className="py-2 px-3 text-right">{catRaw.csi.toFixed(3)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {catCorrected.csi.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`font-bold ${catCorrected.csi >= catRaw.csi ? "text-emerald-600" : "text-rose-600"}`}>
                              ΔCSI: {(catCorrected.csi - catRaw.csi).toFixed(3)}
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                            Heidke Skill Score (HSS)
                          </td>
                          <td className="py-2 px-3 text-right">{catRaw.hss.toFixed(3)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {catCorrected.hss.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`font-bold ${catCorrected.hss >= catRaw.hss ? "text-emerald-600" : "text-rose-600"}`}>
                              ΔHSS: {(catCorrected.hss - catRaw.hss).toFixed(3)}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {/* TAB 4: DATA QUALITY & HOMOGENEITY TESTS */}
          <TabsContent value="homogeneity" className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* RAPS */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Uji Homogenitas RAPS</span>
                  {homogeneity?.raps ? (
                    <Badge variant={homogeneity.raps.isHomogeneous ? "default" : "destructive"} className="text-[10px]">
                      {homogeneity.raps.isHomogeneous ? "Homogen (Lolos)" : "Pergeseran Terdeteksi"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Memproses</Badge>
                  )}
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  {homogeneity?.raps?.interpretation ?? "Menghitung uji RAPS (Rescaled Adjusted Partial Sums)..."}
                </p>
                {homogeneity?.raps && (
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    Q/√n: {homogeneity.raps.qRescaled} • Batas Kritis 95%: {homogeneity.raps.qCritical95}
                  </div>
                )}
              </div>

              {/* Kurva Massa Ganda */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Kurva Massa Ganda</span>
                  {homogeneity?.doubleMass ? (
                    <Badge variant={homogeneity.doubleMass.isConsistent ? "default" : "secondary"} className="text-[10px]">
                      {homogeneity.doubleMass.isConsistent ? "Konsisten" : "Deviasi Terdeteksi"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Memproses</Badge>
                  )}
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  {homogeneity?.doubleMass?.interpretation ?? "Mengevaluasi akumulasi massa stasiun vs referensi..."}
                </p>
                {homogeneity?.doubleMass && (
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    Rasio Lereng: {homogeneity.doubleMass.slopeRatio} • R²: {homogeneity.doubleMass.rSquared}
                  </div>
                )}
              </div>

              {/* Uji Tren Spearman */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Uji Tren Spearman (Stasioneritas)</span>
                  {homogeneity?.spearmanTrend ? (
                    <Badge variant={homogeneity.spearmanTrend.trend === "Stasioner" ? "default" : "outline"} className="text-[10px]">
                      {homogeneity.spearmanTrend.trend}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Memproses</Badge>
                  )}
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  {homogeneity?.spearmanTrend?.interpretation ?? "Menghitung korelasi peringkat Spearman..."}
                </p>
                {homogeneity?.spearmanTrend && (
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    r_s: {homogeneity.spearmanTrend.spearmanR} • Nilai p: {homogeneity.spearmanTrend.pValue}
                  </div>
                )}
              </div>

              {/* Kecukupan Sampel */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Kecukupan Sampel AWS (3 Minggu)</span>
                  {sampleAdequacy ? (
                    <Badge variant={sampleAdequacy.isAdequate ? "default" : "destructive"} className="text-[10px]">
                      {sampleAdequacy.isAdequate ? "Kecukupan Terpenuhi" : "Kurang Sampel"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Memeriksa</Badge>
                  )}
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  {sampleAdequacy?.recommendation ?? "Memeriksa kecukupan sampel terhadap batas minimum 504 jam (3 minggu)..."}
                </p>
                {sampleAdequacy && (
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    Sampel Valid: {sampleAdequacy.sampleCount} / {sampleAdequacy.minRequiredHours} jam ({(sampleAdequacy.coverageRatio * 100).toFixed(0)}%)
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
