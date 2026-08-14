// components/validasi-bias/BiasEvaluationTable.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { ComparativeValidationResult, MeteorologicalVariable, CorrectionMethod } from "@/lib/bias-correction/types";

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
};

export const BiasEvaluationTable: React.FC<BiasEvaluationTableProps> = ({
  result,
  selectedMethod,
  unit,
}) => {
  const { rawEra5, correctedEra5, maeImprovementPercent, rmseImprovementPercent, isDegraded, degradationWarning } = result;

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Evaluasi Metrik Sebelum vs Sesudah Koreksi (Periode Validasi)
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Metode: <strong>{METHOD_LABELS[selectedMethod]}</strong> • Evaluasi independen pada data uji ({result.provenance.validationPeriod.from} s/d {result.provenance.validationPeriod.to}).
            </p>
          </div>
          <div>
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

      <CardContent className="pt-4 space-y-4">
        {/* Degradation Warning Banner if validation error gets worse */}
        {isDegraded && degradationWarning && (
          <Alert variant="destructive" className="bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <AlertTitle className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Peringatan Keandalan Model
            </AlertTitle>
            <AlertDescription className="text-xs text-rose-800 dark:text-rose-300 mt-1">
              {degradationWarning}
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics Comparative Grid / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500">
                <th className="py-2.5 px-3 font-semibold">Parameter Statistik</th>
                <th className="py-2.5 px-3 font-semibold text-right">Raw ERA5 (Sebelum)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Corrected ERA5 (Sesudah)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Peningkatan / Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {/* Mean Absolute Error (MAE) */}
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

              {/* Root Mean Square Error (RMSE) */}
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

              {/* Pearson Correlation (r) & R^2 */}
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
                  Jumlah Sampel Uji: {correctedEra5.sampleCount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
