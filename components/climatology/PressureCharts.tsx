// components/climatology/PressureCharts.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Sparkles } from "lucide-react";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat Grafik Tekanan Udara...
    </div>
  ),
});

interface PressureChartsProps {
  points: AggregatedPoint[];
  preset: string;
  isDarkMode: boolean;
  stdDev: number;
  observedMean?: number;
  era5NormalPress?: number;
  monthlyNormals?: number[];
}

export const PressureCharts: React.FC<PressureChartsProps> = ({
  points,
  preset,
  isDarkMode,
  stdDev = 0,
  observedMean,
  era5NormalPress,
  monthlyNormals,
}) => {
  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Compute observed average & climate anomaly
  const avgObserved = useMemo(() => {
    if (observedMean != null && Number.isFinite(observedMean)) return observedMean;
    if (points.length === 0) return undefined;
    const valid = points.map((p) => p.pressureMean).filter(Number.isFinite);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : undefined;
  }, [observedMean, points]);

  const anomaly = useMemo(() => {
    if (avgObserved != null && era5NormalPress != null) {
      return avgObserved - era5NormalPress;
    }
    return null;
  }, [avgObserved, era5NormalPress]);

  const pressExtremes = useMemo(() => {
    if (!points || points.length === 0) return { max: null, min: null };
    const maxVals = points.map((p) => p.pressureMax).filter((v) => Number.isFinite(v) && v > 800);
    const minVals = points.map((p) => p.pressureMin).filter((v) => Number.isFinite(v) && v > 800);
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

    const validPresses = points.flatMap((p) => [p.pressureMax, p.pressureMean, p.pressureMin]).filter(Number.isFinite);
    if (era5NormalPress != null && Number.isFinite(era5NormalPress)) {
      validPresses.push(era5NormalPress);
    }
    if (preset === "yearly" && monthlyNormals) {
      monthlyNormals.forEach(v => { if (Number.isFinite(v)) validPresses.push(v); });
    }

    const pressMin = validPresses.length > 0 ? Math.floor(Math.min(...validPresses)) : undefined;
    const pressMax = validPresses.length > 0 ? Math.ceil(Math.max(...validPresses)) : undefined;

    const series: any[] = [
      {
        name: "Tekanan Maksimum",
        type: "line",
        data: points.map((p) => p.pressureMax != null ? Number(p.pressureMax.toFixed(2)) : null),
        itemStyle: { color: "#f43f5e" },
        lineStyle: { type: "dashed", width: 1.5 },
        smooth: true,
        markPoint: {
          symbol: "pin",
          symbolSize: 42,
          data: [
            { type: "max", name: "Pmax Tertinggi", itemStyle: { color: "#f43f5e" } },
          ],
          label: {
            formatter: "{c}",
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
          },
        },
      },
      {
        name: "Tekanan Rata-rata",
        type: "line",
        data: points.map((p) => p.pressureMean != null ? Number(p.pressureMean.toFixed(2)) : null),
        itemStyle: { color: "#db2777" },
        lineStyle: { width: 3 },
        markLine: era5NormalPress != null && Number.isFinite(era5NormalPress) ? {
          symbol: ["none", "none"],
          silent: false,
          data: [
            {
              yAxis: Number(era5NormalPress.toFixed(2)),
              name: "Normal ERA5",
              lineStyle: { color: "#f59e0b", type: "dashed", width: 2 },
              label: {
                formatter: `Normal Iklim: ${Number(era5NormalPress.toFixed(2))} hPa`,
                position: "insideEndTop",
                color: "#f59e0b",
                fontSize: 11,
                fontWeight: "bold",
              },
            },
          ],
        } : undefined,
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(219, 39, 119, 0.15)" },
              { offset: 1, color: "rgba(219, 39, 119, 0.0)" },
            ],
          },
        },
        smooth: true,
      },
      {
        name: "Tekanan Minimum",
        type: "line",
        data: points.map((p) => p.pressureMin != null ? Number(p.pressureMin.toFixed(2)) : null),
        itemStyle: { color: "#ec4899" },
        lineStyle: { type: "dashed", width: 1.5 },
        smooth: true,
        markPoint: {
          symbol: "pin",
          symbolSize: 42,
          data: [
            { type: "min", name: "Pmin Terendah", itemStyle: { color: "#be185d" } },
          ],
          label: {
            formatter: "{c}",
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
          },
        },
      },
    ];

    const legendNames = ["Tekanan Maksimum", "Tekanan Rata-rata", "Tekanan Minimum"];

    if (preset === "yearly" && monthlyNormals && monthlyNormals.length === 12 && points.length <= 12) {
      series.push({
        name: "Normal Bulanan (ERA5)",
        type: "line",
        data: monthlyNormals.map((v) => Number(v.toFixed(2))),
        itemStyle: { color: "#a855f7" },
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
              <span style="font-weight:700">${val} hPa</span>
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
        name: "Tekanan (hPa)",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
        scale: true,
        min: pressMin,
        max: pressMax,
      },
      series,
    };
  }, [points, preset, textColor, gridColor, era5NormalPress, monthlyNormals]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Gauge className="h-5 w-5 text-pink-500" /> Analisis Tren Tekanan Udara
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tren Tekanan Udara maksimum, rata-rata, dan minimum (Standard Deviasi: ±{stdDev.toFixed(1)} hPa)
            </CardDescription>
          </div>
          {era5NormalPress != null && (
            <Badge variant="outline" className="text-xs self-start sm:self-auto bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
              <Sparkles className="w-3 h-3 mr-1" /> Benchmark Normal Iklim
            </Badge>
          )}
        </div>

        {/* Climate Normal & Extremes Benchmark Card */}
        {era5NormalPress != null && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Rerata Observasi Stasiun</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {avgObserved != null ? `${avgObserved.toFixed(2)} hPa` : "–"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Normal Klimatologis (ERA5)</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                {era5NormalPress.toFixed(2)} hPa
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Anomali Terhadap Normal</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {anomaly != null ? (
                  <>
                    <span className={`text-sm font-bold ${anomaly >= 0 ? "text-purple-500" : "text-cyan-500"}`}>
                      {anomaly >= 0 ? `+${anomaly.toFixed(2)}` : anomaly.toFixed(2)} hPa
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${anomaly >= 0.5 ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 border-purple-200" : anomaly <= -0.5 ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 border-cyan-200" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200"}`}>
                      {anomaly >= 0.5 ? "Di Atas Normal" : anomaly <= -0.5 ? "Di Bawah Normal" : "Normal"}
                    </Badge>
                  </>
                ) : "–"}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Ekstrem Stasiun (Pmin / Pmax)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {pressExtremes.min != null ? `${pressExtremes.min.toFixed(2)} hPa` : "–"}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-sm font-black text-pink-600 dark:text-pink-400">
                  {pressExtremes.max != null ? `${pressExtremes.max.toFixed(2)} hPa` : "–"}
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
