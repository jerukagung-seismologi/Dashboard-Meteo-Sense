// components/ChartComponent.tsx
"use client"

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground animate-pulse">
      Memuat grafik...
    </div>
  ),
});

interface ChartComponentProps {
  data?: any[];
  layout?: any;
  option?: any;
  title?: string;
  unit?: string;
  color?: string;
  timestamps?: string[];
  seriesData?: number[];
  isDarkMode?: boolean;
}

const ChartComponent: React.FC<ChartComponentProps> = ({
  data,
  layout,
  option: customOption,
  title: propTitle,
  unit: propUnit,
  color: propColor,
  timestamps: propTimestamps,
  seriesData: propSeriesData,
  isDarkMode: propIsDarkMode,
}) => {
  const chartOption = useMemo(() => {
    // If a direct ECharts option is supplied, use it
    if (customOption) return customOption;

    // Extract values from legacy Plotly data/layout props if present
    const firstTrace = data && data[0] ? data[0] : null;
    const xData = propTimestamps || (firstTrace?.x as string[]) || [];
    const yData = propSeriesData || (firstTrace?.y as number[]) || [];
    const title = propTitle || firstTrace?.name || "Nilai";
    const color = propColor || firstTrace?.line?.color || firstTrace?.marker?.color || "#3b82f6";
    const unit = propUnit || layout?.yaxis?.title?.text || "";
    const isDark = propIsDarkMode !== undefined ? propIsDarkMode : (layout?.plot_bgcolor === "#1e293b");

    const textColor = isDark ? "#cbd5e1" : "#475569";
    const gridColor = isDark ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.25)";

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: {
            backgroundColor: isDark ? "#334155" : "#64748b",
          },
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const item = params[0];
          const val = typeof item.value === "number" ? item.value.toFixed(2) : item.value;
          return `
            <div style="font-size:12px;font-family:Inter,sans-serif;">
              <div style="color:${isDark ? '#94a3b8' : '#64748b'};margin-bottom:4px;">${item.name}</div>
              <div style="font-weight:600;color:${isDark ? '#f8fafc' : '#0f172a'};">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>
                ${item.seriesName}: ${val} ${unit}
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 25,
        right: 20,
        bottom: 60,
        left: 55,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: xData,
        boundaryGap: false,
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          hideOverlap: true,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        name: unit ? `(${unit})` : "",
        nameTextStyle: { color: textColor, fontSize: 11 },
        axisLabel: { color: textColor, fontSize: 11 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          bottom: 10,
          height: 18,
          borderColor: "transparent",
          backgroundColor: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(241, 245, 249, 0.8)",
          fillerColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)",
          handleStyle: { color: color },
          textStyle: { color: textColor, fontSize: 10 },
          start: 0,
          end: 100,
        },
      ],
      series: [
        {
          name: title,
          type: "line",
          data: yData,
          smooth: true,
          showSymbol: xData.length < 50,
          symbolSize: 4,
          itemStyle: { color },
          lineStyle: { width: 2.5, color },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}33` },
                { offset: 1, color: `${color}00` },
              ],
            },
          },
        },
      ],
    };
  }, [customOption, data, layout, propTitle, propUnit, propColor, propTimestamps, propSeriesData, propIsDarkMode]);

  return (
    <div className="w-full h-[400px]">
      <ReactECharts
        option={chartOption}
        style={{ width: "100%", height: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge={true}
      />
    </div>
  );
};

export default ChartComponent;
