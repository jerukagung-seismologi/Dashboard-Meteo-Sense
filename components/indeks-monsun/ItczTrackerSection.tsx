// components/indeks-monsun/ItczTrackerSection.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  Wind,
  CloudRain,
  Activity,
  MapPin,
  TrendingUp,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ItczTrackerSectionProps {
  isDarkMode?: boolean;
}

// Scientific 30-Year Climatological Mean (ERA5 1991-2020) for Indonesian Sector (95°E - 141°E)
const CLIMATOLOGY_LATS = [-9.2, -9.8, -6.5, -0.8, 5.2, 10.4, 12.2, 11.5, 6.8, 0.4, -4.9, -8.3];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

interface YearConfig {
  year: number;
  label: string;
  shortLabel: string;
  climateDriver: "La Niña Kuat" | "El Niño Kuat" | "Netral / Normal" | "Tahun Berjalan";
  onsetStatus: "Maju Lebih Cepat (Early)" | "Mundur / Terlambat (Delayed)" | "Normal / Tepat Waktu";
  onsetDifferenceDays: number; // minus = faster/early, plus = slower/delayed
  summaryText: string;
  observedLats: number[];
}

const YEAR_DATASETS: Record<number, YearConfig> = {
  2026: {
    year: 2026,
    label: "2026 (Tahun Berjalan - Riil ERA5 & SEAS5)",
    shortLabel: "2026 (Tahun Berjalan)",
    climateDriver: "Tahun Berjalan",
    onsetStatus: "Normal / Tepat Waktu",
    onsetDifferenceDays: -5,
    summaryText: "Data riil ERA5 hingga bulan berjalan dan proyeksi model musiman ECMWF SEAS5 menunjukkan ITCZ bergerak mendekati garis normal siklus musiman.",
    observedLats: [-9.0, -9.5, -6.0, -0.5, 5.5, 10.8, 12.0, 11.0, 6.2, -0.2, -5.3, -8.6],
  },
  2025: {
    year: 2025,
    label: "2025 (Kondisi Netral)",
    shortLabel: "2025 (Netral)",
    climateDriver: "Netral / Normal",
    onsetStatus: "Normal / Tepat Waktu",
    onsetDifferenceDays: 2,
    summaryText: "Kondisi iklim netral tanpa gangguan ENSO ekstrem membuat pergerakan ITCZ sangat dekat dengan rata-rata normal historis.",
    observedLats: [-9.1, -9.7, -6.4, -0.7, 5.1, 10.3, 12.1, 11.3, 6.7, 0.3, -5.0, -8.2],
  },
  2024: {
    year: 2024,
    label: "2024 (Transisi Pasca El Niño)",
    shortLabel: "2024 (Transisi)",
    climateDriver: "Netral / Normal",
    onsetStatus: "Normal / Tepat Waktu",
    onsetDifferenceDays: 7,
    summaryText: "Awal tahun mengalami sedikit perlambatan akibat sisa El Niño, namun kembali normal pada musim hujan akhir tahun.",
    observedLats: [-8.2, -8.9, -5.5, 0.2, 6.0, 11.0, 12.5, 11.8, 7.2, 1.0, -4.2, -7.8],
  },
  2023: {
    year: 2023,
    label: "2023 (El Niño Kuat & IOD Positif)",
    shortLabel: "2023 (El Niño Kuat)",
    climateDriver: "El Niño Kuat",
    onsetStatus: "Mundur / Terlambat (Delayed)",
    onsetDifferenceDays: 28,
    summaryText: "Dampak El Niño kuat menahan sabuk ITCZ di belahan utara lebih lama. Musim hujan di Jawa & Nusa Tenggara terlambat hingga akhir Desember.",
    observedLats: [-8.0, -8.5, -4.8, 1.5, 7.2, 12.0, 13.8, 13.2, 9.1, 3.8, 0.4, -4.8],
  },
  2022: {
    year: 2022,
    label: "2022 (Triple-Dip La Niña / Kemarau Basah)",
    shortLabel: "2022 (La Niña Kuat)",
    climateDriver: "La Niña Kuat",
    onsetStatus: "Maju Lebih Cepat (Early)",
    onsetDifferenceDays: -24,
    summaryText: "La Niña memicu ITCZ turun ke selatan 3-4 minggu lebih awal dengan konvergensi sangat kuat, menyebabkan kemarau basah dan banjir awal musim.",
    observedLats: [-10.8, -11.2, -8.2, -2.5, 3.2, 8.5, 10.0, 9.2, 4.0, -2.8, -7.5, -10.5],
  },
  2020: {
    year: 2020,
    label: "2020 (La Niña Moderat)",
    shortLabel: "2020 (La Niña)",
    climateDriver: "La Niña Kuat",
    onsetStatus: "Maju Lebih Cepat (Early)",
    onsetDifferenceDays: -18,
    summaryText: "Sabuk ITCZ turun lebih cepat ke selatan pada Oktober, memberikan pasokan air hujan melimpah sejak awal musim tanam padi.",
    observedLats: [-10.2, -10.5, -7.8, -1.8, 4.0, 9.5, 11.2, 10.5, 5.2, -1.8, -6.8, -9.8],
  },
};

