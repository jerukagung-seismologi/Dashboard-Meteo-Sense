"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Download, Calendar as CalendarIcon } from "lucide-react"
import html2canvas from 'html2canvas';
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fetchSensorDataByDateRange } from "@/lib/FetchingSensorData"
import { useToast } from "@/hooks/use-toast"
import { WeatherRecord, aggregateDailyUTC, formatIdDateDash } from "@/lib/weatherUtils"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- Helper UI: Rain Measuring Cup ---
const RainMeasuringCup = ({ value, maxValue = 100, unit = "mm" }: { value: number, maxValue?: number, unit?: string }) => {
  // Pastikan value aman
  const safeValue = isNaN(value) || value < 0 ? 0 : value;

  // --- LOGIKA BARU ---
  // Jika value ada isinya (> 0) tapi kurang dari 1, kita anggap visualnya 1
  // Supaya airnya tetap kelihatan sedikit di gelas.
  // Jika 0 tetap 0. Jika >= 1 gunakan nilai aslinya.
  const visualValue = (safeValue > 0 && safeValue < 1) ? 1 : safeValue;

  // Hitung persentase berdasarkan visualValue
  const percentage = Math.min((visualValue / maxValue) * 100, 100);
  
  const ticks = [100, 75, 50, 25, 0];

  return (
    <div className="flex items-end gap-4 py-2">
      {/* Labels */}
      <div className="flex flex-col justify-between h-56 text-sm text-gray-500 font-mono font-medium py-1 text-right">
        {ticks.map((tick) => <span key={tick} className="leading-none">{tick}</span>)}
      </div>

      {/* Glass Container with Curved Bottom */}
      <div className="relative w-24 h-56">
        {/* The Glass Outline */}
        <div className="absolute inset-0 z-0 bg-slate-100/50 rounded-b-3xl border-2 border-slate-300"></div>

        {/* The Liquid (inset within the glass) */}
        <div className="absolute inset-[3px] z-10 rounded-b-[22px] overflow-hidden flex items-end">
          <div
            className="liquid-bar w-full relative transition-all duration-1000 ease-in-out bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-300"
            style={{ height: `${percentage}%` }}
          >
            {/* Water Surface */}
            <div className="absolute -top-px left-0 right-0 h-0.5 bg-white/90"></div>
          </div>
        </div>

        {/* Tick Marks */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between py-1 px-2 pointer-events-none">
          {ticks.map((tick, index) => (
            <div key={index} className="relative h-px bg-gray-400/30">
              <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-500/60"></span>
            </div>
          ))}
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
  
  // Inisialisasi sesuai tipe WeatherRecord
  const [reportData, setReportData] = useState<WeatherRecord>({
    date: new Date().toISOString().split('T')[0],
    sampleCount: 0,
    temperatureAvg: 0, temperatureMin: 0, temperatureMax: 0,
    humidityAvg: 0, humidityMin: 0, humidityMax: 0,
    pressureAvg: 0, pressureMin: 0, pressureMax: 0,
    dewPointAvg: 0, windSpeedAvg: 0,
    rainfallTot: 0, // Default 0
  });

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
        const startUTC = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
        const endUTC = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));

        toast({ title: "Memuat Data Curah Hujan", description: `Untuk tanggal ${formatIdDateDash(targetDate)} (UTC)` });

        const raw = await fetchSensorDataByDateRange(sensorId, startUTC.getTime(), endUTC.getTime());
        const daily = aggregateDailyUTC(raw);

        if (daily.length > 0) {
          setReportData(daily[0]);
          toast({ title: "Sukses", description: `Data curah hujan berhasil dimuat.` });
        } else {
          // JIKA KOSONG: Set objek dummy dengan nilai 0 agar tidak error dan tetap tampil
          const zeroData: WeatherRecord = {
            date: targetDate.toISOString().split('T')[0],
            sampleCount: 0,
            temperatureAvg: 0, temperatureMin: 0, temperatureMax: 0,
            humidityAvg: 0, humidityMin: 0, humidityMax: 0,
            pressureAvg: 0, pressureMin: 0, pressureMax: 0,
            dewPointAvg: 0, windSpeedAvg: 0,
            rainfallTot: 0,
          };
          setReportData(zeroData);
          // Tidak perlu setError, karena "tidak hujan" atau "tidak ada data" tetap valid untuk ditampilkan laporannya
        }
      } catch (e: any) {
        const msg = e?.message || "Gagal memuat data.";
        setError(msg);
        // Fallback ke 0 jika error koneksi, supaya UI tidak crash
        setReportData(prev => ({ ...prev, rainfallTot: 0 }));
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

    setTimeout(() => {
      html2canvas(componentRef.current as HTMLElement, {
        useCORS: true,
        scale: 3,
        backgroundColor: null,
        onclone: (clonedDoc) => {
          const liquidBars = clonedDoc.getElementsByClassName('liquid-bar');
          for (let i = 0; i < liquidBars.length; i++) {
            (liquidBars[i] as HTMLElement).style.transition = 'none';
          }
        }
      })
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
    }, 100);
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
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleDownloadImage} disabled={loading}>
          <Download className="mr-2 h-4 w-4" /> Unduh Gambar
        </Button>
      </div>

      {error && <div className="no-print mx-auto mb-3 max-w-xl text-red-700 text-center p-4 bg-red-50 rounded-md">{error}</div>}

      <main ref={componentRef} className="mx-auto my-0 mb-6 w-full max-w-xl aspect-square bg-white text-gray-900 shadow-lg print:shadow-none relative overflow-hidden flex flex-col justify-between p-4">
        <header className="relative z-10">
          <div className="flex items-center gap-4">
            <img 
              src="/img/logo.webp" 
              alt="Logo" 
              width={56} 
              height={56} 
              className="h-14 w-14 object-contain" 
            />
            <div>
              <div className="text-base font-medium text-gray-600">Laporan Hujan Harian</div>
              <div className="text-xl font-bold text-gray-800">JERUKAGUNG METEOROLOGI</div>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center">
          {loading ? (
            <section className="text-center text-gray-600 py-10 animate-pulse">Menyiapkan laporan...</section>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-700">Akumulasi Curah Hujan 24 Jam</h2>
              <p className="text-base text-gray-500">{formatIdDateDash(selectedDate)}</p>
              <div className="my-6">
                {/* Visual Value akan minimal 1% jika ada hujan sedikit, tapi value asli tetap dipassing */}
                <RainMeasuringCup value={rainfall} />
              </div>
              <div className="text-5xl font-bold text-blue-600">
                {/* Menampilkan nilai ASLI, bukan nilai visual */}
                {rainfall.toFixed(2)} <span className="text-4xl font-medium text-gray-600 align-middle">mm</span>
              </div>
              <div className={cn("mt-2 text-xl font-semibold", rainfall > 0 ? "text-blue-800" : "text-gray-700")}>{category}</div>
            </>
          )}
        </div>

        <footer className="relative z-10 text-center">
          <p className="text-sm text-gray-500">
            Sensor: {sensorName} • <span style={{ opacity: 0.7 }}>Powered by</span> <strong style={{ color: "#1E3A8A" }}>Meteo Sense</strong>
          </p>
        </footer>
      </main>
    </div>
  );
}