// components/agromet/MonsoonAgrometSection.tsx
"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wind,
  Compass,
  TrendingUp,
  Sprout,
  CloudRain,
  Sun,
  Activity,
  AlertTriangle,
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { MonsoonData } from "@/lib/climate-drivers/types";
import { getMonsoonData } from "@/lib/climate-drivers/climateData";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MonsoonAgrometSectionProps {
  isDarkMode?: boolean;
}

const REGIONS = [
  { id: "central", name: "🇮🇩 Zona Tengah (Laut Jawa - Bali - NTB)", lat: -5.0, lon: 115.0 },
  { id: "west", name: "🌴 Zona Barat (Selat Karimata - Sumatra - Kalimantan)", lat: -2.0, lon: 108.0 },
  { id: "east", name: "🌊 Zona Timur (Laut Banda - NTT - Maluku)", lat: -6.5, lon: 128.0 },
];

export const MonsoonAgrometSection: React.FC<MonsoonAgrometSectionProps> = ({
  isDarkMode = false,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>("central");

  const activeRegion = REGIONS.find((r) => r.id === selectedRegionId) || REGIONS[0];

  const { data: monsoonApiData, isLoading } = useSWR<MonsoonData>(
    `/api/climate-drivers/monsoon?lat=${activeRegion.lat}&lon=${activeRegion.lon}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const data = monsoonApiData && !("error" in monsoonApiData) ? monsoonApiData : getMonsoonData();

  // Combine historical and 16-day forecast
  const timelineData = useMemo(() => {
    if (!data) return { dates: [], uValues: [], colors: [], statusList: [], combined: [] };

    const map = new Map<string, typeof data.historical[0]>();
    data.historical?.forEach((p) => map.set(p.date, p));
    data.forecast16Days?.forEach((p) => map.set(p.date, p));

    const combined = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

    const dates = combined.map((p) => p.date);
    const uValues = combined.map((p) => p.zonalWind);
    const colors = combined.map((p) =>
      p.zonalWind > 2.0 ? "#06b6d4" : p.zonalWind < -2.0 ? "#f59e0b" : "#94a3b8"
    );
    const statusList = combined.map((p) => p.status);

    return { dates, uValues, colors, statusList, combined };
  }, [data]);

  // ECharts Daily Zonal Wind Timeline
  const dailyChartOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          const item = timelineData.combined[idx];
          if (!item) return "";
          return `
            <div class="font-bold text-sm mb-1">${item.date}</div>
            <div class="text-xs space-y-1">
              <div>Status: <b>${item.status}</b></div>
              <div>Angin Zonal (U): <b>${item.zonalWind > 0 ? "+" : ""}${item.zonalWind} m/s</b></div>
              <div>Kecepatan: <b>${item.windSpeedMs} m/s (${item.windSpeed} km/j)</b></div>
              <div>Arah Angin: <b>${item.windDirection}°</b></div>
            </div>
          `;
        },
      },
      grid: {
        top: 35,
        left: 50,
        right: 20,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: timelineData.dates,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          formatter: (val: string) => val.substring(5),
        },
      },
      yAxis: {
        type: "value",
        name: "Zonal U (m/s)",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
      },
      series: [
        {
          name: "Angin Zonal U",
          type: "bar",
          data: timelineData.uValues.map((v, i) => ({
            value: v,
            itemStyle: {
              color: timelineData.colors[i],
              borderRadius: v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
          markLine: {
            symbol: "none",
            data: [
              {
                yAxis: 2.0,
                lineStyle: { color: "#06b6d4", type: "dashed", width: 1.5 },
                label: { formatter: "Monsun Barat / Hujan (+2 m/s)", position: "insideEndTop", color: "#06b6d4", fontSize: 9 },
              },
              {
                yAxis: 0,
                lineStyle: { color: isDarkMode ? "#64748b" : "#94a3b8", type: "solid", width: 1 },
                label: { formatter: "Garis Netral", position: "insideEndTop", color: isDarkMode ? "#64748b" : "#94a3b8", fontSize: 9 },
              },
              {
                yAxis: -2.0,
                lineStyle: { color: "#f59e0b", type: "dashed", width: 1.5 },
                label: { formatter: "Monsun Timur / Kemarau (-2 m/s)", position: "insideEndBottom", color: "#f59e0b", fontSize: 9 },
              },
            ],
          },
        },
      ],
    };
  }, [timelineData, isDarkMode]);

  // ECharts Seasonal Progression Option
  const seasonalChartOption = useMemo(() => {
    if (!data.seasonalForecast || data.seasonalForecast.length === 0) return {};

    const labels = data.seasonalForecast.map((m) => m.label);
    const uVals = data.seasonalForecast.map((m) => m.meanZonalWind);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: { color: isDarkMode ? "#f8fafc" : "#0f172a", fontSize: 12 },
      },
      grid: {
        top: 35,
        left: 50,
        right: 20,
        bottom: 35,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#cbd5e1" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        name: "Mean Zonal U (m/s)",
        nameTextStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1e293b" : "#f1f5f9" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
      },
      series: [
        {
          name: "Proyeksi Angin Zonal",
          type: "line",
          data: uVals,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          itemStyle: {
            color: (params: any) => (params.value > 2.0 ? "#06b6d4" : params.value < -2.0 ? "#f59e0b" : "#94a3b8"),
          },
          lineStyle: { color: "#10b981", width: 3 },
          areaStyle: {
            color: isDarkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.10)",
          },
          markLine: {
            symbol: "none",
            data: [
              { yAxis: 2.0, lineStyle: { color: "#06b6d4", type: "dashed" } },
              { yAxis: -2.0, lineStyle: { color: "#f59e0b", type: "dashed" } },
            ],
          },
        },
      ],
    };
  }, [data.seasonalForecast, isDarkMode]);

  // Crop Calendar Recommendation based on current monsoon status
  const cropAdvice = useMemo(() => {
    if (data.currentZonalWind < -2.0) {
      return {
        phaseTitle: "Musim Kemarau (Monsun Timur Aktif)",
        colorBadge: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300",
        pranataMangsa: "Mangsa Kasa / Karo / Katiga",
        cropType: "Palawija, Jagung, Kedelai, Kacang Tanah, Tembakau",
        actionGuidance: "Prioritaskan efisiensi irigasi berkala, kurangi genangan sawah padi, optimalkan mulsa untuk menekan laju evapotranspirasi tanah.",
        riskAlert: "Kekurangan pasokan air irigasi, potensi penurunan muka air tanah, dan cuaca terik kering.",
      };
    } else if (data.currentZonalWind > 2.0) {
      return {
        phaseTitle: "Musim Hujan (Monsun Barat Aktif)",
        colorBadge: "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-300",
        pranataMangsa: "Mangsa Kanem / Kapitu / Kawalu (Rendeng)",
        cropType: "Padi Sawah (Musim Tanam Utama MT-1), Sayuran Dataran Tinggi",
        actionGuidance: "Waktu ideal untuk tanam serentak padi sawah, optimalkan penampungan air embung, dan siapkan saluran pembuangan (drainase) lahan.",
        riskAlert: "Risiko banjir lahan pertanian, serangan hama wereng/jamur kelembapan tinggi, dan erosi lapisan hara tanah atas.",
      };
    } else {
      return {
        phaseTitle: "Masa Peralihan / Pancaroba",
        colorBadge: "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300",
        pranataMangsa: "Mangsa Kalima / Kasanga (Labuh / Mareng)",
        cropType: "Pengolahan Tanah, Pembibitan, Pergiliran Tanaman Palawija-Padi",
        actionGuidance: "Lakukan perbaikan pematang sawah dan sanitasi lahan menjelang awal musim baru. Tunda pemupukan terbuka saat potensi badai petir sore hari.",
        riskAlert: "Cuaca ekstrem lokal mendadak, angin kencang puting beliung, dan hujan es singkat.",
      };
    }
  }, [data.currentZonalWind]);

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white overflow-hidden">
      <CardHeader className="pb-4 border-b dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Wind className="h-5 w-5 text-emerald-500" /> Analisis Monsun &amp; Kalender Pola Tanam Agrometeorologi
              </CardTitle>
              <Badge className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold">
                Agrometeorology Monsoon Engine
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Pemantauan sirkulasi angin monsun Asia-Australia, penentuan onset awal musim tanam, dan panduan budidaya pertanian
            </CardDescription>
          </div>

          {/* Regional Zone Selector */}
          <div className="flex items-center gap-2">
            <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
              <SelectTrigger className="w-[260px] text-xs h-9 font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Pilih Zona Pantau Monsun" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* Agrometeorological Action Banner */}
        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50/60 dark:from-emerald-950/30 dark:via-slate-900/40 dark:to-slate-950/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 dark:border-emerald-900/40 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Sprout className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Status Siklus Tanam Agrometeorologi:
              </span>
              <Badge variant="outline" className={`text-xs font-bold ${cropAdvice.colorBadge}`}>
                {cropAdvice.phaseTitle}
              </Badge>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Konsep Tradisional: <b className="text-slate-700 dark:text-slate-300">{cropAdvice.pranataMangsa}</b>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Sprout className="h-3.5 w-3.5" /> Rekomendasi Komoditas:
              </span>
              <p className="text-slate-700 dark:text-slate-200 font-medium">
                {cropAdvice.cropType}
              </p>
            </div>

            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <CloudRain className="h-3.5 w-3.5" /> Tindakan Agronomi Lahan:
              </span>
              <p className="text-slate-700 dark:text-slate-200">
                {cropAdvice.actionGuidance}
              </p>
            </div>

            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Antisipasi Risiko Iklim:
              </span>
              <p className="text-slate-700 dark:text-slate-200">
                {cropAdvice.riskAlert}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Zonal Wind 30-Day History & 16-Day Forecast */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-500" /> Deret Waktu Angin Zonal Harian (U) &amp; Indikator Musim
                </h4>
                <p className="text-[11px] text-slate-500">Histori 30 hari &amp; prakiraan 16 hari ({activeRegion.name})</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 font-bold">Barat (Hujan)</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Timur (Kemarau)</span>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ReactECharts option={dailyChartOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </div>

          {/* Seasonal 7-Month Progression */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Proyeksi Transisi 7 Bulan (SEAS5)
              </h4>
              <p className="text-[11px] text-slate-500">Prakiraan awal masuk musim hujan/kemarau</p>
            </div>
            <div className="h-[280px] w-full">
              <ReactECharts option={seasonalChartOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </div>
        </div>

        {/* Deep Scientific Agromet Explainer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <HelpCircle className="h-4 w-4 text-emerald-500" /> Kriteria Awal Musim (Onset) BMKG
            </div>
            <p>
              Awal Musim Hujan (AMH) ditetapkan apabila jumlah curah hujan dalam satu <strong>dasarian (10 hari) ≥ 50 mm</strong> dan diikuti oleh 2 dasarian berikutnya, disertai dengan aktifnya angin baratan (U &gt; 0).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Wind className="h-4 w-4 text-blue-500" /> Seruakan Dingin (Cold Surge)
            </div>
            <p>
              Lonjakan massa udara dingin berkecepatan tinggi dari Siberia/Asia Timur yang menyeberangi Laut Cina Selatan menuju Indonesia barat, sering memicu hujan lebat berhari-hari pada puncak musim hujan (Desember–Januari).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Compass className="h-4 w-4 text-indigo-500" /> Pergeseran ITCZ Ekuatorial
            </div>
            <p>
              Zona Konvergensi Antar-Tropis (ITCZ) bergerak mengikuti peredaran semu matahari. Saat ITCZ berada di selatan ekuator (Desember–Februari), konveksi hujan memuncak di Jawa, Bali, NTB, dan NTT.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
