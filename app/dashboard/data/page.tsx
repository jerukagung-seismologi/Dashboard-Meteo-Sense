"use client";

import { useState, useEffect, useCallback } from "react";
// Import fetchSensorData dari library
import { fetchSensorData, deleteSensorData, SensorDate } from "@/lib/FetchingSensorData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Import icons dari lucide-react
import { RefreshCw, Download, ThermometerSun, Droplets, Gauge, Sprout, Trash2 } from "lucide-react";
// Import ChartComponent
import ChartComponent from "@/components/ChartComponent";

interface Period {
  label: string;
  valueInMinutes: number;
}
// Define the structure for table data
interface WeatherEntry {
  timestamp: number;
  date: string; // Akan menggunakan dateFormatted dari SensorDate
  temperature: number;
  humidity: number;
  pressure: number;
  dew: number;
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

export default function DataPage() {
  // State untuk data grafik (array terpisah)
  const [timestamps, setTimestamps] = useState<string[]>([]); // Akan menggunakan timeFormatted
  const [temperatures, setTemperatures] = useState<number[]>([]);
  const [humidity, setHumidity] = useState<number[]>([]);
  const [pressure, setPressure] = useState<number[]>([]);
  const [dew, setDew] = useState<number[]>([]);

  // State untuk data tabel
  const [weatherData, setWeatherData] = useState<WeatherEntry[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State untuk tab
  const [activeTab, setActiveTab] = useState<'table' | 'grafik'>('table');

  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Jumlah item per halaman

  // State untuk sensor dan jumlah data
  const [sensorId, setSensorId] = useState("id-03");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[1]); // Default 1 Jam

  // Fungsi untuk memproses dan mengatur state data
  const processAndSetData = (data: SensorDate[]) => {
    if (data.length > 0) {
      const fetchedTimestamps: string[] = data.map(d => d.timeFormatted || new Date(d.timestamp).toLocaleString('id-ID', { timeZone: "Asia/Jakarta" }));
      const fetchedTemperatures: number[] = data.map(d => d.temperature);
      const fetchedHumidity: number[] = data.map(d => d.humidity);
      const fetchedPressure: number[] = data.map(d => d.pressure);
      const fetchedDew: number[] = data.map(d => d.dew);

      setTimestamps(fetchedTimestamps);
      setTemperatures(fetchedTemperatures);
      setHumidity(fetchedHumidity);
      setPressure(fetchedPressure);
      setDew(fetchedDew);

      const dataArray: WeatherEntry[] = data.map((entry) => ({
        timestamp: entry.timestamp,
        date: entry.dateFormatted || new Date(entry.timestamp).toLocaleString('id-ID', { timeZone: "Asia/Jakarta" }),
        temperature: entry.temperature,
        humidity: entry.humidity,
        pressure: entry.pressure,
        dew: entry.dew,
      }));
      setWeatherData(dataArray.reverse());
      setError(null);
      setCurrentPage(1); // Reset ke halaman pertama saat data baru dimuat
    } else {
      setTimestamps([]);
      setTemperatures([]);
      setHumidity([]);
      setPressure([]);
      setDew([]);
      setWeatherData([]);
      setError("Tidak ada data yang tersedia untuk periode ini.");
    }
  };

  // Fetch data untuk pembaruan di background (polling)
  const updateData = useCallback(async () => {
    try {
      const dataPoints = selectedPeriod.valueInMinutes;
      const data = await fetchSensorData(sensorId, dataPoints);
      processAndSetData(data);
    } catch (err: any) {
      console.error("Gagal melakukan polling data:", err);
      // Optionally set an error state that doesn't disrupt the UI too much
    }
  }, [sensorId, selectedPeriod]);

  // Fetch data untuk pemuatan awal atau refresh manual
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dataPoints = selectedPeriod.valueInMinutes;
      const data = await fetchSensorData(sensorId, dataPoints);
      processAndSetData(data);
    } catch (err: any) {
      console.error("Error fetching data: ", err);
      setError("Gagal mengambil data: " + (err.message || "Terjadi kesalahan tidak diketahui."));
      setWeatherData([]);
      setTimestamps([]);
      setTemperatures([]);
      setHumidity([]);
      setPressure([]);
      setDew([]);
    } finally {
      setLoading(false);
    }
  }, [sensorId, selectedPeriod]);

  // Inisialisasi komponen dan refresh data
  useEffect(() => {
    fetchData(); // Panggil untuk pemuatan awal

    // Atur interval untuk polling, hanya jika periode tertentu dipilih
    if (selectedPeriod.valueInMinutes <= 60) { // Contoh: polling untuk periode 1 jam atau kurang
      const interval = setInterval(updateData, 60000); // Panggil updateData untuk polling
      return () => clearInterval(interval);
    }
  }, [fetchData, updateData, selectedPeriod.valueInMinutes]);

  // Fungsi untuk menghapus data sensor
  const handleDeleteSensorData = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua riwayat data untuk sensor ini? Tindakan ini tidak dapat diurungkan.")) {
      setIsDeleting(true);
      setError(null);
      try {
        await deleteSensorData(sensorId);
        // Kosongkan state di UI setelah berhasil
        setWeatherData([]);
        setTimestamps([]);
        setTemperatures([]);
        setHumidity([]);
        setPressure([]);
        setDew([]);
        setCurrentPage(1); // Reset halaman setelah data dihapus
      } catch (err: any) {
        console.error(err);
        setError("Gagal menghapus data sensor: " + err.message);
      } finally {
        setIsDeleting(false);
      }
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

  // Fungsi untuk mengunduh data (contoh sederhana)
  const handleDownloadData = () => {
    if (weatherData.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }
    const headers = ["Waktu", "Suhu (°C)", "Kelembapan (%)", "Tekanan (hPa)", "Titik Embun (°C)"];
    const rows = weatherData.map(entry =>
      `${entry.date},${entry.temperature},${entry.humidity},${entry.pressure},${entry.dew}`
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `data_cuaca_${sensorId}_${new Date().toISOString()}.csv`);
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
    hovermode: "",
  };

  // Komponen Card untuk setiap grafik
  const ChartCard = ({ title, data, color, Icon, unit }: { title: string; data: number[]; color: string; Icon: React.FC<any>; unit: string; }) => {
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
      //title: { text: title, font: { size: 14 } },
      yaxis: { ...commonLayout.yaxis, title: { ...commonLayout.yaxis.title, text: unit }, range: yDomain },
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 bg-gray-50 dark:bg-gray-800 border-b py-3 px-6">
          <Icon className={`h-5 w-5`} style={{ color }} />
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartComponent data={chartData} layout={layout} />
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      className="container mx-auto px-4 py-8"
      style={{
        backgroundImage: 'url(/background6.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
      }}
    >
      {/* Global Controls Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800 border-b">
          <CardTitle className="text-xl">Fetching Data</CardTitle>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            {/* Sensor Select */}
            <Select value={sensorId} onValueChange={setSensorId}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Pilih Sensor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id-01">Sensor 1</SelectItem>
                <SelectItem value="id-02">Sensor 2</SelectItem>
                <SelectItem value="id-03">Sensor 3</SelectItem>
                <SelectItem value="id-04">Sensor 4</SelectItem>
                <SelectItem value="id-05">Sensor 5</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh data</span>
            </Button>

            {/* Download Button */}
            <Button variant="outline" size="sm" className="text-gray-600 dark:text-gray-300" onClick={handleDownloadData}>
              <Download className="h-4 w-4 mr-1" /> Unduh Data
            </Button>

            {/* Delete Button */}
            <Button variant="destructive" size="sm" onClick={handleDeleteSensorData} disabled={isDeleting || loading}>
              <Trash2 className="h-4 w-4 mr-1" /> {isDeleting ? "Menghapus..." : "Hapus Data"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            {periods.map((period) => (
              <button
                key={period.label}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod?.label === period.label
                    ? "bg-primary-600 text-white"
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
      {loading ? (
        <div className="flex justify-center items-center h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
          <p className="ml-4 text-gray-500">Memuat data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">{error}</div>
      ) : (
        <>
          {/* Data Table Content */}
          {activeTab === 'table' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                        <th className="p-4 font-medium text-gray-600 dark:text-gray-300 border-b">Waktu</th>
                        <th className="p-4 font-medium text-gray-600 dark:text-gray-300 border-b">Suhu (°C)</th>
                        <th className="p-4 font-medium text-gray-600 dark:text-gray-300 border-b">Kelembapan (%)</th>
                        <th className="p-4 font-medium text-gray-600 dark:text-gray-300 border-b">Tekanan (hPa)</th>
                        <th className="p-4 font-medium text-gray-600 dark:text-gray-300 border-b">Titik Embun (°C)</th>
                      </tr>
                    </thead>
                    <tbody id="datalogger">
                      {currentTableData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-600 dark:text-gray-300">
                            Tidak ada data yang tersedia.
                          </td>
                        </tr>
                      ) : (
                        currentTableData.map((entry, index) => (
                          <tr
                            key={index}
                            className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
                          >
                            <td className="p-4 border-t">{entry.date}</td>
                            <td className="p-4 border-t">{entry.temperature}</td>
                            <td className="p-4 border-t">{entry.humidity}</td>
                            <td className="p-4 border-t">{entry.pressure}</td>
                            <td className="p-4 border-t">{entry.dew}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {weatherData.length > itemsPerPage && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <Button onClick={handlePreviousPage} disabled={currentPage === 1} variant="outline">
                      Sebelumnya
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline">
                      Berikutnya
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grafik Content */}
          {activeTab === 'grafik' && (
            <div className="space-y-6">
              <ChartCard title="Suhu Lingkungan (°C)" data={temperatures} color="#ef4444" Icon={ThermometerSun} unit="Suhu (°C)" />
              <ChartCard title="Kelembapan Relatif (%)" data={humidity} color="#3b82f6" Icon={Droplets} unit="Kelembapan (%)" />
              <ChartCard title="Tekanan Udara (hPa)" data={pressure} color="#f59e0b" Icon={Gauge} unit="Tekanan (hPa)" />
              <ChartCard title="Titik Embun (°C)" data={dew} color="#10b981" Icon={Sprout} unit="Titik Embun (°C)" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
