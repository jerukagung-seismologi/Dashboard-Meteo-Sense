import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Gauge, Grid, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { AnalysisPoint, DailyHeatmapData } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik analisis harian...
    </div>
  ),
});

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      Membuat visualisasi heatmap harian...
    </div>
  ),
});

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

  // Format x-axis categories: WIB hours "HH:MM"
  const xData = useMemo(() => points.map((p) => p.timeKeyWib), [points]);

  // Common Plotly Layout parameters with unified hover across all 3 lines
  const commonLayout = useMemo(() => ({
    autosize: true,
    height: 350,
    hovermode: "x unified" as const,
    hoverlabel: {
      bgcolor: isDarkMode ? "#0f172a" : "#ffffff",
      bordercolor: isDarkMode ? "#334155" : "#cbd5e1",
      font: {
        family: "Inter, sans-serif",
        size: 12,
        color: isDarkMode ? "#f8fafc" : "#0f172a",
      },
    },
    margin: { l: 50, r: 20, t: 30, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: textColor, family: "Inter, sans-serif" },
    xaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      showspikes: true,
      spikemode: "across" as const,
      spikesnap: "cursor" as const,
      spikethickness: 1,
      spikedash: "dot" as const,
      spikecolor: isDarkMode ? "#64748b" : "#94a3b8",
    },
    yaxis: {
      gridcolor: gridColor,
      zerolinecolor: gridColor,
      tickcolor: textColor,
      fixedrange: true,
    },
    legend: {
      orientation: "h" as const,
      yanchor: "bottom" as const,
      y: 1.02,
      xanchor: "right" as const,
      x: 1,
      font: { color: textColor },
    },
  }), [textColor, gridColor, isDarkMode]);

  // Suhu Udara Trace Data
  const tempTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.temperatureMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f87171", width: 2, dash: "dash" as const },
      hovertemplate: "%{y:.1f} °C<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.temperatureMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#ef4444", width: 3 },
      hovertemplate: "%{y:.1f} °C<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.temperatureMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#60a5fa", width: 2, dash: "dash" as const },
      hovertemplate: "%{y:.1f} °C<extra></extra>",
    },
  ], [xData, points]);

  // Kelembaban Trace Data
  const humTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.humidityMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#34d399", width: 2, dash: "dash" as const },
      hovertemplate: "%{y:.1f} %<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.humidityMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#059669", width: 3 },
      hovertemplate: "%{y:.1f} %<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.humidityMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f59e0b", width: 2, dash: "dash" as const },
      hovertemplate: "%{y:.1f} %<extra></extra>",
    },
  ], [xData, points]);

  // Tekanan Trace Data
  const pressTraces = useMemo(() => [
    {
      x: xData,
      y: points.map((p) => p.pressureMax),
      name: "Maksimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#f43f5e", width: 2, dash: "dash" as const },
      hovertemplate: "%{y:.1f} hPa<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.pressureMean),
      name: "Rata-rata",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#db2777", width: 3 },
      hovertemplate: "%{y:.1f} hPa<extra></extra>",
    },
    {
      x: xData,
      y: points.map((p) => p.pressureMin),
      name: "Minimum",
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#818cf8", width: 2, dash: "dash" as const },
      hovertemplate: "%{y:.1f} hPa<extra></extra>",
    },
  ], [xData, points]);

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
      {/* 1. Suhu Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" /> Analisis Suhu Udara Harian
          </CardTitle>
          <CardDescription>Suhu maksimum, rata-rata, dan minimum setiap jam (WIB) — sorot untuk melihat ketiga nilai</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <Plot
              data={tempTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Suhu (°C)" } } }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
              style={{ width: "100%", height: "350px" }}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Tidak ada data observasi suhu
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Kelembapan Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" /> Analisis Kelembaban Relatif Harian
          </CardTitle>
          <CardDescription>Kelembaban maksimum, rata-rata, dan minimum setiap jam (WIB) — sorot untuk melihat ketiga nilai</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <Plot
              data={humTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Kelembaban (%)" }, max: 100, min: 0 } as any }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
              style={{ width: "100%", height: "350px" }}
            />
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              Tidak ada data observasi kelembaban
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Tekanan Chart */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-pink-500" /> Analisis Tekanan Udara Harian
          </CardTitle>
          <CardDescription>Tekanan maksimum, rata-rata, dan minimum setiap jam (WIB) — sorot untuk melihat ketiga nilai</CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          {points.length > 0 ? (
            <Plot
              data={pressTraces}
              layout={{ ...commonLayout, yaxis: { ...commonLayout.yaxis, title: { text: "Tekanan (hPa)" } } }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
              style={{ width: "100%", height: "350px" }}
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
