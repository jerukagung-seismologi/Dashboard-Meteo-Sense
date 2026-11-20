// components/climatology/DesignRainfallSection.tsx
"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import ReactECharts from "echarts-for-react";
import {
  CloudRain,
  Download,
  Printer,
  Sparkles,
  Layers,
  MapPin,
  TrendingUp,
  Info,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  analyzeDesignRainfall,
  getStationHHMTSeries,
  DistributionType,
  AnnualMaximumRainfallItem,
  DesignRainfallAnalysis,
} from "@/lib/climatology/designRainfall";
import {
  computeThiessenArealRainfall,
  getDefaultKebumenThiessenInputs,
  ThiessenStationInput,
  ThiessenAnalysisResult,
} from "@/lib/climatology/thiessenPolygon";
import { KEBUMEN_DEFAULT_STATIONS } from "@/lib/data/kebumenStations";
import { generateCanvasFromDOM, exportAsPNG, exportAsPDF, printCanvas } from "@/lib/exportUtils";

// Dynamic import for Leaflet map component with ssr disabled
const DynamicThiessenMap = dynamic(
  () => import("./ThiessenMap").then((mod) => mod.ThiessenMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-2xl bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center gap-3 border border-slate-200 dark:border-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-xs text-slate-500 font-medium">Memuat Peta Poligon Thiessen & Hidrologi...</p>
      </div>
    ),
  }
);

interface DesignRainfallSectionProps {
  initialStationId?: string;
}

