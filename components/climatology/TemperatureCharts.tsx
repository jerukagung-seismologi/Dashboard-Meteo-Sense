// components/climatology/TemperatureCharts.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThermometerSun, Sparkles } from "lucide-react";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat Grafik Suhu Udara...
    </div>
  ),
});

interface TemperatureChartsProps {
  points: AggregatedPoint[];
  preset: string;
  isDarkMode: boolean;
  stdDev: number;
  observedMean?: number;
  era5NormalTemp?: number;
  monthlyNormals?: number[];
}

export const TemperatureCharts: React.FC<TemperatureChartsProps> = ({
  points,
  preset,
  isDarkMode,
  stdDev,
  observedMean,
  era5NormalTemp,
  monthlyNormals,
}) => {
  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Compute observed average & climate anomaly
  const avgObserved = useMemo(() => {
    if (observedMean != null && Number.isFinite(observedMean)) return observedMean;
    if (points.length === 0) return undefined;
    const valid = points.map((p) => p.temperatureMean).filter(Number.isFinite);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : undefined;
  }, [observedMean, points]);

  const anomaly = useMemo(() => {
    if (avgObserved != null && era5NormalTemp != null) {
      return avgObserved - era5NormalTemp;
    }
    return null;
  }, [avgObserved, era5NormalTemp]);

  const tempExtremes = useMemo(() => {
    if (!points || points.length === 0) return { max: null, min: null };
    const maxVals = points.map((p) => p.temperatureMax).filter(Number.isFinite);
    const minVals = points.map((p) => p.temperatureMin).filter(Number.isFinite);
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

    const validTemps = points.flatMap((p) => [p.temperatureMax, p.temperatureMean, p.temperatureMin]).filter(Number.isFinite);
    if (era5NormalTemp != null && Number.isFinite(era5NormalTemp)) {
      validTemps.push(era5NormalTemp);
    }
    if (preset === "yearly" && monthlyNormals) {
      monthlyNormals.forEach(v => { if (Number.isFinite(v)) validTemps.push(v); });
    }

    const tempMin = validTemps.length > 0 ? Math.floor(Math.min(...validTemps)) : undefined;
    const tempMax = validTemps.length > 0 ? Math.ceil(Math.max(...validTemps)) : undefined;

    const series: any[] = [
      {
        name: "Suhu Maksimum",
        type: "line",
        data: points.map((p) => p.temperatureMax != null ? Number(p.temperatureMax.toFixed(2)) : null),
        itemStyle: { color: "#f87171" },
        lineStyle: { type: "dashed", width: 1.5 },
        smooth: true,
        markPoint: {
          symbol: "pin",
          symbolSize: 42,
          data: [
            { type: "max", name: "Puncak Tmax", itemStyle: { color: "#ef4444" } },
          ],
          label: {
            formatter: "{c}°",
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
          },
        },
      },
      {
        name: "Suhu Rata-rata",
        type: "line",
        data: points.map((p) => p.temperatureMean != null ? Number(p.temperatureMean.toFixed(2)) : null),
        itemStyle: { color: "#14b8a6" },
        lineStyle: { width: 3 },
        markLine: era5NormalTemp != null && Number.isFinite(era5NormalTemp) ? {
          symbol: ["none", "none"],
          silent: false,
          data: [
            {
              yAxis: Number(era5NormalTemp.toFixed(2)),
              name: "Normal ERA5",
              lineStyle: { color: "#f59e0b", type: "dashed", width: 2 },
              label: {
                formatter: `Normal Iklim: ${Number(era5NormalTemp.toFixed(2))} °C`,
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
              { offset: 0, color: "rgba(20, 184, 166, 0.25)" },
              { offset: 1, color: "rgba(20, 184, 166, 0.0)" },
            ],
          },
        },
        smooth: true,
      },
      {
        name: "Suhu Minimum",
        type: "line",
        data: points.map((p) => p.temperatureMin != null ? Number(p.temperatureMin.toFixed(2)) : null),
        itemStyle: { color: "#60a5fa" },
        lineStyle: { type: "dashed", width: 1.5 },
        smooth: true,
        markPoint: {
          symbol: "pin",
          symbolSize: 42,
          data: [
            { type: "min", name: "Puncak Tmin", itemStyle: { color: "#3b82f6" } },
          ],
          label: {
            formatter: "{c}°",
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
          },
        },
      },
    ];

    const legendNames = ["Suhu Maksimum", "Suhu Rata-rata", "Suhu Minimum"];

    // In yearly preset, if 12-month normal data is available, overlay the climatological curve
    if (preset === "yearly" && monthlyNormals && monthlyNormals.length === 12 && points.length <= 12) {
      series.push({
        name: "Normal Bulanan (ERA5)",
        type: "line",
        data: monthlyNormals.map((v) => Number(v.toFixed(2))),
        itemStyle: { color: "#f59e0b" },
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
              <span style="font-weight:700">${val} °C</span>
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
        name: "Suhu (°C)",
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
        scale: true,
        min: tempMin,
        max: tempMax,
      },
      series,
    };
  }, [points, preset, textColor, gridColor, era5NormalTemp, monthlyNormals]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ThermometerSun className="h-5 w-5 text-orange-500" /> Analisis Tren Suhu Udara
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tren Suhu Udara maksimum, rata-rata, dan minimum (Standard Deviasi: ±{stdDev.toFixed(1)}°C)
            </CardDescription>
          </div>
          {era5NormalTemp != null && (
            <Badge variant="outline" className="text-xs self-start sm:self-auto bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              <Sparkles className="w-3 h-3 mr-1" /> Benchmark Normal Iklim
            </Badge>
          )}
        </div>

        {/* Climate Normal & Extremes Benchmark Card */}
        {era5NormalTemp != null && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Rerata Observasi Stasiun</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {avgObserved != null ? `${avgObserved.toFixed(2)} °C` : "–"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Normal Klimatologis (ERA5)</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {era5NormalTemp.toFixed(2)} °C
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Anomali Terhadap Normal</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {anomaly != null ? (
                  <>
                    <span className={`text-sm font-bold ${anomaly >= 0 ? "text-rose-500" : "text-sky-500"}`}>
                      {anomaly >= 0 ? `+${anomaly.toFixed(2)}` : anomaly.toFixed(2)} °C
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${anomaly >= 0.2 ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200" : anomaly <= -0.2 ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 border-sky-200" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200"}`}>
                      {anomaly >= 0.2 ? "Lebih Hangat" : anomaly <= -0.2 ? "Lebih Sejuk" : "Normal"}
                    </Badge>
                  </>
                ) : "–"}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Ekstrem Stasiun (Tmax / Tmin)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {tempExtremes.max != null ? `${tempExtremes.max.toFixed(2)}°C` : "–"}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                  {tempExtremes.min != null ? `${tempExtremes.min.toFixed(2)}°C` : "–"}
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
