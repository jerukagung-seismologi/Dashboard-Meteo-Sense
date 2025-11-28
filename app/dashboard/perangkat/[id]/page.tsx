"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchDevice, Device } from "@/lib/FetchingDevice";
import { fetchSensorMetadata, fetchSensorData, SensorDate } from "@/lib/FetchingSensorData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, MapPin, Calendar, Thermometer, Droplets, Gauge, CloudRain,
  Wind, Wifi, WifiOff, Key, HardDrive, Sprout, Battery, Umbrella, Sun,
  ArrowUp, ArrowDown, Navigation
} from "lucide-react";

// --- Helper Functions & Types ---

interface DeviceDetail extends Device {
  status: "online" | "offline";
  lastUpdate?: number | null;
  latestData?: SensorDate;
  previousData?: SensorDate; // Untuk menghitung tren
}

// Helper untuk menentukan kategori dan deskripsi (diadaptasi dari referensi)
const getSunlightCategory = (intensity: number) => {
  if (intensity < 1000) return "Rendah";
  if (intensity < 20000) return "Sedang";
  if (intensity < 50000) return "Tinggi";
  return "Sangat Tinggi";
};

const getHourlyRainfallCategory = (amount: number) => {
  if (amount === 0) return "Tidak Ada";
  if (amount < 0.5) return "Ringan";
  if (amount < 4) return "Sedang";
  if (amount < 8) return "Lebat";
  if (amount < 16) return "Sangat Lebat";
  return "Ekstrem";
};

const getDailyRainfallCategory = (amount: number) => {
  if (amount === 0) return "Tidak Hujan";
  if (amount <= 20) return "Hujan Ringan";
  if (amount <= 50) return "Hujan Sedang";
  if (amount <= 100) return "Hujan Lebat";
  if (amount <= 150) return "Hujan Sangat Lebat";
  return "Ekstrem";
};

const getWindDescription = (speed: number) => {
  if (speed < 1) return "Tenang";
  if (speed < 6) return "Sepoi Ringan";
  if (speed < 12) return "Sepoi Lemah";
  if (speed < 20) return "Sepoi Lembut";
  if (speed < 29) return "Sepoi Sedang";
  if (speed < 39) return "Sepoi Segar";
  if (speed < 50) return "Sepoi Kuat";
  if (speed < 62) return "Angin Kencang";
  if (speed < 75) return "Badai";
  return "Badai Kuat";
};

const getTrendIcon = (current: number, previous: number) => {
  const diff = current - previous;
  // Hanya tampilkan tren jika perubahannya signifikan (misal > 0.1)
  if (Math.abs(diff) < 0.1) return null; 
  
  if (current > previous) {
    return <ArrowUp className="h-4 w-4 text-green-500" />;
  }
  return <ArrowDown className="h-4 w-4 text-red-500" />;
};

// --- Sub-Component: Simple Wind Compass ---
// Menggantikan WindCompass eksternal agar tidak error jika file tidak ada
const SimpleWindCompass = ({ direction, speed }: { direction: number, speed: number }) => (
  <div className="relative flex items-center justify-center w-32 h-32 border-2 border-slate-200 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-800">
    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground pointer-events-none">
      <span className="absolute top-1">U</span>
      <span className="absolute right-2">T</span>
      <span className="absolute bottom-1">S</span>
      <span className="absolute left-2">B</span>
    </div>
    {/* Arrow */}
    <div 
      className="transition-transform duration-700 ease-out"
      style={{ transform: `rotate(${direction}deg)` }}
    >
      <Navigation className="h-8 w-8 text-sky-500 fill-sky-500" />
    </div>
    <div className="absolute -bottom-6 text-xs font-medium text-muted-foreground">
      {direction}°
    </div>
  </div>
);

