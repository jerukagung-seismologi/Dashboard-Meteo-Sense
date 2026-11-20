// components/prakirawan/ProbabilisticVerificationCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { EnsembleHourlyItem } from "./EnsembleProbabilityChart";
import {
  generateReliabilityDiagram,
  calculateMeanCRPS,
  calculateBrierScore,
  ReliabilityDiagramData,
  CRPSResult,
  BrierScoreResult,
} from "@/lib/bias-correction/statistics/probabilisticMetrics";

interface ProbabilisticVerificationCardProps {
  data: EnsembleHourlyItem[] | null;
  locationName?: string;
  isDarkMode?: boolean;
}

export const ProbabilisticVerificationCard: React.FC<ProbabilisticVerificationCardProps> = ({
  data,
  locationName = "Stasiun Observasi",
  isDarkMode = false,
}) => {
  const [selectedVariable, setSelectedVariable] = useState<"rain" | "temperature">("rain");

  // Derive probabilistic verification data from ensemble items
  const verificationData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    // 1. Temperature CRPS pairs: ensemble member temperatures vs consensus / observed
    const tempPairs: { ensemble: number[]; observed: number }[] = [];
    // 2. Rain Probability pairs: ensemble rain prob vs binary occurrence
    const rainProbs: number[] = [];
    const rainOutcomes: number[] = [];

    for (const item of data) {
      // Gather ensemble member temperatures
      const memberTemps: number[] = [];
      let rainVoteCount = 0;
      let totalMembersWithRain = 0;

      if (item.modelPredictions && item.modelPredictions.length > 0) {
        for (const pred of item.modelPredictions) {
          if (pred.temperature !== null && pred.temperature !== undefined && !isNaN(pred.temperature)) {
            memberTemps.push(pred.temperature);
          }
          if (pred.rainProb !== null && pred.rainProb !== undefined) {
            totalMembersWithRain++;
            if (pred.rainProb >= 50) rainVoteCount++;
          } else if (
            pred.condition.includes("Hujan") ||
            pred.condition.includes("Badai")
          ) {
            totalMembersWithRain++;
            rainVoteCount++;
          } else {
            totalMembersWithRain++;
          }
        }
      }

      // Target / Ground truth observation (or ensemble consensus temperature)
      const targetTemp =
        typeof item.temperature === "number"
          ? item.temperature
          : memberTemps.length > 0
          ? memberTemps.reduce((a, b) => a + b, 0) / memberTemps.length
          : null;

      if (memberTemps.length > 0 && targetTemp !== null) {
        tempPairs.push({ ensemble: memberTemps, observed: targetTemp });
      }

      // Rain Probability
      const pRain =
        totalMembersWithRain > 0
          ? rainVoteCount / totalMembersWithRain
          : parseFloat(item.probMain || "0") / 100 || 0;

      // Actual rain occurrence (based on main weather condition or sensor)
      const isRainOccurred =
        item.conditionMain.includes("Hujan") ||
        item.conditionMain.includes("Badai")
          ? 1
          : 0;

      rainProbs.push(Math.max(0, Math.min(1, pRain)));
      rainOutcomes.push(isRainOccurred);
    }

    const crpsResult: CRPSResult = calculateMeanCRPS(tempPairs);
    const brierResult: BrierScoreResult = calculateBrierScore(rainProbs, rainOutcomes, "Hujan >= 0.1 mm");
    const reliabilityDiagram: ReliabilityDiagramData = generateReliabilityDiagram(rainProbs, rainOutcomes, 10);

    return {
      crps: crpsResult,
      brier: brierResult,
      reliability: reliabilityDiagram,
      sampleHours: data.length,
    };
  }, [data]);

  // ECharts Option for Reliability Diagram
  const chartOption = useMemo(() => {
    if (!verificationData) return {};

    const rel = verificationData.reliability;
    const textColor = isDarkMode ? "#94A3B8" : "#64748B";
    const gridColor = isDarkMode ? "#1E293B" : "#F1F5F9";
    const borderColor = isDarkMode ? "#334155" : "#E2E8F0";

    // Curve data: nominalProb vs observedFrequency
    const reliabilityCurve = rel.bins.map((b) => [
      Number((b.nominalProb * 100).toFixed(1)),
      Number((b.observedFrequency * 100).toFixed(1)),
      b.sampleCount,
      b.sharpness,
    ]);

    // Sharpness histogram data
    const sharpnessData = rel.bins.map((b) => [
      Number((b.nominalProb * 100).toFixed(1)),
      Number((b.sharpness * 100).toFixed(1)),
      b.sampleCount,
    ]);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
        borderColor: borderColor,
        textStyle: { color: isDarkMode ? "#F8FAFC" : "#0F172A", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const p = params[0];
          const xVal = p.data ? p.data[0] : p.name;
          const obsVal = p.data ? p.data[1] : 0;
          const count = p.data ? p.data[2] : 0;
          const sharpness = p.data ? (p.data[3] * 100).toFixed(1) : 0;

          return `
            <div class="space-y-1 font-sans">
              <div class="font-bold text-xs border-b pb-1">Bin Probabilitas: ${xVal}%</div>
              <div class="text-[11px] flex justify-between gap-4">
                <span class="text-slate-400">Frekuensi Teramati:</span>
                <span class="font-bold text-blue-500">${obsVal}%</span>
              </div>
              <div class="text-[11px] flex justify-between gap-4">
                <span class="text-slate-400">Jumlah Sampel (N_k):</span>
                <span class="font-semibold">${count} jam</span>
              </div>
              <div class="text-[11px] flex justify-between gap-4">
                <span class="text-slate-400">Sharpness / Frekuensi Relatif:</span>
                <span class="font-semibold text-emerald-500">${sharpness}%</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: ["Kalibrasi Sempurna (1:1)", "Kurva Reliabilitas Model", "Histogram Frekuensi (Sharpness)"],
      },
      grid: {
        left: "8%",
        right: "8%",
        top: "10%",
        bottom: "16%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 20,
        name: "Probabilitas Prakiraan (%)",
        nameLocation: "middle",
        nameGap: 24,
        axisLabel: { color: textColor, formatter: "{value}%", fontSize: 11 },
        splitLine: { lineStyle: { color: gridColor } },
      },
      yAxis: [
        {
          type: "value",
          min: 0,
          max: 100,
          interval: 20,
          name: "Frekuensi Teramati (%)",
          axisLabel: { color: textColor, formatter: "{value}%", fontSize: 11 },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          type: "value",
          min: 0,
          max: 100,
          interval: 25,
          name: "Sharpness (%)",
          position: "right",
          axisLabel: { color: textColor, formatter: "{value}%", fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Kalibrasi Sempurna (1:1)",
          type: "line",
          data: [
            [0, 0],
            [100, 100],
          ],
          lineStyle: { type: "dashed", color: isDarkMode ? "#64748B" : "#94A3B8", width: 1.5 },
          symbol: "none",
          z: 1,
        },
        {
          name: "Kurva Reliabilitas Model",
          type: "line",
          data: reliabilityCurve,
          lineStyle: { color: "#3B82F6", width: 2.5 },
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { color: "#3B82F6", borderColor: "#FFFFFF", borderWidth: 1.5 },
          z: 3,
        },
        {
          name: "Histogram Frekuensi (Sharpness)",
          type: "bar",
          yAxisIndex: 1,
          data: sharpnessData,
          barWidth: "40%",
          itemStyle: {
            color: isDarkMode ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.20)",
            borderColor: "rgba(16, 185, 129, 0.6)",
            borderWidth: 1,
          },
          z: 2,
        },
      ],
    };
  }, [verificationData, isDarkMode]);

  if (!verificationData) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-6 text-center text-xs text-slate-500">
          Data prakiraan probabilistik belum tersedia untuk verifikasi.
        </CardContent>
      </Card>
    );
  }

  const { crps, brier, reliability } = verificationData;

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Verifikasi Probabilistik Ensambel Multi-Model
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Lokasi: <strong>{locationName}</strong> • Evaluasi CRPS, Brier Score, dan Diagram Reliabilitas ({verificationData.sampleHours} jam).
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Sparkles className="w-3 h-3 mr-1 text-blue-500" /> WMO Verification
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* KPI Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* CRPS Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">CRPS Rata-rata</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {crps.meanCRPS.toFixed(3)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <span>Optimal: 0.0</span>
              <span className="text-emerald-600 font-semibold">• Min: {crps.minCRPS.toFixed(2)}</span>
            </div>
          </div>

          {/* Brier Score Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Brier Score (BS)</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {brier.brierScore.toFixed(3)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Optimal: 0.0 • Ref (Klimatologi): {brier.brierScoreRef.toFixed(3)}
            </div>
          </div>

          {/* Brier Skill Score Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Brier Skill Score (BSS)</div>
            <div className={`text-lg font-bold mt-0.5 ${brier.brierSkillScore >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {brier.brierSkillScore >= 0 ? `+${brier.brierSkillScore.toFixed(3)}` : brier.brierSkillScore.toFixed(3)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {brier.brierSkillScore > 0 ? "Keterampilan di atas klimatologi" : "Perlu kalibrasi sebaran"}
            </div>
          </div>

          {/* Reliability Loss / Resolution */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Dekomposisi Murphy</div>
            <div className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Reliabilitas (REL):</span>
                <span className="font-semibold text-amber-600">{reliability.reliability.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resolusi (RES):</span>
                <span className="font-semibold text-emerald-600">{reliability.resolution.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reliability Diagram ECharts Canvas */}
        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Diagram Reliabilitas & Distribusi Sharpness
            </div>
            <span className="text-[11px] text-slate-400">
              Garis putus-putus 1:1 menunjukkan kalibrasi sempurna
            </span>
          </div>
          <div className="h-[280px] w-full">
            <ReactECharts
              option={chartOption}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
