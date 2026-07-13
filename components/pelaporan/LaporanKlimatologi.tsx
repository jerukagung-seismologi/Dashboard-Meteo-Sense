"use client"

import { useRef, useState, useMemo } from "react"
import { FileImage, FileType, Printer, Download, Sparkles } from "lucide-react"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { format } from "date-fns"
import { id } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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
  
  // States exactly like Climatology Dashboard
  const [preset, setPreset] = useState<string>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getUTCFullYear());
  const [selectedDasarian, setSelectedDasarian] = useState<number>(1);
  
  const [isExporting, setIsExporting] = useState(false)
  const reportId = "klimatologi-print-area";
  
  const handleExport = async (type: 'pdf' | 'png' | 'jpg' | 'print') => {
    if (!data?.points || data.points.length === 0) return;
    setIsExporting(true);
    toast({ title: "Memproses Laporan...", description: "Mohon tunggu sebentar, sedang merender." });
    
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
      
      toast({ title: "Berhasil", description: "Laporan siap." });
      setIsExporting(false);
    }, 100);
  };

  // Construct API Query String
  const apiPath = useMemo(() => {
    if (!sensorId) return null;
    // Always use calibration=true
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

  return (
    <div className="space-y-6">
      {/* Control Panel (Hidden when printing) */}
      <Card className="no-print mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end justify-between">
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
          
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" onClick={handleDownloadCSV} disabled={!data?.points || data.points.length === 0}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('png')} disabled={!data?.points || data.points.length === 0 || isExporting}>
              <FileImage className="mr-2 h-4 w-4 text-green-600" /> PNG
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')} disabled={!data?.points || data.points.length === 0 || isExporting}>
              <FileType className="mr-2 h-4 w-4 text-red-600" /> PDF
            </Button>
            <Button className="bg-slate-800 hover:bg-slate-900 text-white" onClick={() => handleExport('print')} disabled={!data?.points || data.points.length === 0 || isExporting}>
              <Printer className="mr-2 h-4 w-4" /> Cetak
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Printable Area Wrapper (Visually hidden but rendered for canvas) */}
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
             {/* Use the exact SummaryCards from Climatology Dashboard */}
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
                      <td className="px-2 py-2 print:py-1 border-r text-center">{p.temperatureMean?.toFixed(1)} °C</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center">{p.temperatureMax?.toFixed(1)} °C</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center">{p.temperatureMin?.toFixed(1)} °C</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center font-bold text-blue-600">{p.rainfallTotal?.toFixed(1)} mm</td>
                      <td className="px-2 py-2 print:py-1 border-r text-center">{p.humidityMean?.toFixed(0)} %</td>
                      <td className="px-2 py-2 print:py-1 text-center">{p.pressureMean?.toFixed(1)} hPa</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </PrintLayout>
      </div>
    </div>
  )
}
