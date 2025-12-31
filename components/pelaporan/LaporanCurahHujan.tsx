"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Download, Calendar as CalendarIcon } from "lucide-react"
import html2canvas from 'html2canvas';
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData"
import { useToast } from "@/hooks/use-toast"
import {
  WeatherRecord,
  aggregateDailyUTC,
  formatIdDateDash,
} from "@/lib/weatherUtils"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- Helper UI: Rain Measuring Cup ---
const RainMeasuringCup = ({ value, maxValue = 100, unit = "mm" }: { value: number, maxValue?: number, unit?: string }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const ticks = [100, 80, 60, 40, 20, 0];

  return (
    <div className="flex items-end gap-3 py-2">
      <div className="flex flex-col justify-between h-48 text-xs text-gray-600 dark:text-gray-300 font-mono font-medium py-1 text-right">
        {ticks.map((tick) => <span key={tick} className="leading-none">{tick}</span>)}
      </div>
      <div className="relative w-20 h-48">
        <div className="absolute inset-0 z-0 bg-black/5 rounded-b-3xl border-x border-b border-white/10"></div>
        <div className="absolute inset-[2px] z-10 rounded-b-[20px] overflow-hidden flex items-end">
          <div
            className="w-full relative transition-all duration-1000 ease-in-out bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-300"
            style={{ height: `${percentage}%` }}
          >
            {/* Simplified water surface line to prevent rendering artifacts */}
            <div className="absolute -top-px left-0 right-0 h-0.5 bg-white/90"></div>
          </div>
        </div>
        <div className="absolute inset-0 z-20 pointer-events-none rounded-b-3xl border-x-2 border-b-2 border-t-0 border-gray-300/80 dark:border-gray-500/50 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.1)]">
          <div className="absolute inset-0 rounded-b-3xl bg-gradient-to-r from-white/30 via-transparent to-transparent opacity-60"></div>
          <div className="absolute inset-0 flex flex-col justify-between py-1 px-2">
            {ticks.map((tick, index) => (
              <div key={index} className="relative h-px bg-gray-400/50">
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-500/80"></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const getDailyRainfallCategory = (amount: number) => {
  if (amount === 0) return "Tidak Hujan";
  if (amount <= 20) return "Hujan Ringan";
  if (amount <= 50) return "Hujan Sedang";
  if (amount <= 100) return "Hujan Lebat";
  if (amount <= 150) return "Hujan Sangat Lebat";
  return "Hujan Ekstrem";
};

export default function LaporanCurahHujan({ sensorId, sensorName, displayName }: { sensorId: string, sensorName: string, displayName: string }) {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<WeatherRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  });

  useEffect(() => {
    const loadRainfallData = async () => {
      if (!sensorId || !selectedDate) return;
      setLoading(true);
      setError(null);

      try {
        const targetDate = selectedDate;

        // Define the start and end of the selected day in UTC
        const startUTC = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
        const endUTC = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));

        toast({ title: "Memuat Data Curah Hujan", description: `Untuk tanggal ${formatIdDateDash(targetDate)} (UTC)` });

        const raw = await fetchSensorDataByDateRange(sensorId, startUTC.getTime(), endUTC.getTime());
        const daily = aggregateDailyUTC(raw);

        if (daily.length > 0) {
          setReportData(daily[0]);
          toast({ title: "Sukses", description: `Data curah hujan berhasil dimuat.` });
        } else {
          setReportData(null);
          setError(`Tidak ditemukan data untuk tanggal ${formatIdDateDash(targetDate)}.`);
          toast({ variant: "destructive", title: "Data Tidak Ditemukan", description: `Tidak ada data untuk tanggal ${formatIdDateDash(targetDate)}.` });
        }
      } catch (e: any) {
        const msg = e?.message || "Gagal memuat data.";
        setError(msg);
        setReportData(null);
        toast({ variant: "destructive", title: "Error", description: msg });
      } finally {
        setLoading(false);
      }
    };

    loadRainfallData();
  }, [sensorId, selectedDate, toast]);

  const componentRef = useRef<HTMLElement>(null);

  const handleDownloadImage = useCallback(() => {
    if (componentRef.current === null) {
      toast({ variant: "destructive", title: "Error", description: "Komponen laporan tidak ditemukan." });
      return;
    }

    toast({ title: "Membuat Gambar...", description: "Mohon tunggu sebentar." });

    html2canvas(componentRef.current, { useCORS: true, scale: 2, backgroundColor: null })
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const dateStr = selectedDate.toISOString().split('T')[0];
        link.download = `laporan-hujan-${sensorName.replace(/\s+/g, '_')}-${dateStr}.png`;
        link.href = dataUrl;
        link.click();
        toast({ title: "Sukses", description: "Gambar berhasil diunduh." });
      })
      .catch((err) => {
        console.error('Gagal membuat gambar!', err);
        toast({
          variant: "destructive",
          title: "Gagal Mengunduh Gambar",
          description: "Terjadi kesalahan saat membuat gambar.",
        });
      });
  }, [componentRef, selectedDate, sensorName, toast]);

  const rainfall = reportData?.rainfallTot ?? 0;
  const category = getDailyRainfallCategory(rainfall);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row justify-end gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? formatIdDateDash(selectedDate) : <span>Pilih tanggal</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleDownloadImage} disabled={!reportData || loading}>
          <Download className="mr-2 h-4 w-4" /> Unduh Gambar
        </Button>
      </div>

      {error && <div className="no-print mx-auto mb-3 max-w-xl text-red-700 text-center p-4 bg-red-50 rounded-md">{error}</div>}

      <main ref={componentRef} className="mx-auto my-0 mb-6 w-full max-w-xl aspect-square bg-white text-gray-900 shadow-lg print:shadow-none relative overflow-hidden flex flex-col justify-between p-8">
        <header className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/img/logo.webp" alt="Logo" className="h-12 w-12 object-contain" />
            <div>
              <div className="text-sm font-medium text-gray-600">Laporan Hujan Harian</div>
              <div className="text-lg font-bold text-gray-800">JERUKAGUNG METEOROLOGI</div>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center">
          {loading ? <section className="text-center text-gray-600 py-10">Memuat data...</section> : !reportData ? <section className="text-center text-gray-600 py-10">Tidak ada data.</section> : (
            <>
              <h2 className="text-base font-semibold text-gray-700">Akumulasi Curah Hujan 24 Jam</h2>
              <p className="text-sm text-gray-500">{formatIdDateDash(selectedDate)}</p>
              <div className="my-4">
                <RainMeasuringCup value={rainfall} />
              </div>
              <div className="text-5xl font-bold text-blue-600">{rainfall.toFixed(2)} <span className="text-2xl font-medium text-gray-600">mm</span></div>
              <div className={cn("mt-2 text-lg font-semibold", rainfall > 0 ? "text-blue-800" : "text-gray-700")}>{category}</div>
            </>
          )}
        </div>

        <footer className="relative z-10 text-center">
          <p className="text-xs text-gray-500">
            Sensor: {sensorName} • <span style={{ opacity: 0.7 }}>Powered by</span> <strong style={{ color: "#1E3A8A" }}>Meteo Sense</strong>
          </p>
        </footer>
      </main>
    </div>
  );
}