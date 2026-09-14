// components/climatology/WeeklyAnalysis.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import { AnalysisPoint } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      Membuat grafik analisis berkala...
    </div>
  ),
});

interface DataItem {
  name: string;
  value: [number, number]; // [timestamp, value]
}

interface WeeklyAnalysisProps {
  points: (AnalysisPoint & { dayLabelWib?: string; dayLabelUtc?: string; dayLabel?: string })[];
  isDarkMode: boolean;
  timezone?: "WIB" | "UTC";
}

export const WeeklyAnalysis: React.FC<WeeklyAnalysisProps> = ({
  points,
  isDarkMode,
  timezone = "WIB",
}) => {
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";
  const tooltipBg = isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.96)";
  const tooltipBorder = isDarkMode ? "#334155" : "#cbd5e1";

  // Formatter waktu sesuai timezone
  const formatEpochTime = useCallback(
    (ts: number): string => {
      const offsetMs = timezone === "WIB" ? 7 * 3600 * 1000 : 0;
      const d = new Date(ts + offsetMs);
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const min = String(d.getUTCMinutes()).padStart(2, "0");
      return `${dd}/${mm} ${hh}:${min} ${timezone}`;
    },
    [timezone]
  );

  // Factory generator opsi ECharts dinamis (dynamic-data2 pattern)
  const createWeeklyLineOption = useCallback(
    (
      unit: string,
      seriesData: {
        max: DataItem[];
        mean: DataItem[];
        min: DataItem[];
      },
      colors: { max: string; mean: string; min: string },
      yRange?: { min?: number; max?: number }
    ) => {
      return {
        backgroundColor: "transparent",
        animation: true,
        animationDuration: 400,
        grid: {
          top: 35,
          right: 25,
          bottom: 50,
          left: 55,
          containLabel: false,
        },
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: isDarkMode ? "#f8fafc" : "#0f172a",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          },
          axisPointer: {
            type: "cross",
            animation: false,
            label: {
              backgroundColor: isDarkMode ? "#334155" : "#64748b",
              formatter: (param: any) => {
                if (param.axisDimension === "x" && typeof param.value === "number") {
                  return formatEpochTime(param.value);
                }
                return typeof param.value === "number" ? param.value.toFixed(2) : param.value;
              },
            },
          },
          formatter: (params: any) => {
            if (!params || !params.length) return "";
            const first = params[0];
            const timeLabel = first.name || "";
            let html = `
              <div style="font-weight:700; margin-bottom:5px; font-size:11px; opacity:0.85;">
                Waktu: ${timeLabel}
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
            `;
            params.forEach((item: any) => {
              const val = typeof item.value[1] === "number" ? item.value[1].toFixed(2) : item.value[1];
              html += `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
                  <span style="display:flex; align-items:center; gap:6px;">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${item.color};"></span>
                    <span>${item.seriesName}</span>
                  </span>
                  <span style="font-weight:700; font-family:monospace;">${val} ${unit}</span>
                </div>
              `;
            });
            html += `</div>`;
            return html;
          },
        },
        legend: {
          orient: "horizontal",
          right: 20,
          top: 5,
          textStyle: {
            color: textColor,
            fontSize: 11,
          },
          icon: "roundRect",
        },
        xAxis: {
          type: "time",
          splitLine: { show: false },
          axisLine: { lineStyle: { color: gridColor } },
          axisTick: { show: false },
          axisLabel: {
            color: textColor,
            fontSize: 11,
            formatter: (val: number) => {
              const offsetMs = timezone === "WIB" ? 7 * 3600 * 1000 : 0;
              const d = new Date(val + offsetMs);
              const dd = String(d.getUTCDate()).padStart(2, "0");
              const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
              const hh = String(d.getUTCHours()).padStart(2, "0");
              const min = String(d.getUTCMinutes()).padStart(2, "0");
              return `${dd}/${mm} ${hh}:${min}`;
            },
          },
        },
        yAxis: {
          type: "value",
          scale: true,
          name: unit,
          min: yRange?.min,
          max: yRange?.max,
          nameTextStyle: {
            color: textColor,
            fontSize: 11,
            align: "left",
            padding: [0, 0, 4, 0],
          },
          splitLine: {
            lineStyle: {
              color: gridColor,
              type: "dashed",
            },
          },
          axisLabel: {
            color: textColor,
            fontSize: 11,
          },
        },
        dataZoom: [
          {
            type: "inside",
            start: 0,
            end: 100,
          },
          {
            type: "slider",
            start: 0,
            end: 100,
            height: 18,
            bottom: 5,
            borderColor: "transparent",
            backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.4)" : "rgba(241, 245, 249, 0.8)",
            fillerColor: isDarkMode ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.2)",
            handleStyle: {
              color: isDarkMode ? "#818cf8" : "#6366f1",
              borderColor: "transparent",
            },
            textStyle: {
              color: textColor,
              fontSize: 10,
            },
          },
        ],
        series: [
          {
            name: "Maksimum",
            type: "line",
            showSymbol: false,
            smooth: true,
            data: seriesData.max,
            lineStyle: { width: 1.6, type: "dashed", color: colors.max },
            itemStyle: { color: colors.max },
          },
          {
            name: "Rata-rata",
            type: "line",
            showSymbol: false,
            smooth: true,
            data: seriesData.mean,
            lineStyle: { width: 2.6, color: colors.mean },
            itemStyle: { color: colors.mean },
          },
          {
            name: "Minimum",
            type: "line",
            showSymbol: false,
            smooth: true,
            data: seriesData.min,
            lineStyle: { width: 1.6, type: "dashed", color: colors.min },
            itemStyle: { color: colors.min },
          },
        ],
      };
    },
    [textColor, gridColor, tooltipBg, tooltipBorder, isDarkMode, formatEpochTime, timezone]
  );

  // 1. Opsi Suhu Berkala ECharts
  const tempChartOption = useMemo(() => {
    const validTemps = points.flatMap((p) => [p.temperatureMax, p.temperatureMean, p.temperatureMin]).filter(Number.isFinite);
    const tempMin = validTemps.length > 0 ? Math.floor(Math.min(...validTemps)) : undefined;
    const tempMax = validTemps.length > 0 ? Math.ceil(Math.max(...validTemps)) : undefined;

    const maxData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.temperatureMax],
    }));
    const meanData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.temperatureMean],
    }));
    const minData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.temperatureMin],
    }));

    return createWeeklyLineOption(
      "°C",
      { max: maxData, mean: meanData, min: minData },
      { max: "#f87171", mean: "#ef4444", min: "#60a5fa" },
      { min: tempMin, max: tempMax }
    );
  }, [points, formatEpochTime, createWeeklyLineOption]);

  // 2. Opsi Kelembaban Berkala ECharts
  const humChartOption = useMemo(() => {
    const validHums = points.flatMap((p) => [p.humidityMax, p.humidityMean, p.humidityMin]).filter(Number.isFinite);
    const humMin = validHums.length > 0 ? Math.max(0, Math.floor(Math.min(...validHums))) : 0;
    const humMax = validHums.length > 0 ? Math.min(100, Math.ceil(Math.max(...validHums))) : 100;

    const maxData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.humidityMax],
    }));
    const meanData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.humidityMean],
    }));
    const minData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.humidityMin],
    }));

    return createWeeklyLineOption(
      "%",
      { max: maxData, mean: meanData, min: minData },
      { max: "#34d399", mean: "#059669", min: "#f59e0b" },
      { min: humMin, max: humMax }
    );
  }, [points, formatEpochTime, createWeeklyLineOption]);

  // 3. Opsi Tekanan Berkala ECharts
  const pressChartOption = useMemo(() => {
    const validPresses = points.flatMap((p) => [p.pressureMax, p.pressureMean, p.pressureMin]).filter(Number.isFinite);
    const pressMin = validPresses.length > 0 ? Math.floor(Math.min(...validPresses)) : undefined;
    const pressMax = validPresses.length > 0 ? Math.ceil(Math.max(...validPresses)) : undefined;

    const maxData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.pressureMax],
    }));
    const meanData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.pressureMean],
    }));
    const minData: DataItem[] = points.map((p) => ({
      name: formatEpochTime(p.timestamp),
      value: [p.timestamp, p.pressureMin],
    }));

    return createWeeklyLineOption(
      "hPa",
      { max: maxData, mean: meanData, min: minData },
      { max: "#f43f5e", mean: "#db2777", min: "#818cf8" },
      { min: pressMin, max: pressMax }
    );
  }, [points, formatEpochTime, createWeeklyLineOption]);

  return (
    <div className="space-y-6">
      {/* 1. Weekly Temperature */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Suhu Udara Berkala
          </CardTitle>
          <CardDescription>
            Tren suhu udara resolusi tinggi (Maksimum, Rata-rata, Minimum) dalam {timezone === "WIB" ? "WIB (Lokal)" : "UTC (Standar WMO)"} — sorot untuk melihat ketiga nilai
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <ReactECharts
              option={tempChartOption}
              style={{ width: "100%", height: "350px" }}
              notMerge={false}
              lazyUpdate={true}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Tidak ada data observasi suhu
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Weekly Humidity */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Analisis Kelembaban Relatif Berkala
          </CardTitle>
          <CardDescription>
            Tren kelembaban udara resolusi tinggi (Maksimum, Rata-rata, Minimum) dalam {timezone === "WIB" ? "WIB (Lokal)" : "UTC (Standar WMO)"} — sorot untuk melihat ketiga nilai
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <ReactECharts
              option={humChartOption}
              style={{ width: "100%", height: "350px" }}
              notMerge={false}
              lazyUpdate={true}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Tidak ada data observasi kelembaban
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Weekly Pressure */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-pink-500" /> Analisis Tekanan Udara Permukaan Berkala
          </CardTitle>
          <CardDescription>
            Tren tekanan udara resolusi tinggi (Maksimum, Rata-rata, Minimum) dalam {timezone === "WIB" ? "WIB (Lokal)" : "UTC (Standar WMO)"} — sorot untuk melihat ketiga nilai
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <ReactECharts
              option={pressChartOption}
              style={{ width: "100%", height: "350px" }}
              notMerge={false}
              lazyUpdate={true}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Tidak ada data observasi tekanan
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
