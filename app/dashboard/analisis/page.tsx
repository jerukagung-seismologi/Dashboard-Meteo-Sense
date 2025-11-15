"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Download,
  ThermometerSun,
  Droplets,
  Gauge,
  Sprout,
  CloudRain,
  CloudRainWind,
  Calendar as CalendarIcon,
  Wind,
  Eye,
  Compass,
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import {
  fetchSensorData,
  fetchSensorDataByDateRange,
} from "@/lib/FetchingSensorData";
import type { SensorDate } from "@/lib/FetchingSensorData";
import ChartComponent from "@/components/ChartComponent";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Define the structure for selectable periods
interface Period {
  label: string;
  valueInMinutes: number;
}
// Define the structure for table data
interface WeatherData {
  timestamp: number;
  date: string; // Akan menggunakan dateFormatted dari SensorDate
  temperature: number;
  humidity: number;
  pressure: number;
  dew: number;
  rainfall: number;
  rainrate: number;
}

// Daftar periode yang bisa dipilih
const periods: Period[] = [
  { label: "30 Menit", valueInMinutes: 30 },
  { label: "1 Jam", valueInMinutes: 60 },
  { label: "3 Jam", valueInMinutes: 3 * 60 },
  { label: "6 Jam", valueInMinutes: 6 * 60 },
  { label: "12 Jam", valueInMinutes: 12 * 60 },
  { label: "24 Jam", valueInMinutes: 24 * 60 },
];

interface SensorOption {
  label: string;
  value: string;
}

