"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ThermometerIcon,
  CloudRainIcon,
  WindIcon,
  GaugeIcon,
  RadioIcon,
  WifiIcon,
  WifiOffIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  ChevronRight,
  ExternalLink,
  Download,
  Plus,
  Trash2,
  ThermometerSun,
  Droplets,
  Sprout,
  CloudRainWind,
  EditIcon,
  Sun,
  Thermometer,
  Zap,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import Loading from "@/app/loading";
import { fetchAllDevices, Device } from "@/lib/FetchingDevice";
import {
  fetchSensorMetadata,
  fetchSensorData,
  SensorDate,
  fetchSensorDataByDateRange,
  fetchSensorDataByValue,
  deleteSensorData,
  editSensorDataByTimestamp,
  deleteSensorDataByTimestamp,
} from "@/lib/FetchingSensorData";
import { fetchRecentAlerts, LogEvent } from "@/lib/FetchingLogs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import dynamic from "next/dynamic";

const ChartComponent = dynamic(() => import("@/components/ChartComponent"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />,
});

// Define the structure for selectable periods
interface Period {
  label: string;
  valueInMinutes: number;
}

// Define the structure for table data
interface WeatherData {
  timestamp: number;
  date: string;
  temperature: number;
  humidity: number;
  pressure: number;
  dew: number;
  rainfall: number;
  rainrate: number;
  lux: number;
  soil_temp: number;
  volt: number;
}

interface SensorFieldConfig {
  key: keyof WeatherData;
  label: string;
  unit: string;
  step: string;
  min?: string;
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

// Konfigurasi field sensor untuk input fields
const sensorFields: SensorFieldConfig[] = [
  { key: "temperature", label: "Suhu (°C)", unit: "°C", step: "0.01" },
  { key: "humidity", label: "Kelembapan (%)", unit: "%", step: "0.01", min: "0" },
  { key: "pressure", label: "Tekanan (hPa)", unit: "hPa", step: "0.01" },
  { key: "dew", label: "Titik Embun (°C)", unit: "°C", step: "0.01" },
  { key: "rainfall", label: "Curah Hujan (mm)", unit: "mm", step: "0.01", min: "0" },
  { key: "rainrate", label: "Laju Hujan (mm/jam)", unit: "mm/jam", step: "0.01", min: "0" },
  { key: "lux", label: "Intensitas Cahaya (lux)", unit: "lux", step: "0.01", min: "0" },
  { key: "soil_temp", label: "Suhu Tanah (°C)", unit: "°C", step: "0.01" },
  { key: "volt", label: "Tegangan (V)", unit: "V", step: "0.01", min: "0" },
];

interface SensorOption {
  label: string;
  value: string;
}

const ChartSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-3 bg-gray-50 dark:bg-gray-800 border-b py-3 px-6">
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-6 w-1/3" />
    </CardHeader>
    <CardContent className="pt-6">
      <Skeleton className="h-[300px] w-full" />
    </CardContent>
  </Card>
);

