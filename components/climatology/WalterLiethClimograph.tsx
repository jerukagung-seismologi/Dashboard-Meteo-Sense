// components/climatology/WalterLiethClimograph.tsx
"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudSun, CloudRain, Info, Mountain, Thermometer, Droplets, Compass, ShieldAlert } from "lucide-react";
import type { Wmo30YearNormals } from "@/lib/climatology/wmoNormals";

interface WalterLiethClimographProps {
  normals: Wmo30YearNormals | null;
  stationName?: string;
  isDarkMode?: boolean;
}

export function WalterLiethClimograph({
  normals,
  stationName = "Stasiun Terpilih",
  isDarkMode = false,
}: WalterLiethClimographProps) {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

  const chartOption = useMemo(() => {
    if (!normals) return {};

    const months = normals.monthly.map((m) => m.monthName);
    const temps = normals.monthly.map((m) => m.tempMean);
    const rains = normals.monthly.map((m) => m.precipMean);

    // Standar Bioklimatologi Walter-Lieth (Heinrich Walter & Helmut Lieth, 1960–1967; WMO No. 1203):
    // 1. Rasio skala dasar: 10°C = 20 mm presipitasi (1°C = 2 mm) untuk rentang 0 s.d. 100 mm.
    // 2. Di atas 100 mm (wilayah tropis basah/hujan lebat), skala presipitasi dikompresi agar grafik tidak terdistorsi.
    //    Kita gunakan kompresi 1:5 di atas 100 mm (setiap 100 mm aktual = 20 unit grafis).
    // 3. Suhu udara (T) diplot pada T_plot = T * 2, sehingga kurva suhu SECARA ALAMI menjadi garis ambang batas 2T!
    //    Jika kurva presipitasi (P) berada DI BAWAH kurva suhu (T), terjadi PERIODE ARID (P < 2T).
    //    Jika P berada DI ATAS T, terjadi PERIODE HUMID (P >= 2T).
    //    Jika P > 100 mm, masuk ZONA PER-HUMID (ekstra basah).
    const rainToY = (p: number): number => {
      if (p <= 100) return p;
      return Number((100 + (p - 100) / 5).toFixed(2));
    };

    const tempToY = (t: number): number => Number((t * 2).toFixed(2));

    // Identifikasi rentang bulan arid (P < 2T) untuk penanda visual standar Walter-Lieth
    const aridMonthIndices = normals.monthly
      .map((m, idx) => (m.precipMean < m.tempMean * 2 ? idx : -1))
      .filter((idx) => idx !== -1);

    const markAreaPieces: any[] = [];
    if (aridMonthIndices.length > 0) {
      let runStart = aridMonthIndices[0];
      let runEnd = aridMonthIndices[0];

      for (let i = 1; i < aridMonthIndices.length; i++) {
        if (aridMonthIndices[i] === runEnd + 1) {
          runEnd = aridMonthIndices[i];
        } else {
          markAreaPieces.push([
            {
              name: "Periode Arid",
              xAxis: months[runStart],
              itemStyle: {
                color: isDarkMode ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.18)",
              },
              label: {
                show: true,
                formatter: "Periode Arid (P < 2T)",
                position: "insideTop",
                color: isDarkMode ? "#fcd34d" : "#b45309",
                fontSize: 10,
                fontWeight: "bold",
              },
            },
            {
              xAxis: months[runEnd],
            },
          ]);
          runStart = aridMonthIndices[i];
          runEnd = aridMonthIndices[i];
        }
      }
      markAreaPieces.push([
        {
          name: "Periode Arid",
          xAxis: months[runStart],
          itemStyle: {
            color: isDarkMode ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.18)",
          },
          label: {
            show: true,
            formatter: "Periode Arid (P < 2T)",
            position: "insideTop",
            color: isDarkMode ? "#fcd34d" : "#b45309",
            fontSize: 10,
            fontWeight: "bold",
          },
        },
        {
          xAxis: months[runEnd],
        },
      ]);
    }

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          crossStyle: { color: "#999" },
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const monthIdx = params[0].dataIndex;
          const mData = normals.monthly[monthIdx];
          const isArid = mData.precipMean < mData.tempMean * 2;
          const isPerHumid = mData.precipMean > 100;
          const netWater = mData.precipMean - mData.tempMean * 2;

          let statusText = `Periode Humid / Basah (+${netWater.toFixed(1)} mm)`;
          let statusColor = "#0284c7";
          if (isArid) {
            statusText = `Periode Arid / Kering (${netWater.toFixed(1)} mm)`;
            statusColor = "#ea580c";
          } else if (isPerHumid) {
            statusText = `Periode Per-Humid / Sangat Basah (+${netWater.toFixed(1)} mm)`;
            statusColor = "#0369a1";
          }

          return `
            <div style="font-family: inherit; font-size: 12px; padding: 6px; min-width: 240px;">
              <strong style="font-size: 13px; color: ${isDarkMode ? "#fff" : "#0f172a"}; display: block; border-bottom: 1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}; padding-bottom: 4px; margin-bottom: 6px;">
                ${mData.fullName} (Normal WMO 1991–2020)
              </strong>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #ef4444; font-weight: 600;">● Suhu Udara Rerata (T):</span>
                  <strong style="color: #ef4444;">${mData.tempMean.toFixed(1)} °C</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #0284c7; font-weight: 600;">● Curah Hujan (P):</span>
                  <strong style="color: #0284c7;">${mData.precipMean.toFixed(1)} mm</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #f59e0b; font-weight: 600;">● Ambang Bioklimat (2T):</span>
                  <strong style="color: #f59e0b;">${(mData.tempMean * 2).toFixed(1)} mm</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 2px;">
                  <span style="color: #64748b;">Kondisi Bioklimat:</span>
                  <strong style="color: ${statusColor}; font-weight: 700;">
                    ${statusText}
                  </strong>
                </div>
                <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}; padding-top: 4px; margin-top: 4px;">
                  Suhu Ekstrem: ${mData.tempMinMean}°C s.d. ${mData.tempMaxMean}°C · Hari Hujan: ${mData.rainDaysMean} hari
                </div>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: ["Curah Hujan (P)", "Suhu Udara (T) & Ambang 2T"],
        textStyle: { color: textColor, fontSize: 11 },
        top: "2%",
      },
      grid: {
        left: "5%",
        right: "6%",
        bottom: "12%",
        top: "18%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        axisLine: { lineStyle: { color: textColor } },
        axisLabel: { color: textColor, fontWeight: "bold" },
        splitLine: { show: true, lineStyle: { color: gridColor, type: "dashed" } },
      },
      yAxis: [
        {
          type: "value",
          name: "Curah Hujan (mm)",
          nameTextStyle: { color: "#0284c7", fontWeight: "bold" },
          min: 0,
          max: 180,
          interval: 20,
          position: "left",
          axisLine: { show: true, lineStyle: { color: "#0284c7" } },
          axisLabel: {
            color: "#0284c7",
            fontWeight: "bold",
            formatter: (val: number) => {
              if (val <= 100) return `${val} mm`;
              const realRain = Math.round(100 + (val - 100) * 5);
              return `${realRain} mm`;
            },
          },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          type: "value",
          name: "Suhu Udara (°C) [1°C = 2 mm]",
          nameTextStyle: { color: "#ef4444", fontWeight: "bold" },
          min: 0,
          max: 180,
          interval: 20,
          position: "right",
          axisLine: { show: true, lineStyle: { color: "#ef4444" } },
          axisLabel: {
            color: "#ef4444",
            fontWeight: "bold",
            formatter: (val: number) => {
              if (val <= 100) return `${val / 2} °C`;
              return ""; // Kosong di atas 50°C
            },
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Curah Hujan (P)",
          type: "line",
          yAxisIndex: 0,
          data: rains.map((r, idx) => {
            const isArid = r < temps[idx] * 2;
            return {
              value: rainToY(r),
              itemStyle: {
                color: isArid ? "#ea580c" : "#0284c7",
                borderColor: isArid ? "#c2410c" : "#0369a1",
                borderWidth: isArid ? 2 : 1,
              },
            };
          }),
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 3, color: "#0284c7" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(2, 132, 199, 0.40)" },
                { offset: 0.6, color: "rgba(2, 132, 199, 0.20)" },
                { offset: 1, color: "rgba(2, 132, 199, 0.02)" },
              ],
            },
          },
          markArea: markAreaPieces.length > 0 ? { silent: true, data: markAreaPieces } : undefined,
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 100,
                lineStyle: { color: "#0284c7", type: "solid", width: 1.5 },
                label: {
                  formatter: "Batas Per-Humid Walter-Lieth (100 mm) · Skala Kompresi 1:5",
                  position: "insideEndTop",
                  fontSize: 10,
                  fontWeight: "bold",
                  color: "#0284c7",
                },
              },
              {
                yAxis: 60,
                lineStyle: { color: "#f59e0b", type: "dotted", width: 1.5 },
                label: {
                  formatter: "Bulan Kering Mohr / SF (60 mm)",
                  position: "insideEndBottom",
                  fontSize: 10,
                  color: "#f59e0b",
                },
              },
            ],
          },
        },
        {
          name: "Suhu Udara (T) & Ambang 2T",
          type: "line",
          yAxisIndex: 1,
          data: temps.map((t) => tempToY(t)),
          smooth: true,
          symbol: "diamond",
          symbolSize: 8,
          itemStyle: { color: "#ef4444" },
          lineStyle: { width: 3, color: "#ef4444" },
        },
      ],
    };
  }, [normals, isDarkMode, textColor, gridColor]);

  if (!normals) {
    return null;
  }

  // Identifikasi bulan kering vs lembap vs per-humid
  const aridMonths = normals.monthly.filter((m) => m.precipMean < m.tempMean * 2);
  const humidMonths = normals.monthly.filter((m) => m.precipMean >= m.tempMean * 2);
  const perHumidMonths = normals.monthly.filter((m) => m.precipMean > 100);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header Standar WMO Klimadiagramm */}
      <CardHeader className="pb-3 border-b border-slate-200/80 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 text-[10px] font-bold">
                WMO Standard No. 1203 / No. 100
              </Badge>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 text-[10px]">
                Periode Normal: 1991–2020 (30 Tahun)
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[10px]">
                Skala Walter-Lieth (1°C = 2 mm · Kompresi &gt;100 mm)
              </Badge>
            </div>
            <CardTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <CloudSun className="h-5 w-5 text-blue-500" />
              Diagram Iklim Walter-Lieth (Climograph WMO)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Bioklimatologi rasio standar P = 2T (1°C = 2 mm): Kurva suhu (T) sekaligus berfungsi sebagai ambang batas aridity 2T. Presipitasi &gt; 100 mm dikompresi 1:5 sesuai kaidah Heinrich Walter &amp; Helmut Lieth.
            </CardDescription>
          </div>

          {/* Metadata Stasiun Box ala Walter-Lieth */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs shadow-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Compass className="h-3 w-3 text-blue-500" /> Posisi
              </span>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                {normals.latitude.toFixed(2)}°, {normals.longitude.toFixed(2)}°
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Mountain className="h-3 w-3 text-emerald-500" /> Elevasi
              </span>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                {normals.elevation} m dpl
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Thermometer className="h-3 w-3 text-red-500" /> Rerata Suhu (T)
              </span>
              <div className="font-mono font-bold text-red-600 dark:text-red-400 text-[11px]">
                {normals.annual.tempMean.toFixed(1)} °C
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Droplets className="h-3 w-3 text-cyan-500" /> Total Hujan (P)
              </span>
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                {normals.annual.precipMean.toFixed(0)} mm/th
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Main Climograph Chart */}
        <div className="h-[370px] w-full">
          <ReactECharts
            option={chartOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
          />
        </div>

        {/* Bioclimatic Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t dark:border-slate-800 text-xs">
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-1">
            <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-blue-500" /> Periode Humid (Surplus Air)
            </span>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              Terjadi selama <strong>{humidMonths.length} bulan</strong> ({humidMonths.map((m) => m.monthName).join(", ") || "Nihil"}), di mana kurva presipitasi berada di atas garis suhu (P &ge; 2T).
            </p>
          </div>

          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <CloudSun className="h-3.5 w-3.5 text-amber-500" /> Periode Arid (Defisit Kering)
            </span>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Terjadi selama <strong>{aridMonths.length} bulan</strong> ({aridMonths.map((m) => `${m.monthName} (${m.precipMean.toFixed(1)} mm)`).join(", ") || "Tidak ada bulan arid"}), di mana presipitasi berada di bawah kurva suhu (P &lt; 2T).
            </p>
          </div>

          <div className="p-3 bg-sky-50/60 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-900/40 space-y-1">
            <span className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
              <CloudRain className="h-3.5 w-3.5 text-sky-500" /> Zona Per-Humid (P &gt; 100 mm)
            </span>
            <p className="text-[11px] text-sky-700 dark:text-sky-300">
              Terjadi selama <strong>{perHumidMonths.length} bulan</strong> ({perHumidMonths.map((m) => m.monthName).join(", ")}). Presipitasi melimpah melebihi ambang batas infiltrasi tanah dan mendukung biomassa tropis lebat.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-slate-500" /> Evaluasi Kewajaran Meteorologis
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Total Hujan: <strong className="text-blue-600 dark:text-blue-400">{normals.annual.precipMean.toFixed(0)} mm/th</strong> (Sangat wajar untuk pesisir selatan Jawa Tengah; normal BMKG: 2.200–2.800 mm). Bulan terbasah {normals.annual.wettestMonth.name} ({normals.annual.wettestMonth.rain.toFixed(0)} mm) &amp; terkering {normals.annual.driestMonth.name} ({normals.annual.driestMonth.rain.toFixed(0)} mm).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