// --- Main Page Component ---

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isMobile = useIsMobile();

  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Tambahkan parameter isPolling untuk membedakan load awal vs update background
    const loadDeviceData = async (isPolling = false) => {
      if (!id) return;
      
      // Hanya tampilkan loading skeleton saat inisialisasi awal
      if (!isPolling) setLoading(true);
      
      try {
        // 1. Metadata Firestore
        const deviceData = await fetchDevice(id);
        if (!deviceData) {
          if (isMounted) setError("Perangkat tidak ditemukan.");
          if (isMounted) setLoading(false);
          return;
        }

        // 2. Data RTDB (Ambil 2 data terakhir untuk tren)
        const sensorToken = deviceData.authToken || deviceData.id;
        const [metadata, latestDataArr] = await Promise.all([
          fetchSensorMetadata(sensorToken),
          fetchSensorData(sensorToken, 2), 
        ]);

        if (isMounted) {
          setDevice({
            ...deviceData,
            status: metadata.TelemetryStatus,
            lastUpdate: metadata.lastUpdate,
            latestData: latestDataArr.length > 0 ? latestDataArr[0] : undefined,
            previousData: latestDataArr.length > 1 ? latestDataArr[1] : undefined,
          });
        }

      } catch (err) {
        console.error("Error:", err);
        if (isMounted) setError("Gagal memuat data.");
      } finally {
        // Matikan loading hanya jika ini load pertama
        // Saat polling, kita biarkan loading state tetap false agar UI tidak berkedip
        if (isMounted && !isPolling) {
          setLoading(false);
        }
      }
    };

    // Load awal (tampilkan skeleton)
    loadDeviceData(false);
    
    // Polling setiap 5 detik untuk update data real-time (tanpa skeleton)
    const interval = setInterval(() => loadDeviceData(true), 5000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id]);

  // --- Render Logic ---

  if (loading) return <div className="p-6 space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !device) return <div className="p-10 text-center text-red-500">{error || "Data hilang"}</div>;

  const isOnline = device.status === "online";
  const data = device.latestData || {} as SensorDate;
  const prevData = device.previousData || data;

  // Siapkan nilai untuk kartu (gunakan nilai 0 jika undefined)
  const values = {
    temp: data.temperature ?? 0,
    hum: data.humidity ?? 0,
    press: data.pressure ?? 0,
    dew: data.dew ?? 0,
    volt: data.volt ?? 0,
    rainRate: data.rainrate ?? 0,
    rainTotal: data.rainfall ?? 0,
    // Fallback untuk data yang mungkin belum ada di interface SensorDate Anda
    windSpeed: (data as any).windspeed ?? 0,
    windDir: (data as any).winddir ?? 0,
    sunlight: (data as any).sunlight ?? 0,
  };

  // Progress calculations
  const sunlightPct = Math.min(Math.round((values.sunlight / 120000) * 100), 100);
  const rainRatePct = Math.min(Math.round((values.rainRate / 25) * 100), 100);
  const rainTotalPct = Math.min(Math.round((values.rainTotal / 150) * 100), 100);

  // Basic Cards Data
  const basicCards = [
    {
      title: "Suhu Lingkungan",
      value: values.temp.toFixed(1),
      unit: "°C",
      icon: Thermometer,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10 dark:bg-rose-500/20",
      borderColor: "border-rose-200 dark:border-rose-800",
      desc: "Suhu udara saat ini",
      trend: getTrendIcon(values.temp, prevData.temperature ?? values.temp),
    },
    {
      title: "Kelembapan",
      value: values.hum.toFixed(1),
      unit: "%",
      icon: Droplets,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      desc: "Kelembapan relatif",
      trend: getTrendIcon(values.hum, prevData.humidity ?? values.hum),
    },
    {
      title: "Tekanan",
      value: values.press.toFixed(1),
      unit: "hPa",
      icon: Gauge,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
      borderColor: "border-amber-200 dark:border-amber-800",
      desc: "Tekanan atmosfer",
      trend: getTrendIcon(values.press, prevData.pressure ?? values.press),
    },
    {
      title: "Titik Embun",
      value: values.dew.toFixed(1),
      unit: "°C",
      icon: Sprout,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      desc: "Suhu titik embun",
      trend: getTrendIcon(values.dew, prevData.dew ?? values.dew),
    },
    {
      title: "Baterai",
      value: values.volt.toFixed(2),
      unit: "V",
      icon: Battery,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10 dark:bg-purple-500/20",
      borderColor: "border-purple-200 dark:border-purple-800",
      desc: "Tegangan baterai",
      trend: null,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Page */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()}
          className="dark:text-white dark:border-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{device.name}</h1>
            <Badge variant={isOnline ? "default" : "destructive"} className={isOnline ? "bg-green-600 hover:bg-green-700" : ""}>
              {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {device.id}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {device.location}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {device.registrationDate}</span>
          </div>
        </div>
      </div>

      {/* 1. Basic Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {basicCards.map((card, index) => (
          <Card key={index} className={cn("overflow-hidden border-2 shadow-sm hover:shadow-md transition-shadow duration-300", card.borderColor)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{card.title}</p>
                  <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-bold text-foreground">{card.value}</h3>
                    <span className="text-lg font-medium text-muted-foreground">{card.unit}</span>
                    <div className="ml-1">{card.trend}</div>
                  </div>
                </div>
                <div className={cn("p-2 rounded-full", card.bgColor)}>
                  <card.icon className={cn("h-5 w-5", card.color)} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Enhanced Cards Grid (Rain, Wind, Sun) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card: Angin */}
        <Card className="border-2 border-sky-200 dark:border-sky-800 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Angin</span>
              <div className="p-2 rounded-full bg-sky-500/10 dark:bg-sky-500/20">
                <Wind className="h-5 w-5 text-sky-500" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            <div className="flex justify-between items-center w-full mb-4">
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-bold">{values.windSpeed.toFixed(1)}</span>
                 <span className="text-xl font-medium text-muted-foreground">km/j</span>
               </div>
               <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900 dark:text-sky-300">
                 {getWindDescription(values.windSpeed)}
               </Badge>
            </div>
            <SimpleWindCompass direction={values.windDir} speed={values.windSpeed} />
            
            <div className="w-full mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Intensitas</span>
                <span>{Math.min((values.windSpeed / 50) * 100, 100).toFixed(0)}%</span>
              </div>
              <Progress value={(values.windSpeed / 50) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Card: Hujan Per Jam */}
        <Card className="border-2 border-cyan-200 dark:border-cyan-800 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Laju Hujan</span>
              <div className="p-2 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20">
                <CloudRain className="h-5 w-5 text-cyan-500" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex justify-between items-end mb-4">
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-bold">{values.rainRate.toFixed(2)}</span>
                 <span className="text-xl font-medium text-muted-foreground">mm/h</span>
               </div>
               <Badge variant="outline" className="border-cyan-200 text-cyan-700 dark:border-cyan-800 dark:text-cyan-300">
                 {getHourlyRainfallCategory(values.rainRate)}
               </Badge>
             </div>
             <div className="space-y-2">
                <Progress value={rainRatePct} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-medium">
                  <span>Ringan</span><span>Sedang</span><span>Lebat</span>
                </div>
             </div>
             <p className="text-xs text-muted-foreground mt-4">Intensitas curah hujan saat ini.</p>
          </CardContent>
        </Card>

        {/* Card: Curah Hujan Harian */}
        <Card className="border-2 border-indigo-200 dark:border-indigo-800 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Akumulasi Hujan</span>
              <div className="p-2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20">
                <Umbrella className="h-5 w-5 text-indigo-500" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex justify-between items-end mb-4">
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-bold">{values.rainTotal.toFixed(2)}</span>
                 <span className="text-xl font-medium text-muted-foreground">mm</span>
               </div>
               <Badge variant="outline" className="border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                 {getDailyRainfallCategory(values.rainTotal)}
               </Badge>
             </div>
             <div className="space-y-2">
                <Progress value={rainTotalPct} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-medium">
                  <span>0mm</span><span>75mm</span><span>150mm+</span>
                </div>
             </div>
             <p className="text-xs text-muted-foreground mt-4">Total hujan tercatat sejak jam 00:00.</p>
          </CardContent>
        </Card>

        {/* Card: Intensitas Cahaya */}
        <Card className="border-2 border-yellow-200 dark:border-yellow-800 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Cahaya Matahari</span>
              <div className="p-2 rounded-full bg-yellow-500/10 dark:bg-yellow-500/20">
                <Sun className="h-5 w-5 text-yellow-500" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex justify-between items-end mb-4">
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-bold">{values.sunlight.toLocaleString()}</span>
                 <span className="text-xl font-medium text-muted-foreground">lux</span>
               </div>
               <Badge variant="outline" className="border-yellow-200 text-yellow-700 dark:border-yellow-800 dark:text-yellow-300">
                 {getSunlightCategory(values.sunlight)}
               </Badge>
             </div>
             <div className="space-y-2">
                <Progress value={sunlightPct} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-medium">
                  <span>Redup</span><span>Terang</span><span>Silau</span>
                </div>
             </div>
             <p className="text-xs text-muted-foreground mt-4">
               &gt; 25k lux menandakan cahaya siang hari cerah.
             </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}