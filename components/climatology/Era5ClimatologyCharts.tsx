// components/climatology/Era5ClimatologyCharts.tsx
"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Droplets,
  Gauge,
  CloudRain,
  Compass,
  Clock,
  Calendar,
  Sparkles,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Flame,
  Wind,
  AlertTriangle,
} from "lucide-react";
import type { ClimatologySummary } from "@/lib/reanalysis/climatology";
import type { AggregatedPoint } from "@/lib/climatology/climatologyTypes";
import { computeClimateExtremes } from "@/lib/climatology/climateExtremes";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full flex items-center justify-center text-muted-foreground animate-pulse bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col items-center gap-2">
        <Activity className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="text-sm">Memuat visualisasi chart klimatologis ERA5...</span>
      </div>
    </div>
  ),
});

interface Era5ClimatologyChartsProps {
  era5Data: (ClimatologySummary & { sourceModel?: string }) | null;
  isLoading: boolean;
  stationPoints?: AggregatedPoint[];
  stationName?: string;
  coordinates?: { lat: number; lng: number };
  isDarkMode: boolean;
  selectedYear?: number;
}

type ViewMode = "monthly" | "diurnal" | "extremes";
type Parameter = "temperature" | "humidity" | "pressure" | "rainfall";

export const Era5ClimatologyCharts: React.FC<Era5ClimatologyChartsProps> = ({
  era5Data,
  isLoading,
  stationPoints = [],
  stationName = "Stasiun Terpilih",
  coordinates,
  isDarkMode,
  selectedYear = new Date().getFullYear(),
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [activeParam, setActiveParam] = useState<Parameter>("temperature");

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const titleColor = isDarkMode ? "#f1f5f9" : "#0f172a";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.25)" : "rgba(203, 213, 225, 0.35)";
  const tooltipBg = isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)";
  const tooltipBorder = isDarkMode ? "#334155" : "#cbd5e1";

  // Calculate station's observed monthly averages if stationPoints exist
  const stationMonthlyAverages = useMemo(() => {
    if (!stationPoints || stationPoints.length === 0) return null;
    const monthBuckets: { [m: number]: { temps: number[]; hums: number[]; press: number[]; rain: number } } = {};

    stationPoints.forEach((p) => {
      const d = new Date(p.timestamp);
      const m = d.getUTCMonth(); // 0 to 11
      if (!monthBuckets[m]) {
        monthBuckets[m] = { temps: [], hums: [], press: [], rain: 0 };
      }
      if (Number.isFinite(p.temperatureMean)) monthBuckets[m].temps.push(p.temperatureMean);
      if (Number.isFinite(p.humidityMean)) monthBuckets[m].hums.push(p.humidityMean);
      if (Number.isFinite(p.pressureMean)) monthBuckets[m].press.push(p.pressureMean);
      if (Number.isFinite(p.rainfallAccumulation)) monthBuckets[m].rain += p.rainfallAccumulation;
    });

    const result = {
      temps: Array(12).fill(null) as (number | null)[],
      hums: Array(12).fill(null) as (number | null)[],
      press: Array(12).fill(null) as (number | null)[],
      rain: Array(12).fill(null) as (number | null)[],
    };

    for (let m = 0; m < 12; m++) {
      const b = monthBuckets[m];
      if (b && b.temps.length > 0) {
        result.temps[m] = Number((b.temps.reduce((a, c) => a + c, 0) / b.temps.length).toFixed(2));
      }
      if (b && b.hums.length > 0) {
        result.hums[m] = Number((b.hums.reduce((a, c) => a + c, 0) / b.hums.length).toFixed(2));
      }
      if (b && b.press.length > 0) {
        result.press[m] = Number((b.press.reduce((a, c) => a + c, 0) / b.press.length).toFixed(2));
      }
      if (b && b.rain > 0) {
        result.rain[m] = Number(b.rain.toFixed(2));
      }
    }

    return result;
  }, [stationPoints]);

  // Option generator for 12-Month Normal Profile
  const monthlyChartOption = useMemo(() => {
    if (!era5Data || !era5Data.monthly) return {};

    const months = era5Data.monthly.months || [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];

    if (activeParam === "temperature") {
      const { min, mean, max } = era5Data.monthly.temperature;
      const allVals = [...min, ...mean, ...max].filter(Number.isFinite);
      if (stationMonthlyAverages?.temps) {
        stationMonthlyAverages.temps.forEach(v => { if (v != null) allVals.push(v); });
      }
      const yMin = allVals.length > 0 ? Math.floor(Math.min(...allVals) - 1) : 15;
      const yMax = allVals.length > 0 ? Math.ceil(Math.max(...allVals) + 1) : 35;

      const series: any[] = [
        {
          name: "Suhu Maksimum Normal",
          type: "line",
          data: max.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#f87171" },
          lineStyle: { type: "dashed", width: 1.75 },
          symbol: "circle",
          symbolSize: 6,
          smooth: true,
        },
        {
          name: "Suhu Rerata Normal (ERA5)",
          type: "line",
          data: mean.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 3.5 },
          symbol: "circle",
          symbolSize: 7,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(16, 185, 129, 0.25)" },
                { offset: 1, color: "rgba(16, 185, 129, 0.01)" },
              ],
            },
          },
          smooth: true,
        },
        {
          name: "Suhu Minimum Normal",
          type: "line",
          data: min.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#38bdf8" },
          lineStyle: { type: "dashed", width: 1.75 },
          symbol: "circle",
          symbolSize: 6,
          smooth: true,
        },
      ];

      // If station has observations, overlay them as distinct reference markers
      if (stationMonthlyAverages?.temps && stationMonthlyAverages.temps.some(v => v !== null)) {
        series.push({
          name: `Observasi Stasiun (${selectedYear})`,
          type: "scatter",
          data: stationMonthlyAverages.temps,
          itemStyle: { color: "#f59e0b" },
          symbolSize: 10,
          symbol: "diamond",
        });
      }

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            let res = `<div class="font-bold border-b pb-1 mb-1.5" style="color:${titleColor}">Bulan: ${params[0].name}</div>`;
            params.forEach((item: any) => {
              if (item.value == null) return;
              const val = Number(item.value).toFixed(2);
              res += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span>${item.marker} ${item.seriesName}:</span>
                <span class="font-bold">${val} °C</span>
              </div>`;
            });
            return res;
          },
        },
        legend: {
          bottom: 0,
          textStyle: { color: textColor, fontSize: 11 },
        },
        grid: { left: "4%", right: "4%", top: "8%", bottom: "14%", containLabel: true },
        xAxis: {
          type: "category",
          data: months,
          axisLabel: { color: textColor, fontWeight: 500 },
          axisTick: { alignWithLabel: true },
        },
        yAxis: {
          type: "value",
          name: "Suhu Udara (°C)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} °C" },
          splitLine: { lineStyle: { color: gridColor } },
          min: yMin,
          max: yMax,
          scale: true,
        },
        series,
      };
    }

    if (activeParam === "humidity") {
      const { min, mean, max } = era5Data.monthly.humidity;
      const allVals = [...min, ...mean, ...max].filter(Number.isFinite);
      if (stationMonthlyAverages?.hums) {
        stationMonthlyAverages.hums.forEach(v => { if (v != null) allVals.push(v); });
      }
      const yMin = allVals.length > 0 ? Math.max(0, Math.floor(Math.min(...allVals) - 5)) : 40;
      const yMax = allVals.length > 0 ? Math.min(100, Math.ceil(Math.max(...allVals) + 5)) : 100;

      const series: any[] = [
        {
          name: "Kelembaban Maksimum Normal",
          type: "line",
          data: max.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#34d399" },
          lineStyle: { type: "dashed", width: 1.75 },
          smooth: true,
        },
        {
          name: "Kelembaban Rerata Normal (ERA5)",
          type: "line",
          data: mean.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#3b82f6" },
          lineStyle: { width: 3.5 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59, 130, 246, 0.25)" },
                { offset: 1, color: "rgba(59, 130, 246, 0.01)" },
              ],
            },
          },
          smooth: true,
        },
        {
          name: "Kelembaban Minimum Normal",
          type: "line",
          data: min.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#f59e0b" },
          lineStyle: { type: "dashed", width: 1.75 },
          smooth: true,
        },
      ];

      if (stationMonthlyAverages?.hums && stationMonthlyAverages.hums.some(v => v !== null)) {
        series.push({
          name: `Observasi Stasiun (${selectedYear})`,
          type: "scatter",
          data: stationMonthlyAverages.hums,
          itemStyle: { color: "#a855f7" },
          symbolSize: 10,
          symbol: "diamond",
        });
      }

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            let res = `<div class="font-bold border-b pb-1 mb-1.5" style="color:${titleColor}">Bulan: ${params[0].name}</div>`;
            params.forEach((item: any) => {
              if (item.value == null) return;
              const val = Number(item.value).toFixed(2);
              res += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span>${item.marker} ${item.seriesName}:</span>
                <span class="font-bold">${val} %</span>
              </div>`;
            });
            return res;
          },
        },
        legend: { bottom: 0, textStyle: { color: textColor, fontSize: 11 } },
        grid: { left: "4%", right: "4%", top: "8%", bottom: "14%", containLabel: true },
        xAxis: {
          type: "category",
          data: months,
          axisLabel: { color: textColor, fontWeight: 500 },
          axisTick: { alignWithLabel: true },
        },
        yAxis: {
          type: "value",
          name: "Kelembaban Relatif (%)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} %" },
          splitLine: { lineStyle: { color: gridColor } },
          min: yMin,
          max: yMax,
        },
        series,
      };
    }

    if (activeParam === "pressure") {
      const { min, mean, max } = era5Data.monthly.pressure;
      const allVals = [...min, ...mean, ...max].filter(Number.isFinite);
      if (stationMonthlyAverages?.press) {
        stationMonthlyAverages.press.forEach(v => { if (v != null) allVals.push(v); });
      }
      const yMin = allVals.length > 0 ? Math.floor(Math.min(...allVals) - 1) : 1000;
      const yMax = allVals.length > 0 ? Math.ceil(Math.max(...allVals) + 1) : 1020;

      const series: any[] = [
        {
          name: "Tekanan Maksimum Normal",
          type: "line",
          data: max.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#ec4899" },
          lineStyle: { type: "dashed", width: 1.75 },
          smooth: true,
        },
        {
          name: "Tekanan Rerata Normal (ERA5)",
          type: "line",
          data: mean.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#8b5cf6" },
          lineStyle: { width: 3.5 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(139, 92, 246, 0.25)" },
                { offset: 1, color: "rgba(139, 92, 246, 0.01)" },
              ],
            },
          },
          smooth: true,
        },
        {
          name: "Tekanan Minimum Normal",
          type: "line",
          data: min.map(v => Number(v.toFixed(2))),
          itemStyle: { color: "#06b6d4" },
          lineStyle: { type: "dashed", width: 1.75 },
          smooth: true,
        },
      ];

      if (stationMonthlyAverages?.press && stationMonthlyAverages.press.some(v => v !== null)) {
        series.push({
          name: `Observasi Stasiun (${selectedYear})`,
          type: "scatter",
          data: stationMonthlyAverages.press,
          itemStyle: { color: "#f97316" },
          symbolSize: 10,
          symbol: "diamond",
        });
      }

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            let res = `<div class="font-bold border-b pb-1 mb-1.5" style="color:${titleColor}">Bulan: ${params[0].name}</div>`;
            params.forEach((item: any) => {
              if (item.value == null) return;
              const val = Number(item.value).toFixed(2);
              res += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span>${item.marker} ${item.seriesName}:</span>
                <span class="font-bold">${val} hPa</span>
              </div>`;
            });
            return res;
          },
        },
        legend: { bottom: 0, textStyle: { color: textColor, fontSize: 11 } },
        grid: { left: "4%", right: "4%", top: "8%", bottom: "14%", containLabel: true },
        xAxis: {
          type: "category",
          data: months,
          axisLabel: { color: textColor, fontWeight: 500 },
          axisTick: { alignWithLabel: true },
        },
        yAxis: {
          type: "value",
          name: "Tekanan MSL (hPa)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} hPa" },
          splitLine: { lineStyle: { color: gridColor } },
          min: yMin,
          max: yMax,
          scale: true,
        },
        series,
      };
    }

    // Default: Rainfall (Bar + Cumulative line)
    const rain = era5Data.monthly.rain || Array(12).fill(0);
    // Cumulative sum
    let cum = 0;
    const cumulativeRain = rain.map((v) => {
      cum += v;
      return Number(cum.toFixed(2));
    });

    const series: any[] = [
      {
        name: "Curah Hujan Bulanan (ERA5)",
        type: "bar",
        data: rain.map(v => Number(v.toFixed(2))),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#38bdf8" },
              { offset: 1, color: "#0284c7" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: "Akumulasi Kumulatif (mm)",
        type: "line",
        yAxisIndex: 1,
        data: cumulativeRain,
        itemStyle: { color: "#f59e0b" },
        lineStyle: { width: 3 },
        symbol: "circle",
        symbolSize: 6,
        smooth: true,
      },
    ];

    if (stationMonthlyAverages?.rain && stationMonthlyAverages.rain.some(v => v !== null)) {
      series.push({
        name: `Observasi Stasiun (${selectedYear})`,
        type: "bar",
        data: stationMonthlyAverages.rain,
        itemStyle: {
          color: "rgba(244, 63, 94, 0.8)",
          borderRadius: [4, 4, 0, 0],
        },
      });
    }

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: textColor },
        formatter: (params: any) => {
          let res = `<div class="font-bold border-b pb-1 mb-1.5" style="color:${titleColor}">Bulan: ${params[0].name}</div>`;
          params.forEach((item: any) => {
            if (item.value == null) return;
            const val = Number(item.value).toFixed(2);
            res += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
              <span>${item.marker} ${item.seriesName}:</span>
              <span class="font-bold">${val} mm</span>
            </div>`;
          });
          return res;
        },
      },
      legend: { bottom: 0, textStyle: { color: textColor, fontSize: 11 } },
      grid: { left: "4%", right: "4%", top: "8%", bottom: "14%", containLabel: true },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: { color: textColor, fontWeight: 500 },
        axisTick: { alignWithLabel: true },
      },
      yAxis: [
        {
          type: "value",
          name: "Curah Hujan Bulanan (mm)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} mm" },
          splitLine: { lineStyle: { color: gridColor } },
          min: 0,
        },
        {
          type: "value",
          name: "Akumulasi Kumulatif (mm)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} mm" },
          splitLine: { show: false },
          min: 0,
        },
      ],
      series,
    };
  }, [era5Data, activeParam, isDarkMode, textColor, titleColor, gridColor, tooltipBg, tooltipBorder, stationMonthlyAverages, selectedYear]);

  // Option generator for 24-Hour Diurnal Cycle
  const diurnalChartOption = useMemo(() => {
    if (!era5Data || !era5Data.diurnal) return {};

    const diurnal = era5Data.diurnal;
    const hours = diurnal.map(d => d.hour);

    if (activeParam === "temperature" || activeParam === "humidity") {
      // Dual Axis: Temperature & Humidity Diurnal Oscillation
      const temps = diurnal.map(d => Number(d.temperature.toFixed(2)));
      const hums = diurnal.map(d => Number(d.humidity.toFixed(2)));

      const tMin = Math.floor(Math.min(...temps) - 1);
      const tMax = Math.ceil(Math.max(...temps) + 1);
      const hMin = Math.max(0, Math.floor(Math.min(...hums) - 5));
      const hMax = Math.min(100, Math.ceil(Math.max(...hums) + 5));

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            let res = `<div class="font-bold border-b pb-1 mb-1.5" style="color:${titleColor}">Pukul: ${params[0].name} WIB</div>`;
            params.forEach((item: any) => {
              const val = Number(item.value).toFixed(2);
              const unit = item.seriesName.includes("Suhu") ? "°C" : "%";
              res += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span>${item.marker} ${item.seriesName}:</span>
                <span class="font-bold">${val} ${unit}</span>
              </div>`;
            });
            return res;
          },
        },
        legend: {
          bottom: 0,
          textStyle: { color: textColor, fontSize: 11 },
          data: ["Suhu Udara Diurnal", "Kelembaban Relatif Diurnal"],
        },
        grid: { left: "4%", right: "4%", top: "8%", bottom: "14%", containLabel: true },
        xAxis: {
          type: "category",
          data: hours,
          axisLabel: { color: textColor, fontSize: 11 },
        },
        yAxis: [
          {
            type: "value",
            name: "Suhu (°C)",
            nameTextStyle: { color: "#ef4444", fontSize: 11 },
            axisLabel: { color: "#ef4444", formatter: "{value} °C" },
            splitLine: { lineStyle: { color: gridColor } },
            min: tMin,
            max: tMax,
            scale: true,
          },
          {
            type: "value",
            name: "Kelembaban (%)",
            nameTextStyle: { color: "#3b82f6", fontSize: 11 },
            axisLabel: { color: "#3b82f6", formatter: "{value} %" },
            splitLine: { show: false },
            min: hMin,
            max: hMax,
          },
        ],
        series: [
          {
            name: "Suhu Udara Diurnal",
            type: "line",
            data: temps,
            itemStyle: { color: "#ef4444" },
            lineStyle: { width: 3 },
            symbol: "circle",
            symbolSize: 6,
            smooth: true,
          },
          {
            name: "Kelembaban Relatif Diurnal",
            type: "line",
            yAxisIndex: 1,
            data: hums,
            itemStyle: { color: "#3b82f6" },
            lineStyle: { width: 3 },
            symbol: "circle",
            symbolSize: 6,
            smooth: true,
          },
        ],
      };
    }

    if (activeParam === "pressure") {
      const pressures = diurnal.map(d => Number(d.pressure.toFixed(2)));
      const pMin = Math.floor(Math.min(...pressures) - 0.5);
      const pMax = Math.ceil(Math.max(...pressures) + 0.5);

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            let res = `<div class="font-bold border-b pb-1 mb-1.5" style="color:${titleColor}">Pukul: ${params[0].name} WIB</div>`;
            params.forEach((item: any) => {
              const val = Number(item.value).toFixed(2);
              res += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span>${item.marker} ${item.seriesName}:</span>
                <span class="font-bold">${val} hPa</span>
              </div>`;
            });
            return res;
          },
        },
        legend: { bottom: 0, textStyle: { color: textColor, fontSize: 11 } },
        grid: { left: "4%", right: "4%", top: "8%", bottom: "14%", containLabel: true },
        xAxis: {
          type: "category",
          data: hours,
          axisLabel: { color: textColor, fontSize: 11 },
        },
        yAxis: {
          type: "value",
          name: "Tekanan MSL Diurnal (hPa)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} hPa" },
          splitLine: { lineStyle: { color: gridColor } },
          min: pMin,
          max: pMax,
          scale: true,
        },
        series: [
          {
            name: "Tekanan Udara Diurnal",
            type: "line",
            data: pressures,
            itemStyle: { color: "#a855f7" },
            lineStyle: { width: 3 },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(168, 85, 247, 0.25)" },
                  { offset: 1, color: "rgba(168, 85, 247, 0.0)" },
                ],
              },
            },
            smooth: true,
          },
        ],
      };
    }

    // Default: Rain & Wind Diurnal
    const rains = diurnal.map(d => Number(d.rain.toFixed(2)));
    const winds = diurnal.map(d => Number(d.windSpeed.toFixed(2)));

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: textColor },
        formatter: (params: any) => {
          let res = `<div class="font-bold border-b pb-1 mb-1.5" style="color:${titleColor}">Pukul: ${params[0].name} WIB</div>`;
          params.forEach((item: any) => {
            const val = Number(item.value).toFixed(2);
            const unit = item.seriesName.includes("Hujan") ? "mm" : "m/s";
            res += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
              <span>${item.marker} ${item.seriesName}:</span>
              <span class="font-bold">${val} ${unit}</span>
            </div>`;
          });
          return res;
        },
      },
      legend: { bottom: 0, textStyle: { color: textColor, fontSize: 11 } },
      grid: { left: "4%", right: "4%", top: "8%", bottom: "14%", containLabel: true },
      xAxis: {
        type: "category",
        data: hours,
        axisLabel: { color: textColor, fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          name: "Curah Hujan Diurnal (mm)",
          nameTextStyle: { color: "#0ea5e9", fontSize: 11 },
          axisLabel: { color: "#0ea5e9", formatter: "{value} mm" },
          splitLine: { lineStyle: { color: gridColor } },
          min: 0,
        },
        {
          type: "value",
          name: "Kecepatan Angin (m/s)",
          nameTextStyle: { color: "#10b981", fontSize: 11 },
          axisLabel: { color: "#10b981", formatter: "{value} m/s" },
          splitLine: { show: false },
          min: 0,
        },
      ],
      series: [
        {
          name: "Rata-rata Curah Hujan",
          type: "bar",
          data: rains,
          itemStyle: { color: "#0ea5e9", borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Kecepatan Angin",
          type: "line",
          yAxisIndex: 1,
          data: winds,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 2.5 },
          smooth: true,
        },
      ],
    };
  }, [era5Data, activeParam, isDarkMode, textColor, titleColor, gridColor, tooltipBg, tooltipBorder]);

  // Calculate hourly climate percentiles from ERA5
  const era5Percentiles = useMemo(() => {
    if (!era5Data?.hourly) return null;
    const { temperature, humidity, pressure, windSpeed, windGust, rain } = era5Data.hourly;

    const calcP = (raw?: (number | null | undefined)[]) => {
      const sorted = (raw || []).filter((v): v is number => v != null && Number.isFinite(v)).sort((a, b) => a - b);
      if (sorted.length === 0) {
        return { min: 0, p5: 0, p25: 0, p50: 0, p75: 0, p95: 0, p99: 0, max: 0 };
      }
      const getP = (p: number) => {
        const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
        return Number(sorted[idx].toFixed(2));
      };
      return {
        min: Number(sorted[0].toFixed(2)),
        p5: getP(5),
        p25: getP(25),
        p50: getP(50),
        p75: getP(75),
        p95: getP(95),
        p99: getP(99),
        max: Number(sorted[sorted.length - 1].toFixed(2)),
      };
    };

    return {
      temperature: calcP(temperature),
      humidity: calcP(humidity),
      pressure: calcP(pressure),
      windSpeed: calcP(windSpeed),
      windGust: calcP(windGust),
      rain: calcP(rain),
    };
  }, [era5Data]);

  // Compute station and ERA5 extreme event metrics
  const extremes = useMemo(() => {
    return computeClimateExtremes(stationPoints, era5Data);
  }, [stationPoints, era5Data]);

  // Option generator for Extremes & Rekor View
  const extremesChartOption = useMemo(() => {
    if (!era5Data || !era5Percentiles) return {};

    const p = era5Percentiles;

    if (activeParam === "temperature") {
      const { min, p5, p25, p50, p75, p95, p99, max } = p.temperature;
      const categories = [
        "Min Absolut",
        "P5 (Sangat Dingin)",
        "P25 (Kuartil Bawah)",
        "P50 (Median Iklim)",
        "P75 (Kuartil Atas)",
        "P95 (Sangat Hangat)",
        "P99 (Ekstrem Panas)",
        "Maks Absolut"
      ];
      const vals = [min, p5, p25, p50, p75, p95, p99, max];
      const yMin = Math.floor(min - 1);
      const yMax = Math.ceil(max + 1);

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            const item = params[0];
            return `<div class="font-bold border-b pb-1 mb-1" style="color:${titleColor}">Distribusi Ekstrem Suhu ERA5</div>
                    <div class="text-xs py-0.5">
                      <span>${item.name}: </span>
                      <span class="font-bold text-red-500">${item.value} °C</span>
                    </div>`;
          },
        },
        grid: { left: "4%", right: "4%", top: "10%", bottom: "16%", containLabel: true },
        xAxis: {
          type: "category",
          data: categories,
          axisLabel: { color: textColor, fontSize: 10, rotate: 20 },
        },
        yAxis: {
          type: "value",
          name: "Suhu Udara (°C)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} °C" },
          splitLine: { lineStyle: { color: gridColor } },
          min: yMin,
          max: yMax,
          scale: true,
        },
        series: [
          {
            name: "Nilai Persentil Suhu",
            type: "bar",
            data: vals.map((v, i) => ({
              value: v,
              itemStyle: {
                color: i >= 5 ? "#ef4444" : i <= 1 ? "#3b82f6" : "#f59e0b",
                borderRadius: [4, 4, 0, 0],
              },
            })),
            label: {
              show: true,
              position: "top",
              formatter: "{c}°C",
              color: textColor,
              fontSize: 10,
              fontWeight: "bold",
            },
          },
        ],
      };
    } else if (activeParam === "humidity") {
      const { min, p5, p25, p50, p75, p95, p99, max } = p.humidity;
      const categories = [
        "Min Absolut",
        "P5 (Sangat Kering)",
        "P25 (Kuartil Bawah)",
        "P50 (Median Iklim)",
        "P75 (Kuartil Atas)",
        "P95 (Sangat Lembap)",
        "P99 (Jenuh)",
        "Maks Absolut"
      ];
      const vals = [min, p5, p25, p50, p75, p95, p99, max];

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            const item = params[0];
            return `<div class="font-bold border-b pb-1 mb-1" style="color:${titleColor}">Distribusi Kelembaban Relatif ERA5</div>
                    <div class="text-xs py-0.5">
                      <span>${item.name}: </span>
                      <span class="font-bold text-blue-500">${item.value} %</span>
                    </div>`;
          },
        },
        grid: { left: "4%", right: "4%", top: "10%", bottom: "16%", containLabel: true },
        xAxis: {
          type: "category",
          data: categories,
          axisLabel: { color: textColor, fontSize: 10, rotate: 20 },
        },
        yAxis: {
          type: "value",
          name: "Kelembaban Relatif (%)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} %" },
          splitLine: { lineStyle: { color: gridColor } },
          min: Math.max(0, Math.floor(min - 5)),
          max: 100,
        },
        series: [
          {
            name: "Nilai Persentil RH",
            type: "bar",
            data: vals.map((v, i) => ({
              value: v,
              itemStyle: {
                color: i <= 1 ? "#f59e0b" : "#0284c7",
                borderRadius: [4, 4, 0, 0],
              },
            })),
            label: {
              show: true,
              position: "top",
              formatter: "{c}%",
              color: textColor,
              fontSize: 10,
              fontWeight: "bold",
            },
          },
        ],
      };
    } else if (activeParam === "pressure") {
      const { min, p5, p25, p50, p75, p95, p99, max } = p.pressure;
      const categories = [
        "Min Absolut",
        "P5 (Palung Rendah)",
        "P25 (Kuartil Bawah)",
        "P50 (Median Iklim)",
        "P75 (Kuartil Atas)",
        "P95 (Tekanan Tinggi)",
        "P99 (Pusat Antisiklon)",
        "Maks Absolut"
      ];
      const vals = [min, p5, p25, p50, p75, p95, p99, max];

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            const item = params[0];
            return `<div class="font-bold border-b pb-1 mb-1" style="color:${titleColor}">Distribusi Tekanan Udara ERA5</div>
                    <div class="text-xs py-0.5">
                      <span>${item.name}: </span>
                      <span class="font-bold text-pink-500">${item.value} hPa</span>
                    </div>`;
          },
        },
        grid: { left: "4%", right: "4%", top: "10%", bottom: "16%", containLabel: true },
        xAxis: {
          type: "category",
          data: categories,
          axisLabel: { color: textColor, fontSize: 10, rotate: 20 },
        },
        yAxis: {
          type: "value",
          name: "Tekanan MSL (hPa)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value} hPa" },
          splitLine: { lineStyle: { color: gridColor } },
          min: Math.floor(min - 1),
          max: Math.ceil(max + 1),
          scale: true,
        },
        series: [
          {
            name: "Nilai Persentil Tekanan",
            type: "bar",
            data: vals.map((v, i) => ({
              value: v,
              itemStyle: {
                color: i <= 1 ? "#e11d48" : "#9333ea",
                borderRadius: [4, 4, 0, 0],
              },
            })),
            label: {
              show: true,
              position: "top",
              formatter: "{c}",
              color: textColor,
              fontSize: 10,
              fontWeight: "bold",
            },
          },
        ],
      };
    } else {
      const { max: maxWind, p95: p95Wind, p99: p99Wind } = p.windSpeed;
      const { max: maxGust, p95: p95Gust, p99: p99Gust } = p.windGust;
      const { max: maxRain, p95: p95Rain, p99: p99Rain } = p.rain;

      const categories = [
        "Angin P95",
        "Angin P99",
        "Angin Maks ERA5",
        "Gust P95",
        "Gust P99",
        "Puncak Gust ERA5",
        "Hujan Jam P99",
        "Hujan Jam Maks"
      ];
      const vals = [
        p95Wind, p99Wind, maxWind,
        p95Gust, p99Gust, maxGust,
        p99Rain, maxRain
      ];

      return {
        tooltip: {
          trigger: "axis",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor },
          formatter: (params: any) => {
            const item = params[0];
            const unit = item.name.includes("Hujan") ? "mm" : "m/s";
            return `<div class="font-bold border-b pb-1 mb-1" style="color:${titleColor}">Nilai Ekstrem Angin & Hujan</div>
                    <div class="text-xs py-0.5">
                      <span>${item.name}: </span>
                      <span class="font-bold text-teal-500">${item.value} ${unit}</span>
                    </div>`;
          },
        },
        grid: { left: "4%", right: "4%", top: "10%", bottom: "18%", containLabel: true },
        xAxis: {
          type: "category",
          data: categories,
          axisLabel: { color: textColor, fontSize: 10, rotate: 25 },
        },
        yAxis: {
          type: "value",
          name: "Magnitudo Ekstrem (m/s atau mm)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor },
          splitLine: { lineStyle: { color: gridColor } },
          min: 0,
        },
        series: [
          {
            name: "Magnitudo Ekstrem",
            type: "bar",
            data: vals.map((v, i) => ({
              value: v,
              itemStyle: {
                color: i >= 6 ? "#0ea5e9" : i >= 3 ? "#8b5cf6" : "#10b981",
                borderRadius: [4, 4, 0, 0],
              },
            })),
            label: {
              show: true,
              position: "top",
              formatter: "{c}",
              color: textColor,
              fontSize: 10,
              fontWeight: "bold",
            },
          },
        ],
      };
    }
  }, [era5Data, era5Percentiles, activeParam, textColor, titleColor, gridColor, tooltipBg, tooltipBorder]);

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-spin text-indigo-500" />
            <CardTitle className="text-lg">Mengambil Data Normal Klimatologis ERA5...</CardTitle>
          </div>
          <CardDescription>
            Menghubungkan ke dataset ECMWF ERA5-Land (resolusi tinggi 9 km) untuk koordinat stasiun.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[380px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Memproses agregasi normal bulanan & siklus diurnal...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!era5Data || !era5Data.monthly) {
    return (
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardContent className="p-8 text-center flex flex-col items-center justify-center">
          <Info className="h-12 w-12 text-slate-400 mb-3" />
          <h4 className="text-base font-semibold text-slate-700 dark:text-slate-200">Data Normal Klimatologis Belum Tersedia</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
            Data reanalisis ERA5 untuk koordinat ini sedang diproses atau koordinat stasiun belum terdaftar secara akurat.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Summary Metrics from ERA5
  const stats = era5Data.stats;
  const sourceModel = era5Data.sourceModel || "ECMWF ERA5-Land (9 km)";
  const annualRainSum = era5Data.monthly.rain.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* 1. Climate Normals Header & Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Normal Temperature */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-amber-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Suhu Rerata Normal</span>
              <Thermometer className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.temperature.mean.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-500">°C</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center text-blue-500 font-medium">
                <ArrowDownRight className="h-3 w-3 inline" /> Min {stats.temperature.min.toFixed(2)}°C
              </span>
              <span>•</span>
              <span className="flex items-center text-rose-500 font-medium">
                <ArrowUpRight className="h-3 w-3 inline" /> Maks {stats.temperature.max.toFixed(2)}°C
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Normal Humidity */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Kelembaban Rerata Normal</span>
              <Droplets className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.humidity.mean.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-500">%</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Rentang: {stats.humidity.min.toFixed(2)}% – {stats.humidity.max.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Normal MSL Pressure */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Tekanan MSL Normal</span>
              <Gauge className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.pressure.mean.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-500">hPa</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Deviasi Std: ±{stats.pressure.stdDev.toFixed(2)} hPa</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Normal Total Rainfall */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Total Hujan Normal Tahunan</span>
              <CloudRain className="h-4 w-4 text-teal-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {annualRainSum.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-500">mm</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Akumulasi reanalisis tahunan</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Main Climatology Chart Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Grafik Normal Klimatologis {stationName}
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                  {sourceModel}
                </Badge>
                {coordinates && (
                  <Badge variant="outline" className="text-[11px] font-mono text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                    {coordinates.lat.toFixed(4)}°, {coordinates.lng.toFixed(4)}°
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Acuan baseline normal iklim jangka panjang untuk membandingkan anomali cuaca dan variasi musiman di lokasi stasiun.
              </CardDescription>
            </div>

            {/* View Mode Switcher: 12-Month Profile vs 24-Hour Diurnal Cycle vs Rekor Ekstrem */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start lg:self-auto text-xs font-semibold flex-wrap">
              <button
                type="button"
                onClick={() => setViewMode("monthly")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition duration-150 ${
                  viewMode === "monthly"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                Profil 12-Bulan
              </button>
              <button
                type="button"
                onClick={() => setViewMode("diurnal")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition duration-150 ${
                  viewMode === "diurnal"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Siklus Diurnal (24 Jam)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("extremes")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition duration-150 ${
                  viewMode === "extremes"
                    ? "bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-red-500" />
                Rekor & Ekstrem ERA5
              </button>
            </div>
          </div>

          {/* Parameter Switcher Tabs */}
          <div className="flex items-center gap-2 pt-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Parameter:
            </span>
            <Button
              type="button"
              size="sm"
              variant={activeParam === "temperature" ? "default" : "outline"}
              onClick={() => setActiveParam("temperature")}
              className={`h-8 text-xs gap-1.5 ${
                activeParam === "temperature"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <Thermometer className="h-3.5 w-3.5" /> Suhu Udara
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeParam === "humidity" ? "default" : "outline"}
              onClick={() => setActiveParam("humidity")}
              className={`h-8 text-xs gap-1.5 ${
                activeParam === "humidity"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <Droplets className="h-3.5 w-3.5" /> Kelembaban Relatif
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeParam === "pressure" ? "default" : "outline"}
              onClick={() => setActiveParam("pressure")}
              className={`h-8 text-xs gap-1.5 ${
                activeParam === "pressure"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <Gauge className="h-3.5 w-3.5" /> Tekanan Udara
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeParam === "rainfall" ? "default" : "outline"}
              onClick={() => setActiveParam("rainfall")}
              className={`h-8 text-xs gap-1.5 ${
                activeParam === "rainfall"
                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <CloudRain className="h-3.5 w-3.5" /> {viewMode === "monthly" ? "Curah Hujan Bulanan" : viewMode === "diurnal" ? "Hujan & Angin Diurnal" : "Ekstrem Hujan & Angin"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {/* ECharts Instance */}
          <div className="w-full h-[400px]">
            <ReactECharts
              option={
                viewMode === "monthly"
                  ? monthlyChartOption
                  : viewMode === "diurnal"
                  ? diurnalChartOption
                  : extremesChartOption
              }
              style={{ height: "100%", width: "100%" }}
              notMerge={true}
              lazyUpdate={true}
            />
          </div>

          {/* Meteorological Analysis Notes or Percentile Table */}
          {viewMode === "extremes" && era5Percentiles ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Tabel Distribusi Persentil & Nilai Ekstrem ERA5
                  </h4>
                </div>
                <Badge variant="outline" className="text-[10px] bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200">
                  Ambang Batas P95 & P99 Standar WMO
                </Badge>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">Variabel Iklim</th>
                      <th className="p-2.5 text-blue-600 dark:text-blue-400">Min Absolut</th>
                      <th className="p-2.5">P5 (Sangat Rendah)</th>
                      <th className="p-2.5">P25 (Q1)</th>
                      <th className="p-2.5 font-bold text-slate-800 dark:text-slate-200">P50 (Median)</th>
                      <th className="p-2.5">P75 (Q3)</th>
                      <th className="p-2.5 text-amber-600 dark:text-amber-400">P95 (Tinggi)</th>
                      <th className="p-2.5 text-rose-600 dark:text-rose-400 font-bold">P99 (Ekstrem)</th>
                      <th className="p-2.5 text-red-600 dark:text-red-400 font-black">Maks Absolut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    <tr>
                      <td className="p-2.5 font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <Thermometer className="w-3.5 h-3.5 text-red-500" /> Suhu Udara (°C)
                      </td>
                      <td className="p-2.5 font-bold text-blue-600">{era5Percentiles.temperature.min.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.temperature.p5.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.temperature.p25.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">{era5Percentiles.temperature.p50.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.temperature.p75.toFixed(2)}</td>
                      <td className="p-2.5 text-amber-600 font-medium">{era5Percentiles.temperature.p95.toFixed(2)}</td>
                      <td className="p-2.5 text-rose-600 font-bold">{era5Percentiles.temperature.p99.toFixed(2)}</td>
                      <td className="p-2.5 text-red-600 font-black">{era5Percentiles.temperature.max.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" /> Kelembaban Relatif (%)
                      </td>
                      <td className="p-2.5 font-bold text-amber-600">{era5Percentiles.humidity.min.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.humidity.p5.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.humidity.p25.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">{era5Percentiles.humidity.p50.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.humidity.p75.toFixed(2)}</td>
                      <td className="p-2.5 font-medium">{era5Percentiles.humidity.p95.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">{era5Percentiles.humidity.p99.toFixed(2)}</td>
                      <td className="p-2.5 font-black">{era5Percentiles.humidity.max.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <Gauge className="w-3.5 h-3.5 text-pink-500" /> Tekanan MSL (hPa)
                      </td>
                      <td className="p-2.5 font-bold text-rose-600">{era5Percentiles.pressure.min.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.pressure.p5.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.pressure.p25.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">{era5Percentiles.pressure.p50.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.pressure.p75.toFixed(2)}</td>
                      <td className="p-2.5 font-medium">{era5Percentiles.pressure.p95.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">{era5Percentiles.pressure.p99.toFixed(2)}</td>
                      <td className="p-2.5 font-black">{era5Percentiles.pressure.max.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <Wind className="w-3.5 h-3.5 text-teal-500" /> Kecepatan Angin (m/s)
                      </td>
                      <td className="p-2.5">{era5Percentiles.windSpeed.min.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.windSpeed.p5.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.windSpeed.p25.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">{era5Percentiles.windSpeed.p50.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.windSpeed.p75.toFixed(2)}</td>
                      <td className="p-2.5 text-amber-600 font-medium">{era5Percentiles.windSpeed.p95.toFixed(2)}</td>
                      <td className="p-2.5 text-rose-600 font-bold">{era5Percentiles.windSpeed.p99.toFixed(2)}</td>
                      <td className="p-2.5 text-red-600 font-black">{era5Percentiles.windSpeed.max.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <Wind className="w-3.5 h-3.5 text-violet-500" /> Puncak Gust Angin (m/s)
                      </td>
                      <td className="p-2.5">{era5Percentiles.windGust.min.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.windGust.p5.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.windGust.p25.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">{era5Percentiles.windGust.p50.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.windGust.p75.toFixed(2)}</td>
                      <td className="p-2.5 text-amber-600 font-medium">{era5Percentiles.windGust.p95.toFixed(2)}</td>
                      <td className="p-2.5 text-rose-600 font-bold">{era5Percentiles.windGust.p99.toFixed(2)}</td>
                      <td className="p-2.5 text-red-600 font-black">{era5Percentiles.windGust.max.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <CloudRain className="w-3.5 h-3.5 text-sky-500" /> Curah Hujan Per Jam (mm)
                      </td>
                      <td className="p-2.5">{era5Percentiles.rain.min.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.rain.p5.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.rain.p25.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">{era5Percentiles.rain.p50.toFixed(2)}</td>
                      <td className="p-2.5">{era5Percentiles.rain.p75.toFixed(2)}</td>
                      <td className="p-2.5 text-amber-600 font-medium">{era5Percentiles.rain.p95.toFixed(2)}</td>
                      <td className="p-2.5 text-rose-600 font-bold">{era5Percentiles.rain.p99.toFixed(2)}</td>
                      <td className="p-2.5 text-red-600 font-black">{era5Percentiles.rain.max.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Explanatory note for Climatology Extremes */}
              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200/60 dark:border-red-900/30 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Konsep Ilmiah: Mengapa Analisis Klimatologi Menggunakan Skala Minimal Dasarian / Bulanan?
                  </p>
                  <p>
                    Iklim didefinisikan oleh WMO sebagai sintesis statistik jangka panjang kondisi atmosfer. Variasi skala harian merupakan fluktuasi cuaca sesaat (noise). Analisis iklim ekstrem menggunakan batas persentil (P95 atau P99) yang dihitung dari agregasi Dasarian (10 hari), Bulanan, atau Tahunan guna mengidentifikasi anomali cuaca yang persisten, gelombang panas (heatwaves), atau kekeringan berkepanjangan (CDD).
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {viewMode === "monthly" ? (
                  <>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Interpretasi Siklus Iklim Tahunan (Normal Bulanan)
                    </p>
                    <p>
                      Grafik profil 12-bulan memperlihatkan pola musiman rata-rata di wilayah stasiun. Garis tebal merupakan nilai rata-rata iklim ERA5, sedangkan garis putus-putus menggambarkan variasi batas ekstrem maksimum dan minimum. {stationMonthlyAverages?.temps && stationMonthlyAverages.temps.some(v => v !== null) && "Titik berbentuk diamond menunjukkan data aktual pengamatan stasiun untuk memverifikasi kesesuaian sensor dengan baseline klimatologi."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Interpretasi Dinamika Siklus Diurnal (24-Jam WIB)
                    </p>
                    <p>
                      Siklus diurnal memetakan ritme harian atmosfer: suhu mencapai titik terendah sesaat sebelum fajar (05:00–06:00 WIB) dan mencapai puncak tertinggi pada tengah hari (13:00–14:00 WIB). Kelembaban relatif bergerak invers (berlawanan arah) terhadap fluktuasi suhu.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
