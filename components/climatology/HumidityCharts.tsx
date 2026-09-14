// components/climatology/HumidityCharts.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Sparkles } from "lucide-react";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat Grafik Kelembaban...
    </div>
  ),
});

interface HumidityChartsProps {
  points: AggregatedPoint[];
  preset: string;
  isDarkMode: boolean;
  stdDev: number;
  observedMean?: number;
  era5NormalHum?: number;
  monthlyNormals?: number[];
}

export const HumidityCharts: React.FC<HumidityChartsProps> = ({
  points,
  preset,
  isDarkMode,
  stdDev,
  observedMean,
  era5NormalHum,
  monthlyNormals,
}) => {
  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Compute observed average & climate anomaly
  const avgObserved = useMemo(() => {
    if (observedMean != null && Number.isFinite(observedMean)) return observedMean;
    if (points.length === 0) return undefined;
    const valid = points.map((p) => p.humidityMean).filter(Number.isFinite);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : undefined;
  }, [observedMean, points]);

  const anomaly = useMemo(() => {
    if (avgObserved != null && era5NormalHum != null) {
      return avgObserved - era5NormalHum;
    }
    return null;
  }, [avgObserved, era5NormalHum]);

  const humExtremes = useMemo(() => {
    if (!points || points.length === 0) return { max: null, min: null };
    const maxVals = points.map((p) => p.humidityMax).filter(Number.isFinite);
    const minVals = points.map((p) => p.humidityMin).filter(Number.isFinite);
    return {
      max: maxVals.length > 0 ? Math.max(...maxVals) : null,
      min: minVals.length > 0 ? Math.min(...minVals) : null,
    };
  }, [points]);

  const option = useMemo(() => {
    if (points.length === 0) return {};

    const xAxisLabels = points.map((p) => {
      const d = new Date(p.timestamp);
      if (preset === "daily") {
        return d.toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        }) + " WIB";
      } else if (preset === "yearly") {
        return d.toLocaleDateString("id-ID", {
          timeZone: "Asia/Jakarta",
          day: "2-digit",
          month: "short",
        });
      } else {
        return d.toLocaleDateString("id-ID", {
          timeZone: "Asia/Jakarta",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    });

    const validHums = points.flatMap((p) => [p.humidityMax, p.humidityMean, p.humidityMin]).filter(Number.isFinite);
    if (era5NormalHum != null && Number.isFinite(era5NormalHum)) {
      validHums.push(era5NormalHum);
    }
    if (preset === "yearly" && monthlyNormals) {
      monthlyNormals.forEach(v => { if (Number.isFinite(v)) validHums.push(v); });
    }

    const humMin = validHums.length > 0 ? Math.max(0, Math.floor(Math.min(...validHums))) : undefined;
    const humMax = validHums.length > 0 ? Math.min(100, Math.ceil(Math.max(...validHums))) : undefined;

    const series: any[] = [
      {
        name: "Kelembapan Maksimum",
        type: "line",
        data: points.map((p) => p.humidityMax != null ? Number(p.humidityMax.toFixed(2)) : null),
        itemStyle: { color: "#10b981" },
        lineStyle: { type: "dashed", width: 1.5 },
        smooth: true,
        markPoint: {
          symbol: "pin",
          symbolSize: 42,
          data: [
            { type: "max", name: "RH Maksimum", itemStyle: { color: "#059669" } },
          ],
          label: {
            formatter: "{c}%",
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
          },
        },
      },
      {
        name: "Kelembapan Rata-rata",
        type: "line",
        data: points.map((p) => p.humidityMean != null ? Number(p.humidityMean.toFixed(2)) : null),
        itemStyle: { color: "#059669" },
        lineStyle: { width: 3 },
        markLine: era5NormalHum != null && Number.isFinite(era5NormalHum) ? {
          symbol: ["none", "none"],
          silent: false,
          data: [
            {
              yAxis: Number(era5NormalHum.toFixed(2)),
              name: "Normal ERA5",
              lineStyle: { color: "#f59e0b", type: "dashed", width: 2 },
              label: {
                formatter: `Normal Iklim: ${Number(era5NormalHum.toFixed(2))} %`,
                position: "insideEndTop",
                color: "#f59e0b",
                fontSize: 11,
                fontWeight: "bold",
              },
            },
          ],
        } : undefined,
        smooth: true,
      },
      {
        name: "Kelembapan Minimum",
        type: "line",
        data: points.map((p) => p.humidityMin != null ? Number(p.humidityMin.toFixed(2)) : null),
        itemStyle: { color: "#f59e0b" },
        lineStyle: { type: "dashed", width: 1.5 },
        smooth: true,
        markPoint: {
          symbol: "pin",
          symbolSize: 42,
          data: [
            { type: "min", name: "RHmin Terendah", itemStyle: { color: "#d97706" } },
          ],
          label: {
            formatter: "{c}%",
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
          },
        },
      },
    ];

    const legendNames = ["Kelembapan Maksimum", "Kelembapan Rata-rata", "Kelembapan Minimum"];

    if (preset === "yearly" && monthlyNormals && monthlyNormals.length === 12 && points.length <= 12) {
      series.push({
        name: "Normal Bulanan (ERA5)",
        type: "line",
        data: monthlyNormals.map((v) => Number(v.toFixed(2))),
        itemStyle: { color: "#3b82f6" },
        lineStyle: { type: "dotted", width: 2.5 },
        symbol: "circle",
        symbolSize: 6,
        smooth: true,
      });
      legendNames.push("Normal Bulanan (ERA5)");
    }

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          let res = `<div class="font-semibold mb-1">${params[0].name}</div>`;
          params.forEach((item: any) => {
            const val = item.value != null ? Number(item.value).toFixed(2) : '–';
            res += `<div class="flex justify-between gap-4 text-xs py-0.5">
              <span>${item.marker} ${item.seriesName}:</span>
              <span style="font-weight:700">${val} %</span>
            </div>`;
          });
          return res;
        },
      },
      legend: {
        data: legendNames,
        textStyle: { color: textColor },
        bottom: 0,
      },
      grid: { left: "3%", right: "4%", top: "8%", bottom: "12%", containLabel: true },
      xAxis: {
        type: "category",
        data: xAxisLabels,
        axisLabel: { color: textColor, rotate: preset === "weekly" ? 0 : 30 },
      },
      yAxis: {
        type: "value",
        name: "Kelembapan (%)",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
        scale: true,
        min: humMin,
        max: humMax,
      },
      series,
    };
  }, [points, preset, textColor, gridColor, era5NormalHum, monthlyNormals]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Droplets className="h-5 w-5 text-emerald-500" /> Kelembapan Udara
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tren Kelembapan Udara Relatif Maksimum, rata-rata, dan minimum (Standard Deviasi: ±{stdDev.toFixed(1)}%)
            </CardDescription>
          </div>
          {era5NormalHum != null && (
            <Badge variant="outline" className="text-xs self-start sm:self-auto bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Sparkles className="w-3 h-3 mr-1" /> Benchmark Normal Iklim
            </Badge>
          )}
        </div>

        {/* Climate Normal & Extremes Benchmark Card */}
        {era5NormalHum != null && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Rerata Observasi Stasiun</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {avgObserved != null ? `${avgObserved.toFixed(2)} %` : "–"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Normal Klimatologis (ERA5)</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {era5NormalHum.toFixed(2)} %
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Anomali Terhadap Normal</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {anomaly != null ? (
                  <>
                    <span className={`text-sm font-bold ${anomaly >= 0 ? "text-blue-500" : "text-amber-500"}`}>
                      {anomaly >= 0 ? `+${anomaly.toFixed(2)}` : anomaly.toFixed(2)} %
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${anomaly >= 2 ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200" : anomaly <= -2 ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200"}`}>
                      {anomaly >= 2 ? "Lebih Lembap" : anomaly <= -2 ? "Lebih Kering" : "Normal"}
                    </Badge>
                  </>
                ) : "–"}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Ekstrem Stasiun (RHmin / RHmax)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {humExtremes.min != null ? `${humExtremes.min.toFixed(2)}%` : "–"}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {humExtremes.max != null ? `${humExtremes.max.toFixed(2)}%` : "–"}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="h-[380px] p-2">
        {points.length > 0 && (
          <ReactECharts
            option={option}
            style={{ height: "100%", width: "100%" }}
            theme={chartTheme}
          />
        )}
      </CardContent>
    </Card>
  );
};
