// components/peta/OneHourTrendChart.tsx
"use client";

import React, { useState, useMemo } from "react";

export interface SensorDataPoint {
  time: string; // HH:mm
  timestamp: number;
  temperature: number;
  humidity: number;
  pressure?: number;
  rainfall?: number;
  rainrate?: number;
  windSpeed?: number;
  windDirection?: number;
  lux?: number;
}

export type ChartMetricType = "temperature" | "humidity" | "rainfall" | "wind" | "pressure";

interface OneHourTrendChartProps {
  data: SensorDataPoint[];
  metric?: ChartMetricType;
  height?: number;
  width?: number;
  isDarkMode?: boolean;
}

const METRIC_CONFIGS: Record<ChartMetricType, {
  label: string;
  unit: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  minDecimals: number;
  defaultRange: [number, number];
}> = {
  temperature: {
    label: "Suhu Udara",
    unit: "°C",
    color: "#f43f5e", // Rose 500
    gradientStart: "rgba(244, 63, 94, 0.4)",
    gradientEnd: "rgba(244, 63, 94, 0.02)",
    minDecimals: 1,
    defaultRange: [24, 34],
  },
  humidity: {
    label: "Kelembapan",
    unit: "%",
    color: "#0284c7", // Sky 600
    gradientStart: "rgba(2, 132, 199, 0.4)",
    gradientEnd: "rgba(2, 132, 199, 0.02)",
    minDecimals: 0,
    defaultRange: [60, 95],
  },
  rainfall: {
    label: "Curah Hujan",
    unit: "mm",
    color: "#10b981", // Emerald 500
    gradientStart: "rgba(16, 185, 129, 0.4)",
    gradientEnd: "rgba(16, 185, 129, 0.02)",
    minDecimals: 1,
    defaultRange: [0, 5],
  },
  wind: {
    label: "Kecepatan Angin",
    unit: "km/h",
    color: "#06b6d4", // Cyan 500
    gradientStart: "rgba(6, 182, 212, 0.4)",
    gradientEnd: "rgba(6, 182, 212, 0.02)",
    minDecimals: 1,
    defaultRange: [0, 25],
  },
  pressure: {
    label: "Tekanan Udara",
    unit: "hPa",
    color: "#8b5cf6", // Violet 500
    gradientStart: "rgba(139, 92, 246, 0.4)",
    gradientEnd: "rgba(139, 92, 246, 0.02)",
    minDecimals: 1,
    defaultRange: [1005, 1018],
  },
};

