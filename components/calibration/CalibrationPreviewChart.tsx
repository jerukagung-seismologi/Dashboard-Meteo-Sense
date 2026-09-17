"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StationCalibrationDocument } from "@/lib/calibration/calibrationTypes";
import { applyCalibrationToSeries } from "@/lib/calibration/calibrationEngine";
import { SensorDate } from "@/lib/FetchingSensorData";

interface CalibrationPreviewChartProps {
  stationId: string;
  config: StationCalibrationDocument;
  previewVariable: string;
  isDarkMode?: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch preview data");
  return res.json();
};

export const CalibrationPreviewChart: React.FC<CalibrationPreviewChartProps> = ({
  stationId,
  config,
  previewVariable,
  isDarkMode = false,
}) => {
  // Fetch latest 50 raw data points (calibration=false)
  const apiPath = stationId ? `/api/sensors?action=latest&sensorId=${stationId}&limit=50&calibration=false` : null;
  const { data: rawData, error, isLoading } = useSWR<SensorDate[]>(apiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Extract variable-specific configuration
  const varConfig = (config as any)?.[previewVariable];
  const isOperationallyEnabled = Boolean(config?.enabled && varConfig?.enabled);

  // Isolate preview config: Force enabled = true for preview variable so mathematical response curve is always visible
  const effectiveConfig = useMemo(() => {
    if (!config) return config;
    const cloned = JSON.parse(JSON.stringify(config)) as StationCalibrationDocument;
    cloned.enabled = true;
    if (cloned[previewVariable as keyof StationCalibrationDocument]) {
      const v = cloned[previewVariable as keyof StationCalibrationDocument] as any;
      if (v && typeof v === "object") {
        v.enabled = true; // Force preview variable active to render transfer function
      }
    }
    return cloned;
  }, [config, previewVariable]);

  // Determine formula text representation
  const { formulaText, unit } = useMemo(() => {
    let u = "";
    if (previewVariable.includes("temp") || previewVariable === "dew") u = "°C";
    else if (previewVariable === "humidity") u = "%";
    else if (previewVariable === "pressure") u = "hPa";
    else if (previewVariable === "windSpeed") u = "m/s";
    else if (previewVariable === "rainfall" || previewVariable === "rainrate") u = "mm";
    else if (previewVariable === "windDirection") u = "°";
    else if (previewVariable === "lux") u = "lux";
    else if (previewVariable === "volt") u = "V";

    if (!varConfig || varConfig.method === "none") {
      return { formulaText: "y = x (Bypass / Tanpa Koreksi)", unit: u };
    }

    const m = varConfig.method;
    if (m === "offset") {
      const off = typeof varConfig.offset === "number" ? varConfig.offset : 0;
      return { formulaText: `y = x ${off >= 0 ? "+" : "-"} ${Math.abs(off).toFixed(2)}${u ? " " + u : ""}`, unit: u };
    }
    if (m === "scale_offset" || m === "robust_linear") {
      const s = typeof varConfig.scale === "number" ? varConfig.scale : 1;
      const off = typeof varConfig.offset === "number" ? varConfig.offset : 0;
      return { formulaText: `y = ${s.toFixed(3)}·x ${off >= 0 ? "+" : "-"} ${Math.abs(off).toFixed(2)}`, unit: u };
    }
    if (m === "multiplier") {
      const mul = typeof varConfig.multiplier === "number" ? varConfig.multiplier : 1;
      return { formulaText: `y = ${mul.toFixed(3)}·x`, unit: u };
    }
    if (m === "percentage") {
      const p = typeof varConfig.percentage === "number" ? varConfig.percentage : 0;
      return { formulaText: `y = x · (1 + ${p}%)`, unit: u };
    }
    if (m === "polynomial") {
      const a = typeof varConfig.polyA === "number" ? varConfig.polyA : 0;
      const b = typeof varConfig.polyB === "number" ? varConfig.polyB : 1;
      const c = typeof varConfig.polyC === "number" ? varConfig.polyC : 0;
      return { formulaText: `y = ${a}·x² + ${b}·x ${c >= 0 ? "+" : "-"} ${Math.abs(c)}`, unit: u };
    }
    if (m === "power_law") {
      const a = typeof varConfig.powerA === "number" ? varConfig.powerA : 1;
      const b = typeof varConfig.powerB === "number" ? varConfig.powerB : 1;
      return { formulaText: `y = ${a}·(x^${b})`, unit: u };
    }
    if (m === "two_point") {
      return { formulaText: `Interpolasi 2-Titik (${varConfig.point1Raw}→${varConfig.point1Ref}, ${varConfig.point2Raw}→${varConfig.point2Ref})`, unit: u };
    }

    return { formulaText: "y = f(x)", unit: u };
  }, [varConfig, previewVariable]);

  const chartData = useMemo(() => {
    // If real sensor data exists, use it
    if (rawData && rawData.length > 0) {
      const rawSeries = [...rawData].reverse();
      const calibratedSeries = applyCalibrationToSeries(rawSeries, effectiveConfig);

      return rawSeries
        .map((rawItem, i) => {
          const calItem = calibratedSeries[i];
          const rawVal = (rawItem as any)[previewVariable];
          const calVal = (calItem as any)[previewVariable];
          const time = new Date(rawItem.timestamp).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return {
            time,
            raw: typeof rawVal === "number" ? Number(rawVal.toFixed(2)) : null,
            calibrated: typeof calVal === "number" ? Number(calVal.toFixed(2)) : null,
          };
        })
        .filter(d => d.raw !== null || d.calibrated !== null);
    }

    // Otherwise, generate an interactive synthetic transfer function curve across typical operating range
    let minVal = 0;
    let maxVal = 100;

    if (previewVariable.includes("temp") || previewVariable === "dew") {
      minVal = 15;
      maxVal = 38;
    } else if (previewVariable === "humidity") {
      minVal = 30;
      maxVal = 100;
    } else if (previewVariable === "pressure") {
      minVal = 995;
      maxVal = 1025;
    } else if (previewVariable === "windSpeed") {
      minVal = 0;
      maxVal = 25;
    } else if (previewVariable === "rainfall") {
      minVal = 0;
      maxVal = 50;
    }

    const steps = 25;
    const syntheticPoints: any[] = [];
    for (let i = 0; i <= steps; i++) {
      const rawVal = minVal + ((maxVal - minVal) / steps) * i;
      const fakeRecord: any = { timestamp: Date.now() + i * 60000, stationId };
      fakeRecord[previewVariable] = rawVal;
      const [calRecord] = applyCalibrationToSeries([fakeRecord], effectiveConfig);
      const calVal = calRecord[previewVariable];

      syntheticPoints.push({
        time: `${rawVal.toFixed(1)}${unit ? " " + unit : ""}`,
        raw: Number(rawVal.toFixed(2)),
        calibrated: Number(calVal.toFixed(2)),
      });
    }

    return syntheticPoints;
  }, [rawData, effectiveConfig, previewVariable, stationId, unit]);

  // Calculate average shift delta
  const avgDelta = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    const valid = chartData.filter(d => typeof d.raw === "number" && typeof d.calibrated === "number");
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, d) => acc + (d.calibrated! - d.raw!), 0);
    return Number((sum / valid.length).toFixed(2));
  }, [chartData]);

  if (!stationId) {
    return (
      <div className="flex h-64 items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-sm text-slate-500">Pilih stasiun terlebih dahulu untuk menampilkan kurva respons.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-64 items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm text-slate-500">Menghitung transfer kalibrasi sensor...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Parameter Status & Dynamic Formula Pill Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
        <div className="flex items-center gap-2">
          <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Model Pratinjau:</span>
          <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
            {formulaText}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Rerata Pergeseran:</span>
          <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${
            avgDelta !== 0
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700"
          }`}>
            Δ {avgDelta >= 0 ? "+" : ""}{avgDelta} {unit}
          </span>

          {isOperationallyEnabled ? (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] gap-1 py-0.5">
              <CheckCircle2 className="w-3 h-3" />
              Saklar Operasional Aktif
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[10px] gap-1 py-0.5">
              <AlertTriangle className="w-3 h-3" />
              Mode Simulasi (Bypass)
            </Badge>
          )}
        </div>
      </div>

      {(!rawData || rawData.length === 0) && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-900">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Menampilkan transfer function sintetis respons operasional (Ground Raw vs Calibrated Output).</span>
        </div>
      )}

      <div className="w-full h-72 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDarkMode ? "#334155" : "#e2e8f0"}
              strokeOpacity={0.6}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: isDarkMode ? "#94a3b8" : "#64748b" }}
              tickLine={false}
              axisLine={false}
              minTickGap={25}
            />
            <YAxis
              tick={{ fontSize: 11, fill: isDarkMode ? "#94a3b8" : "#64748b" }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                fontSize: "12px",
                backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
                borderColor: isDarkMode ? "#334155" : "#e2e8f0",
                color: isDarkMode ? "#f8fafc" : "#0f172a",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              formatter={(value: any, name: any, item: any) => {
                const raw = item?.payload?.raw;
                const cal = item?.payload?.calibrated;
                const delta = (typeof raw === "number" && typeof cal === "number")
                  ? (cal - raw).toFixed(2)
                  : "—";

                if (name === "Hasil Terkalibrasi") {
                  return [`${value} ${unit} (Δ: ${Number(delta) >= 0 ? "+" : ""}${delta} ${unit})`, name];
                }
                return [`${value} ${unit}`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />

            {/* Raw Line */}
            <Line
              type="monotone"
              dataKey="raw"
              name="Nilai Mentah (Raw)"
              stroke={isDarkMode ? "#64748b" : "#94a3b8"}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4 }}
            />

            {/* Calibrated Line */}
            <Line
              type="monotone"
              dataKey="calibrated"
              name="Hasil Terkalibrasi"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
