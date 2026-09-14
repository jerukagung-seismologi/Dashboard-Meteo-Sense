"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground">Memuat grafik...</div>,
});

interface LegacyTrace {
  x?: Array<string | number>;
  y?: Array<string | number>;
  z?: Array<Array<number | null>>;
  type?: string;
  mode?: string;
  name?: string;
  line?: { color?: string; width?: number; dash?: string };
  marker?: { color?: string; size?: number; opacity?: number; line?: { color?: string; width?: number } };
  colorscale?: Array<Array<number | string>>;
  zmin?: number;
  zmax?: number;
}

interface LegacyLayout {
  height?: number;
  margin?: { l?: number; r?: number; t?: number; b?: number };
  font?: { color?: string; family?: string; size?: number };
  title?: { text?: string };
  xaxis?: { title?: { text?: string; [key: string]: unknown }; type?: string; nticks?: number; [key: string]: unknown };
  yaxis?: { title?: { text?: string; [key: string]: unknown }; range?: number[]; type?: string; autorange?: string; [key: string]: unknown };
  legend?: { orientation?: string };
  hovermode?: string;
}

interface ChartComponentProps {
  /** Compact dashboard descriptor, rendered exclusively with Apache ECharts. */
  data: LegacyTrace[];
  layout: LegacyLayout;
  style?: CSSProperties;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ data, layout, style }) => {
  const textColor = layout.font?.color ?? "#64748b";
  const gridColor = "rgba(148, 163, 184, 0.22)";
  const heatmapTrace = data.find((trace) => trace.type === "heatmap");
  const isHeatmap = Boolean(heatmapTrace);
  const xAxisType = isHeatmap || data.some((trace) => typeof trace.x?.[0] === "string") ? "category" : "value";
  const yAxisType = isHeatmap ? "category" : "value";

  const option = {
    animation: true,
    textStyle: { color: textColor, fontFamily: layout.font?.family ?? "Inter, sans-serif" },
    title: layout.title?.text ? { text: layout.title.text, left: "center", top: 0, textStyle: { color: textColor, fontSize: 12, fontWeight: 700 } } : undefined,
    tooltip: {
      trigger: isHeatmap ? "item" : layout.hovermode === "x unified" ? "axis" : "axis",
      axisPointer: { type: "cross" },
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderColor: "#475569",
      textStyle: { color: "#f8fafc" },
    },
    legend: data.length > 1 || data[0]?.name ? { show: !isHeatmap, bottom: 0, textStyle: { color: textColor } } : undefined,
    grid: {
      left: layout.margin?.l ?? 52,
      right: isHeatmap ? 78 : layout.margin?.r ?? 24,
      top: layout.title?.text ? 42 : layout.margin?.t ?? 28,
      bottom: layout.margin?.b ?? (data.length > 1 ? 55 : 42),
      containLabel: true,
    },
    xAxis: {
      type: xAxisType,
      data: xAxisType === "category" ? (heatmapTrace?.x ?? data[0]?.x ?? []) : undefined,
      name: layout.xaxis?.title?.text,
      nameLocation: "middle",
      nameGap: 32,
      axisLabel: { color: textColor, interval: "auto", hideOverlap: true },
      axisLine: { lineStyle: { color: gridColor } },
      splitLine: { show: !isHeatmap, lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: yAxisType,
      data: isHeatmap ? heatmapTrace?.y ?? [] : undefined,
      name: layout.yaxis?.title?.text,
      nameLocation: "middle",
      nameGap: 42,
      inverse: isHeatmap && layout.yaxis?.autorange === "reversed",
      min: layout.yaxis?.range?.[0],
      max: layout.yaxis?.range?.[1],
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: gridColor } },
      splitLine: { show: !isHeatmap, lineStyle: { color: gridColor } },
    },
    visualMap: isHeatmap ? {
      min: heatmapTrace?.zmin,
      max: heatmapTrace?.zmax,
      calculable: true,
      orient: "vertical",
      right: 8,
      top: "middle",
      text: [heatmapTrace?.name ?? layout.yaxis?.title?.text ?? "Nilai", ""],
      textStyle: { color: textColor },
      inRange: { color: heatmapTrace?.colorscale?.map(([, color]) => String(color)) },
    } : undefined,
    series: data.map((trace) => {
      if (trace.type === "heatmap") {
        const heatmapData = (trace.z ?? []).flatMap((row, y) => row.flatMap((value, x) => value === null || !Number.isFinite(value) ? [] : [[x, y, value]]));
        return { type: "heatmap", name: trace.name, data: heatmapData, emphasis: { itemStyle: { shadowBlur: 8 } } };
      }

      const isScatter = trace.type === "scatter" && trace.mode === "markers";
      const color = trace.line?.color ?? trace.marker?.color ?? "#3b82f6";
      return {
        type: trace.type === "bar" ? "bar" : isScatter ? "scatter" : "line",
        name: trace.name,
        data: isScatter ? (trace.x ?? []).map((x, index) => [x, trace.y?.[index]]) : trace.y ?? [],
        showSymbol: trace.mode?.includes("markers") ?? false,
        symbolSize: trace.marker?.size ?? 6,
        smooth: false,
        lineStyle: { color, width: trace.line?.width ?? 2, type: trace.line?.dash === "dash" ? "dashed" : "solid" },
        itemStyle: { color, opacity: trace.marker?.opacity ?? 1, borderColor: trace.marker?.line?.color, borderWidth: trace.marker?.line?.width },
        barMaxWidth: 42,
      };
    }),
  };

  return <ReactECharts option={option} notMerge lazyUpdate style={{ width: "100%", height: `${layout.height ?? 400}px`, ...style }} />;
};

export default ChartComponent;
