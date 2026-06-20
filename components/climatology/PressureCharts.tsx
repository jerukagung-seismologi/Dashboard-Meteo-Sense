// components/climatology/PressureCharts.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat grafik tekanan udara...
    </div>
  ),
});

interface PressureChartsProps {
  points: AggregatedPoint[];
  preset: string;
  isDarkMode: boolean;
}

export const PressureCharts: React.FC<PressureChartsProps> = ({
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
              <span className="font-bold">${item.value.toFixed(1)} hPa</span>
            </div>`;
          });
          return res;
        },
      },
      legend: {
        data: ["Tekanan Maksimum", "Tekanan Rata-rata", "Tekanan Minimum"],
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
      },
      series: [
        {
          name: "Tekanan Maksimum",
          type: "line",
          data: points.map((p) => p.pressureMax),
          itemStyle: { color: "#f43f5e" },
          lineStyle: { type: "dashed", width: 1.5 },
          smooth: true,
        },
        {
          name: "Tekanan Rata-rata",
          type: "line",
          data: points.map((p) => p.pressureMean),
          itemStyle: { color: "#db2777" },
          lineStyle: { width: 3 },
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
          data: points.map((p) => p.pressureMin),
          itemStyle: { color: "#ec4899" },
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
          <Gauge className="h-5 w-5 text-pink-500" /> Tekanan Atmosfer
        </CardTitle>
        <CardDescription>
          Tren tekanan udara rata-rata harian/jam, nilai maksimum, dan nilai minimum (hPa)
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