export function DesignRainfallSection({
  initialStationId = "stasiun-jerukagung-klirong",
}: DesignRainfallSectionProps) {
  const [selectedStationId, setSelectedStationId] = useState<string>(initialStationId);
  const [dataSourceMode, setDataSourceMode] = useState<"historical" | "custom">("historical");
  const [activeTab, setActiveTab] = useState<string>("ringkasan");
  const reportRef = useRef<HTMLDivElement>(null);

  // State untuk stasiun pada metode Poligon Thiessen (mendukung toggle on/off)
  const [thiessenStations, setThiessenStations] = useState<ThiessenStationInput[]>(() => {
    return getDefaultKebumenThiessenInputs();
  });

  // Handler toggle stasiun pada poligon Thiessen
  const handleToggleThiessenStation = useCallback((stationId: string) => {
    setThiessenStations((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, active: !s.active } : s))
    );
  }, []);

  // Perhitungan Poligon Thiessen & Hujan Wilayah Areal
  const thiessenResult: ThiessenAnalysisResult = useMemo(() => {
    return computeThiessenArealRainfall(thiessenStations);
  }, [thiessenStations]);

  // Stasiun aktif yang dipilih untuk analisis curah hujan rencana
  const currentStation = useMemo(() => {
    return (
      KEBUMEN_DEFAULT_STATIONS.find((s) => s.id === selectedStationId) ||
      KEBUMEN_DEFAULT_STATIONS[0]
    );
  }, [selectedStationId]);

  // Deret Hujan Harian Maksimum Tahunan (HHMT)
  const hhmtSeries: AnnualMaximumRainfallItem[] = useMemo(() => {
    return getStationHHMTSeries(currentStation.id);
  }, [currentStation.id]);

  // Perhitungan Analisis Curah Hujan Rencana (4 Distribusi & 2 Uji)
  const designAnalysis: DesignRainfallAnalysis = useMemo(() => {
    return analyzeDesignRainfall(
      currentStation.id,
      currentStation.name,
      hhmtSeries,
      [2, 5, 10, 20, 50]
    );
  }, [currentStation.id, currentStation.name, hhmtSeries]);

  // ECharts Option: Kurva Periode Ulang vs Curah Hujan Rencana
  const echartsOption = useMemo(() => {
    const returnPeriods = [2, 5, 10, 20, 50];
    const distributions: DistributionType[] = [
      "Normal",
      "Log-Normal",
      "Log-Pearson III",
      "Gumbel I",
    ];

    const distColors: Record<DistributionType, string> = {
      Normal: "#64748b",
      "Log-Normal": "#06b6d4",
      "Log-Pearson III": "#8b5cf6",
      "Gumbel I": "#3b82f6",
    };

    const seriesList: any[] = [];

    // Kurva untuk masing-masing distribusi
    distributions.forEach((dist) => {
      const distData = designAnalysis.distributions[dist];
      if (!distData) return;

      const isBest = dist === designAnalysis.bestDistribution;
      const dataPoints = returnPeriods.map((T) => [T, distData.returnPeriods[T]]);

      seriesList.push({
        name: dist + (isBest ? " (Terpilih)" : ""),
        type: "line",
        smooth: true,
        data: dataPoints,
        lineStyle: {
          width: isBest ? 3.5 : 1.8,
          color: distColors[dist],
          type: isBest ? "solid" : "dashed",
        },
        itemStyle: {
          color: distColors[dist],
        },
        symbolSize: isBest ? 7 : 5,
        z: isBest ? 5 : 2,
      });
    });

    // Titik Plotting Position Weibull Aktual
    const weibullPoints = designAnalysis.weibullPlottingPositions
      .filter((p) => p.returnPeriod <= 60)
      .map((p) => [p.returnPeriod, p.rainfall]);

    seriesList.push({
      name: "Observasi Aktual (Weibull)",
      type: "scatter",
      data: weibullPoints,
      symbolSize: 8,
      itemStyle: {
        color: "#f59e0b",
        borderColor: "#ffffff",
        borderWidth: 1.5,
      },
      z: 10,
    });

    return {
      title: {
        text: `Kurva Curah Hujan Rencana — ${currentStation.name}`,
        left: "center",
        textStyle: {
          fontSize: 13,
          fontWeight: 600,
          color: "#334155",
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        borderColor: "#334155",
        textStyle: { color: "#f8fafc", fontSize: 11 },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const T = params[0].value[0];
          let html = `<div class="font-bold mb-1 border-b border-slate-700 pb-1">Periode Ulang: T = ${T} Tahun</div>`;
          params.forEach((p) => {
            const val = p.value[1];
            html += `<div class="flex justify-between gap-3 text-xs">
              <span style="color: ${p.color};">${p.seriesName}:</span>
              <span class="font-bold">${val} mm</span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        bottom: 5,
        textStyle: { fontSize: 10 },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "log",
        logBase: 10,
        name: "Periode Ulang T (Tahun)",
        nameLocation: "middle",
        nameGap: 26,
        min: 1.5,
        max: 60,
        axisLabel: {
          formatter: (val: number) => {
            if ([2, 5, 10, 20, 50].includes(val)) return `${val} Th`;
            return "";
          },
        },
        splitLine: {
          lineStyle: { type: "dashed", color: "#e2e8f0" },
        },
      },
      yAxis: {
        type: "value",
        name: "Curah Hujan (mm/hari)",
        nameLocation: "end",
        splitLine: {
          lineStyle: { type: "dashed", color: "#e2e8f0" },
        },
      },
      series: seriesList,
    };
  }, [designAnalysis, currentStation.name]);

  // Export CSV Handler
  const handleExportCSV = () => {
    let csv = "LAPORAN ANALISIS CURAH HUJAN RENCANA KABUPATEN KEBUMEN\n";
    csv += `Stasiun,${currentStation.name}\n`;
    csv += `Lokasi,${currentStation.location}\n`;
    csv += `Koordinat,${currentStation.lat};${currentStation.lng}\n`;
    csv += `Distribusi Rekomendasi,${designAnalysis.bestDistribution}\n\n`;

    csv += "Tabel Curah Hujan Rencana (mm)\n";
    csv += "Distribusi,T=2 Th,T=5 Th,T=10 Th,T=20 Th,T=50 Th,Uji Chi-Square (Hitung/Kritis),Status Chi-Square,Uji KS (DeltaP/Kritis),Status KS,Kelayakan\n";

    (["Normal", "Log-Normal", "Log-Pearson III", "Gumbel I"] as const).forEach((dist) => {
      const d = designAnalysis.distributions[dist];
      if (!d) return;
      csv += `${dist},${d.returnPeriods[2]},${d.returnPeriods[5]},${d.returnPeriods[10]},${d.returnPeriods[20]},${d.returnPeriods[50]},"${d.chiSquareTest.chiSquare} / ${d.chiSquareTest.criticalValue}",${d.chiSquareTest.passed ? "LOLOS" : "DITOLAK"},"${d.ksTest.deltaPMax} / ${d.ksTest.criticalValue}",${d.ksTest.passed ? "LOLOS" : "DITOLAK"},${d.isPassedBoth ? "LOLOS KEDUA UJI" : "DITOLAK"}\n`;
    });

    csv += "\n\nTabel Bobot Poligon Thiessen & Curah Hujan Wilayah\n";
    csv += `Curah Hujan Wilayah R_areal (Tertimbang),${thiessenResult.arealRainfall} mm\n`;
    csv += `Total Luas Wilayah Kebumen,${thiessenResult.totalAreaKm2} km²\n`;
    csv += "ID Stasiun,Nama Stasiun,Curah Hujan Observasi (mm),Luas Pengaruh (km²),Bobot Thiessen (%),Kontribusi Wilayah (mm)\n";

    thiessenResult.cells.forEach((c) => {
      csv += `${c.stationId},"${c.stationName}",${c.rainfall},${c.areaKm2},${c.weightPercent}%,${c.weightedRainfall}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Curah_Hujan_Rencana_${currentStation.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF Handler
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await generateCanvasFromDOM("official-design-rainfall-report");
    if (canvas) {
      exportAsPDF([canvas], `Laporan_Curah_Hujan_Rencana_${currentStation.id}`, "portrait");
    }
  };

  // Print Document Handler
  const handlePrint = async () => {
    if (!reportRef.current) return;
    const canvas = await generateCanvasFromDOM("official-design-rainfall-report");
    if (canvas) {
      printCanvas(canvas, "portrait");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Control Bar: Pemilihan Stasiun & Mode Data ──────────────────── */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Stasiun Analisis:
              </span>
            </div>
            <Select value={selectedStationId} onValueChange={setSelectedStationId}>
              <SelectTrigger className="w-full sm:w-[280px] h-9 text-xs font-medium">
                <SelectValue placeholder="Pilih Stasiun AWS Kebumen" />
              </SelectTrigger>
              <SelectContent>
                {KEBUMEN_DEFAULT_STATIONS.map((station) => (
                  <SelectItem key={station.id} value={station.id} className="text-xs">
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">Sumber Data:</span>
              <Select
                value={dataSourceMode}
                onValueChange={(val: any) => setDataSourceMode(val)}
              >
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical" className="text-xs">
                    Validasi 25 Th (1999–2023)
                  </SelectItem>
                  <SelectItem value="custom" className="text-xs">
                    Data Observasi Sensor AWS
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              <span>PDF A4</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Cetak</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Peringatan Metodologis jika Data < 10 Tahun ──────────────────────── */}
      {designAnalysis.methodologyWarnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">Catatan Standar Hidrologi WMO No. 168:</div>
            {designAnalysis.methodologyWarnings.map((warn, i) => (
              <p key={i} className="text-[11px] leading-relaxed">
                {warn}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab Modular Navigasi Ergonomis Anti-Long-Scroll ─────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-[420px] mb-4">
          <TabsTrigger value="ringkasan" className="text-xs">
            Curah Hujan Rencana
          </TabsTrigger>
          <TabsTrigger value="thiessen" className="text-xs">
            Poligon Thiessen
          </TabsTrigger>
          <TabsTrigger value="laporan" className="text-xs">
            Kop & Dokumen Resmi
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Ringkasan Curah Hujan Rencana (Tabel + ECharts) ────────── */}
        <TabsContent value="ringkasan" className="space-y-6 m-0">
          {/* Ringkasan Distribusi Terbaik Callout */}
          <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                  Rekomendasi Distribusi Frekuensi Terpilih:
                </div>
                <div className="text-lg font-extrabold text-blue-950 dark:text-blue-100 flex items-center gap-2">
                  <span>{designAnalysis.bestDistribution}</span>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] h-5">
                    Lolos Uji Keselarasan
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 border-t sm:border-t-0 sm:border-l border-blue-200 dark:border-blue-900/60 pt-2 sm:pt-0 sm:pl-4">
              <div>
                <span className="text-[10px] text-slate-500 block">Rerata HHMT:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {designAnalysis.stats.mean} mm
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Kemencengan (Cs):</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {designAnalysis.stats.skewness}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Jumlah Data:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {designAnalysis.stats.n} Tahun
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Perbandingan 4 Distribusi Probabilitas */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="py-3.5 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Perbandingan 4 Distribusi & Uji Kecocokan
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Estimasi periode ulang T = 2 s/d 50 tahun dan evaluasi uji Chi-Square & Kolmogorov-Smirnov.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  α = 0.05
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Metode Distribusi</th>
                      <th className="py-2.5 px-3 text-right">T = 2 Th</th>
                      <th className="py-2.5 px-3 text-right">T = 5 Th</th>
                      <th className="py-2.5 px-3 text-right">T = 10 Th</th>
                      <th className="py-2.5 px-3 text-right">T = 20 Th</th>
                      <th className="py-2.5 px-3 text-right">T = 50 Th</th>
                      <th className="py-2.5 px-3 text-center">Uji Chi-Square</th>
                      <th className="py-2.5 px-3 text-center">Uji KS (ΔP_max)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(["Normal", "Log-Normal", "Log-Pearson III", "Gumbel I"] as const).map(
                      (dist) => {
                        const d = designAnalysis.distributions[dist];
                        const isBest = dist === designAnalysis.bestDistribution;
                        if (!d) return null;

                        return (
                          <tr
                            key={dist}
                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                              isBest ? "bg-blue-50/50 dark:bg-blue-950/20 font-medium" : ""
                            }`}
                          >
                            <td className="py-2.5 px-4 flex items-center gap-2">
                              <span>{dist}</span>
                              {isBest && (
                                <Badge className="text-[9px] h-4 bg-blue-600 text-white">
                                  Terbaik
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">{d.returnPeriods[2]} mm</td>
                            <td className="py-2.5 px-3 text-right font-mono">{d.returnPeriods[5]} mm</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                              {d.returnPeriods[10]} mm
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">{d.returnPeriods[20]} mm</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {d.returnPeriods[50]} mm
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-mono text-[11px]">
                                {d.chiSquareTest.chiSquare}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                (kritis: {d.chiSquareTest.criticalValue})
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-mono text-[11px]">
                                {d.ksTest.deltaPMax}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                (kritis: {d.ksTest.criticalValue})
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {d.isPassedBoth ? (
                                <Badge variant="outline" className="text-[10px] h-5 border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Lolos
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-5 border-rose-300 text-rose-500 bg-rose-50/50 dark:bg-rose-950/30">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Ditolak
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Grafik Kurva Periode Ulang ECharts */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Grafik Kurva Periode Ulang vs Curah Hujan
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Visualisasi komparasi 4 kurva teoritis dan titik sebaran empiris posisi plotting Weibull.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[380px] w-full">
                <ReactECharts
                  option={echartsOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "canvas" }}
                  notMerge={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: Peta Poligon Thiessen & Curah Hujan Wilayah ─────────────── */}
        <TabsContent value="thiessen" className="space-y-6 m-0">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="py-3.5 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Peta Interaktif Poligon Thiessen & Jaringan Sungai Kebumen
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Cakupan area pengaruh stasiun aktif terpotong batas wilayah Kebumen dan alur DAS Luk Ulo/Kemit.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono">
                    Total: {thiessenResult.totalAreaKm2} km²
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DynamicThiessenMap
                thiessenData={thiessenResult}
                stations={thiessenStations}
                onToggleStation={handleToggleThiessenStation}
                selectedStationId={selectedStationId}
                onSelectStation={setSelectedStationId}
              />
            </CardContent>
          </Card>

          {/* Tabel Bobot Stasiun Thiessen */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="py-3 px-5 border-b">
              <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Daftar Bobot Stasiun & Kontribusi Curah Hujan Wilayah
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[280px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 text-slate-600 dark:text-slate-400 border-b">
                    <tr>
                      <th className="py-2 px-4">Stasiun</th>
                      <th className="py-2 px-3 text-right">Luas (km²)</th>
                      <th className="py-2 px-3 text-right">Bobot (wi)</th>
                      <th className="py-2 px-3 text-right">Hujan Observasi (Ri)</th>
                      <th className="py-2 px-3 text-right">Kontribusi (wi·Ri)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {thiessenStations.map((st) => {
                      const cell = thiessenResult.cells.find((c) => c.stationId === st.id);
                      const isActive = st.active;

                      return (
                        <tr
                          key={st.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                            !isActive ? "opacity-40" : ""
                          }`}
                        >
                          <td className="py-2 px-4 font-medium">{st.name}</td>
                          <td className="py-2 px-3 text-right font-mono">
                            {cell ? `${cell.areaKm2} km²` : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                            {cell ? `${cell.weightPercent}%` : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {st.rainfall} mm
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {cell ? `${cell.weightedRainfall} mm` : "—"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              size="sm"
                              variant={isActive ? "ghost" : "outline"}
                              className="text-[10px] h-6 px-2"
                              onClick={() => handleToggleThiessenStation(st.id)}
                            >
                              {isActive ? "Aktif" : "Sertakan"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: Kop & Dokumen Resmi Laporan Sesuai AGENTS.md Rule 5 ──────── */}
        <TabsContent value="laporan" className="space-y-6 m-0">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Pratinjau Dokumen Laporan Resmi
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Format baku standar pelaporan meteorologi & hidrometeorologi Kabupaten Kebumen.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleExportPDF} className="h-8 text-xs flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Unduh PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs flex items-center gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  Cetak
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 bg-slate-200/50 dark:bg-slate-950/50 flex justify-center">
              {/* Wadah Dokumen A4 Resmi */}
              <div
                id="official-design-rainfall-report"
                ref={reportRef}
                className="w-full max-w-[780px] bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-lg border border-slate-300 font-sans"
              >
                {/* ─── KOP SURAT RESMI INSTANSI SESUAI AGENTS.md Rule 5 ──────── */}
                <div className="flex items-center justify-between pb-4 border-b-4 border-slate-800">
                  <div className="flex items-center gap-4">
                    {/* Logo Resmi Instansi dengan crossOrigin="anonymous" */}
                    <img
                      src="/img/logo.webp"
                      alt="Logo Resmi Jerukagung Meteorologi"
                      crossOrigin="anonymous"
                      className="w-16 h-16 object-contain"
                    />
                    <div>
                      <div className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                        Jerukagung Meteorologi • Automatic Weather Station
                      </div>
                      <div className="text-xl font-black text-slate-900 tracking-tight">
                        METEOSENSE HIDROMETEOROLOGI
                      </div>
                      <div className="text-xs text-slate-600 font-medium mt-0.5">
                        Layanan Riset Dinamika Cuaca, Iklim, dan Hidrologi Kabupaten Kebumen
                      </div>
                    </div>
                  </div>

                  {/* Panel Metadata Dokumen */}
                  <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                    <div><span className="font-semibold">Kode Dokumen:</span> MS-HDR-2026</div>
                    <div><span className="font-semibold">Tanggal:</span> {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</div>
                    <div><span className="font-semibold">Status:</span> Observasi Resmi</div>
                  </div>
                </div>

                {/* Garis Aksen Gradien Pelaporan Resmi */}
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-sky-400 to-blue-500 rounded-full my-3" />

                {/* Judul Laporan */}
                <div className="text-center my-6">
                  <h1 className="text-lg font-black text-slate-900 tracking-wide uppercase">
                    LAPORAN ANALISIS CURAH HUJAN RENCANA & POLIGON THIESSEN
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Wilayah Analisis: {currentStation.name} • {currentStation.location}
                  </p>
                </div>

                {/* Ringkasan Metadata Analisis */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-6">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Metode Rekomendasi:</span>
                    <span className="font-bold text-blue-700">{designAnalysis.bestDistribution}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Rerata HHMT:</span>
                    <span className="font-bold">{designAnalysis.stats.mean} mm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Standar Deviasi:</span>
                    <span className="font-bold">{designAnalysis.stats.stdDev} mm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Hujan Wilayah (R_areal):</span>
                    <span className="font-bold text-emerald-700">{thiessenResult.arealRainfall} mm</span>
                  </div>
                </div>

                {/* Tabel Hasil Periode Ulang Resmi */}
                <div className="mb-6">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    1. Estimasi Curah Hujan Rencana (Return Period Analysis)
                  </h2>
                  <table className="w-full text-xs border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2 px-3 text-left border-r border-slate-300">Metode Distribusi</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">T=2 Th</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">T=5 Th</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">T=10 Th</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">T=20 Th</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">T=50 Th</th>
                        <th className="py-2 px-2 text-center border-r border-slate-300">Chi-Square</th>
                        <th className="py-2 px-2 text-center">Kolmogorov-Smirnov</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(["Normal", "Log-Normal", "Log-Pearson III", "Gumbel I"] as const).map((dist) => {
                        const d = designAnalysis.distributions[dist];
                        const isBest = dist === designAnalysis.bestDistribution;
                        if (!d) return null;

                        return (
                          <tr key={dist} className={isBest ? "bg-blue-50/60 font-semibold" : ""}>
                            <td className="py-2 px-3 border-r border-slate-200">
                              {dist} {isBest ? "★ (Rekomendasi)" : ""}
                            </td>
                            <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{d.returnPeriods[2]} mm</td>
                            <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{d.returnPeriods[5]} mm</td>
                            <td className="py-2 px-2 text-right font-mono border-r border-slate-200 text-blue-700">{d.returnPeriods[10]} mm</td>
                            <td className="py-2 px-2 text-right font-mono border-r border-slate-200">{d.returnPeriods[20]} mm</td>
                            <td className="py-2 px-2 text-right font-mono border-r border-slate-200 text-indigo-700">{d.returnPeriods[50]} mm</td>
                            <td className="py-2 px-2 text-center font-mono border-r border-slate-200 text-[11px]">
                              {d.chiSquareTest.passed ? "Lolos" : "Ditolak"} ({d.chiSquareTest.chiSquare})
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-[11px]">
                              {d.ksTest.passed ? "Lolos" : "Ditolak"} ({d.ksTest.deltaPMax})
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Ringkasan Poligon Thiessen */}
                <div className="mb-8">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    2. Curah Hujan Rata-rata Wilayah Metode Poligon Thiessen
                  </h2>
                  <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                    Total stasiun terverifikasi: {thiessenResult.activeStationsCount} stasiun aktif dengan luas total tangkapan air {thiessenResult.totalAreaKm2} km². Nilai curah hujan wilayah tertimbang terhitung adalah <strong>{thiessenResult.arealRainfall} mm</strong>.
                  </p>
                </div>

                {/* ─── STANDAR FOOTER DOKUMEN SESUAI AGENTS.md Rule 5 ─────────── */}
                <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
                  <div>
                    Sumber Data: AWS Stasiun Riset Jerukagung, Reanalisis ERA5 ECMWF, dan Stasiun BMKG.
                  </div>
                  <div className="text-center sm:text-right font-medium">
                    Dihasilkan otomatis oleh sistem MeteoSense Dashboard • Sah tanpa tanda tangan basah.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
