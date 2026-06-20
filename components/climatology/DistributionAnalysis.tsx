// components/climatology/DistributionAnalysis.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import { HistogramBin, ParameterStats } from "@/lib/climatology/analysisTypes";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-lg border">
      Membuat grafik distribusi frekuensi...
    </div>
  ),
});

interface HistogramProps {
  bins: HistogramBin[];
  stats: ParameterStats;
  isDarkMode: boolean;
}

interface DistributionAnalysisProps {
  histograms: {
    temperature: { bins: HistogramBin[]; stats: ParameterStats };
    humidity: { bins: HistogramBin[]; stats: ParameterStats };
    pressure: { bins: HistogramBin[]; stats: ParameterStats };
  };
  isDarkMode: boolean;
}

const SingleHistogram: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  bins: HistogramBin[];
  stats: ParameterStats;
  isDarkMode: boolean;
  colorGradient: [string, string];
  yAxisName: string;
  unit: string;
}> = ({
  title,
  description,
  icon,
  bins,
  stats,
  isDarkMode,
  colorGradient,
  yAxisName,
  unit,
}) => {
  const chartTheme = isDarkMode ? "dark" : "light";
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  const option = useMemo(() => {
    if (!bins || bins.length === 0) return {};

    const xAxisData = bins.map((b) => b.binLabel);
    const seriesData = bins.map((b) => b.count);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const item = params[0];
          return `<div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            Rentang: <span className="font-bold">${item.name} ${unit}</span><br/>
            Frekuensi: <span className="font-bold">${item.value} sampel</span>
          </div>`;
        },
      },
      grid: { left: "4%", right: "4%", top: "10%", bottom: "15%", containLabel: true },
      xAxis: {
        type: "category",
        data: xAxisData,
        axisLabel: {
          color: textColor,
          rotate: 35,
          fontSize: 10,
          interval: 0,
        },
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: "value",
        name: yAxisName,
        nameTextStyle: { color: textColor, fontSize: 10 },
        axisLabel: { color: textColor, fontSize: 10 },
        splitLine: { lineStyle: { color: gridColor } },
      },
      series: [
        {
          name: "Frekuensi",
          type: "bar",
          barWidth: "70%",
          data: seriesData,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colorGradient[0] },
                { offset: 1, color: colorGradient[1] },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [bins, textColor, gridColor, colorGradient, yAxisName, unit]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          {icon} {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[280px]">
          {bins && bins.length > 0 ? (
            <ReactECharts
              option={option}
              style={{ height: "100%", width: "100%" }}
              theme={chartTheme}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Tidak ada data distribusi
            </div>
          )}
        </div>

        {/* Statistical Summary Panel */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Mean (Rata-rata)</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              {stats.mean.toFixed(1)}{unit}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Median</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              {stats.median.toFixed(1)}{unit}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Std Deviasi</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              ±{stats.stdDev.toFixed(1)}{unit}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const DistributionAnalysis: React.FC<DistributionAnalysisProps> = ({
  histograms,
  isDarkMode,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Temperature Distribution */}
      <SingleHistogram
        title="Distribusi Suhu Udara"
        description="Frekuensi kemunculan suhu udara selama 7 hari"
        icon={<Thermometer className="h-5 w-5 text-orange-500" />}
        bins={histograms.temperature.bins}
        stats={histograms.temperature.stats}
        isDarkMode={isDarkMode}
        colorGradient={["#f87171", "#ef4444"]}
        yAxisName="Jumlah Sampel"
        unit="°C"
      />

      {/* 2. Humidity Distribution */}
      <SingleHistogram
        title="Distribusi Kelembaban"
        description="Frekuensi kemunculan kelembaban relatif selama 7 hari"
        icon={<Droplets className="h-5 w-5 text-blue-500" />}
        bins={histograms.humidity.bins}
        stats={histograms.humidity.stats}
        isDarkMode={isDarkMode}
        colorGradient={["#60a5fa", "#3b82f6"]}
        yAxisName="Jumlah Sampel"
        unit="%"
      />

      {/* 3. Pressure Distribution */}
      <SingleHistogram
        title="Distribusi Tekanan Udara"
        description="Frekuensi kemunculan tekanan udara selama 7 hari"
        icon={<Gauge className="h-5 w-5 text-pink-500" />}
        bins={histograms.pressure.bins}
        stats={histograms.pressure.stats}
        isDarkMode={isDarkMode}
        colorGradient={["#f472b6", "#ec4899"]}
        yAxisName="Jumlah Sampel"
        unit="hPa"
      />
    </div>
  );
};
