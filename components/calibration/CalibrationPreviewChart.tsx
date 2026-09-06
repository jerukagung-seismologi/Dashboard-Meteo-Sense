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
import { Loader2, Sparkles } from "lucide-react";
import { StationCalibrationDocument } from "@/lib/calibration/calibrationTypes";
import { applyCalibrationToSeries } from "@/lib/calibration/calibrationEngine";
import { SensorDate } from "@/lib/FetchingSensorData";

interface CalibrationPreviewChartProps {
  stationId: string;
  config: StationCalibrationDocument;
  previewVariable: string;
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
}) => {
  // Fetch latest 50 raw data points (calibration=false)
  const apiPath = stationId ? `/api/sensors?action=latest&sensorId=${stationId}&limit=50&calibration=false` : null;
  const { data: rawData, error, isLoading } = useSWR<SensorDate[]>(apiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const chartData = useMemo(() => {
    // If real sensor data exists, use it
    if (rawData && rawData.length > 0) {
      const rawSeries = [...rawData].reverse();
      const calibratedSeries = applyCalibrationToSeries(rawSeries, config);

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
    let unit = "";

    if (previewVariable.includes("temp") || previewVariable === "dew") {
      minVal = 15;
      maxVal = 38;
      unit = "°C";
    } else if (previewVariable === "humidity") {
      minVal = 30;
      maxVal = 100;
      unit = "%";
    } else if (previewVariable === "pressure") {
      minVal = 995;
      maxVal = 1025;
      unit = "hPa";
    } else if (previewVariable === "windSpeed") {
      minVal = 0;
      maxVal = 25;
      unit = "m/s";
    } else if (previewVariable === "rainfall") {
      minVal = 0;
      maxVal = 50;
      unit = "mm";
    }

    const steps = 25;
    const syntheticPoints: any[] = [];
    for (let i = 0; i <= steps; i++) {
      const rawVal = minVal + ((maxVal - minVal) / steps) * i;
      const fakeRecord: any = { timestamp: Date.now() + i * 60000 };
      fakeRecord[previewVariable] = rawVal;
      const [calRecord] = applyCalibrationToSeries([fakeRecord], config);
      const calVal = calRecord[previewVariable];

      syntheticPoints.push({
        time: `${rawVal.toFixed(1)}${unit ? " " + unit : ""}`,
        raw: Number(rawVal.toFixed(2)),
        calibrated: Number(calVal.toFixed(2)),
      });
    }

    return syntheticPoints;
  }, [rawData, config, previewVariable]);

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
    <div className="w-full space-y-2">
      {(!rawData || rawData.length === 0) && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-900">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Menampilkan simulasi kurva respons kalibrasi (Ground Input vs Calibrated Output).</span>
        </div>
      )}
      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              minTickGap={25}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                fontSize: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />

            {/* Raw Line */}
            <Line
              type="monotone"
              dataKey="raw"
              name="Nilai Mentah (Raw)"
              stroke="#94a3b8"
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