export default function DataPage() {
  const { user } = useAuth();

  // State untuk data grafik (array terpisah)
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [temperatures, setTemperatures] = useState<number[]>([]);
  const [humidity, setHumidity] = useState<number[]>([]);
  const [pressure, setPressure] = useState<number[]>([]);
  const [dew, setDew] = useState<number[]>([]);
  const [rainfall, setRainfall] = useState<number[]>([]);
  const [rainrate, setRainrate] = useState<number[]>([]);
  const [lights, setLights] = useState<number[]>([]);
  const [soilTemps, setSoilTemps] = useState<number[]>([]);
  const [volts, setVolts] = useState<number[]>([]);

  // State untuk data tabel
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "grafik">("table");

  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // State untuk sensor dan jumlah data
  const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[1]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // State untuk mode dark
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modal states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<WeatherData | null>(null);
  const [deleteRowIndex, setDeleteRowIndex] = useState<number | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<WeatherData | null>(null);

  // State untuk pencarian
  const [searchField, setSearchField] = useState<string>("temperature");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch user's devices from Firestore
  useEffect(() => {
    if (user?.uid) {
      const loadUserDevices = async () => {
        try {
          const devices = await fetchAllDevices(user.uid);
          if (devices.length > 0) {
            const options = devices
              .filter((device) => device.authToken)
              .map((device) => ({
                label: device.name,
                value: device.authToken!,
              }));

            if (options.length > 0) {
              setSensorOptions(options);
              setSensorId(options[0].value);
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

  // Reset halaman saat item per halaman berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Helper function to reset chart states
  const resetChartStates = () => {
    setTimestamps([]);
    setTemperatures([]);
    setHumidity([]);
    setPressure([]);
    setDew([]);
    setRainfall([]);
    setRainrate([]);
    setLights([]);
    setSoilTemps([]);
    setVolts([]);
  };

  // Fungsi untuk memproses dan mengatur state data tabel
  const processTableData = (data: SensorDate[]) => {
    if (data.length > 0) {
      const dataArray: WeatherData[] = data.map((entry) => ({
        timestamp: entry.timestamp,
        date: entry.dateFormatted || new Date(entry.timestamp).toLocaleString('id-ID', { timeZone: "Asia/Jakarta" }),
        temperature: entry.temperature,
        humidity: entry.humidity,
        pressure: entry.pressure,
        dew: entry.dew,
        rainfall: entry.rainfall,
        rainrate: entry.rainrate,
        lux: entry.lux ?? 0,
        soil_temp: entry.soil_temp ?? 0,
        volt: entry.volt ?? 0,
      }));
      setWeatherData(dataArray.reverse());
      setError(null);
      setCurrentPage(1);
    } else {
      setWeatherData([]);
      setError("Tidak ada data yang cocok dengan pencarian Anda.");
    }
  };

  // Fungsi untuk memproses dan mengatur state data grafik dan tabel
  const processAndSetData = (data: SensorDate[]) => {
    if (data.length > 0) {
      const fetchedTimestamps: string[] = data.map(d => d.timeFormatted || new Date(d.timestamp).toLocaleString('id-ID', { timeZone: "Asia/Jakarta" }));
      const fetchedTemperatures: number[] = data.map(d => d.temperature);
      const fetchedHumidity: number[] = data.map(d => d.humidity);
      const fetchedPressure: number[] = data.map(d => d.pressure);
      const fetchedDew: number[] = data.map(d => d.dew);
      const fetchedRainfall: number[] = data.map(d => d.rainfall);
      const fetchedRainrate: number[] = data.map(d => d.rainrate);
      const fetchedLights: number[] = data.map(d => d.lux ?? 0);
      const fetchedSoilTemps: number[] = data.map(d => d.soil_temp ?? 0);
      const fetchedVolts: number[] = data.map(d => d.volt ?? 0);

      setTimestamps(fetchedTimestamps);
      setTemperatures(fetchedTemperatures);
      setHumidity(fetchedHumidity);
      setPressure(fetchedPressure);
      setDew(fetchedDew);
      setRainfall(fetchedRainfall);
      setRainrate(fetchedRainrate);
      setLights(fetchedLights);
      setSoilTemps(fetchedSoilTemps);
      setVolts(fetchedVolts);

      processTableData(data);
    } else {
      resetChartStates();
      setWeatherData([]);
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
        const startTimestamp = dateRange.from.getTime();
        const endTimestamp = dateRange.to.getTime();
        data = await fetchSensorDataByDateRange(
          sensorId,
          startTimestamp,
          endTimestamp
        );
      } else {
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
      resetChartStates();
      setWeatherData([]);
    } finally {
      setLoading(false);
    }
  }, [sensorId, selectedPeriod, dateRange]);

  // Fungsi untuk menangani pencarian
  const handleSearch = useCallback(async () => {
    if (!sensorId || !searchQuery) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const value = parseFloat(searchQuery);
      if (isNaN(value)) {
        setError("Nilai pencarian harus berupa angka.");
        setLoading(false);
        return;
      }
      const data = await fetchSensorDataByValue(sensorId, searchField, value);
      processTableData(data);
      setActiveTab("table");
    } catch (err: any) {
      console.error("Error searching data: ", err);
      setError("Gagal melakukan pencarian: " + (err.message || "Terjadi kesalahan."));
      setWeatherData([]);
    } finally {
      setLoading(false);
    }
  }, [sensorId, searchField, searchQuery]);

  // Inisialisasi komponen dan refresh data
  useEffect(() => {
    if (sensorId) {
      fetchData();
    }

    if (sensorId && selectedPeriod.valueInMinutes <= 60 && !dateRange) {
      const interval = setInterval(updateData, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchData, updateData, selectedPeriod.valueInMinutes, dateRange, sensorId]);

  // Deteksi mode dark dari Tailwind
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    window.addEventListener('resize', checkDarkMode);
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
    lux: isDarkMode ? "#fcd34d" : "#f59e0b",
    soil_temp: isDarkMode ? "#fb7185" : "#ef4444",
    volt: isDarkMode ? "#4ade80" : "#22c55e",
  };

  // Fungsi untuk menghapus data sensor
  const handleDeleteSensorData = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua riwayat data untuk sensor ini? Tindakan ini tidak dapat diurungkan.")) {
      setIsDeleting(true);
      setError(null);
      try {
        await deleteSensorData(sensorId);
        resetChartStates();
        setWeatherData([]);
        setCurrentPage(1);
      } catch (err: any) {
        console.error(err);
        setError("Gagal menghapus data sensor: " + err.message);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Helper function to close modals
  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingIndex(null);
    setEditForm(null);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setAddForm(null);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteRowIndex(null);
  };

  // Fungsi untuk membuka modal edit
  const openEditModal = (row: WeatherData, index: number) => {
    setEditingIndex(index);
    setEditForm({ ...row });
    setEditModalOpen(true);
  };

  // Fungsi untuk membuka modal tambah data
  const openAddModal = () => {
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setAddForm({
      timestamp: 0,
      date: "",
      temperature: 0,
      humidity: 0,
      pressure: 0,
      dew: 0,
      rainfall: 0,
      rainrate: 0,
      lux: 0,
      soil_temp: 0,
      volt: 0,
    });
    setAddModalOpen(true);
  };

  // Fungsi untuk menyimpan perubahan edit
  const handleEditSave = async () => {
    if (!editForm || editingIndex === null) return;
    try {
      await editSensorDataByTimestamp(sensorId, editForm.timestamp, {
        temperature: editForm.temperature,
        humidity: editForm.humidity,
        pressure: editForm.pressure,
        dew: editForm.dew,
        rainfall: editForm.rainfall,
        rainrate: editForm.rainrate,
        lux: editForm.lux,
        soil_temp: editForm.soil_temp,
        volt: editForm.volt,
      });

      if (searchQuery) {
        await handleSearch();
      } else {
        const updatedData = [...weatherData];
        updatedData[editingIndex] = { ...editForm };
        setWeatherData(updatedData);
      }

      closeEditModal();
    } catch (err: any) {
      alert("Gagal mengedit data: " + (err.message || "Terjadi kesalahan."));
    }
  };

  // Fungsi untuk simpan data baru
  const handleAddSave = async () => {
    if (!addForm) return;
    const ts = new Date(addForm.date).getTime();
    if (Number.isNaN(ts)) {
      alert("Tanggal/Waktu tidak valid.");
      return;
    }
    try {
      await editSensorDataByTimestamp(sensorId, ts, {
        temperature: Number(addForm.temperature),
        humidity: Number(addForm.humidity),
        pressure: Number(addForm.pressure),
        dew: Number(addForm.dew),
        rainfall: Number(addForm.rainfall),
        rainrate: Number(addForm.rainrate),
        lux: Number(addForm.lux),
        soil_temp: Number(addForm.soil_temp),
        volt: Number(addForm.volt),
      });
      closeAddModal();
      await fetchData();
    } catch (err: any) {
      alert("Gagal menambahkan data: " + (err.message || "Terjadi kesalahan."));
    }
  };

  // Fungsi untuk membuka modal konfirmasi hapus
  const openDeleteModal = (index: number) => {
    setDeleteRowIndex(index);
    setDeleteModalOpen(true);
  };

  // Fungsi untuk menghapus data sensor pada baris tertentu
  const handleDeleteRowConfirmed = async () => {
    if (deleteRowIndex === null) return;
    const row = weatherData[deleteRowIndex];
    try {
      await deleteSensorDataByTimestamp(sensorId, row.timestamp);
      const updatedData = [...weatherData];
      updatedData.splice(deleteRowIndex, 1);
      setWeatherData(updatedData);
      closeDeleteModal();
    } catch (err: any) {
      alert("Gagal menghapus data: " + (err.message || "Terjadi kesalahan."));
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(weatherData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = weatherData.slice(indexOfFirstItem, indexOfLastItem);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Fungsi untuk menangani perubahan periode
  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    setDateRange(undefined);
    if (searchQuery) {
      setSearchQuery("");
      fetchData();
    }
  };

  // Fungsi untuk menangani reset pencarian
  const handleResetSearch = () => {
    setSearchQuery("");
    fetchData();
  };

  // Fungsi untuk mengunduh data
  const handleDownloadData = () => {
    if (weatherData.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }
    const headers = ["Waktu", "Suhu (°C)", "Kelembapan (%)", "Tekanan (hPa)", "Titik Embun (°C)", "Curah Hujan (mm)", "Laju Hujan (mm/jam)", "Cahaya (lux)", "Suhu Tanah (°C)", "Tegangan (V)"];
    const rows = weatherData.map(entry =>
      `${entry.date},${fmt2(entry.temperature)},${fmt2(entry.humidity)},${fmt2(entry.pressure)},${fmt2(entry.dew)},${fmt2(entry.rainfall)},${fmt2(entry.rainrate)},${fmt2(entry.lux)},${fmt2(entry.soil_temp)},${fmt2(entry.volt)}`
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `data_sensor_${sensorId}_${new Date().toISOString()}.csv`);
    link.click();
    URL.revokeObjectURL(url);
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
    hovermode: "",
  };

  // Komponen Card untuk setiap grafik
  const ChartCard = ({ title, data, color, Icon, unit = "" }: 
    { title: string; data: number[]; color: string; Icon: React.FC<any>; unit?: string; }) => {
    const yDomain = getYAxisDomain(data);
    const chartData = [{
      x: timestamps,
      y: data,
      type: "scatter",
      mode: "lines+markers",
      marker: { color },
      name: title,
      line: { color, width: 3 },
    }];
    const layout = {
      ...commonLayout,
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

  // Komponen untuk render input field
  const SensorInput = ({ 
    field, 
    value, 
    onChange, 
    isDark 
  }: { 
    field: SensorFieldConfig; 
    value: number; 
    onChange: (val: number) => void;
    isDark: boolean;
  }) => (
    <div>
      <label className="block text-sm mb-1">{field.label}</label>
      <input
        type="number"
        step={field.step}
        min={field.min}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={`w-full px-3 py-2 rounded border ${isDark ? "bg-gray-800 text-gray-200 border-gray-700" : "bg-gray-50 border-gray-300"}`}
        required
      />
    </div>
  );

  // helper format 2 desimal
  const fmt2 = (n: number) => Number.isFinite(n) ? n.toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Data Editor</h2>
          <p className="text-muted-foreground dark:text-gray-50">Pengelolaan data sensor</p>
        </div>
      </div>
      
      {/* Global Controls Card */}
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

            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => setItemsPerPage(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Item per Halaman" />
              </SelectTrigger>
              <SelectContent>
                {[15, 20, 50, 70, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / Halaman
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Cari berdasarkan..." />
                </SelectTrigger>
                <SelectContent>
                  {sensorFields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Masukkan nilai..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[150px]"
              />
              <Button onClick={handleSearch} disabled={loading || !searchQuery}>
                Cari
              </Button>
              {searchQuery && (
                <Button variant="ghost" onClick={handleResetSearch} disabled={loading}>
                  Reset
                </Button>
              )}
            </div>

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
                        {new Date(dateRange.from).toLocaleDateString("id-ID", { month: "short", day: "2-digit", year: "numeric" })} -{" "}
                        {new Date(dateRange.to).toLocaleDateString("id-ID", { month: "short", day: "2-digit", year: "numeric" })}
                      </>
                    ) : (
                      new Date(dateRange.from).toLocaleDateString("id-ID", { month: "short", day: "2-digit", year: "numeric" })
                    )
                  ) : (
                    <span>Pilih rentang tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  autoFocus
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
              onClick={fetchData} 
              disabled={loading}
            >
              <RefreshCwIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""} ${isDarkMode ? "text-gray-200" : ""}`} />
              <span className="sr-only">Refresh data</span>
            </Button>

            <Button variant="outline" size="sm" className={`${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"}`} onClick={handleDownloadData}>
              <Download className="h-4 w-4 mr-1" /> Unduh Data
            </Button>

            <Button variant="outline" size="sm" className={`${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"}`} onClick={openAddModal}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Data
            </Button>

            <Button variant="destructive" size="sm" onClick={handleDeleteSensorData} disabled={isDeleting || loading}>
              <Trash2 className={`h-4 w-4 mr-1 ${isDarkMode ? "text-gray-200" : ""}`} /> {isDeleting ? "Menghapus..." : "Hapus Data"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 bg-slate-100 dark:bg-slate-800">
          <div className="flex flex-wrap gap-2">
            {periods.map((period) => (
              <button
                key={period.label}
                onClick={() => handlePeriodChange(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod?.label === period.label && !dateRange
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

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'table'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('table')}
        >
          Data Tabel
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'grafik'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('grafik')}
        >
          Grafik
        </button>
      </div>

      {/* Tab Content */}
      {error ? (
        <div className={`border p-4 rounded-md mb-6 ${isDarkMode ? "bg-red-950 border-red-900 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>{error}</div>
      ) : (
        <>
          {/* Data Table Content */}
          {activeTab === 'table' && (
            loading ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          {[...Array(11)].map((_, i) => (
                            <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                              <Skeleton className="h-4 w-20" />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                        {[...Array(itemsPerPage)].map((_, i) => (
                          <tr key={i}>
                            {[...Array(11)].map((_, j) => (
                              <td key={j} className="px-6 py-4 whitespace-nowrap">
                                <Skeleton className="h-4 w-full" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={isDarkMode ? "bg-gray-800 text-left" : "bg-gray-50 dark:bg-gray-800 text-left"}>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Waktu</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Suhu (°C)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Kelembapan (%)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Tekanan (hPa)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Titik Embun (°C)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Curah Hujan (mm)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Laju Hujan (mm/j)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Cahaya (lux)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Suhu Tanah (°C)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Tegangan (V)</th>
                          <th className={`p-3 font-medium ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"} border-b`}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody id="datalogger">
                        {currentTableData.length === 0 ? (
                          <tr>
                            <td colSpan={11} className={`p-8 text-center ${isDarkMode ? "text-gray-200" : "text-gray-600 dark:text-gray-300"}`}>
                              Tidak ada data yang tersedia.
                            </td>
                          </tr>
                        ) : (
                          currentTableData.map((entry, index) => (
                            <tr
                              key={index}
                              className={isDarkMode
                                ? (index % 2 === 0 ? "bg-gray-900" : "bg-gray-800")
                                : (index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800")}
                            >
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{entry.date}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.temperature)}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.humidity)}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.pressure)}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.dew)}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.rainfall)}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.rainrate)}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.lux)}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.soil_temp)}</td>
                              <td className={`p-3 border-t ${isDarkMode ? "text-gray-200" : ""}`}>{fmt2(entry.volt)}</td>
                              <td className={`p-3 border-t flex gap-2`}>
                                <button
                                  className={`p-2 rounded hover:bg-primary-100 dark:hover:bg-primary-900`}
                                  title="Edit"
                                  onClick={() => openEditModal(entry, indexOfFirstItem + index)}
                                >
                                  <EditIcon className={`h-4 w-4 ${isDarkMode ? "text-primary-300" : "text-primary-600"}`} />
                                </button>
                                <button
                                  className={`p-2 rounded hover:bg-red-100 dark:hover:bg-red-900`}
                                  title="Hapus"
                                  onClick={() => openDeleteModal(indexOfFirstItem + index)}
                                >
                                  <Trash2 className={`h-4 w-4 ${isDarkMode ? "text-red-300" : "text-red-600"}`} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {weatherData.length > itemsPerPage && (
                    <div className="flex items-center justify-between p-4 border-t bg-slate-200 dark:bg-slate-700">
                      <Button onClick={handlePreviousPage} disabled={currentPage === 1} variant="outline">
                        Sebelumnya
                      </Button>
                      <span className="text-sm text-gray-800 dark:text-gray-200">
                        Halaman {currentPage} dari {totalPages}
                      </span>
                      <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline">
                        Berikutnya
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          )}

          {/* Grafik Content */}
          {activeTab === 'grafik' && (
            loading ? (
              <div className="space-y-6">
                {[...Array(9)].map((_, i) => <ChartSkeleton key={i} />)}
              </div>
            ) : (
              <div className="space-y-6">
                <ChartCard title="Suhu Lingkungan" data={temperatures} color={chartColors.temperature} Icon={ThermometerSun} unit="°C" />
                <ChartCard title="Kelembapan Relatif" data={humidity} color={chartColors.humidity} Icon={Droplets} unit="%" />
                <ChartCard title="Tekanan Udara" data={pressure} color={chartColors.pressure} Icon={GaugeIcon} unit="hPa" />
                <ChartCard title="Titik Embun" data={dew} color={chartColors.dew} Icon={Sprout} unit="°C" />
                <ChartCard title="Curah Hujan Kumulatif" data={rainfall} color={chartColors.rainfall} Icon={CloudRainIcon} unit="mm" />
                <ChartCard title="Laju Hujan Per Jam" data={rainrate} color={chartColors.rainrate} Icon={CloudRainWind} unit="mm/jam" />
                <ChartCard title="Intensitas Cahaya" data={lights} color={chartColors.lux} Icon={Sun} unit="lux" />
                <ChartCard title="Suhu Tanah" data={soilTemps} color={chartColors.soil_temp} Icon={Thermometer} unit="°C" />
                <ChartCard title="Tegangan Listrik" data={volts} color={chartColors.volt} Icon={Zap} unit="V" />
              </div>
            )
          )}
        </>
      )}

      {/* Modal Edit Data */}
      {editModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-40">
          <Card className={`w-full max-w-md mx-auto ${isDarkMode ? "bg-gray-900" : "bg-white"}`}>
            <CardHeader>
              <CardTitle>Edit Data Sensor</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleEditSave();
                }}
                className="space-y-4 max-h-[70vh] overflow-y-auto"
              >
                {sensorFields.map((field) => (
                  <SensorInput
                    key={field.key}
                    field={field}
                    value={editForm[field.key] as number}
                    onChange={(val) => setEditForm({ ...editForm, [field.key]: val })}
                    isDark={isDarkMode}
                  />
                ))}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeEditModal}>
                    Batal
                  </Button>
                  <Button type="submit" variant="default">
                    Simpan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Tambah Data */}
      {addModalOpen && addForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <Card className={`w-full max-w-md mx-auto ${isDarkMode ? "bg-gray-900" : "bg-white"}`}>
            <CardHeader>
              <CardTitle>Tambah Data Sensor</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddSave();
                }}
                className="space-y-4 max-h-[70vh] overflow-y-auto"
              >
                <div>
                  <label className="block text-sm mb-1">Tanggal & Waktu</label>
                  <input
                    type="datetime-local"
                    value={addForm.date}
                    onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${isDarkMode ? "bg-gray-800 text-gray-200 border-gray-700" : "bg-gray-50 border-gray-300"}`}
                    required
                  />
                </div>
                {sensorFields.map((field) => (
                  <SensorInput
                    key={field.key}
                    field={field}
                    value={addForm[field.key] as number}
                    onChange={(val) => setAddForm({ ...addForm, [field.key]: val })}
                    isDark={isDarkMode}
                  />
                ))}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeAddModal}>
                    Batal
                  </Button>
                  <Button type="submit" variant="default">
                    Simpan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteModalOpen && deleteRowIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <Card className={`w-full max-w-sm mx-auto ${isDarkMode ? "bg-gray-900" : "bg-white"}`}>
            <CardHeader>
              <CardTitle>Konfirmasi Hapus Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat diurungkan.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDeleteModal}>
                  Tidak
                </Button>
                <Button variant="destructive" onClick={handleDeleteRowConfirmed}>
                  Ya, Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
