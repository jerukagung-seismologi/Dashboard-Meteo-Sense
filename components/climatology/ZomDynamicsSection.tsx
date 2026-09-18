// components/climatology/ZomDynamicsSection.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CloudRain, SunMedium, Compass, Info, CheckCircle2 } from "lucide-react";
import type { DasarianNormal } from "@/lib/climatology/wmoNormals";

interface ZomDynamicsSectionProps {
  dasarians: DasarianNormal[] | null;
  seasonalDynamics: {
    amh: { number: number; name: string; rain: number };
    amk: { number: number; name: string; rain: number };
    description: string;
  } | null;
  isDarkMode?: boolean;
}

export function ZomDynamicsSection({
  dasarians,
  seasonalDynamics,
  isDarkMode = false,
}: ZomDynamicsSectionProps) {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const chartOption = useMemo(() => {
    if (!dasarians || dasarians.length === 0) return {};

    const names = dasarians.map((d) => d.name);
    const rains = dasarians.map((d) => d.precipMean);

    const amhNumber = seasonalDynamics?.amh.number || 28;
    const amkNumber = seasonalDynamics?.amk.number || 13;

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const idx = params[0].dataIndex;
          const d = dasarians[idx];
          const isWet = d.precipMean >= 50;

          return `
            <div style="font-family: inherit; font-size: 12px; padding: 4px;">
              <strong style="font-size: 13px; color: ${isDarkMode ? "#fff" : "#0f172a"};">
                Dasarian: ${d.name} (Ke-${d.dasarianNumber})
              </strong>
              <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span>Normal Presipitasi:</span>
                  <strong style="color: ${isWet ? "#0284c7" : "#f59e0b"}; font-family: monospace; font-size: 13px;">
                    ${d.precipMean.toFixed(1)} mm
                  </strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span>Kriteria Ambang Musim:</span>
                  <strong style="color: ${isWet ? "#0284c7" : "#f59e0b"};">
                    ${isWet ? "≥ 50 mm (Kriteria Hujan)" : "< 50 mm (Kriteria Kemarau)"}
                  </strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span>Suhu Rerata:</span>
                  <strong>${d.tempMean.toFixed(1)} °C</strong>
                </div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: "4%",
        right: "4%",
        bottom: "16%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: names,
        axisLine: { lineStyle: { color: textColor } },
        axisLabel: {
          color: textColor,
          fontSize: 9,
          rotate: 45,
          interval: 0,
        },
      },
      yAxis: {
        type: "value",
        name: "Curah Hujan (mm / dasarian)",
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Curah Hujan Dasarian",
          type: "bar",
          data: rains.map((val, idx) => {
            const isAmh = idx + 1 === amhNumber;
            const isAmk = idx + 1 === amkNumber;
            let color = val >= 50 ? "#0284c7" : "#f59e0b";
            if (isAmh) color = "#10b981"; // Emerald untuk AMH
            if (isAmk) color = "#ef4444"; // Red untuk AMK

            return {
              value: val,
              itemStyle: {
                color,
                borderRadius: [3, 3, 0, 0],
              },
            };
          }),
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 50,
                lineStyle: { color: "#ef4444", type: "dashed", width: 1.5 },
                label: {
                  formatter: "Ambang Batas Musim BMKG (50 mm)",
                  position: "insideEndTop",
                  fontSize: 10,
                  color: "#ef4444",
                },
              },
            ],
          },
          markPoint: {
            symbol: "pin",
            symbolSize: 45,
            data: [
              {
                name: "AMH",
                coord: [amhNumber - 1, rains[amhNumber - 1]],
                itemStyle: { color: "#10b981" },
                label: { formatter: "AMH", color: "#fff", fontSize: 10, fontWeight: "bold" },
              },
              {
                name: "AMK",
                coord: [amkNumber - 1, rains[amkNumber - 1]],
                itemStyle: { color: "#ef4444" },
                label: { formatter: "AMK", color: "#fff", fontSize: 10, fontWeight: "bold" },
              },
            ],
          },
        },
      ],
    };
  }, [dasarians, seasonalDynamics, isDarkMode, textColor, gridColor]);

  if (!dasarians || dasarians.length === 0) return null;

  const amh = seasonalDynamics?.amh;
  const amk = seasonalDynamics?.amk;

  // Hitung panjang musim hujan & kemarau (dalam jumlah dasarian)
  let rainyDasarianCount = 0;
  let dryDasarianCount = 0;
  dasarians.forEach((d) => {
    if (d.precipMean >= 50) rainyDasarianCount++;
    else dryDasarianCount++;
  });

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b dark:border-slate-800 bg-gradient-to-r from-teal-50/50 via-slate-50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 border-teal-300 text-[10px] font-bold">
                Standar BMKG ZOM (Zona Musim)
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                Profil 36 Dasarian (Normal 1991–2020)
              </Badge>
            </div>
            <CardTitle className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <CalendarDays className="h-5 w-5 text-teal-500" />
              Dinamika 36 Dasarian &amp; Prediksi Onset Musim BMKG
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Penetapan Awal Musim Hujan (AMH) &amp; Awal Musim Kemarau (AMK) berdasarkan kaidah resmi BMKG (ambang batas 50 mm/dasarian selama 3 dasarian berurutan).
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Onset KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AMH Card */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                <CloudRain className="h-4 w-4 text-emerald-600" /> Awal Musim Hujan (AMH)
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px]">BMKG Rule</Badge>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono">
                {amh ? amh.name : "Okt I"}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Dasarian Ke-{amh ? amh.number : 28} · Curah Hujan: <strong>{amh ? amh.rain.toFixed(1) : "65"} mm</strong>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 border-t border-emerald-200/60 dark:border-emerald-900/60 pt-2">
              Kondisi presipitasi mencapai ≥ 50 mm dan dipastikan berlanjut minimal selama 3 dasarian berturut-turut.
            </p>
          </div>

          {/* AMK Card */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <SunMedium className="h-4 w-4 text-amber-600" /> Awal Musim Kemarau (AMK)
              </span>
              <Badge className="bg-amber-600 text-white text-[10px]">BMKG Rule</Badge>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-950 dark:text-amber-100 font-mono">
                {amk ? amk.name : "Mei I"}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Dasarian Ke-{amk ? amk.number : 13} · Curah Hujan: <strong>{amk ? amk.rain.toFixed(1) : "42"} mm</strong>
              </div>
            </div>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 border-t border-amber-200/60 dark:border-amber-900/60 pt-2">
              Kondisi presipitasi turun di bawah &lt; 50 mm dan berlanjut minimal selama 3 dasarian berturut-turut.
            </p>
          </div>

          {/* Durasi Musim Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-indigo-500" /> Panjang &amp; Proporsi Musim
              </span>
              <Badge variant="outline" className="text-[10px]">Siklus ZOM</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
                <span className="text-[10px] text-blue-700 font-bold block">Musim Hujan</span>
                <div className="text-lg font-black text-blue-950 dark:text-blue-100 font-mono">
                  {rainyDasarianCount} <span className="text-[10px] font-normal">dasarian</span>
                </div>
                <span className="text-[9px] text-slate-400">~{Math.round(rainyDasarianCount / 3)} bulan</span>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
                <span className="text-[10px] text-amber-700 font-bold block">Musim Kemarau</span>
                <div className="text-lg font-black text-amber-950 dark:text-amber-100 font-mono">
                  {dryDasarianCount} <span className="text-[10px] font-normal">dasarian</span>
                </div>
                <span className="text-[9px] text-slate-400">~{Math.round(dryDasarianCount / 3)} bulan</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              Proporsi iklim mencerminkan tipe Monsunal Indonesia dengan batas transisi pancaroba yang tegas.
            </p>
          </div>
        </div>

        {/* ECharts 36 Dasarians Chart */}
        <div className="h-[360px] w-full">
          <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
        </div>

        {/* BMKG Sifat Hujan Guidance Strip */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
            <Info className="h-4 w-4 text-blue-500" /> Kaidah Sifat Hujan BMKG (Evaluasi Terhadap Normal 1991–2020):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
              <strong className="text-emerald-800 dark:text-emerald-300">Atas Normal (AN): &gt; 115%</strong>
              <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">Curah hujan berada di atas 115% dari rata-rata normal historis 30-tahun.</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/50">
              <strong className="text-blue-800 dark:text-blue-300">Normal (N): 85% – 115%</strong>
              <p className="text-blue-700 dark:text-blue-400 mt-0.5">Curah hujan berada pada interval 85% hingga 115% dari rata-rata normal historis.</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/50">
              <strong className="text-amber-800 dark:text-amber-300">Bawah Normal (BN): &lt; 85%</strong>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">Curah hujan berada di bawah 85% dari rata-rata normal historis (indikasi kekeringan).</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
