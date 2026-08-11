"use client"

import { useState, useMemo } from "react"
import { 
  FileImage, 
  FileType, 
  Printer, 
  Download, 
  LayoutDashboard, 
  Eye, 
  Calendar,
  Layers,
  Thermometer,
  CloudRain,
  Droplets,
  Gauge
} from "lucide-react"
import dynamic from "next/dynamic"
import useSWR from "swr"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PresetSelector } from "@/components/climatology/PresetSelector"
import { SummaryCards } from "@/components/climatology/SummaryCards"
import { useToast } from "@/hooks/use-toast"
import { exportToCSV, formatIdDateShort, formatYMD } from "@/lib/weatherUtils"
import { PrintLayout } from "./PrintLayout"
import { generateCanvasFromDOM, exportAsPNG, exportAsJPEG, exportAsPDF, printCanvas } from "@/lib/exportUtils"
import { cn } from "@/lib/utils"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LaporanKlimatologiProps {
  sensorId: string;
  sensorName: string;
  displayName: string;
}

export default function LaporanKlimatologi({ sensorId, sensorName, displayName }: LaporanKlimatologiProps) {
  const { toast } = useToast()
  
  const [preset, setPreset] = useState<string>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getUTCFullYear());
  const [selectedDasarian, setSelectedDasarian] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'web' | 'print'>('web');
  
  const [isExporting, setIsExporting] = useState(false)
  const reportId = "klimatologi-print-area";
  
  const handleExport = async (type: 'pdf' | 'png' | 'jpg' | 'print') => {
    if (!data?.points || data.points.length === 0) return;
    setIsExporting(true);
    toast({ title: "Memproses Laporan...", description: "Mohon tunggu sebentar, sedang merender kanvas dokumen." });
    
    setTimeout(async () => {
      const canvas = await generateCanvasFromDOM(reportId);
      if (!canvas) {
        toast({ variant: "destructive", title: "Error", description: "Gagal membuat gambar dari laporan." });
        setIsExporting(false);
        return;
      }
      
      const filename = `Laporan_Klimatologi_${sensorName.replace(/\s+/g, '_')}_${preset}`;
      
      if (type === 'png') exportAsPNG(canvas, filename);
      else if (type === 'jpg') exportAsJPEG(canvas, filename);
      else if (type === 'pdf') exportAsPDF([canvas], filename, 'landscape');
      else if (type === 'print') printCanvas(canvas, 'landscape');
      
      toast({ title: "✓ Berhasil", description: "Dokumen laporan siap diunduh/dicetak." });
      setIsExporting(false);
    }, 100);
  };

  // Construct API Query String (Always calibrated)
  const apiPath = useMemo(() => {
    if (!sensorId) return null;
    let queryParams = `sensorId=${sensorId}&preset=${preset}&calibration=true`;
    if (preset === "monthly") {
      queryParams += `&month=${selectedMonth}&year=${selectedYear}`;
    } else if (preset === "dasarian") {
      queryParams += `&month=${selectedMonth}&year=${selectedYear}&dasarian=${selectedDasarian}`;
    } else if (preset === "yearly") {
      queryParams += `&year=${selectedYear}`;
    }
    return `/api/climatology?${queryParams}`;
  }, [sensorId, preset, selectedMonth, selectedYear, selectedDasarian]);

  const { data, error, isLoading, mutate } = useSWR(apiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const handleDownloadCSV = () => {
    if (!data?.points || data.points.length === 0) return;
    const headers = [
      "Timestamp (UTC)",
      "Suhu Rata-rata (°C)",
      "Suhu Maks (°C)",
      "Suhu Min (°C)",
      "Curah Hujan (mm)",
      "Kelembaban Rata-rata (%)",
      "Tekanan Rata-rata (hPa)",
    ];
    const rows = data.points.map((p: any) =>
      `"${p.timeKey}",${p.temperatureMean},${p.temperatureMax},${p.temperatureMin},${p.rainfallTotal},${p.humidityMean},${p.pressureMean}`
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Klimatologi_${sensorName.replace(/\s+/g, '_')}_${preset}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  }

  // Interactive ECharts Climatology Multi-Series Chart
  const climatologyChartOption = useMemo(() => {
    if (!data?.points || data.points.length === 0) return null;

    const labels = data.points.map((p: any) => p.timeKey);
    const temps = data.points.map((p: any) => p.temperatureMean);
    const tempMaxs = data.points.map((p: any) => p.temperatureMax);
    const tempMins = data.points.map((p: any) => p.temperatureMin);
    const rains = data.points.map((p: any) => p.rainfallTotal);
    const hums = data.points.map((p: any) => p.humidityMean);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      legend: {
        data: ["Suhu Rata²", "Suhu Maks", "Suhu Min", "Curah Hujan", "Kelembapan"],
        top: 0,
        textStyle: { color: "#64748B" },
      },
      grid: { left: "3%", right: "3%", bottom: "8%", top: "40px", containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "#CBD5E1" } },
      },
      yAxis: [
        {
          type: "value",
          name: "°C / %",
          scale: true,
          splitLine: { lineStyle: { color: "#F1F5F9" } },
        },
        {
          type: "value",
          name: "Hujan (mm)",
          position: "right",
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", start: 0, end: 100, height: 16, bottom: 0 },
      ],
      series: [
        {
          name: "Curah Hujan",
          type: "bar",
          yAxisIndex: 1,
          data: rains,
          itemStyle: { color: "#38BDF8", borderRadius: [4, 4, 0, 0] },
        },
        {
          name: "Suhu Rata²",
          type: "line",
          data: temps,
          itemStyle: { color: "#F97316" },
          lineStyle: { width: 3 },
          smooth: true,
        },
        {
          name: "Suhu Maks",
          type: "line",
          data: tempMaxs,
          itemStyle: { color: "#EF4444" },
          smooth: true,
        },
        {
          name: "Suhu Min",
          type: "line",
          data: tempMins,
          itemStyle: { color: "#3B82F6" },
          smooth: true,
        },
        {
          name: "Kelembapan",
          type: "line",
          data: hums,
          itemStyle: { color: "#10B981" },
          lineStyle: { width: 2, type: "dashed" },
          smooth: true,
        },
      ],
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <Card className="no-print shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
          <div className="flex flex-col gap-3 flex-grow">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Parameter Agregasi Klimatologi
              </label>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border">
                <Button
                  variant={viewMode === 'web' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('web')}
                  className={cn("h-7 text-xs px-3 font-medium", viewMode === 'web' && "bg-white dark:bg-slate-900 text-blue-600 shadow-sm")}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                  Dashboard Web
                </Button>
                <Button
                  variant={viewMode === 'print' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('print')}
                  className={cn("h-7 text-xs px-3 font-medium", viewMode === 'print' && "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm")}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Pratinjau Cetak
                </Button>
              </div>
            </div>

            <PresetSelector
              preset={preset}
              setPreset={setPreset}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedDasarian={selectedDasarian}
              setSelectedDasarian={setSelectedDasarian}
              isLoading={isLoading}
              onRefresh={() => mutate()}
            />
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={!data?.points || data.points.length === 0} className="h-9">
              <Download className="mr-1.5 h-4 w-4 text-emerald-600" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('png')} disabled={!data?.points || data.points.length === 0 || isExporting} className="h-9">
              <FileImage className="mr-1.5 h-4 w-4 text-green-600" /> PNG
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={!data?.points || data.points.length === 0 || isExporting} className="h-9">
              <FileType className="mr-1.5 h-4 w-4 text-red-600" /> PDF
            </Button>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white h-9" size="sm" onClick={() => handleExport('print')} disabled={!data?.points || data.points.length === 0 || isExporting}>
              <Printer className="mr-1.5 h-4 w-4" /> Cetak
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- VIEW MODE 1: DASHBOARD WEB INTERAKTIF --- */}
      {viewMode === 'web' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          {data?.stats && (
            <SummaryCards stats={data.stats} />
          )}

          {/* Interactive Chart */}
          {climatologyChartOption && (
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 bg-slate-50 dark:bg-slate-800/60 border-b flex flex-row justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Grafik Agregasi Klimatologi ({preset.toUpperCase()})
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                  Kalibrasi Aktif
                </Badge>
              </CardHeader>
              <CardContent className="p-4">
                <ReactECharts option={climatologyChartOption} style={{ width: "100%", height: "320px" }} />
              </CardContent>
            </Card>
          )}

          {/* Interactive Web Table */}
          {data?.points && data.points.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm font-bold">Tabel Rincian Agregasi Data ({preset})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-mono">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-sans border-b">
                      <tr>
                        <th className="px-4 py-3 font-semibold border-r">Waktu (UTC)</th>
                        <th className="px-3 py-2 text-center font-semibold border-r text-orange-600">Suhu Rata² (°C)</th>
                        <th className="px-3 py-2 text-center font-semibold border-r text-red-600">Suhu Maks (°C)</th>
                        <th className="px-3 py-2 text-center font-semibold border-r text-blue-600">Suhu Min (°C)</th>
                        <th className="px-3 py-2 text-center font-semibold border-r text-sky-700">Total Hujan (mm)</th>
                        <th className="px-3 py-2 text-center font-semibold border-r text-emerald-700">Kelembapan (%)</th>
                        <th className="px-3 py-2 text-center font-semibold text-violet-700">Tekanan (hPa)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.points.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2 font-sans font-medium border-r">{p.timeKey}</td>
                          <td className="px-3 py-2 text-center border-r font-semibold">{p.temperatureMean?.toFixed(1) ?? "-"}</td>
                          <td className="px-3 py-2 text-center border-r text-red-600">{p.temperatureMax?.toFixed(1) ?? "-"}</td>
                          <td className="px-3 py-2 text-center border-r text-blue-600">{p.temperatureMin?.toFixed(1) ?? "-"}</td>
                          <td className="px-3 py-2 text-center border-r font-semibold text-sky-700">{p.rainfallTotal?.toFixed(1) ?? "0.0"}</td>
                          <td className="px-3 py-2 text-center border-r text-emerald-700">{p.humidityMean?.toFixed(0) ?? "-"}</td>
                          <td className="px-3 py-2 text-center text-violet-700">{p.pressureMean?.toFixed(1) ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* --- VIEW MODE 2: PRATINJAU LEMBAR CETAK (LANDSCAPE) --- */}
      {viewMode === 'print' && data && !error && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border">
            <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-600" />
              Menampilkan pratinjau lembar cetak standar dokumen Landscape.
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting} className="h-8 text-xs">
                <FileType className="w-3.5 h-3.5 mr-1 text-red-600" /> Export PDF
              </Button>
              <Button size="sm" onClick={() => handleExport('print')} disabled={isExporting} className="h-8 text-xs bg-slate-900 text-white">
                <Printer className="w-3.5 h-3.5 mr-1" /> Cetak Lembar Ini
              </Button>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-slate-200 dark:bg-slate-950 flex justify-center overflow-x-auto shadow-inner">
            <div className="scale-[0.85] origin-top shadow-2xl rounded-md overflow-hidden bg-white">
              <PrintLayout 
                id="visible-klimatologi-preview"
                title="Laporan Klimatologi"
                sensorName={sensorName}
                generatedBy={displayName}
                periodLabel={`${preset.toUpperCase()} ${preset === 'monthly' || preset === 'dasarian' ? `- Bulan ${selectedMonth}/${selectedYear}` : ''} ${preset === 'yearly' ? `- Tahun ${selectedYear}` : ''}`}
                orientation="landscape"
              >
                <section className="space-y-4 mt-4">
                  <h2 className="text-xl print:text-lg font-semibold mb-2 border-l-4 border-slate-800 pl-3">Ringkasan Statistik Klimatologi</h2>
                  <div className="print-summary-cards">
                    {data?.stats && <SummaryCards stats={data.stats} />}
                  </div>
                </section>

                <section className="break-inside-avoid mt-8 print:mt-4">
                  <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-slate-800 pl-3">Tabel Agregasi Data ({preset})</h2>
                  <div className="overflow-x-auto border rounded-lg print:border-none print:rounded-none">
                    <table className="w-full text-sm print:text-[10px]">
                      <thead className="bg-slate-100 print:bg-slate-200 text-slate-700">
                        <tr>
                          <th className="px-4 py-3 print:py-1 text-left font-semibold border-b border-r">Waktu (UTC)</th>
                          <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r">Suhu Rata-rata</th>
                          <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r">Suhu Maks</th>
                          <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r">Suhu Min</th>
                          <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r text-blue-700">Total Hujan</th>
                          <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r">Kelembaban Rata</th>
                          <th className="px-2 py-3 print:py-1 text-center font-semibold border-b">Tekanan Rata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {data?.points?.map((p: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50 print:bg-white"}>
                            <td className="px-4 py-2 print:py-1 border-r font-medium">{p.timeKey}</td>
                            <td className="px-2 py-2 print:py-1 border-r text-center">{p.temperatureMean?.toFixed(1) ?? "-"}</td>
                            <td className="px-2 py-2 print:py-1 border-r text-center text-red-600 font-medium">{p.temperatureMax?.toFixed(1) ?? "-"}</td>
                            <td className="px-2 py-2 print:py-1 border-r text-center text-blue-600 font-medium">{p.temperatureMin?.toFixed(1) ?? "-"}</td>
                            <td className="px-2 py-2 print:py-1 border-r text-center font-bold text-blue-700">{p.rainfallTotal?.toFixed(1) ?? "-"}</td>
                            <td className="px-2 py-2 print:py-1 border-r text-center">{p.humidityMean?.toFixed(0) ?? "-"}</td>
                            <td className="px-2 py-2 print:py-1 text-center">{p.pressureMean?.toFixed(1) ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </PrintLayout>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Canvas for Export */}
      <div className={cn("overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none", data && !error && "block")}>
        <PrintLayout 
          id={reportId}
          title="Laporan Klimatologi"
          sensorName={sensorName}
          generatedBy={displayName}
          periodLabel={`${preset.toUpperCase()} ${preset === 'monthly' || preset === 'dasarian' ? `- Bulan ${selectedMonth}/${selectedYear}` : ''} ${preset === 'yearly' ? `- Tahun ${selectedYear}` : ''}`}
          orientation="landscape"
        >
          <section className="space-y-4 mt-4">
            <h2 className="text-xl print:text-lg font-semibold mb-2 border-l-4 border-slate-800 pl-3">Ringkasan Statistik Klimatologi</h2>
            <div className="print-summary-cards">
              {data?.stats && <SummaryCards stats={data.stats} />}
            </div>
          </section>

          <section className="break-inside-avoid mt-8 print:mt-4">
            <h2 className="text-xl print:text-lg font-semibold mb-4 print:mb-2 border-l-4 border-slate-800 pl-3">Tabel Agregasi Data ({preset})</h2>
            <div className="overflow-x-auto border rounded-lg print:border-none print:rounded-none">
              <table className="w-full text-sm print:text-[10px]">
                <thead className="bg-slate-100 print:bg-slate-200 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 print:py-1 text-left font-semibold border-b border-r">Waktu (UTC)</th>
                    <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r">Suhu Rata-rata</th>
                    <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r">Suhu Maks</th>
                    <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r">Suhu Min</th>
                    <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r text-blue-700">Total Hujan</th>
                    <th className="px-2 py-3 print:py-1 text-center font-semibold border-b border-r">Kelembaban Rata</th>
                    <th className="px-2 py-3 print:py-1 text-center font-semibold border-b">Tekanan Rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data?.points?.map((p: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50 print:bg-white"}>
                      <td className="px-4 py-2 print:py-1 border-r font-medium">{p.timeKey}</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center">{p.temperatureMean?.toFixed(1) ?? "-"}</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center text-red-600 font-medium">{p.temperatureMax?.toFixed(1) ?? "-"}</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center text-blue-600 font-medium">{p.temperatureMin?.toFixed(1) ?? "-"}</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center font-bold text-blue-700">{p.rainfallTotal?.toFixed(1) ?? "-"}</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center">{p.humidityMean?.toFixed(0) ?? "-"}</td>
                      <td className="px-2 py-2 print:py-1 text-center">{p.pressureMean?.toFixed(1) ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </PrintLayout>
      </div>
    </div>
  );
}
