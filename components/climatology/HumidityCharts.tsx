// components/climatology/HumidityCharts.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat grafik kelembapan...
    </div>
  ),
});

interface HumidityChartsProps {
  points: AggregatedPoint[];
  preset: string;
  isDarkMode: boolean;
}

export const HumidityCharts: React.FC<HumidityChartsProps> = ({
  points,
  preset,
  isDarkMode,
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

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          let res = `<div className="font-semibold">${params[0].name}</div>`;
          params.forEach((item: any) => {
            res += `<div className="flex justify-between gap-4 text-xs mt-1">
              <span>${item.marker} ${item.seriesName}:</span>
              <span className="font-bold">${item.value.toFixed(1)} %</span>
            </div>`;
          });
          return res;
        },
      },
      legend: {
        data: ["Kelembapan Maksimum", "Kelembapan Rata-rata", "Kelembapan Minimum"],
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
        max: 100,
        min: 0,
        nameTextStyle: { color: textColor },
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Kelembapan Maksimum",
          type: "line",
          data: points.map((p) => p.humidityMax),
          itemStyle: { color: "#10b981" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true,
        },
        {
          name: "Kelembapan Rata-rata",
          type: "line",
          data: points.map((p) => p.humidityMean),
          itemStyle: { color: "#059669" },
          lineStyle: { width: 3 },
          smooth: true,
        },
        {
          name: "Kelembapan Minimum",
          type: "line",
          data: points.map((p) => p.humidityMin),
          itemStyle: { color: "#f59e0b" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true,
        },
      ],
    };
  }, [points, preset, textColor, gridColor]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Droplets className="h-5 w-5 text-emerald-500" /> Kelembapan Udara
        </CardTitle>
        <CardDescription>
          Analisis variabilitas kelembapan udara relatif (maksimum harian, nilai rata-rata, dan minimum harian)
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
