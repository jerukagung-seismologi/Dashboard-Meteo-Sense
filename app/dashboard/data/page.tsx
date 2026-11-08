"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CloudRainIcon,
  GaugeIcon,
  RadioIcon,
  RefreshCwIcon,
  CalendarIcon,
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
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  CalendarDays,
  Search,
} from "lucide-react";
import { format, isSameDay, subDays, addDays, startOfDay, endOfDay, isFuture } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import Loading from "@/app/loading";
import { fetchAllDevices, Device } from "@/lib/FetchingDevice";
import { PageHeaderBanner } from "@/components/ui/PageHeaderBanner";
import {
  getStoredActiveSensorId,
  setStoredActiveSensorId,
  resolveActiveSensorId,
} from "@/lib/activeSensorStorage";
import {
  SensorDate,
  deleteSensorData,
  editSensorDataByTimestamp,
  deleteSensorDataByTimestamp,
} from "@/lib/FetchingSensorData";
import {
  fetchSensorMetadata,
  fetchSensorData,
  fetchSensorDataByDateRange,
  fetchSensorDataByValue,
} from "@/lib/apiClient";
import { filterByTimeRange, getPlotlyTimeJakarta } from "@/lib/timeUtils";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
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
  { label: "15 Menit", valueInMinutes: 15 },
  { label: "30 Menit", valueInMinutes: 30 },
  { label: "1 Jam", valueInMinutes: 60 },
  { label: "3 Jam", valueInMinutes: 3 * 60 },
  { label: "6 Jam", valueInMinutes: 6 * 60 },
  { label: "12 Jam", valueInMinutes: 12 * 60 },
  { label: "24 Jam", valueInMinutes: 24 * 60 },
];

