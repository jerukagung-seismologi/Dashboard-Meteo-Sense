import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat grafik Perbandingan Suhu & Titik Embun...
    </div>
  ),
});

interface TempDewComparisonChartsProps {
  points: AggregatedPoint[];
  preset: string;
  isDarkMode: boolean;
}

export const TempDewComparisonCharts: React.FC<TempDewComparisonChartsProps> = ({
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
              <span className="font-bold">${item.value.toFixed(1)} °C</span>
            </div>`;
          });
          
          // Calculate Dew Point Depression if both values exist
          const tempValue = params.find((p: any) => p.seriesName === "Suhu Udara (Rata-rata)")?.value;
          const dewValue = params.find((p: any) => p.seriesName === "Titik Embun (Dew Point)")?.value;
          if (tempValue !== undefined && dewValue !== undefined) {
             const depression = tempValue - dewValue;
             res += `<div className="flex justify-between gap-4 text-xs mt-2 pt-1 border-t border-slate-500/30">
              <span className="text-slate-500">Dew Point Depression:</span>
              <span className="font-bold text-orange-400">${depression.toFixed(1)} °C</span>
            </div>`;
          }

          return res;
        },
      },
      legend: {
        data: ["Suhu Udara (Rata-rata)", "Titik Embun (Dew Point)"],
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
      },
      series: [
        {
          name: "Suhu Udara (Rata-rata)",
          type: "line",
          data: points.map((p) => p.temperatureMean),
          itemStyle: { color: "#ef4444" }, // Red
          lineStyle: { width: 3 },
          smooth: true,
          z: 2
        },
        {
          name: "Titik Embun (Dew Point)",
          type: "line",
          data: points.map((p) => p.dewPointMean),
          itemStyle: { color: "#3b82f6" }, // Blue
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59, 130, 246, 0.4)" },
                { offset: 1, color: "rgba(59, 130, 246, 0.0)" },
              ],
            },
          },
          smooth: true,
          z: 1
        }
      ],
    };
  }, [points, preset, textColor, gridColor]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" /> Perbandingan Suhu Udara vs Titik Embun
        </CardTitle>
        <CardDescription>
          Analisis hubungan antara suhu udara aktual dengan titik embun (Dew Point). Semakin dekat jarak antar garis, semakin tinggi kelembaban relatif (risiko kondensasi/hujan).
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
