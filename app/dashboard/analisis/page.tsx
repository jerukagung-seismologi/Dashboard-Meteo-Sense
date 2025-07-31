"use client"

import { useState, useEffect } from "react"
import { fetchSensorData } from "@/lib/FetchingSensorData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
// Import icons from lucide-react
import { RefreshCw, Download, ThermometerSun, Droplets, Gauge, CloudDrizzle, BatteryCharging, ScatterChart } from "lucide-react"
import ChartComponent from "@/components/ChartComponent"

export default function AnalisisPage() {
  // State for data
  const [timestamps, setTimestamps] = useState<string[]>([])
  const [temperatures, setTemperatures] = useState<number[]>([])
  const [humidity, setHumidity] = useState<number[]>([])
  const [pressure, setPressure] = useState<number[]>([])
  const [dew, setDew] = useState<number[]>([])
  const [volt, setVolt] = useState<number[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sensorId, setSensorId] = useState("id-03")
  const [dataPoints, setDataPoints] = useState(60) // Default to 1 hour (60 minutes)

  // Fetch data from Firebase
  const fetchData = async () => {
    try {
      setLoading(true)
      const sensorData = await fetchSensorData(sensorId, dataPoints)

      if (sensorData.length > 0) {
        const Timestamps: string[] = sensorData.map(d => d.timeFormatted || new Date(d.timestamp).toLocaleString('id-ID', { timeZone: "Asia/Jakarta" }));
        const temperatures = sensorData.map(d => d.temperature).reverse()
        const humidity = sensorData.map(d => d.humidity).reverse()
        const pressure = sensorData.map(d => d.pressure).reverse()
        const dew = sensorData.map(d => d.dew).reverse()
        const volt = sensorData.map(d => d.volt).reverse()

        setTimestamps(Timestamps)
        setTemperatures(temperatures)
        setHumidity(humidity)
        setPressure(pressure)
        setDew(dew)
        setVolt(volt)
        setError(null)
      } else {
        // Reset data jika tidak ada
        setTimestamps([])
        setTemperatures([])
        setHumidity([])
        setPressure([])
        setDew([])
        setVolt([])
        setError("Tidak ada data yang tersedia untuk periode ini.")
      }
    } catch (err) {
      console.error("Error fetching data: ", err)
      setError("Gagal mengambil data.")
    } finally {
      setLoading(false)
    }
  }

  // Initialize component
  useEffect(() => {
    fetchData()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [sensorId, dataPoints])

  // Common layout settings for charts
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
        text: "",
        font: { size: 14, color: "#475569" },
      },
      // Add nticks to reduce the number of grid lines on the x-axis
      nticks: 10, // Adjust this number to control density
    },
    yaxis: {
      gridcolor: "rgba(203, 213, 225, 0.2)",
      title: { font: { size: 14, color: "#475569" } },
      // Add nticks to reduce the number of grid lines on the y-axis
      nticks: 10, // Adjust this number to control density
    },
    legend: {
      orientation: "h",
      y: -0.3,
      yanchor: 'top',
      font: { size: 12 },
    },
    hovermode: "closest", // Peningkatan UX
  }

  // Array of chart configurations
  const chartConfigs = [
    {
      // Add icon and color class for Temperature
      icon: ThermometerSun,
      colorClass: "text-red-500", // Tailwind class for red
      data: [{
        x: timestamps,
        y: temperatures,
        type: "scatter",
        mode: "lines+markers",
        name: "Suhu Lingkungan (°C)",
        line: { color: "#ef4444" }, // Warna merah
      }],
      layout: {
        ...commonLayout,
        title: { text: "Suhu Lingkungan (°C)", font: { size: 16 } },
        yaxis: { ...commonLayout.yaxis, title: { ...commonLayout.yaxis.title, text: "Suhu (°C)" } },
      },
    },
    {
      // Add icon and color class for Humidity
      icon: Droplets,
      colorClass: "text-blue-500", // Tailwind class for blue
      data: [{
        x: timestamps,
        y: humidity,
        type: "scatter",
        mode: "lines+markers",
        name: "Kelembapan Relatif (%)",
        line: { color: "#3b82f6" }, // Warna biru
      }],
      layout: {
        ...commonLayout,
        title: { text: "Kelembapan Relatif (%)", font: { size: 16 } },
        yaxis: { ...commonLayout.yaxis, title: { ...commonLayout.yaxis.title, text: "Kelembapan (%)" } },
      },
    },
    {
      // Add icon and color class for Pressure
      icon: Gauge, // Using Cloud as a representation for atmospheric pressure
      colorClass: "text-green-500", // Tailwind class for green
      data: [{
        x: timestamps,
        y: pressure,
        type: "scatter",
        mode: "lines+markers",
        name: "Tekanan Udara (hPa)",
        line: { color: "#10b981" }, // Warna hijau
      }],
      layout: {
        ...commonLayout,
        title: { text: "Tekanan Udara (hPa)", font: { size: 16 } },
        yaxis: { ...commonLayout.yaxis, title: { ...commonLayout.yaxis.title, text: "Tekanan (hPa)" } },
      },
    },
    {
      // Add icon and color class for Dew Point
      icon: CloudDrizzle, // Icon for Dew Point
      colorClass: "text-orange-500", // Tailwind class for orange
      data: [{
        x: timestamps,
        y: dew,
        type: "scatter",
        mode: "lines+markers",
        name: "Titik Embun (°C)",
        line: { color: "#f59e0b" }
      }],
      layout: {
        ...commonLayout,
        title: { text: "Titik Embun (°C)", font: { size: 16 } },
        yaxis: { ...commonLayout.yaxis, title: { ...commonLayout.yaxis.title, text: "Titik Embun (°C)" } }
      },
    },
    {
      // Add icon and color class for Battery Voltage
      icon: BatteryCharging, // Icon for Battery Voltage
      colorClass: "text-indigo-500", // Tailwind class for indigo
      data: [{
        x: timestamps,
        y: volt,
        type: "bar", // Changed to bar chart
        name: "Tegangan Baterai (V)",
        marker: { color: "#6366f1" } // Warna indigo for bars
      }],
      layout: {
        ...commonLayout,
        title: { text: "Tegangan Baterai (V)", font: { size: 16 } },
        yaxis: { ...commonLayout.yaxis, title: { ...commonLayout.yaxis.title, text: "Tegangan (V)" } }
      },
    },
    {
      // Add configuration for Temperature vs Humidity Scatter Plot
      icon: ScatterChart, // Icon for Scatter Plot
      colorClass: "text-purple-500", // Tailwind class for purple
      data: [{
        x: temperatures,
        y: humidity,
        mode: "markers",
        type: "scatter",
        name: "Suhu vs Kelembapan",
        marker: { color: "#a855f7" } // Warna ungu
      }],
      layout: {
        ...commonLayout,
        title: { text: "Korelasi Suhu dan Kelembapan", font: { size: 16 } },
        xaxis: { ...commonLayout.xaxis, title: { ...commonLayout.xaxis.title, text: "Suhu (°C)" } },
        yaxis: { ...commonLayout.yaxis, title: { ...commonLayout.yaxis.title, text: "Kelembapan (%)" } },
      },
    },
    {
      // Add configuration for Temperature vs Humidity vs Pressure 3D Scatter Plot
      data: [{
        x: temperatures,
        y: humidity,
        z: pressure,
        mode: "markers",
        type: "scatter3d",
        name: "Suhu, Kelembapan & Tekanan",
        marker: { size: 5, color: pressure, colorscale: 'Viridis', opacity: 0.8 }
      }],
      layout: {
        ...commonLayout,
        title: { text: "Korelasi Suhu, Kelembapan, dan Tekanan", font: { size: 16 } },
        scene: {
          xaxis: { title: "Suhu (°C)" },
          yaxis: { title: "Kelembapan (%)" },
          zaxis: { title: "Tekanan (hPa)" },
        },
        margin: { l: 0, r: 0, b: 0, t: 40 }
      },
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">

      <Card className="mb-6">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800 border-b">
          <CardTitle className="text-xl">Pengaturan Analisis Data</CardTitle>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
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

            <Select value={dataPoints.toString()} onValueChange={(value) => setDataPoints(Number.parseInt(value))}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Interval Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 menit terakhir</SelectItem>
                <SelectItem value="60">1 jam terakhir</SelectItem>
                <SelectItem value="120">2 jam terakhir</SelectItem>
                <SelectItem value="240">4 jam terakhir</SelectItem>
                <SelectItem value="720">12 jam terakhir</SelectItem>
                <SelectItem value="1440">24 jam terakhir</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh data</span>
            </Button>

            <Button variant="outline" size="sm" className="text-gray-600 dark:text-gray-300">
              <Download className="h-4 w-4 mr-1" /> Unduh Data
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      {/* PERUBAHAN UTAMA: DARI TABS MENJADI STACKED LAYOUT */}
      {loading ? (
        // Tampilan loading terpusat
        <div className="flex justify-center items-center h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
          <p className="ml-4 text-gray-500">Memuat data...</p>
        </div>
      ) : error ? (
        // Tampilan error
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">{error}</div>
      ) : (
        // Layout bertumpuk untuk semua grafik
        <div className="space-y-6">
          {chartConfigs.map((config, index) => {
            const IconComponent = config.icon; // Get the icon component
            return (
              <Card key={index}>
                {/* Add CardHeader for each chart */}
                <CardHeader className="flex flex-row items-center gap-3 bg-gray-50 dark:bg-gray-800 border-b py-3 px-6">
                  {/* Add the icon with dynamic color class */}
                  {IconComponent && <IconComponent className={`h-5 w-5 ${config.colorClass}`} />}
                  {/* Use the title from the layout */}
                  <CardTitle className="text-lg">{config.layout.title.text}</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ChartComponent data={config.data} layout={config.layout} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  )
}