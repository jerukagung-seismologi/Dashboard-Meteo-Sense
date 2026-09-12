// components/agromet/WaterBalanceDualChart.tsx
"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  Sun,
  Activity,
  ArrowDownUp,
  Clock,
  Calendar,
  Info,
  Layers,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface WaterBalanceDualChartProps {
  hourly?: {
    time?: string[];
    precipitation?: number[];
    et0_fao_evapotranspiration?: number[];
  };
  daily?: {
    time?: string[];
    precipitation_sum?: number[];
    et0_fao_evapotranspiration_sum?: number[];
  };
  isDarkMode?: boolean;
}

export const WaterBalanceDualChart: React.FC<WaterBalanceDualChartProps> = ({
  hourly = {},
  daily = {},
  isDarkMode = false,
}) => {
  // Toggle between "hourly" (168 jam / 7 hari) and "daily" (7 hari agregat)
  const [resolution, setResolution] = useState<"hourly" | "daily">("hourly");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.25)" : "rgba(203, 213, 225, 0.35)";

  // Format time labels
  const { timeData, et0Data, rainData, totalRain, totalEt0, netBalance } = useMemo(() => {
    if (resolution === "hourly" && hourly.time && hourly.time.length > 0) {
      // 7 Hari hourly (168 titik data)
      const times = hourly.time.slice(0, 168).map((t) => {
        // format: "YYYY-MM-DDTHH:mm" -> "DD/MM HH:mm"
        const parts = t.split("T");
        if (parts.length === 2) {
          const dParts = parts[0].split("-");
          return `${dParts[2]}/${dParts[1]} ${parts[1]}`;
        }
        return t;
      });
      const et0 = (hourly.et0_fao_evapotranspiration || []).slice(0, 168).map((v) => Number((v || 0).toFixed(2)));
      const rain = (hourly.precipitation || []).slice(0, 168).map((v) => Number((v || 0).toFixed(2)));

      const tRain = rain.reduce((a, b) => a + b, 0);
      const tEt0 = et0.reduce((a, b) => a + b, 0);

      return {
        timeData: times,
        et0Data: et0,
        rainData: rain,
        totalRain: Number(tRain.toFixed(1)),
        totalEt0: Number(tEt0.toFixed(1)),
        netBalance: Number((tRain - tEt0).toFixed(1)),
      };
    } else {
      // Daily (7 Hari)
      const times = (daily.time || []).slice(0, 7).map((d) => {
        // format: "YYYY-MM-DD" -> "DD MMM"
        const dParts = d.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const mIdx = parseInt(dParts[1], 10) - 1;
        return `${dParts[2]} ${monthNames[mIdx] || dParts[1]}`;
      });
      const et0 = (daily.et0_fao_evapotranspiration_sum || []).slice(0, 7).map((v) => Number((v || 0).toFixed(2)));
      const rain = (daily.precipitation_sum || []).slice(0, 7).map((v) => Number((v || 0).toFixed(2)));

      const tRain = rain.reduce((a, b) => a + b, 0);
      const tEt0 = et0.reduce((a, b) => a + b, 0);

      return {
        timeData: times,
        et0Data: et0,
        rainData: rain,
        totalRain: Number(tRain.toFixed(1)),
        totalEt0: Number(tEt0.toFixed(1)),
        netBalance: Number((tRain - tEt0).toFixed(1)),
      };
    }
  }, [resolution, hourly, daily]);

  // ECharts Dual-Grid Synchronized Option (Rainfall vs Evaporation)
  const chartOption = useMemo(() => {
    // Dynamic max for scale
    const maxEt0 = Math.max(...et0Data, 0.5);
    const maxRain = Math.max(...rainData, 0.5);

    return {
      backgroundColor: "transparent",
      title: {
        text: "Neraca Hidrologi Lahan: Evapotranspirasi vs Curah Hujan",
        left: "center",
        top: 0,
        textStyle: {
          color: textColor,
          fontSize: 13,
          fontWeight: "bold",
        },
        subtext:
          resolution === "hourly"
            ? "Resolusi Per Jam (168 Jam / 7 Hari) • Linked Synchronized Grids"
            : "Resolusi Akumulasi Harian (7 Hari) • Linked Synchronized Grids",
        subtextStyle: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          animation: false,
          type: "cross",
          lineStyle: {
            color: isDarkMode ? "#64748b" : "#94a3b8",
            type: "dashed",
          },
        },
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: {
          color: isDarkMode ? "#f8fafc" : "#0f172a",
          fontSize: 12,
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const time = params[0].axisValueLabel || params[0].name;
          let etVal = 0;
          let rainVal = 0;

          params.forEach((p) => {
            if (p.seriesName.includes("Evapotranspirasi") || p.seriesName === "Evaporation") {
              etVal = Number(p.value) || 0;
            } else if (p.seriesName.includes("Curah Hujan") || p.seriesName === "Rainfall") {
              rainVal = Number(p.value) || 0;
            }
          });

          const diff = Number((rainVal - etVal).toFixed(2));
          const isSurplus = diff > 0;
          const isDeficit = diff < 0;

          return `
            <div class="font-bold text-xs pb-1.5 border-b border-slate-200 dark:border-slate-700 mb-1.5 flex justify-between gap-3">
              <span>Waktu: ${time}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isSurplus
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold"
                  : isDeficit
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
                  : "bg-slate-500/20 text-slate-600 dark:text-slate-300"
              }">
                ${isSurplus ? "Surplus Air" : isDeficit ? "Defisit Air" : "Seimbang"}
              </span>
            </div>
            <div class="space-y-1 text-xs">
              <div class="flex justify-between gap-4">
                <span class="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  Output Evapotranspirasi (ET0):
                </span>
                <span class="font-mono font-bold text-amber-600 dark:text-amber-400">${etVal.toFixed(2)} mm</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                  <span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Input Curah Hujan (Rainfall):
                </span>
                <span class="font-mono font-bold text-blue-600 dark:text-blue-400">${rainVal.toFixed(2)} mm</span>
              </div>
              <div class="flex justify-between gap-4 pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                <span class="text-slate-500">Neraca Bersih (Hujan - ET0):</span>
                <span class="font-mono font-bold ${isSurplus ? "text-emerald-500" : isDeficit ? "text-amber-500" : "text-slate-400"}">
                  ${diff > 0 ? `+${diff}` : diff} mm
                </span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: ["Evapotranspirasi (ET0)", "Curah Hujan"],
        left: 20,
        top: 2,
        textStyle: {
          color: textColor,
          fontSize: 11,
          fontWeight: "bold",
        },
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: "none",
            title: {
              zoom: "Area Zoom",
              back: "Reset Zoom",
            },
          },
          restore: { title: "Kembalikan Tampilan" },
          saveAsImage: { title: "Simpan Gambar (PNG)" },
        },
        iconStyle: {
          borderColor: textColor,
        },
        right: 20,
        top: 0,
      },
      axisPointer: {
        link: [
          {
            xAxisIndex: "all",
          },
        ],
      },
      dataZoom: [
        {
          show: true,
          realtime: true,
          start: resolution === "hourly" ? 0 : 0,
          end: resolution === "hourly" ? 100 : 100,
          xAxisIndex: [0, 1],
          bottom: 4,
          height: 20,
          textStyle: {
            color: textColor,
            fontSize: 10,
          },
          borderColor: isDarkMode ? "#334155" : "#cbd5e1",
          fillerColor: isDarkMode ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.12)",
          handleStyle: {
            color: "#6366f1",
          },
        },
        {
          type: "inside",
          realtime: true,
          start: 0,
          end: 100,
          xAxisIndex: [0, 1],
        },
      ],
      grid: [
        // Top Grid: Evaporation
        {
          left: 55,
          right: 35,
          top: 48,
          height: "33%",
        },
        // Bottom Grid: Rainfall (Inverted)
        {
          left: 55,
          right: 35,
          top: "54%",
          height: "33%",
        },
      ],
      xAxis: [
        // Top X-Axis
        {
          type: "category",
          boundaryGap: false,
          axisLine: { onZero: true, lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
          axisLabel: {
            color: textColor,
            fontSize: 10,
            show: resolution === "daily", // Hide on top if hourly to reduce clutter, or show conditionally
          },
          data: timeData,
        },
        // Bottom X-Axis (position top creates the shared horizon line)
        {
          gridIndex: 1,
          type: "category",
          boundaryGap: false,
          axisLine: { onZero: true, lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
          axisLabel: {
            color: textColor,
            fontSize: 10,
            formatter: (val: string) => {
              // Condense hourly label for cleanliness
              if (resolution === "hourly") {
                return val.includes("00:00") ? val.split(" ")[0] : val.split(" ")[1];
              }
              return val;
            },
          },
          data: timeData,
          position: "top",
        },
      ],
      yAxis: [
        // Top Y-Axis: Evapotranspiration
        {
          name: resolution === "hourly" ? "Evaporasi (mm/jam)" : "Evaporasi (mm/hari)",
          type: "value",
          nameTextStyle: {
            color: "#f59e0b",
            fontSize: 10.5,
            fontWeight: "bold",
          },
          max: Number((maxEt0 * 1.25).toFixed(1)),
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: gridColor } },
        },
        // Bottom Y-Axis: Inverted Rainfall
        {
          gridIndex: 1,
          name: resolution === "hourly" ? "Curah Hujan (mm/jam)" : "Curah Hujan (mm/hari)",
          type: "value",
          inverse: true, // Inverted vertical orientation
          nameTextStyle: {
            color: "#3b82f6",
            fontSize: 10.5,
            fontWeight: "bold",
          },
          max: Number((maxRain * 1.35).toFixed(1)),
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: gridColor } },
        },
      ],
      series: [
        // 1. Evaporation Line (Top Grid)
        {
          name: "Evapotranspirasi (ET0)",
          type: "line",
          symbolSize: resolution === "daily" ? 7 : 4,
          smooth: true,
          itemStyle: { color: "#f59e0b" },
          lineStyle: { width: 2.2, color: "#f59e0b" },
          areaStyle: {
            color: isDarkMode ? "rgba(245, 158, 11, 0.18)" : "rgba(245, 158, 11, 0.12)",
          },
          data: et0Data,
        },
        // 2. Rainfall Line (Bottom Grid, Inverted)
        {
          name: "Curah Hujan",
          type: "line",
          xAxisIndex: 1,
          yAxisIndex: 1,
          symbolSize: resolution === "daily" ? 7 : 4,
          smooth: true,
          itemStyle: { color: "#3b82f6" },
          lineStyle: { width: 2.2, color: "#3b82f6" },
          areaStyle: {
            color: isDarkMode ? "rgba(59, 130, 246, 0.22)" : "rgba(59, 130, 246, 0.14)",
          },
          data: rainData,
        },
      ],
    };
  }, [resolution, timeData, et0Data, rainData, isDarkMode, textColor, gridColor]);

  const isOverallSurplus = netBalance >= 0;

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-3 border-b dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <ArrowDownUp className="h-4 w-4" />
              </span>
              <CardTitle className="text-base font-bold tracking-tight">
                Neraca Air Lahan: Hujan vs Evapotranspirasi (Water Balance)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Visualisasi hidrometeorologi ganda sinkron: Input presipitasi ke tanah vs Output penguapan ke atmosfer
            </CardDescription>
          </div>

          {/* Resolution Selector Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border dark:border-slate-700/60">
            <button
              onClick={() => setResolution("hourly")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                resolution === "hourly"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Clock className="h-3 w-3" />
              Per Jam (7 Hari)
            </button>
            <button
              onClick={() => setResolution("daily")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                resolution === "daily"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Calendar className="h-3 w-3" />
              Harian (7 Hari)
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <Droplets className="h-3 w-3 text-blue-500" /> Total Input Hujan (7 Hari)
            </span>
            <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">
              {totalRain} mm
            </span>
          </div>

          <div className="p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <Sun className="h-3 w-3 text-amber-500" /> Total Evapotranspirasi ET0
            </span>
            <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {totalEt0} mm
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isOverallSurplus
                ? "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20"
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              {isOverallSurplus ? (
                <ArrowUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDown className="h-3 w-3 text-rose-500" />
              )}
              Neraca Bersih (Net Balance)
            </span>
            <span
              className={`text-base font-bold font-mono mt-0.5 block ${
                isOverallSurplus ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {netBalance > 0 ? `+${netBalance}` : netBalance} mm
            </span>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-500">Status Neraca Lahan</span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold w-fit mt-0.5 ${
                isOverallSurplus
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300"
              }`}
            >
              {isOverallSurplus ? "Surplus (Air Cukup)" : "Defisit (Perlu Irigasi)"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {/* Dual Linked ECharts Container */}
        <div className="h-[430px] w-full bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-1.5 border dark:border-slate-800">
          <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={true} />
        </div>

        {/* Agrometeorological Interpretation Footnote */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2.5">
          <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Prinsip Hidrologi Visual ECharts:</strong> Grafik bagian atas menampilkan laju{" "}
              <strong className="text-amber-600 dark:text-amber-400">Evapotranspirasi (ET0)</strong> yang menguap ke atas
              menuju atmosfer. Grafik bagian bawah menampilkan{" "}
              <strong className="text-blue-600 dark:text-blue-400">Curah Hujan</strong> dengan sumbu terbalik (
              <code className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">inverse: true</code>
              ) melambangkan air yang turun membasahi tanah.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gunakan slider zoom di bagian bawah atau gulir mouse (scroll) untuk meneliti lonjakan hujan ekstrem per jam
              maupun periode defisit kekeringan secara sinkron.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