export default function DataPage() {
  const { user } = useAuth();

  // State untuk data grafik (array terpisah)
  const [timestamps, setTimestamps] = useState<string[]>([]); // Akan menggunakan timeFormatted
  const [temperatures, setTemperatures] = useState<number[]>([]); //Float64
  const [humidity, setHumidity] = useState<number[]>([]); //Float64
  const [pressure, setPressure] = useState<number[]>([]); //Float64
  const [dew, setDew] = useState<number[]>([]); //Float64
  const [rainfall, setRainfall] = useState<number[]>([]); //Float64
  const [rainrate, setRainrate] = useState<number[]>([]); //Float64

  // State untuk data tabel
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State untuk tab
  const [activeTab, setActiveTab] = useState<"table" | "grafik">("table");

  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Jumlah item per halaman

  // State untuk sensor dan jumlah data
  const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[1]); // Default 1 Jam
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // State untuk mode dark
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Fetch user's devices from Firestore
  useEffect(() => {
    if (user?.uid) {
      const loadUserDevices = async () => {
        try {
          const devices = await fetchAllDevices(user.uid);
          if (devices.length > 0) {
            const options = devices
              .filter((device) => device.authToken) // Only include devices with an authToken
              .map((device) => ({
                label: device.name,
                value: device.authToken!,
              }));

            if (options.length > 0) {
              setSensorOptions(options);
              setSensorId(options[0].value); // Set the first sensor as default
            } else {
              setError("Tidak ada sensor yang dapat ditampilkan. Pastikan perangkat Anda memiliki authToken.");
              setSensorOptions([]);
              setSensorId("");
            }
          } else {
            setError("Tidak ada perangkat yang terhubung dengan akun Anda.");
            setSensorOptions([]);
            setSensorId("");
          }
        } catch (err) {
          setError("Gagal memuat daftar perangkat.");
          console.error(err);
        }
      };
      loadUserDevices();
    }
  }, [user]);

  // Fungsi untuk memproses dan mengatur state data
  const processAndSetData = (data: SensorDate[]) => {
    if (data.length > 0) {
      const fetchedTimestamps: string[] = data.map(d => d.timeFormatted || new Date(d.timestamp).toLocaleString('id-ID', { timeZone: "Asia/Jakarta" }));
      const fetchedTemperatures: number[] = data.map(d => d.temperature);
      const fetchedHumidity: number[] = data.map(d => d.humidity);
      const fetchedPressure: number[] = data.map(d => d.pressure);
      const fetchedDew: number[] = data.map(d => d.dew);
      const fetchedRainfall: number[] = data.map(d => d.rainfall);
      const fetchedRainrate: number[] = data.map(d => d.rainrate);

      setTimestamps(fetchedTimestamps);
      setTemperatures(fetchedTemperatures);
      setHumidity(fetchedHumidity);
      setPressure(fetchedPressure);
      setDew(fetchedDew);
      setRainfall(fetchedRainfall);
      setRainrate(fetchedRainrate);
      setError(null);
    } else {
      setTimestamps([]);
      setTemperatures([]);
      setHumidity([]);
      setPressure([]);
      setDew([]);
      setRainfall([]);
      setRainrate([]);
      setError("Tidak ada data yang tersedia untuk periode ini.");
    }
  };

  // Fetch data untuk pembaruan di background (polling)
  const updateData = useCallback(async () => {
    if (!sensorId) return;
    try {
      const dataPoints = selectedPeriod.valueInMinutes;
      const data = await fetchSensorData(sensorId, dataPoints);
      processAndSetData(data);
    } catch (err: any) {
      console.error("Gagal melakukan polling data:", err);
    }
  }, [sensorId, selectedPeriod]);

  // Fetch data untuk pemuatan awal atau refresh manual
  const fetchData = useCallback(async () => {
    if (!sensorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let data: SensorDate[];
      if (dateRange?.from && dateRange?.to) {
        // Fetch by date range if selected
        const startTimestamp = dateRange.from.getTime();
        const endTimestamp = dateRange.to.getTime();
        data = await fetchSensorDataByDateRange(
          sensorId,
          startTimestamp,
          endTimestamp
        );
      } else {
        // Fallback to fetch by period
        const dataPoints = selectedPeriod.valueInMinutes;
        data = await fetchSensorData(sensorId, dataPoints);
      }
      processAndSetData(data);
    } catch (err: any) {
      console.error("Error fetching data: ", err);
      setError(
        "Gagal mengambil data: " +
          (err.message || "Terjadi kesalahan tidak diketahui.")
      );
      setTimestamps([]);
      setTemperatures([]);
      setHumidity([]);
      setPressure([]);
      setDew([]);
      setRainfall([]);
      setRainrate([]);
    } finally {
      setLoading(false);
    }
  }, [sensorId, selectedPeriod, dateRange]);

  // Inisialisasi komponen dan refresh data
  useEffect(() => {
    if (sensorId) {
      fetchData(); // Panggil untuk pemuatan awal
    }

    // Atur interval untuk polling, hanya jika periode tertentu dipilih
    if (sensorId && selectedPeriod.valueInMinutes <= 60 && !dateRange) {
      // Contoh: polling untuk periode 1 jam atau kurang, dan tidak ada date range aktif
      const interval = setInterval(updateData, 60000); // Panggil updateData untuk polling
      return () => clearInterval(interval);
    }
  }, [fetchData, updateData, selectedPeriod.valueInMinutes, dateRange, sensorId]);

  // Deteksi mode dark dari Tailwind (class 'dark' pada html)
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    window.addEventListener('resize', checkDarkMode);
    // Juga listen ke perubahan class 'dark'
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('resize', checkDarkMode);
      observer.disconnect();
    };
  }, []);

  // Warna dinamis untuk dark/light mode
  const chartColors = {
    temperature: isDarkMode ? "#f87171" : "#ef4444",
    humidity: isDarkMode ? "#60a5fa" : "#3b82f6",
    pressure: isDarkMode ? "#fbbf24" : "#f59e0b",
    dew: isDarkMode ? "#34d399" : "#10b981",
    rainfall: isDarkMode ? "#22d3ee" : "#06b6d4",
    rainrate: isDarkMode ? "#c4b5fd" : "#a78bfa",
    heatIndex: isDarkMode ? "#fb923c" : "#f97316",
    windChill: isDarkMode ? "#7dd3fc" : "#0ea5e9",
  };

  // Fungsi untuk mengunduh data (contoh sederhana)
  const handleDownloadData = () => {
    if (timestamps.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }
    const headers = ["Waktu", "Suhu (°C)", "Kelembapan (%)", "Tekanan (hPa)", "Titik Embun (°C)", "Curah Hujan (mm)", "Laju Hujan (mm/jam)"];
    const rows = timestamps.map((time, i) =>
      `${time},${temperatures[i].toFixed(2)},${humidity[i].toFixed(2)},${pressure[i].toFixed(2)},${dew[i].toFixed(2)},${rainfall[i].toFixed(2)},${rainrate[i].toFixed(2)}`
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `data_sensor_${sensorId}_${new Date().toISOString()}.csv`);
    link.click();
    URL.revokeObjectURL(url); // Membersihkan URL objek setelah diunduh
  };

  // Fungsi untuk mendapatkan domain sumbu Y
  function getYAxisDomain(data: number[]) {
    if (data.length === 0) return [-1, 1];
    let min = Math.min(...data);
    let max = Math.max(...data);
    if (min === max) {
        min -= 1;
        max += 1;
    } else {
        const padding = (max - min) * 0.1;
        min -= padding;
        max += padding;
    }
    return [min, max];
  }

  // Pengaturan tata letak umum untuk grafik
  const commonLayout = {
    autosize: true,
    margin: { l: 60, r: 40, t: 40, b: 60 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: {
      family: "Roboto, sans-serif",
      color: "#64748b",
    },
    xaxis: {
      gridcolor: "rgba(203, 213, 225, 0.2)",
      title: {
        font: { size: 14, color: "#475569" },
      },
      nticks: 10,
    },
    yaxis: {
      gridcolor: "rgba(203, 213, 225, 0.2)",
      title: { font: { size: 14, color: "#475569" } },
      nticks: 10,
    },
    legend: {
      orientation: "h",
      y: -0.3,
      yanchor: 'top',
      font: { size: 12 },
    },
    hovermode: "closest" as const,
  };

  // Komponen Card untuk setiap grafik
  const ChartCard = ({ title, data, color, Icon, unit = "" }: 
    { title: string; data: number[]; color: string; Icon: React.FC<any>; unit?: string; }) => {
    const yDomain = getYAxisDomain(data);
    const chartData = [{
      x: timestamps,
      y: data,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      marker: { color },
      name: title,
      line: { color, width: 3 },
    }];
    const layout = {
      ...commonLayout,
      //title: { text: title, font: { size: 14 } },
      paper_bgcolor: isDarkMode ? "#1e293b" : "transparent",
      plot_bgcolor: isDarkMode ? "#1e293b" : "transparent",
      font: {
        family: "Roboto, sans-serif",
        color: isDarkMode ? "#cbd5e1" : "#64748b",
      },
      xaxis: {
        ...commonLayout.xaxis,
        gridcolor: isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)",
        title: {
          font: { size: 14, color: isDarkMode ? "#cbd5e1" : "#475569" },
        },
      },
      yaxis: {
        ...commonLayout.yaxis,
        title: { text: unit, font: { size: 14, color: isDarkMode ? "#cbd5e1" : "#475569" } },
        gridcolor: isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)",
        range: yDomain,
      },
    };

    return (
      <Card>
        <CardHeader className={`flex flex-row items-center gap-3 ${isDarkMode ? "bg-gray-800" : "bg-gray-50"} border-b py-3 px-6`}>
          <Icon className={`h-5 w-5`} style={{ color }} />
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartComponent data={chartData} layout={layout} />
        </CardContent>
      </Card>
    );
  };

  // Hitung Heat Index (Indeks Panas) - rumus sederhana
  const calculateHeatIndex = () => {
    return temperatures.map((temp, i) => {
      const rh = humidity[i];
      const T = temp;
      const R = rh;
      // Rumus Heat Index (Steadman)
      const HI = -8.78469475556 + 
                 1.61139411 * T + 
                 2.33854883889 * R + 
                 -0.14611605 * T * R + 
                 -0.012308094 * T * T + 
                 -0.0164248277778 * R * R + 
                 0.002211732 * T * T * R + 
                 0.00072546 * T * R * R + 
                 -0.000003582 * T * T * R * R;
      return HI;
    });
  };

  // Hitung Wind Chill (Suhu yang Terasa) - jika ada data angin (di sini diasumsikan 0)
  const calculateWindChill = () => {
    return temperatures.map((temp) => {
      // Rumus sederhana Wind Chill dengan asumsi kecepatan angin 0 km/h
      // Tanpa data angin, Wind Chill akan sama dengan suhu aktual
      return temp;
    });
  };

  // Comfort Index (Indeks Kenyamanan)
  const calculateComfortIndex = () => {
    return temperatures.map((temp, i) => {
      const rh = humidity[i];
      // Rumus sederhana: Comfort Index = Temperature - (0.55 - 0.55*RH/100) * (Temperature - 14.5)
      const CI = temp - (0.55 - 0.55 * (rh / 100)) * (temp - 14.5);
      return CI;
    });
  };

  const heatIndexData = calculateHeatIndex();
  const windChillData = calculateWindChill();
  const comfortIndexData = calculateComfortIndex();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Analisis dan Prediksi</h2>
          <p className="text-muted-foreground dark:text-gray-50">Analisis dan visualisasi data sensor cuaca</p>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"} border-b`}>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <Select
              value={sensorId}
              onValueChange={setSensorId}
              disabled={!sensorId}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Pilih Sensor" />
              </SelectTrigger>
              <SelectContent>
                {sensorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pilih rentang tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchData} disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""} ${isDarkMode ? "text-gray-200" : ""}`} />
              <span className="sr-only">Refresh data</span>
            </Button>

            <Button variant="outline" size="sm" className={`${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"}`} onClick={handleDownloadData}>
              <Download className="h-4 w-4 mr-1" /> Unduh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 bg-slate-100 dark:bg-slate-800">
          <div className="flex flex-wrap gap-2">
            {periods.map((period) => (
              <button
                key={period.label}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod?.label === period.label
                    ? isDarkMode
                      ? "bg-primary-700 text-white"
                      : "bg-primary-600 text-white"
                    : isDarkMode
                      ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-[400px]">
          <RefreshCw className={`h-8 w-8 animate-spin ${isDarkMode ? "text-primary-400" : "text-primary-500"}`} />
          <p className={`ml-4 ${isDarkMode ? "text-gray-200" : "text-gray-500"}`}>Memuat data...</p>
        </div>
      ) : error ? (
        <div className={`border p-4 rounded-md mb-6 ${isDarkMode ? "bg-red-950 border-red-900 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>{error}</div>
      ) : (
        <div className="space-y-6">
          <ChartCard title="Suhu Lingkungan" data={temperatures} color={chartColors.temperature} Icon={ThermometerSun} unit="°C" />
          <ChartCard title="Kelembapan Relatif" data={humidity} color={chartColors.humidity} Icon={Droplets} unit="%" />
          <ChartCard title="Tekanan Udara" data={pressure} color={chartColors.pressure} Icon={Gauge} unit="hPa" />
          <ChartCard title="Titik Embun" data={dew} color={chartColors.dew} Icon={Sprout} unit="°C" />
          <ChartCard title="Curah Hujan Kumulatif" data={rainfall} color={chartColors.rainfall} Icon={CloudRain} unit="mm" />
          <ChartCard title="Laju Hujan" data={rainrate} color={chartColors.rainrate} Icon={CloudRainWind} unit="mm/jam" />
          <ChartCard title="Indeks Panas (Heat Index)" data={heatIndexData} color={chartColors.heatIndex} Icon={ThermometerSun} unit="°C" />
          <ChartCard title="Indeks Kenyamanan" data={comfortIndexData} color={chartColors.windChill} Icon={Eye} unit="°C" />
        </div>
      )}
    </div>
  )
}
