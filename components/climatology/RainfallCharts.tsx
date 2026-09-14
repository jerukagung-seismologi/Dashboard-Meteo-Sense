// components/climatology/RainfallCharts.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudRain, Sparkles } from "lucide-react";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat grafik curah hujan...
    </div>
  ),
});

interface RainfallChartsProps {
  points: AggregatedPoint[];
  preset: string;
  isDarkMode: boolean;
  totalRainfall: number;
  era5NormalRain?: number;
  monthlyNormals?: number[];
}

export const RainfallCharts: React.FC<RainfallChartsProps> = ({
  points,
  preset,
  isDarkMode,
  totalRainfall,
  era5NormalRain,
  monthlyNormals,
}) => {
  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  // Sifat Hujan analysis (BMKG standard: AN > 115%, N 85-115%, BN < 85%)
  const rainRatio = useMemo(() => {
    if (era5NormalRain != null && era5NormalRain > 0 && totalRainfall != null) {
      return (totalRainfall / era5NormalRain) * 100;
    }
    return null;
  }, [totalRainfall, era5NormalRain]);

  const sifatHujan = useMemo(() => {
    if (rainRatio == null) return null;
    if (rainRatio > 115) {
      return {
        label: "Atas Normal (AN)",
        desc: "Curah hujan melebihi 115% dari rata-rata normal klimatologis",
        color: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      };
    }
    if (rainRatio >= 85) {
      return {
        label: "Normal (N)",
        desc: "Curah hujan berada di rentang 85% – 115% dari acuan normal",
        color: "text-blue-600 dark:text-blue-400",
        badgeBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
      };
    }
    return {
      label: "Bawah Normal (BN)",
      desc: "Curah hujan kurang dari 85% dari rata-rata normal klimatologis",
      color: "text-amber-600 dark:text-amber-400",
      badgeBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    };
  }, [rainRatio]);

  const rainExtremes = useMemo(() => {
    if (!points || points.length === 0) return { max: 0, cdd: 0, cwd: 0 };
    let max = 0;
    let curDry = 0;
    let maxDry = 0;
    let curWet = 0;
    let maxWet = 0;

    points.forEach((p) => {
      const r = p.rainfallAccumulation || 0;
      if (r > max) max = r;
      if (r < 1.0) {
        curDry++;
        curWet = 0;
        if (curDry > maxDry) maxDry = curDry;
      } else {
        curWet++;
        curDry = 0;
        if (curWet > maxWet) maxWet = curWet;
      }
    });

    return {
      max: Number(max.toFixed(2)),
      cdd: maxDry,
      cwd: maxWet,
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

    let runningTotal = 0;
    const cumulativeData = points.map((p) => {
      runningTotal += p.rainfallAccumulation;
      return Number(runningTotal.toFixed(2));
    });

    const isYearlyMode = preset === "yearly" && monthlyNormals && monthlyNormals.length === 12 && points.length <= 12;

    const series: any[] = [
      {
        name: "Curah Hujan Interval",
        type: "bar",
        data: points.map((p) => Number((p.rainfallAccumulation || 0).toFixed(2))),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#3b82f6" },
              { offset: 1, color: "#60a5fa" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        markPoint: {
          symbol: "pin",
          symbolSize: 44,
          data: [
            { type: "max", name: "Rx1day Maks", itemStyle: { color: "#4f46e5" } },
          ],
          label: {
            formatter: "{c}mm",
            fontSize: 10,
            fontWeight: "bold",
            color: "#ffffff",
          },
        },
      },
    ];

    // In yearly mode, show normal monthly rainfall bar alongside station bars
    if (isYearlyMode && monthlyNormals) {
      series.push({
        name: "Normal Bulanan (ERA5)",
        type: "bar",
        data: monthlyNormals.map((v) => Number(v.toFixed(2))),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#10b981" },
              { offset: 1, color: "#34d399" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      });
    }

    // Cumulative line
    series.push({
      name: "Akumulasi Total",
      type: "line",
      yAxisIndex: 1,
      data: cumulativeData,
      itemStyle: { color: "#a855f7" },
      lineStyle: { width: 3 },
      smooth: true,
      markLine: !isYearlyMode && era5NormalRain != null && era5NormalRain > 0 ? {
        symbol: ["none", "none"],
        silent: false,
        data: [
          {
            yAxis: Number(era5NormalRain.toFixed(2)),
            name: "Normal Hujan Periode",
            lineStyle: { color: "#f59e0b", type: "dashed", width: 2 },
            label: {
              formatter: `Normal Periode: ${Number(era5NormalRain.toFixed(1))} mm`,
              position: "insideEndTop",
              color: "#f59e0b",
              fontSize: 11,
              fontWeight: "bold",
            },
          },
        ],
      } : undefined,
    });

    // In yearly mode, also add cumulative normal curve
    if (isYearlyMode && monthlyNormals) {
      let cumNormal = 0;
      const normalCumulative = monthlyNormals.map((v) => {
        cumNormal += v;
        return Number(cumNormal.toFixed(2));
      });

      series.push({
        name: "Normal Kumulatif (ERA5)",
        type: "line",
        yAxisIndex: 1,
        data: normalCumulative,
        itemStyle: { color: "#f59e0b" },
        lineStyle: { type: "dashed", width: 2.5 },
        smooth: true,
      });
    }

    const legendData = isYearlyMode
      ? ["Curah Hujan Interval", "Normal Bulanan (ERA5)", "Akumulasi Total", "Normal Kumulatif (ERA5)"]
      : ["Curah Hujan Interval", "Akumulasi Total"];

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          let res = `<div class="font-semibold mb-1">${params[0].name}</div>`;
          params.forEach((item: any) => {
            const val = item.value != null ? Number(item.value).toFixed(2) : '–';
            res += `<div class="flex justify-between gap-4 text-xs py-0.5">
              <span>${item.marker} ${item.seriesName}:</span>
              <span style="font-weight:700">${val} mm</span>
            </div>`;
          });
          return res;
        },
      },
      legend: {
        data: legendData,
        textStyle: { color: textColor },
        bottom: 0,
      },
      grid: { left: "3%", right: "4%", top: "8%", bottom: "12%", containLabel: true },
      xAxis: {
        type: "category",
        data: xAxisLabels,
        axisLabel: { color: textColor, rotate: preset === "weekly" ? 0 : 30 },
      },
      yAxis: [
        {
          type: "value",
          name: "Hujan (mm)",
          nameTextStyle: { color: textColor },
          axisLabel: { color: textColor },
          splitLine: { lineStyle: { color: gridColor } },
          min: 0,
        },
        {
          type: "value",
          name: "Kumulatif (mm)",
          nameTextStyle: { color: textColor },
          axisLabel: { color: textColor },
          splitLine: { show: false },
          min: 0,
        },
      ],
      series,
    };
  }, [points, preset, textColor, gridColor, era5NormalRain, monthlyNormals]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-blue-500" /> Analisis Curah Hujan
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Distribusi curah hujan interval dan akumulasi total (Total Hujan: {totalRainfall.toFixed(1)} mm)
            </CardDescription>
          </div>
          {era5NormalRain != null && (
            <Badge variant="outline" className="text-xs self-start sm:self-auto bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
              <Sparkles className="w-3 h-3 mr-1" /> Benchmark Normal Iklim
            </Badge>
          )}
        </div>

        {/* Climate Normal & BMKG Rainfall Characteristic Benchmark Card */}
        {era5NormalRain != null && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Total Observasi Stasiun</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {totalRainfall.toFixed(2)} mm
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Normal Klimatologis (ERA5)</span>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                {era5NormalRain.toFixed(2)} mm
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sifat Hujan (Standar BMKG)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {sifatHujan != null && rainRatio != null ? (
                  <>
                    <span className={`text-sm font-bold ${sifatHujan.color}`}>
                      {rainRatio.toFixed(1)}%
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${sifatHujan.badgeBg}`}>
                      {sifatHujan.label}
                    </Badge>
                  </>
                ) : "–"}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Ekstrem Rx1day & CDD</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {rainExtremes.max.toFixed(2)} mm
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  CDD {rainExtremes.cdd} hr
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