export const OneHourTrendChart: React.FC<OneHourTrendChartProps> = ({
  data = [],
  metric = "temperature",
  height = 110,
  width = 280,
  isDarkMode = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const config = METRIC_CONFIGS[metric] || METRIC_CONFIGS.temperature;

  // Extract clean numerical series
  const series = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, idx) => {
      let val = metric === "wind" ? d.windSpeed : d[metric];
      if (typeof val !== "number" || isNaN(val)) {
        val =
          metric === "temperature"
            ? 28
            : metric === "humidity"
            ? 75
            : metric === "wind"
            ? 6.5
            : metric === "pressure"
            ? 1011
            : 0;
      }
      return {
        idx,
        time: d.time || `${idx * 4}m`,
        value: Number(val),
        raw: d,
      };
    });
  }, [data, metric]);

  const { minVal, maxVal, currentVal, pathD, areaD, points } = useMemo(() => {
    if (series.length === 0) {
      return { minVal: 0, maxVal: 0, currentVal: 0, pathD: "", areaD: "", points: [] };
    }

    const values = series.map((s) => s.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const curr = values[values.length - 1];

    // Ensure minimum visual variation range so line isn't completely flat
    if (min === max) {
      min = min - 1;
      max = max + 1;
    } else {
      const padding = (max - min) * 0.15;
      min = min - padding;
      max = max + padding;
    }

    const padLeft = 14;
    const padRight = 14;
    const padTop = 16;
    const padBottom = 22;
    const drawW = width - padLeft - padRight;
    const drawH = height - padTop - padBottom;

    const calcPoints = series.map((s, i) => {
      const x = padLeft + (drawW * i) / Math.max(series.length - 1, 1);
      const normalized = (s.value - min) / (max - min);
      const y = padTop + drawH * (1 - Math.max(0, Math.min(1, normalized)));
      return { x, y, value: s.value, time: s.time };
    });

    // Smooth Bezier Curve computation
    let linePath = "";
    if (calcPoints.length === 1) {
      linePath = `M ${padLeft} ${calcPoints[0].y} L ${width - padRight} ${calcPoints[0].y}`;
    } else {
      linePath = `M ${calcPoints[0].x.toFixed(1)} ${calcPoints[0].y.toFixed(1)}`;
      for (let i = 0; i < calcPoints.length - 1; i++) {
        const p0 = calcPoints[i];
        const p1 = calcPoints[i + 1];
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;
        linePath += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }
    }

    // Area closed path
    const baselineY = height - padBottom;
    const firstP = calcPoints[0];
    const lastP = calcPoints[calcPoints.length - 1];
    const areaPath = `${linePath} L ${lastP.x.toFixed(1)} ${baselineY} L ${firstP.x.toFixed(1)} ${baselineY} Z`;

    return {
      minVal: Math.min(...values),
      maxVal: Math.max(...values),
      currentVal: curr,
      pathD: linePath,
      areaD: areaPath,
      points: calcPoints,
    };
  }, [series, width, height]);

  if (series.length === 0) {
    return (
      <div className="h-24 w-full flex items-center justify-center text-xs text-slate-400 italic">
        Data 1 jam terakhir belum tersedia
      </div>
    );
  }

  const activeHover = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : points[points.length - 1];

  const startTime = series[0]?.time || "1 jam lalu";
  const endTime = series[series.length - 1]?.time || "Sekarang";

  return (
    <div className="w-full select-none space-y-1">
      {/* Top Value Summary Header */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: config.color }}
          />
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {config.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            Min: {minVal.toFixed(config.minDecimals)} | Max: {maxVal.toFixed(config.minDecimals)}
          </span>
          <span
            className="font-mono font-bold text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${config.color}15`,
              color: config.color,
            }}
          >
            {activeHover?.value !== undefined ? activeHover.value.toFixed(config.minDecimals) : currentVal.toFixed(config.minDecimals)} {config.unit}
          </span>
        </div>
      </div>

      {/* SVG Sparkline Area Chart */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[95px] overflow-visible"
        >
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity="0.38" />
              <stop offset="85%" stopColor={config.color} stopOpacity="0.03" />
              <stop offset="100%" stopColor={config.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background horizontal grid guides */}
          <line
            x1="12"
            y1={height / 2}
            x2={width - 12}
            y2={height / 2}
            stroke={isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
            strokeDasharray="3 3"
          />

          {/* Gradient Filled Area */}
          <path d={areaD} fill={`url(#grad-${metric})`} />

          {/* Smooth Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke={config.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Hover Target Areas */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
            const isLast = idx === points.length - 1;
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Invisible larger hit target */}
                <circle cx={p.x} cy={p.y} r="8" fill="transparent" />

                {/* Visible dot for last point or hovered */}
                {(isHovered || isLast) && (
                  <>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? "5" : "3.5"}
                      fill={config.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    {isHovered && (
                      <line
                        x1={p.x}
                        y1="10"
                        x2={p.x}
                        y2={height - 20}
                        stroke={config.color}
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}
                  </>
                )}
              </g>
            );
          })}

          {/* Time Labels on bottom */}
          <text
            x="14"
            y={height - 6}
            fontSize="9"
            fill={isDarkMode ? "#94a3b8" : "#64748b"}
            textAnchor="start"
          >
            {startTime}
          </text>
          <text
            x={width - 14}
            y={height - 6}
            fontSize="9"
            fill={isDarkMode ? "#94a3b8" : "#64748b"}
            textAnchor="end"
          >
            {endTime}
          </text>
        </svg>

        {/* Hover Time Tooltip Tag */}
        {hoveredIdx !== null && activeHover && (
          <div className="absolute top-1 left-2 text-[10px] text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded shadow-xs border border-slate-200 dark:border-slate-800">
            Waktu: {activeHover.time} • Nilai: {activeHover.value.toFixed(config.minDecimals)} {config.unit}
          </div>
        )}
      </div>
    </div>
  );
};