// Preset skala waktu lebih pendek (Button Select)
const shortPeriods: { label: string; shortLabel: string; valueInMinutes: number }[] = [
  { label: "1 Jam", shortLabel: "1J", valueInMinutes: 60 },
  { label: "3 Jam", shortLabel: "3J", valueInMinutes: 3 * 60 },
  { label: "6 Jam", shortLabel: "6J", valueInMinutes: 6 * 60 },
  { label: "12 Jam", shortLabel: "12J", valueInMinutes: 12 * 60 },
  { label: "24 Jam", shortLabel: "24J", valueInMinutes: 24 * 60 },
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

  // State untuk data grafik (array terpisah untuk Plotly)
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
  const [sensorId, setSensorId] = useState<string>(() => getStoredActiveSensorId() || "");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[1]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi ukuran layar responsif untuk popover kalender
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
              const activeId = resolveActiveSensorId(options);
              setSensorId(activeId);
              const matched = options.find((o) => o.value === activeId);
              setStoredActiveSensorId(activeId, { label: matched?.label });
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
      const fetchedTimestamps: string[] = data.map((d) => getPlotlyTimeJakarta(d.timestamp));
      const fetchedTemperatures: number[] = data.map((d) => d.temperature);
      const fetchedHumidity: number[] = data.map((d) => d.humidity);
      const fetchedPressure: number[] = data.map((d) => d.pressure);
      const fetchedDew: number[] = data.map((d) => d.dew);
      const fetchedRainfall: number[] = data.map((d) => d.rainfall);
      const fetchedRainrate: number[] = data.map((d) => d.rainrate);
      const fetchedLights: number[] = data.map((d) => d.lux ?? 0);
      const fetchedSoilTemps: number[] = data.map((d) => d.soil_temp ?? 0);
      const fetchedVolts: number[] = data.map((d) => d.volt ?? 0);

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
      const rangeMs = selectedPeriod.valueInMinutes * 60000;
      const now = Date.now();
      const rawData = await fetchSensorDataByDateRange(sensorId, now - rangeMs, now, false);
      const data = filterByTimeRange(rawData, rangeMs);
      processAndSetData(data);
    } catch (err: any) {
      console.error("Gagal melakukan polling data:", err);
    }
  }, [sensorId, selectedPeriod]);

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (!sensorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let data: SensorDate[];
      if (dateRange?.from) {
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const startTimestamp = fromDate.getTime();
        const endTimestamp = toDate.getTime();
        const durationHours = (endTimestamp - startTimestamp) / (1000 * 3600);
        const resolution = durationHours > 72 ? "hourly" : "raw";
        data = await fetchSensorDataByDateRange(
          sensorId,
          startTimestamp,
          endTimestamp,
          false,
          forceRefresh,
          resolution
        );
      } else {
        const rangeMs = selectedPeriod.valueInMinutes * 60000;
        const now = Date.now();
        const rawData = await fetchSensorDataByDateRange(sensorId, now - rangeMs, now, false, forceRefresh);
        data = filterByTimeRange(rawData, rangeMs);
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

  const handleManualRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

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
      const data = await fetchSensorDataByValue(sensorId, searchField, value, false);
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

  // Helper mendapatkan tanggal aktif saat ini
  const getActiveDay = useCallback(() => {
    if (dateRange?.from) {
      return new Date(dateRange.from);
    }
    return new Date();
  }, [dateRange]);

  // Geser 1 hari ke belakang (Lihat data 24 Jam Hari Kemarin)
  const handlePrevDay = useCallback(() => {
    const current = getActiveDay();
    const prev = subDays(current, 1);
    const start = startOfDay(prev);
    const end = endOfDay(prev);
    setDateRange({ from: start, to: end });
    if (searchQuery) setSearchQuery("");
  }, [getActiveDay, searchQuery]);

  // Geser 1 hari ke depan (Lihat data 24 Jam Hari Selanjutnya)
  const handleNextDay = useCallback(() => {
    const current = getActiveDay();
    const next = addDays(current, 1);
    const now = new Date();
    if (startOfDay(next) > startOfDay(now)) return; // Tidak boleh melampaui hari ini
    const start = startOfDay(next);
    const end = isSameDay(next, now) ? endOfDay(now) : endOfDay(next);
    setDateRange({ from: start, to: end });
    if (searchQuery) setSearchQuery("");
  }, [getActiveDay, searchQuery]);

  // Langsung ke 24 jam hari kemarin
  const handleGoToYesterday = useCallback(() => {
    const now = new Date();
    const yesterday = subDays(now, 1);
    const start = startOfDay(yesterday);
    const end = endOfDay(yesterday);
    setDateRange({ from: start, to: end });
    if (searchQuery) setSearchQuery("");
  }, [searchQuery]);

  // Reset kembali ke mode live streaming
  const handleResetToLive = useCallback(() => {
    setDateRange(undefined);
    if (searchQuery) setSearchQuery("");
  }, [searchQuery]);

  // Cek apakah tombol hari selanjutnya dinonaktifkan
  const isNextDayDisabled = useMemo(() => {
    const current = getActiveDay();
    return isSameDay(current, new Date()) || isFuture(current);
  }, [getActiveDay]);

  const isCustomDateActive = Boolean(dateRange?.from);

  // Cek apakah preset rentang luar aktif
  const isPresetActive = useCallback((days: number) => {
    if (!dateRange?.from || !dateRange?.to) return false;
    const now = new Date();
    const expectedFrom = startOfDay(subDays(now, days - 1));
    const expectedTo = endOfDay(now);
    return isSameDay(dateRange.from, expectedFrom) && isSameDay(dateRange.to, expectedTo);
  }, [dateRange]);

  // Handler memilih preset rentang luar (Mingguan, Dasarian, Bulanan, 24 Jam)
  const handleApplyExternalPreset = useCallback((type: "24h" | "weekly" | "dasarian" | "monthly") => {
    if (type === "24h") {
      const p24 = periods.find(p => p.valueInMinutes === 24 * 60) || periods[6];
      setSelectedPeriod(p24);
      setDateRange(undefined);
      if (searchQuery) setSearchQuery("");
      return;
    }
    const now = new Date();
    let days = 7;
    if (type === "weekly") days = 7;
    else if (type === "dasarian") days = 10;
    else if (type === "monthly") days = 30;

    const start = startOfDay(subDays(now, days - 1));
    const end = endOfDay(now);
    setDateRange({ from: start, to: end });
    if (searchQuery) setSearchQuery("");
  }, [searchQuery]);

  // Handler memilih preset skala waktu pendek (Button Select)
  const handleSelectShortPeriod = useCallback((periodMinutes: number) => {
    const match = periods.find((p) => p.valueInMinutes === periodMinutes) || {
      label: `${periodMinutes / 60} Jam`,
      valueInMinutes: periodMinutes,
    };
    setSelectedPeriod(match);
    setDateRange(undefined);
    if (searchQuery) setSearchQuery("");
  }, [searchQuery]);

  // Nilai preset rentang panjang aktif (untuk Dropdown)
  const activeLongPreset = useMemo(() => {
    if (isPresetActive(7)) return "weekly";
    if (isPresetActive(10)) return "dasarian";
    if (isPresetActive(30)) return "monthly";
    return "";
  }, [isPresetActive]);

  // Label tampilan periode aktif
  const dateIndicatorLabel = useMemo(() => {
    if (!dateRange?.from) {
      return `${selectedPeriod.label} Terakhir`;
    }
    const fromStr = format(dateRange.from, "dd MMM yyyy", { locale: id });
    if (dateRange.to && !isSameDay(dateRange.from, dateRange.to)) {
      const toStr = format(dateRange.to, "dd MMM yyyy", { locale: id });
      if (isPresetActive(7)) return `Mingguan: ${fromStr} – ${toStr}`;
      if (isPresetActive(10)) return `Dasarian: ${fromStr} – ${toStr}`;
      if (isPresetActive(30)) return `Bulanan: ${fromStr} – ${toStr}`;
      return `${fromStr} – ${toStr}`;
    }
    return format(dateRange.from, "EEEE, dd MMMM yyyy", { locale: id });
  }, [dateRange, selectedPeriod, isPresetActive]);

  // Badge status periode aktif
  const dateIndicatorBadge = useMemo(() => {
    if (!dateRange?.from) return selectedPeriod.label;
    if (isPresetActive(7)) return "7 Hari";
    if (isPresetActive(10)) return "10 Hari";
    if (isPresetActive(30)) return "30 Hari";
    if (dateRange.to && !isSameDay(dateRange.from, dateRange.to)) return "Multi-Hari";
    return "1 Hari";
  }, [dateRange, selectedPeriod, isPresetActive]);

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

  // Fungsi untuk mendapatkan domain sumbu Y berbasis data aktual (BUKAN 0!)
  function getYAxisDomain(data: number[], unit: string = "") {
    const valid = data.filter((v) => typeof v === "number" && Number.isFinite(v) && !Number.isNaN(v));
    if (valid.length === 0) return [-1, 1];

    if (unit === "mm" || unit === "mm/jam") {
      const max = Math.max(...valid);
      return [0, max > 0 ? Number((max * 1.1).toFixed(2)) : 10];
    }

    let min = Math.min(...valid);
    let max = Math.max(...valid);

    if (min === max) {
      min -= 1;
      max += 1;
    } else {
      const padding = (max - min) * 0.05;
      min -= padding;
      max += padding;
    }

    if (unit === "%") {
      min = Math.max(0, min);
      max = Math.min(100, max);
    }

    return [Number(min.toFixed(2)), Number(max.toFixed(2))];
  }

  // Pengaturan tata letak umum untuk grafik Plotly
  const commonLayout = {
    autosize: true,
    margin: { l: 60, r: 40, t: 40, b: 60 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: {
      family: "Inter, Roboto, sans-serif",
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
      orientation: "h" as const,
      y: -0.3,
      yanchor: "top" as const,
      font: { size: 12 },
    },
    hovermode: "closest" as const,
  };

  // Komponen Card untuk setiap grafik (Plotly)
  const ChartCard = ({
    title,
    data,
    color,
    Icon,
    unit = "",
  }: {
    title: string;
    data: number[];
    color: string;
    Icon: React.FC<any>;
    unit?: string;
  }) => {
    const yDomain = getYAxisDomain(data, unit);
    const chartData = [
      {
        x: timestamps,
        y: data,
        type: "scatter" as const,
        mode: "lines+markers" as const,
        marker: { color, size: 4 },
        name: title,
        line: { color, width: 2.5 },
      },
    ];
    const layout = {
      ...commonLayout,
      paper_bgcolor: isDarkMode ? "#1e293b" : "transparent",
      plot_bgcolor: isDarkMode ? "#1e293b" : "transparent",
      font: {
        family: "Inter, Roboto, sans-serif",
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
        <CardHeader
          className={`flex flex-row items-center gap-3 ${
            isDarkMode ? "bg-gray-800" : "bg-gray-50"
          } border-b py-3 px-6`}
        >
          <Icon className={`h-5 w-5`} style={{ color }} />
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartComponent data={chartData} layout={layout} />
        </CardContent>
      </Card>
    );
  };

  // Komponen untuk render input field (shadcn UI)
  const SensorInput = ({ 
    field, 
    value, 
    onChange, 
  }: { 
    field: SensorFieldConfig; 
    value: number; 
    onChange: (val: number) => void;
    isDark?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{field.label}</Label>
      <Input
        type="number"
        step={field.step}
        min={field.min}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="h-9"
        required
      />
    </div>
  );

  // helper format 2 desimal
  const fmt2 = (n: number) => Number.isFinite(n) ? n.toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      {/* Unified Single Header Banner */}
      <PageHeaderBanner
        gradient="slate"
        icon={EditIcon}
        title="Data Editor & Telemetri"
        subtitle="Pengelolaan, inspeksi, filtering, koreksi, dan ekspor dataset deret waktu sensor cuaca terhubung"
      />
      
      {/* Global Controls Card */}
      <Card className="mb-6">
        <CardHeader className={`p-3 sm:p-4 ${isDarkMode ? "bg-slate-800/80" : "bg-slate-50"} border-b`}>
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Sisi Kiri: Filter Dataset (Sensor, Items per Halaman, Search Parameter + Nilai + Cari) */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sensorId}
                onValueChange={(val) => {
                  setSensorId(val);
                  const matched = sensorOptions.find((o) => o.value === val);
                  setStoredActiveSensorId(val, { label: matched?.label });
                }}
                disabled={!sensorId}
              >
                <SelectTrigger className="h-8 text-xs font-medium w-full sm:w-[170px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Pilih Sensor" />
                </SelectTrigger>
                <SelectContent>
                  {sensorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => setItemsPerPage(Number(value))}
              >
                <SelectTrigger className="h-8 text-xs font-medium w-full sm:w-[130px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Item per Halaman" />
                </SelectTrigger>
                <SelectContent>
                  {[15, 20, 50, 70, 100].map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-xs">
                      {size} / Halaman
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <Select value={searchField} onValueChange={setSearchField}>
                  <SelectTrigger className="h-8 text-xs font-medium w-[130px] sm:w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Cari berdasarkan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sensorFields.map((field) => (
                      <SelectItem key={field.key} value={field.key} className="text-xs">
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Nilai angka..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs w-[110px] sm:w-[130px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
                <Button 
                  size="sm" 
                  onClick={handleSearch} 
                  disabled={loading || !searchQuery}
                  className="h-8 text-xs font-semibold px-2.5 shadow-2xs cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Cari</span>
                </Button>
                {searchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleResetSearch} 
                    disabled={loading}
                    title="Reset Pencarian"
                    className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Sisi Kanan: Aksi Terjustifikasi (Unduh Data, Tambah Data, Hapus Data, Refresh) */}
            <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className={`h-8 text-xs font-semibold px-2.5 shadow-2xs cursor-pointer ${isDarkMode ? "text-gray-200 border-slate-700 bg-slate-900/60 hover:bg-slate-800" : "text-gray-700 border-slate-200 bg-white hover:bg-slate-100"}`} 
                onClick={handleDownloadData}
              >
                <Download className="h-3.5 w-3.5 mr-1 text-slate-500" /> Unduh Data
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                className={`h-8 text-xs font-semibold px-2.5 shadow-2xs cursor-pointer ${isDarkMode ? "text-gray-200 border-slate-700 bg-slate-900/60 hover:bg-slate-800" : "text-gray-700 border-slate-200 bg-white hover:bg-slate-100"}`} 
                onClick={openAddModal}
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-slate-500" /> Tambah Data
              </Button>

              <Button 
                variant="destructive" 
                size="sm" 
                className="h-8 text-xs font-semibold px-2.5 shadow-2xs cursor-pointer"
                onClick={handleDeleteSensorData} 
                disabled={isDeleting || loading}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> {isDeleting ? "Menghapus..." : "Hapus Data"}
              </Button>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 hidden sm:block" />

              <Button
                variant="outline"
                size="icon"
                onClick={handleManualRefresh} 
                disabled={loading}
                title="Segarkan Data"
                className="h-8 w-8 shadow-2xs cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              >
                <RefreshCwIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""} ${isDarkMode ? "text-gray-200" : "text-gray-700"}`} />
                <span className="sr-only">Refresh data</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:px-4 sm:py-2.5 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Sisi Kiri: Stepper Hari & Indikator Tanggal Aktif */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevDay}
                title="Geser Mundur 1 Hari (Hari Kemarin)"
                className="h-8 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 gap-1 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Hari Kemarin
              </Button>

              <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-950/80 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs h-8">
                <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {dateIndicatorLabel}
                </span>
                {dateIndicatorBadge && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40">
                    {dateIndicatorBadge}
                  </Badge>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDay}
                disabled={isNextDayDisabled}
                title="Geser Maju 1 Hari (Hari Selanjutnya)"
                className="h-8 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 gap-1 shadow-2xs disabled:opacity-40 cursor-pointer"
              >
                Hari Selanjutnya
                <ChevronRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </Button>

              {isCustomDateActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetToLive}
                  title="Kembali ke tampilan periode berjalan"
                  className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 gap-1 shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Hari Ini
                </Button>
              )}
            </div>

            {/* Sisi Kanan: Preset Skala Pendek (Button Select) + Preset Rentang Panjang (Dropdown) + DateRangePicker */}
            <div className="flex flex-wrap items-center gap-2 justify-start xl:justify-end">
              {/* Segmented Button Select untuk Skala Waktu Pendek */}
              <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {shortPeriods.map((p) => {
                  const isActive = !dateRange && selectedPeriod.valueInMinutes === p.valueInMinutes;
                  return (
                    <Button
                      key={p.valueInMinutes}
                      type="button"
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleSelectShortPeriod(p.valueInMinutes)}
                      className={cn(
                        "h-7 text-xs font-bold px-2 sm:px-2.5 rounded-md transition-all cursor-pointer",
                        isActive
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs hover:bg-white dark:hover:bg-slate-900"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                      )}
                    >
                      <span className="hidden sm:inline">{p.label}</span>
                      <span className="sm:hidden">{p.shortLabel}</span>
                    </Button>
                  );
                })}
              </div>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 hidden sm:block" />

              {/* Dropdown Preset Rentang Panjang */}
              <Select
                value={activeLongPreset}
                onValueChange={(val) => {
                  if (val === "weekly" || val === "dasarian" || val === "monthly") {
                    handleApplyExternalPreset(val);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs font-semibold px-2.5 w-[145px] sm:w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs">
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-500 shrink-0" />
                  <SelectValue placeholder="Rentang Panjang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly" className="text-xs">
                    Mingguan (7 Hari)
                  </SelectItem>
                  <SelectItem value="dasarian" className="text-xs">
                    Dasarian (10 Hari)
                  </SelectItem>
                  <SelectItem value="monthly" className="text-xs">
                    Bulanan (30 Hari)
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Shadcn Date Range Picker (2-Bulan Side-by-Side dengan Preset Cepat) */}
              <DateRangePicker
                id="date"
                value={dateRange}
                onChange={(range) => {
                  setDateRange(range);
                  if (searchQuery) setSearchQuery("");
                }}
                onReset={handleResetToLive}
                align="end"
                disabled={(date) => isFuture(date)}
                triggerClassName="h-8 text-xs font-semibold px-2.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation (shadcn Tabs) */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'table' | 'grafik')} className="mb-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <TabsTrigger 
            value="table" 
            className="text-xs sm:text-sm font-semibold rounded-lg px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
          >
            Data Tabel
          </TabsTrigger>
          <TabsTrigger 
            value="grafik" 
            className="text-xs sm:text-sm font-semibold rounded-lg px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
          >
            Grafik
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      {error ? (
        <div className={`border p-4 rounded-md mb-6 ${isDarkMode ? "bg-red-950 border-red-900 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>{error}</div>
      ) : (
        <>
          {/* Data Table Content (shadcn Table) */}
          {activeTab === 'table' && (
            loading ? (
              <Card>
                <CardContent className="p-0">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        {[...Array(11)].map((_, i) => (
                          <TableHead key={i}>
                            <Skeleton className="h-4 w-20" />
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(itemsPerPage)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(11)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Waktu</TableHead>
                        <TableHead className="font-bold">Suhu (°C)</TableHead>
                        <TableHead className="font-bold">Kelembapan (%)</TableHead>
                        <TableHead className="font-bold">Tekanan (hPa)</TableHead>
                        <TableHead className="font-bold">Titik Embun (°C)</TableHead>
                        <TableHead className="font-bold">Curah Hujan (mm)</TableHead>
                        <TableHead className="font-bold">Laju Hujan (mm/j)</TableHead>
                        <TableHead className="font-bold">Cahaya (lux)</TableHead>
                        <TableHead className="font-bold">Suhu Tanah (°C)</TableHead>
                        <TableHead className="font-bold">Tegangan (V)</TableHead>
                        <TableHead className="font-bold text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody id="datalogger">
                      {currentTableData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="p-8 text-center text-muted-foreground">
                            Tidak ada data yang tersedia.
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentTableData.map((entry, index) => (
                          <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-mono text-xs">{entry.date}</TableCell>
                            <TableCell>{fmt2(entry.temperature)}</TableCell>
                            <TableCell>{fmt2(entry.humidity)}</TableCell>
                            <TableCell>{fmt2(entry.pressure)}</TableCell>
                            <TableCell>{fmt2(entry.dew)}</TableCell>
                            <TableCell>{fmt2(entry.rainfall)}</TableCell>
                            <TableCell>{fmt2(entry.rainrate)}</TableCell>
                            <TableCell>{fmt2(entry.lux)}</TableCell>
                            <TableCell>{fmt2(entry.soil_temp)}</TableCell>
                            <TableCell>{fmt2(entry.volt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                                  title="Edit"
                                  onClick={() => openEditModal(entry, indexOfFirstItem + index)}
                                >
                                  <EditIcon className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                  title="Hapus"
                                  onClick={() => openDeleteModal(indexOfFirstItem + index)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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

      {/* Modal Edit Data (shadcn Dialog) */}
      <Dialog open={editModalOpen} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Sensor</DialogTitle>
          </DialogHeader>
          {editForm && (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleEditSave();
              }}
              className="space-y-4"
            >
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {sensorFields.map((field) => (
                  <SensorInput
                    key={field.key}
                    field={field}
                    value={editForm[field.key] as number}
                    onChange={(val) => setEditForm({ ...editForm, [field.key]: val })}
                  />
                ))}
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={closeEditModal}>
                  Batal
                </Button>
                <Button type="submit" variant="default">
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Data (shadcn Dialog) */}
      <Dialog open={addModalOpen} onOpenChange={(open) => !open && closeAddModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Data Sensor</DialogTitle>
          </DialogHeader>
          {addForm && (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAddSave();
              }}
              className="space-y-4"
            >
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tanggal & Waktu</Label>
                  <Input
                    type="datetime-local"
                    value={addForm.date}
                    onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                    className="h-9"
                    required
                  />
                </div>
                {sensorFields.map((field) => (
                  <SensorInput
                    key={field.key}
                    field={field}
                    value={addForm[field.key] as number}
                    onChange={(val) => setAddForm({ ...addForm, [field.key]: val })}
                  />
                ))}
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={closeAddModal}>
                  Batal
                </Button>
                <Button type="submit" variant="default">
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus (shadcn AlertDialog) */}
      <AlertDialog open={deleteModalOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Data</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteModal}>Tidak</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRowConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
