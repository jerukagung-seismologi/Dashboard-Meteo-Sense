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
  ResponsiveContainer
} from "recharts";
import { Loader2, AlertCircle } from "lucide-react";
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
    dedupingInterval: 60000, // 1 min
  });

  const chartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    
    // Reverse so chronologically left to right
    const rawSeries = [...rawData].reverse();
    
    // Apply the real-time form config locally
    const calibratedSeries = applyCalibrationToSeries(rawSeries, config);

    // Merge them for Recharts
    return rawSeries.map((rawItem, i) => {
      const calItem = calibratedSeries[i];
      const rawVal = (rawItem as any)[previewVariable];
      const calVal = (calItem as any)[previewVariable];
      
      const time = new Date(rawItem.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
      
      return {
        time,
        raw: typeof rawVal === 'number' ? Number(rawVal.toFixed(2)) : null,
        calibrated: typeof calVal === 'number' ? Number(calVal.toFixed(2)) : null,
      };
    }).filter(d => d.raw !== null || d.calibrated !== null); // Remove points with missing values
    
  }, [rawData, config, previewVariable]);

  if (!stationId) {
    return (
      <div className="flex h-64 items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
        <p className="text-sm text-slate-500">Pilih stasiun terlebih dahulu.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-64 items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-2" />
        <p className="text-sm text-slate-500">Memuat data mentah...</p>
      </div>
    );
  }

  if (error || !chartData || chartData.length === 0) {
    return (
      <div className="flex flex-col h-64 items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-lg border border-dashed border-red-200 dark:border-red-800">
        <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
        <p className="text-sm text-red-500">{error?.message || "Tidak ada data tersedia untuk preview."}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-72 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          
          {/* Raw Line */}
          <Line 
            type="monotone" 
            dataKey="raw" 
            name="Raw Data" 
            stroke="#94a3b8" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4 }}
          />
          
          {/* Calibrated Line */}
          <Line 
            type="monotone" 
            dataKey="calibrated" 
            name="Calibrated Preview" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
