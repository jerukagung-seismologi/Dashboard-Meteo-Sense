import React, { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Gauge, Grid, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { AnalysisPoint, DailyHeatmapData } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      Membuat grafik analisis harian...
    </div>
  ),
});

interface DataItem {
  name: string;
  value: [number | string, number];
}

interface DailyAnalysisProps {
  points: AnalysisPoint[];
  heatmaps?: {
    temperature: DailyHeatmapData;
    humidity: DailyHeatmapData;
    pressure: DailyHeatmapData;
  };
  isDarkMode: boolean;
  selectedDate?: Date;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onToday?: () => void;
  isToday?: boolean;
}

export const DailyAnalysis: React.FC<DailyAnalysisProps> = ({
  points,
  heatmaps,
  isDarkMode,
  selectedDate,
  onPrevDay,
  onNextDay,
  onToday,
  isToday,
}) => {
  const [activeParam, setActiveParam] = useState<"temperature" | "humidity" | "pressure">("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";
  const tooltipBg = isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.96)";
  const tooltipBorder = isDarkMode ? "#334155" : "#cbd5e1";

  // Konversi UTC epoch ke string WIB untuk label tooltip
  const epochToWibLabel = useCallback((ts: number): string => {
    const wibMs = ts + 7 * 3600 * 1000;
    const d = new Date(wibMs);
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, []);

  // Batas sumbu X: tengah malam WIB (00:00 WIB = 17:00 UTC hari sebelumnya)
  const xAxisBounds = useMemo(() => {
    // Gunakan timestamp point pertama/terakhir sebagai batas inklusif hari WIB
    if (points.length === 0) {
      // Fallback: hari ini WIB
      const nowWib = Date.now() + 7 * 3600 * 1000;
      const d = new Date(nowWib);
      const startOfDayWib = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 7 * 3600 * 1000;
      return { min: startOfDayWib, max: startOfDayWib + 24 * 3600 * 1000 - 1 };
    }
    // Ambil tanggal WIB dari timeKeyWib point pertama (sudah diurutkan)
    const firstTs = points[0].timestamp;
    const firstWib = firstTs + 7 * 3600 * 1000;
    const d = new Date(firstWib);
    // Tengah malam WIB = jam 0 WIB = UTC hari D-1 jam 17:00
    const startOfDayUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 7 * 3600 * 1000;
    return {
      min: startOfDayUtc,
      max: startOfDayUtc + 24 * 3600 * 1000 - 1,
    };
  }, [points]);

  // Factory generator opsi ECharts — gunakan epoch UTC sebagai nilai x
  const createDailyLineOption = useCallback(
    (
      paramTitle: string,
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
          bottom: 35,
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
                  const wibMs = param.value + 7 * 3600 * 1000;
                  const d = new Date(wibMs);
                  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} WIB`;
                }
                return typeof param.value === "number" ? param.value.toFixed(1) : param.value;
              },
            },
          },
          formatter: (params: any) => {
            if (!params || !params.length) return "";
            const first = params[0];
            // Ambil label WIB dari name yang sudah disimpan
            const timeLabel = first.name || "";
            let html = `
              <div style="font-weight:700; margin-bottom:5px; font-size:11px; opacity:0.85;">
                Jam ${timeLabel}
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
            `;
            params.forEach((item: any) => {
              const val = Array.isArray(item.value) && typeof item.value[1] === "number"
                ? item.value[1].toFixed(1)
                : typeof item.value === "number"
                ? item.value.toFixed(1)
                : "-";
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
          // Batas axis dalam UTC epoch (bukan string ambigu)
          min: xAxisBounds.min,
          max: xAxisBounds.max,
          splitLine: { show: false },
          axisLine: { lineStyle: { color: gridColor } },
          axisTick: { show: false },
          axisLabel: {
            color: textColor,
            fontSize: 11,
            // Formatter ekplisit: konversi timestamp ke WIB
            formatter: (val: number) => {
              const wibMs = val + 7 * 3600 * 1000;
              const d = new Date(wibMs);
              return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
            },
          },
        },
        yAxis: {
          type: "value",
          scale: true,
          name: unit,
          min: yRange?.min !== undefined ? yRange.min : undefined,
          max: yRange?.max !== undefined ? yRange.max : undefined,
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
        series: [
          {
            name: "Maksimum",
            type: "line",
            showSymbol: false,
            smooth: true,
            data: seriesData.max,
            lineStyle: { width: 1.8, type: "dashed", color: colors.max },
            itemStyle: { color: colors.max },
          },
          {
            name: "Rata-rata",
            type: "line",
            showSymbol: false,
            smooth: true,
            data: seriesData.mean,
            lineStyle: { width: 2.8, color: colors.mean },
            itemStyle: { color: colors.mean },
          },
          {
            name: "Minimum",
            type: "line",
            showSymbol: false,
            smooth: true,
            data: seriesData.min,
            lineStyle: { width: 1.8, type: "dashed", color: colors.min },
            itemStyle: { color: colors.min },
          },
        ],
      };
    },
    [xAxisBounds, textColor, gridColor, tooltipBg, tooltipBorder, isDarkMode]
  );

  // 1. Opsi Suhu ECharts — x = UTC epoch (p.timestamp), y = nilai suhu
  const tempChartOption = useMemo(() => {
    const validTemps = points.flatMap((p) => [p.temperatureMax, p.temperatureMean, p.temperatureMin]).filter(Number.isFinite);
    const tempMin = validTemps.length > 0 ? Math.floor(Math.min(...validTemps)) - 1 : undefined;
    const tempMax = validTemps.length > 0 ? Math.ceil(Math.max(...validTemps)) + 1 : undefined;

    const maxData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.temperatureMax],
    }));
    const meanData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.temperatureMean],
    }));
    const minData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.temperatureMin],
    }));

    return createDailyLineOption(
      "Suhu Udara",
      "°C",
      { max: maxData, mean: meanData, min: minData },
      { max: "#f87171", mean: "#ef4444", min: "#60a5fa" },
      { min: tempMin, max: tempMax }
    );
  }, [points, epochToWibLabel, createDailyLineOption]);

  // 2. Opsi Kelembaban ECharts — x = UTC epoch, y = kelembaban
  const humChartOption = useMemo(() => {
    const validHums = points.flatMap((p) => [p.humidityMax, p.humidityMean, p.humidityMin]).filter(Number.isFinite);
    const humMin = validHums.length > 0 ? Math.max(0, Math.floor(Math.min(...validHums)) - 2) : 0;
    const humMax = validHums.length > 0 ? Math.min(100, Math.ceil(Math.max(...validHums)) + 2) : 100;

    const maxData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.humidityMax],
    }));
    const meanData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.humidityMean],
    }));
    const minData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.humidityMin],
    }));

    return createDailyLineOption(
      "Kelembaban",
      "%",
      { max: maxData, mean: meanData, min: minData },
      { max: "#34d399", mean: "#059669", min: "#f59e0b" },
      { min: humMin, max: humMax }
    );
  }, [points, epochToWibLabel, createDailyLineOption]);

  // 3. Opsi Tekanan ECharts — x = UTC epoch, y = tekanan
  const pressChartOption = useMemo(() => {
    const validPresses = points.flatMap((p) => [p.pressureMax, p.pressureMean, p.pressureMin]).filter(Number.isFinite);
    const pressMin = validPresses.length > 0 ? Math.floor(Math.min(...validPresses)) - 1 : undefined;
    const pressMax = validPresses.length > 0 ? Math.ceil(Math.max(...validPresses)) + 1 : undefined;

    const maxData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.pressureMax],
    }));
    const meanData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.pressureMean],
    }));
    const minData: DataItem[] = points.map((p) => ({
      name: epochToWibLabel(p.timestamp) + " WIB",
      value: [p.timestamp, p.pressureMin],
    }));

    return createDailyLineOption(
      "Tekanan",
      "hPa",
      { max: maxData, mean: meanData, min: minData },
      { max: "#f43f5e", mean: "#db2777", min: "#818cf8" },
      { min: pressMin, max: pressMax }
    );
  }, [points, epochToWibLabel, createDailyLineOption]);

  // Daily Heatmap Trace & Layout Data
  const currentHeatmapData = useMemo(() => {
    return heatmaps?.[activeParam];
  }, [heatmaps, activeParam]);

  const dailyHeatmapOption = useMemo(() => {
    if (!currentHeatmapData?.z) return {};

    const dataPoints: [number, number, number | null][] = [];
    for (let h = 0; h < currentHeatmapData.hours.length; h++) {
      for (let m = 0; m < currentHeatmapData.minutes.length; m++) {
        const val = currentHeatmapData.z[h]?.[m];
        dataPoints.push([m, h, val !== null && Number.isFinite(val) ? val : null]);
      }
    }

    const flatVals = currentHeatmapData.z
      .flat()
      .filter((v): v is number => v !== null && Number.isFinite(v));
    const zmin = flatVals.length > 0 ? Math.floor(Math.min(...flatVals)) : 0;
    const zmax = flatVals.length > 0 ? Math.ceil(Math.max(...flatVals)) : 100;

    const colorPalettes = {
      temperature: [
        "#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8",
        "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"
      ],
      humidity: [
        "#eff6ff", "#bfdbfe", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#172554"
      ],
      pressure: [
        "#440154", "#482878", "#3e4989", "#31688e", "#26828e",
        "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"
      ]
    };

    const unit = activeParam === "temperature" ? "°C" : activeParam === "humidity" ? "%" : "hPa";
    const paramName =
      activeParam === "temperature"
        ? "Suhu Udara"
        : activeParam === "humidity"
        ? "Kelembaban"
        : "Tekanan Udara";

    return {
      backgroundColor: "transparent",
      animation: false,
      grid: {
        top: 30,
        right: 80,
        bottom: 50,
        left: 65,
        containLabel: false,
      },
      tooltip: {
        position: "top",
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.96)",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        textStyle: {
          color: isDarkMode ? "#f8fafc" : "#0f172a",
          fontSize: 12,
        },
        formatter: (p: any) => {
          if (!p || !p.data) return "";
          const mIdx = p.data[0];
          const hIdx = p.data[1];
          const rawVal = p.data[2];
          const hStr = currentHeatmapData.hours[hIdx] || "00";
          const mStr = currentHeatmapData.minutes[mIdx] || "00";
          const valText =
            rawVal !== null && rawVal !== undefined
              ? `<b>${Number(rawVal).toFixed(1)} ${unit}</b>`
              : `<span style="color:#94a3b8">Tidak Ada Data</span>`;
          return `
            <div style="font-weight:700; margin-bottom:2px;">Pukul ${hStr}:${mStr} WIB</div>
            <div>${paramName}: ${valText}</div>
          `;
        },
      },
      xAxis: {
        type: "category",
        data: currentHeatmapData.minutes,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          interval: 4,
          formatter: (val: string) => `${val}'`,
        },
        name: "Menit",
        nameLocation: "middle",
        nameGap: 28,
        nameTextStyle: { color: textColor, fontSize: 11, fontWeight: 600 },
      },
      yAxis: {
        type: "category",
        data: currentHeatmapData.hours.map((h) => `${h}:00`),
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: textColor, fontSize: 10 },
        name: "Jam (WIB)",
        nameLocation: "middle",
        nameGap: 45,
        nameTextStyle: { color: textColor, fontSize: 11, fontWeight: 600 },
      },
      visualMap: {
        min: zmin,
        max: zmax,
        calculable: true,
        orient: "vertical",
        right: 10,
        top: "middle",
        inRange: {
          color: colorPalettes[activeParam],
        },
        textStyle: { color: textColor, fontSize: 10 },
        formatter: (val: number) => `${val.toFixed(0)}${unit}`,
      },
      series: [
        {
          name: paramName,
          type: "heatmap",
          data: dataPoints,
          itemStyle: {
            borderColor: isDarkMode ? "#0f172a" : "#ffffff",
            borderWidth: 0.5,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowColor: "rgba(0, 0, 0, 0.5)",
              borderColor: "#ffffff",
              borderWidth: 1.5,
            },
          },
        },
      ],
    };
  }, [currentHeatmapData, activeParam, isDarkMode, textColor]);

  return (
    <div className="space-y-6">
      {/* Date Navigation Sub-Header Banner */}
      {onPrevDay && onNextDay && selectedDate && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/80 border dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-lg">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Tanggal Observasi Harian
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: id })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevDay}
              title="Mundur 1 Hari"
              className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 dark:hover:text-orange-400"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1 text-orange-500" /> Hari Sebelumnya
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onNextDay}
              disabled={isToday}
              title="Maju 1 Hari"
              className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 dark:hover:text-orange-400 disabled:opacity-40"
            >
              Hari Selanjutnya <ChevronRight className="h-3.5 w-3.5 ml-1 text-orange-500" />
            </Button>

            {!isToday && onToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToday}
                className="h-8 px-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50"
              >
                Hari Ini
              </Button>
            )}
          </div>
        </div>
      )}
      {/* 1. Suhu Chart (ECharts Dynamic) */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Suhu Udara Harian
          </CardTitle>
          <CardDescription>Suhu maksimum, rata-rata, dan minimum setiap jam (WIB) — sorot untuk melihat ketiga nilai</CardDescription>
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

      {/* 2. Kelembapan Chart (ECharts Dynamic) */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Analisis Kelembaban Relatif Harian
          </CardTitle>
          <CardDescription>Kelembaban maksimum, rata-rata, dan minimum setiap jam (WIB) — sorot untuk melihat ketiga nilai</CardDescription>
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

      {/* 3. Tekanan Chart (ECharts Dynamic) */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-pink-500" /> Analisis Tekanan Udara Harian
          </CardTitle>
          <CardDescription>Tekanan maksimum, rata-rata, dan minimum setiap jam (WIB) — sorot untuk melihat ketiga nilai</CardDescription>
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

      {/* 4. Daily Heatmap Chart (ECharts) */}
      {heatmaps && currentHeatmapData && (
        <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Grid className="h-5 w-5 text-indigo-500" /> Heatmap Diurnal Harian
              </CardTitle>
              <CardDescription>
                Distribusi nilai parameter cuaca menit-demi-menit terhadap jam WIB (ECharts)
              </CardDescription>
            </div>
            
            {/* Tab Selection */}
            <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 self-start md:self-center">
              <button
                onClick={() => setActiveParam("temperature")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "temperature"
                    ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Suhu
              </button>
              <button
                onClick={() => setActiveParam("humidity")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "humidity"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Kelembaban
              </button>
              <button
                onClick={() => setActiveParam("pressure")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeParam === "pressure"
                    ? "bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Tekanan
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-2 overflow-x-auto">
            <div className="min-w-[760px]">
              {dailyHeatmapOption && (
                <ReactECharts
                  option={dailyHeatmapOption}
                  style={{ width: "100%", height: "460px" }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