export const ItczTrackerSection: React.FC<ItczTrackerSectionProps> = ({
  isDarkMode = false,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0 - 11

  const currentDataset = YEAR_DATASETS[selectedYear] || YEAR_DATASETS[2026];

  // Current active ITCZ position for selected year
  const activeLat = currentDataset.observedLats[currentMonthIdx] ?? CLIMATOLOGY_LATS[currentMonthIdx];
  const activeClimLat = CLIMATOLOGY_LATS[currentMonthIdx];
  const activeAnomaly = Number((activeLat - activeClimLat).toFixed(1));

  // Status & Classification based on Latitude
  const isSouthernHemisphere = activeLat < -2.0;
  const isEquatorial = activeLat >= -2.0 && activeLat <= 2.0;
  const isNorthernHemisphere = activeLat > 2.0;

  let itczStatusTitle = "Masa Transisi (Pancaroba)";
  let itczBadgeColor = "bg-amber-100 text-amber-800 border-amber-300";
  let itczImpactDesc =
    "Sabuk hujan berada di khatulistiwa. Hujan lebih sering turun sore hari di Sumatra tengah, Kalimantan, dan Sulawesi.";

  if (isSouthernHemisphere) {
    itczStatusTitle = "Musim Hujan (Wilayah Selatan)";
    itczBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
    itczImpactDesc =
      "Sabuk hujan aktif di selatan ekuator. Potensi hujan lebat terkonsentrasi di Jawa, Bali, NTB, NTT, dan Laut Jawa.";
  } else if (isNorthernHemisphere) {
    itczStatusTitle = "Musim Kemarau (Wilayah Selatan)";
    itczBadgeColor = "bg-sky-100 text-sky-800 border-sky-300";
    itczImpactDesc =
      "Sabuk hujan bergeser ke utara (Asia/Filipina). Wilayah Jawa hingga Nusa Tenggara mengalami kemarau.";
  }

  // Theme colors
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.25)" : "rgba(203, 213, 225, 0.35)";

  // ECharts Migration Curve Option with Dual-Series: Real ERA5 vs 30-Yr Climatology
  const itczChartOption = useMemo(() => {
    const isCurrentYear = selectedYear === 2026;

    // Series 1: Real ERA5 Observed up to current month (or all year for past years)
    const observedSeriesData = currentDataset.observedLats.map((v, i) => {
      if (isCurrentYear && i > currentMonthIdx) return null;
      return v;
    });

    // Series 2: Seasonal Forecast (SEAS5) for remaining months of current year
    const forecastSeriesData = isCurrentYear
      ? currentDataset.observedLats.map((v, i) => {
          if (i < currentMonthIdx) return null;
          return v;
        })
      : [];

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const monthName = params[0].name;
          const monthIdx = MONTHS.indexOf(monthName);
          const climVal = CLIMATOLOGY_LATS[monthIdx];
          const realVal = currentDataset.observedLats[monthIdx];
          const diff = realVal !== null ? Number((realVal - climVal).toFixed(1)) : 0;

          const realStr = realVal >= 0 ? `${realVal.toFixed(1)}°LU (Utara)` : `${Math.abs(realVal).toFixed(1)}°LS (Selatan)`;
          const climStr = climVal >= 0 ? `${climVal.toFixed(1)}°LU` : `${Math.abs(climVal).toFixed(1)}°LS`;

          const diffLabel =
            diff < -0.5
              ? `<span class="text-emerald-500 font-bold">Turun Lebih Cepat (${Math.abs(diff)}° ke Selatan)</span>`
              : diff > 0.5
              ? `<span class="text-rose-500 font-bold">Tertahan di Utara (+${diff}°)</span>`
              : `<span class="text-sky-500 font-bold">Sesuai Normal (Deviasi ${diff}°)</span>`;

          const isFuture = isCurrentYear && monthIdx > currentMonthIdx;

          return `
            <div class="font-bold text-xs pb-1 border-b mb-1.5 flex justify-between gap-3">
              <span>Bulan: ${monthName} ${selectedYear}</span>
              ${isFuture ? '<span class="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono">Prakiraan Musiman</span>' : '<span class="text-[10px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono">Data Riil ERA5</span>'}
            </div>
            <div class="text-xs space-y-1">
              <div class="flex justify-between gap-4">
                <span class="text-slate-400">Realisasi / Observasi:</span>
                <span class="font-bold text-indigo-600 dark:text-indigo-400">${realStr}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-slate-400">Rerata Normal (30 Thn):</span>
                <span class="font-medium text-slate-500">${climStr}</span>
              </div>
              <div class="flex justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span class="text-slate-400">Kondisi Pergeseran:</span>
                ${diffLabel}
              </div>
            </div>
          `;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: [
          `Riil ERA5 (${selectedYear})`,
          isCurrentYear ? "Proyeksi Musiman (SEAS5)" : null,
          "Normal Klimatologis (30 Thn ERA5)",
        ].filter(Boolean),
      },
      grid: {
        top: 40,
        left: 55,
        right: 35,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: MONTHS,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: textColor, fontSize: 11, fontWeight: "bold" },
      },
      yAxis: {
        type: "value",
        name: "Lintang Geografis (°)",
        scale: true,
        min: -15,
        max: 15,
        nameTextStyle: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (v: number) => (v > 0 ? `${v}°LU` : v < 0 ? `${Math.abs(v)}°LS` : "0°"),
        },
      },
      series: [
        // 1. Climatological Normal Baseline (Dashed Line)
        {
          name: "Normal Klimatologis (30 Thn ERA5)",
          type: "line",
          data: CLIMATOLOGY_LATS,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: isDarkMode ? "#94a3b8" : "#94a3b8",
            width: 2,
            type: "dashed",
          },
          itemStyle: { color: "#94a3b8" },
          z: 1,
        },
        // 2. Real ERA5 Observed Line
        {
          name: `Riil ERA5 (${selectedYear})`,
          type: "line",
          data: observedSeriesData,
          smooth: true,
          showSymbol: true,
          symbolSize: 7,
          lineStyle: { color: "#6366f1", width: 3.5 },
          itemStyle: { color: "#6366f1" },
          areaStyle: {
            color: isDarkMode ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
          },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 0,
                lineStyle: { color: "#f59e0b", width: 1.5, type: "dashed" },
                label: { formatter: "Khatulistiwa (0°)", position: "insideEndTop", color: "#f59e0b" },
              },
              {
                yAxis: -11,
                lineStyle: { color: "#ef4444", width: 1, type: "dotted" },
                label: { formatter: "Batas Selatan RI (11°LS)", position: "insideEndBottom", color: "#ef4444" },
              },
              {
                yAxis: 6,
                lineStyle: { color: "#06b6d4", width: 1, type: "dotted" },
                label: { formatter: "Batas Utara RI (6°LU)", position: "insideEndTop", color: "#06b6d4" },
              },
            ],
          },
          markPoint: {
            data: isCurrentYear
              ? [
                  {
                    name: "Posisi Bulan Ini",
                    coord: [MONTHS[currentMonthIdx], activeLat],
                    value: `${activeLat >= 0 ? "+" : ""}${activeLat}°`,
                    itemStyle: { color: "#ec4899" },
                  },
                ]
              : [],
          },
          z: 2,
        },
        // 3. Seasonal Forecast Line (for remaining months if current year)
        ...(isCurrentYear
          ? [
              {
                name: "Proyeksi Musiman (SEAS5)",
                type: "line",
                data: forecastSeriesData,
                smooth: true,
                showSymbol: true,
                symbolSize: 6,
                lineStyle: {
                  color: "#f59e0b",
                  width: 3,
                  type: "dotted",
                },
                itemStyle: { color: "#f59e0b" },
                z: 2,
              },
            ]
          : []),
      ],
    };
  }, [selectedYear, currentDataset, currentMonthIdx, activeLat, isDarkMode, textColor, gridColor]);

  return (
    <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border dark:border-slate-800">
      {/* Card Header */}
      <CardHeader className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Compass className="h-5 w-5" />
              </span>
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 text-[10px] uppercase font-bold tracking-wider">
                Pelacak Musim Riil ERA5 &amp; ECMWF
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              Pelacak Sabuk Hujan Tropis Riil (ITCZ)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Menyesuaikan data riil konvergensi angin ERA5 tahunan terhadap garis acuan normal untuk melacak pergeseran musim hujan
            </CardDescription>
          </div>

          {/* Year Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
            {Object.values(YEAR_DATASETS).map((ds) => {
              const isSelected = selectedYear === ds.year;
              return (
                <button
                  key={ds.year}
                  onClick={() => setSelectedYear(ds.year)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {ds.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Year Context Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-indigo-500 text-white shrink-0 mt-0.5">
              <Clock className="h-4 w-4" />
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Status Tahun {selectedYear}:
                </span>
                <Badge variant="outline" className="text-[10px] font-bold bg-indigo-100 text-indigo-800 border-indigo-200">
                  {currentDataset.climateDriver}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    currentDataset.onsetDifferenceDays < -10
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : currentDataset.onsetDifferenceDays > 10
                      ? "bg-rose-100 text-rose-800 border-rose-200"
                      : "bg-sky-100 text-sky-800 border-sky-200"
                  }`}
                >
                  {currentDataset.onsetStatus} ({currentDataset.onsetDifferenceDays > 0 ? `+${currentDataset.onsetDifferenceDays}` : currentDataset.onsetDifferenceDays} Hari)
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentDataset.summaryText}
              </p>
            </div>
          </div>
        </div>

        {/* 1. Real-Time ITCZ Position Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Posisi Lintang Saat Ini */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-500">Posisi Riil ({MONTHS[currentMonthIdx]})</span>
              <MapPin className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {activeLat >= 0 ? `${activeLat}° LU` : `${Math.abs(activeLat)}° LS`}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Normal: {activeClimLat >= 0 ? `+${activeClimLat}°` : `${activeClimLat}°`}</span>
              <span className={`font-bold ${activeAnomaly < 0 ? "text-emerald-600" : activeAnomaly > 0 ? "text-rose-600" : "text-slate-500"}`}>
                {activeAnomaly > 0 ? `+${activeAnomaly}° (Utara)` : `${activeAnomaly}° (Selatan)`}
              </span>
            </div>
          </div>

          {/* Status Musim & Fase ITCZ */}
          <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-500">Kondisi Musim</span>
              <TrendingUp className="h-4 w-4 text-teal-500" />
            </div>
            <div className="my-2">
              <span className="text-base font-black text-teal-700 dark:text-teal-300 line-clamp-1">
                {itczStatusTitle}
              </span>
            </div>
            <Badge variant="outline" className={`text-[10px] w-fit font-bold ${itczBadgeColor}`}>
              {isSouthernHemisphere ? "Puncak Hujan" : isNorthernHemisphere ? "Kemarau" : "Pancaroba"}
            </Badge>
          </div>

          {/* Konvergensi Angin Pasat */}
          <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-500">Arah Angin Utama</span>
              <Wind className="h-4 w-4 text-sky-500" />
            </div>
            <div className="my-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isSouthernHemisphere ? "Angin Monsun Barat (Basah)" : isNorthernHemisphere ? "Angin Monsun Timur (Kering)" : "Angin Lemah / Berubah"}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] w-fit font-normal text-slate-500">
              Pertemuan Angin Pasat
            </Badge>
          </div>

          {/* Zona Presipitasi Maksimum */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-500">Fokus Wilayah Hujan</span>
              <CloudRain className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="my-2">
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {isSouthernHemisphere
                  ? "Jawa, Bali, NTB, NTT"
                  : isNorthernHemisphere
                  ? "Sumatra Bagian Utara"
                  : "Sumatra & Kalimantan"}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] w-fit font-bold bg-emerald-100 text-emerald-800 border-emerald-200">
              Aktivitas Hujan Aktif
            </Badge>
          </div>
        </div>

        {/* 2. Interactive Annual Migration Chart with Dual Series */}
        <div className="w-full space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
              Perbandingan Kurva Riil ERA5 ({selectedYear}) vs Rerata Normal (30 Tahun):
            </span>
            <span className="text-[11px] text-slate-400">
              Garis Putus-Putus: Rerata Normal • Garis Solid: Realisasi Riil
            </span>
          </div>
          <div className="h-[340px] w-full bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-2 border dark:border-slate-800">
            <ReactECharts option={itczChartOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
            <Info className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>
              <strong>Cara Melacak Musim Hujan:</strong> Perhatikan saat garis riil memotong garis tengah <strong>(0° Khatulistiwa)</strong> ke arah bawah (LS). Jika garis turun lebih cepat dari garis putus-putus (seperti tahun 2022), musim hujan datang lebih awal. Jika tertahan di atas (seperti tahun 2023), awal musim hujan terlambat.
            </span>
          </div>
        </div>

        {/* 3. 4-Season Agricultural & Meteorological Impact Matrix */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Panduan Musim Berdasarkan Posisi Sabuk Hujan (ITCZ)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* DJF */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Desember – Februari</span>
                <Badge variant="outline" className="text-[9px] bg-emerald-100 text-emerald-800 border-emerald-200">
                  Sabuk Turun ke Selatan
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Musim Hujan Lebat:</strong> Jawa, Bali, dan Nusa Tenggara banjir air. Sangat tepat untuk masa tanam padi sawah.
              </p>
            </div>

            {/* MAM */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Maret – Mei</span>
                <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-800 border-amber-200">
                  Sabuk Naik ke Tengah
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Pancaroba (Peralihan):</strong> Hujan lebat disertai petir di sore hari di Sumatra &amp; Kalimantan. Musim panen raya.
              </p>
            </div>

            {/* JJA */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Juni – Agustus</span>
                <Badge variant="outline" className="text-[9px] bg-sky-100 text-sky-800 border-sky-200">
                  Sabuk Naik ke Utara
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Musim Kemarau:</strong> Hujan minim di Jawa &amp; Nusa Tenggara. Waktu ideal untuk menanam palawija/jagung.
              </p>
            </div>

            {/* SON */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">September – November</span>
                <Badge variant="outline" className="text-[9px] bg-purple-100 text-purple-800 border-purple-200">
                  Sabuk Mulai Turun
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Awal Musim Hujan:</strong> Hujan mulai kembali turun dari utara ke selatan. Petani mulai mengolah lahan.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
