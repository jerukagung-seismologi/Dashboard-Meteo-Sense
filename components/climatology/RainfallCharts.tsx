// components/climatology/RainfallCharts.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudRain } from "lucide-react";
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
}

export const RainfallCharts: React.FC<RainfallChartsProps> = ({
  points,
  preset,
  isDarkMode,
  totalRainfall,
}) => {
  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

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
      return Math.round(runningTotal * 10) / 10;
    });

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          let res = `<div className="font-semibold">${params[0].name}</div>`;
          params.forEach((item: any) => {
            res += `<div className="flex justify-between gap-4 text-xs mt-1">
              <span>${item.marker} ${item.seriesName}:</span>
              <span className="font-bold">${item.value.toFixed(1)} mm</span>
            </div>`;
          });
          return res;
        },
      },
      legend: {
        data: ["Curah Hujan Interval", "Akumulasi Total"],
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
        },
        {
          type: "value",
          name: "Kumulatif (mm)",
          nameTextStyle: { color: textColor },
          axisLabel: { color: textColor },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Curah Hujan Interval",
          type: "bar",
          data: points.map((p) => p.rainfallAccumulation),
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
        },
        {
          name: "Akumulasi Total",
          type: "line",
          yAxisIndex: 1,
          data: cumulativeData,
          itemStyle: { color: "#a855f7" },
          lineStyle: { width: 3 },
          smooth: true,
        },
      ],
    };
  }, [points, preset, textColor, gridColor]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CloudRain className="h-5 w-5 text-blue-500" /> Analisis Curah Hujan
        </CardTitle>
        <CardDescription>
          Perbandingan curah hujan interval (bar) dengan garis akumulasi kumulatif (Total: {totalRainfall.toFixed(1)} mm)
        </CardDescription>
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
