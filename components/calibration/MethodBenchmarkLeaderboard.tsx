"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Sliders,
} from "lucide-react";
import { CorrectionMethod } from "@/lib/bias-correction/types";
import { MethodBenchmarkSummary } from "@/lib/bias-correction/correction/CorrectionEngine";

interface MethodBenchmarkLeaderboardProps {
  benchmarks: MethodBenchmarkSummary[];
  selectedMethod: CorrectionMethod;
  onSelectMethod: (method: CorrectionMethod) => void;
  onApplyToSensor: (method: CorrectionMethod, fitParams: any) => void;
  variableUnit: string;
}

export const MethodBenchmarkLeaderboard: React.FC<MethodBenchmarkLeaderboardProps> = ({
  benchmarks,
  selectedMethod,
  onSelectMethod,
  onApplyToSensor,
  variableUnit,
}) => {
  if (!benchmarks || benchmarks.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-6 text-center text-sm text-slate-500">
          Memproses benchmark otomatis untuk seluruh algoritma kalibrasi...
        </CardContent>
      </Card>
    );
  }

  const bestMethod = benchmarks.find(b => b.isBest) || benchmarks[0];

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      <CardHeader className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-transparent border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Leaderboard Benchmark Multi-Metode
              </CardTitle>
              <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold">
                Auto-Ranked
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Perbandingan objektif seluruh metode kalibrasi pada dataset stasiun independen. Diurutkan dari error RMSE terendah.
            </CardDescription>
          </div>

          {bestMethod && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block uppercase font-bold tracking-wider">
                  Rekomendasi Terbaik
                </span>
                <span className="font-semibold">{bestMethod.name}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                <th className="py-2.5 px-4 min-w-[200px]">Metode Algoritma</th>
                <th className="py-2.5 px-3 min-w-[180px]">Rumus / Model Empiris</th>
                <th className="py-2.5 px-3 text-right">RMSE ({variableUnit})</th>
                <th className="py-2.5 px-3 text-right">MAE ({variableUnit})</th>
                <th className="py-2.5 px-3 text-right">Korelasi R²</th>
                <th className="py-2.5 px-3 text-right">Peningkatan</th>
                <th className="py-2.5 px-4 text-center min-w-[180px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {benchmarks.map((item, index) => {
                const isSelected = selectedMethod === item.method;
                const isWinner = item.isBest;

                return (
                  <tr
                    key={item.method}
                    className={`transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20 ${
                      isSelected
                        ? "bg-blue-50/70 dark:bg-blue-950/40 font-medium"
                        : isWinner
                        ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                        : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center font-mono">
                      {index === 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-bold">
                          1
                        </span>
                      ) : index === 1 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                          2
                        </span>
                      ) : index === 2 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-900/20 text-amber-800 dark:text-amber-400 text-xs font-bold">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400">{index + 1}</span>
                      )}
                    </td>

                    {/* Method Name & Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                        {isWinner && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                            Terbaik
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="outline" className="text-[9px] border-blue-400 text-blue-600 dark:text-blue-400 px-1.5 py-0">
                            Aktif
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.category}</span>
                    </td>

                    {/* Formula */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-[10px]">
                        {item.formulaDescription}
                      </span>
                    </td>

                    {/* RMSE */}
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">
                        {item.correctedRmse.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        (Raw: {item.rawRmse.toFixed(2)})
                      </span>
                    </td>

                    {/* MAE */}
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">
                        {item.correctedMae.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        (Raw: {item.rawMae.toFixed(2)})
                      </span>
                    </td>

                    {/* R-Squared */}
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">
                        {item.correctedRSquared.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        (Raw: {item.rawRSquared.toFixed(3)})
                      </span>
                    </td>

                    {/* Improvement */}
                    <td className="py-3 px-3 text-right font-mono">
                      {item.rmseImprovementPercent > 0 ? (
                        <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>+{item.rmseImprovementPercent.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1 text-red-500 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{item.rmseImprovementPercent.toFixed(1)}%</span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 block">red. error</span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-[11px] px-2.5"
                          onClick={() => onSelectMethod(item.method)}
                        >
                          {isSelected ? "Sedang Dipilih" : "Pilih Metode"}
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          onClick={() => onApplyToSensor(item.method, item.fitParams)}
                          title="Terapkan rumus kalibrasi ini ke sensor stasiun aktif"
                        >
                          <Sliders className="w-3 h-3 mr-1" />
                          1-Click Apply
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
