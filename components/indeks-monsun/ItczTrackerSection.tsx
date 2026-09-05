// components/indeks-monsun/ItczTrackerSection.tsx
"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";

interface ItczTrackerSectionProps {
  isDarkMode?: boolean;
}

export const ItczTrackerSection: React.FC<ItczTrackerSectionProps> = ({
  isDarkMode = false,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // Date and Day of Year calculation
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Scientific ITCZ Mean Latitude Formula for Maritime Continent / Indonesian Sector:
  // Lat(t) = 1.0 + 11.5 * sin(2*pi*(DOY - 105)/365.25)
  const calculateItczLat = (doy: number) => {
    return Number((1.0 + 11.5 * Math.sin((2 * Math.PI * (doy - 105)) / 365.25)).toFixed(1));
  };

  const currentItczLat = calculateItczLat(dayOfYear);

  // Status & Classification based on Latitude
  const isSouthernHemisphere = currentItczLat < -2.0;
  const isEquatorial = currentItczLat >= -2.0 && currentItczLat <= 2.0;
  const isNorthernHemisphere = currentItczLat > 2.0;

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

  // Monthly Climatological Migration Curve (12 Months)
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  // Mid-month day of year approx: 15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349
  const midMonthDoys = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
  const monthlyLats = midMonthDoys.map((d) => calculateItczLat(d));

  // High-resolution 365-day migration series
  const fullYearDoys = Array.from({ length: 365 }, (_, i) => i + 1);
  const fullYearLats = fullYearDoys.map((d) => calculateItczLat(d));

  // Theme colors
  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.25)" : "rgba(203, 213, 225, 0.35)";

  // ECharts Migration Curve Option
  const itczChartOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const p = params[0];
          const latVal = Number(p.value);
          const latStr = latVal >= 0 ? `${latVal.toFixed(1)}°LU (Utara)` : `${Math.abs(latVal).toFixed(1)}°LS (Selatan)`;
          return `
            <div class="font-bold text-xs pb-1 border-b mb-1">Bulan: ${p.name}</div>
            <div class="text-xs space-y-1">
              <div class="flex justify-between gap-4">
                <span class="text-indigo-500 font-bold">Lintang ITCZ Rerata:</span>
                <span class="font-bold">${latStr}</span>
              </div>
              <div class="text-[11px] text-slate-400">
                ${
                  latVal < -2
                    ? "Wilayah Hujan: Jawa, Bali, NTB, NTT"
                    : latVal > 2
                    ? "Wilayah Hujan: Filipina & Asia Tenggara Daratan"
                    : "Wilayah Hujan: Ekuator (Sumatra, Kalimantan, Sulawesi)"
                }
              </div>
            </div>
          `;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: textColor, fontSize: 11 },
        data: ["Posisi Sabuk ITCZ", "Garis Khatulistiwa (0°)"],
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
        data: months,
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
        {
          name: "Posisi Sabuk ITCZ",
          type: "line",
          data: monthlyLats,
          smooth: true,
          showSymbol: true,
          symbolSize: 8,
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
            data: [
              {
                name: "Posisi Bulan Ini",
                coord: [months[now.getMonth()], currentItczLat],
                value: `${currentItczLat >= 0 ? "+" : ""}${currentItczLat}°`,
                itemStyle: { color: "#ec4899" },
              },
            ],
          },
        },
      ],
    };
  }, [months, monthlyLats, currentItczLat, now, isDarkMode, textColor, gridColor]);

  return (
    <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border dark:border-slate-800">
      {/* Card Header */}
      <CardHeader className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Compass className="h-5 w-5" />
              </span>
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 text-[10px] uppercase font-bold tracking-wider">
                Sirkulasi Ekuatorial Global
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              Pelacak Sabuk Hujan Tropis (ITCZ)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Pantauan pergerakan sabuk pembawa hujan tropis dan dampaknya terhadap musim di Indonesia
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-2xl border dark:border-slate-700 text-xs">
            <Calendar className="h-4 w-4 text-indigo-500" />
            <span className="text-slate-500">Bulan Ini:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{months[now.getMonth()]}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* 1. Real-Time ITCZ Position Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Posisi Lintang Saat Ini */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-500">Posisi Sabuk Hujan</span>
              <MapPin className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {currentItczLat >= 0 ? `${currentItczLat}° LU` : `${Math.abs(currentItczLat)}° LS`}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] w-fit font-bold bg-indigo-100 text-indigo-800 border-indigo-200">
              {currentItczLat < 0 ? "Di Selatan Khatulistiwa" : "Di Utara Khatulistiwa"}
            </Badge>
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

        {/* 2. Interactive Annual Migration Chart */}
        <div className="w-full space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
              Grafik Naik-Turun Sabuk Hujan Tahunan:
            </span>
            <span className="text-[11px] text-slate-400">
              Titik Merah Muda: Posisi Saat Ini
            </span>
          </div>
          <div className="h-[340px] w-full bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-2 border dark:border-slate-800">
            <ReactECharts option={itczChartOption} notMerge={true} lazyUpdate={true} style={{ height: "100%", width: "100%" }} />
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
            <Info className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>
              <strong>Cara Membaca:</strong> Saat garis berada di <strong>bawah (LS)</strong>, wilayah Jawa–Nusa Tenggara sedang musim hujan. Saat garis naik ke <strong>atas (LU)</strong>, wilayah selatan mengalami musim kemarau.
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
