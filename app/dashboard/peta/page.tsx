// app/dashboard/peta/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import { fetchSensorData } from "@/lib/apiClient";
import { StationData } from "@/components/peta/StationMarkerPopup";
import { SensorDataPoint } from "@/components/peta/OneHourTrendChart";
import {
  MapPin,
  RefreshCw,
  Search,
  Radio,
  Thermometer,
  Droplets,
  CloudRain,
  Compass,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  KEBUMEN_DEFAULT_STATIONS,
  generateRealistic1HourHistory,
} from "@/lib/data/kebumenStations";
import {
  seedBenchmarkDevicesIfEmpty,
  fetchLiveERA5WeatherForStations,
  BenchmarkDevice,
} from "@/lib/FetchingBenchmarkDevice";

export default function PetaPage() {
  const { user } = useAuth();
  const [deviceData, setDeviceData] = useState<StationData[]>(KEBUMEN_DEFAULT_STATIONS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch benchmark devices from Firestore benchmarkdevices collection
      let benchmarkStations: StationData[] = [];
      try {
        const firestoreDevices = await seedBenchmarkDevicesIfEmpty();
        if (firestoreDevices && firestoreDevices.length > 0) {
          // Live fetch real-time atmospheric readings from ECMWF / ERA5
          const liveWeatherMap = await fetchLiveERA5WeatherForStations(firestoreDevices);

          benchmarkStations = firestoreDevices.map((b) => {
            const live = liveWeatherMap[b.id];
            const temp = live ? live.temp : 29.0;
            const hum = live ? live.hum : 75;
            const pressure = live ? live.pressure : 1012;
            const rainfall = live ? live.rainfall : 0.0;
            const windSpeed = live ? live.windSpeed : 6.0;
            const windDirection = live ? live.windDirection : 135;
            const history1h =
              live && live.history1h && live.history1h.length > 0
                ? live.history1h
                : generateRealistic1HourHistory(temp, hum, pressure, rainfall, windSpeed, windDirection);

            return {
              id: b.id,
              name: b.name,
              location: b.location || "Kabupaten Kebumen",
              lat: b.lat,
              lng: b.lng,
              temp,
              hum,
              pressure,
              rainfall,
              rainrate: live?.rainrate ?? 0.0,
              windSpeed,
              windDirection,
              status: b.status,
              batteryVolt: live?.batteryVolt ?? 4.15,
              lastUpdate: live ? "Live ERA5 / ECMWF" : "Standby",
              history1h,
            };
          });
        } else {
          benchmarkStations = [...KEBUMEN_DEFAULT_STATIONS];
        }
      } catch (fErr) {
        console.warn("Firestore benchmark fetch error, using fallback stations:", fErr);
        benchmarkStations = [...KEBUMEN_DEFAULT_STATIONS];
      }

      let mergedStations: StationData[] = [...benchmarkStations];

      // 2. Fetch authenticated user's hardware IoT devices if available
      if (user) {
        const devices = await fetchAllDevices(user.uid);

        if (devices && devices.length > 0) {
          const userDevicePromises = devices.map(async (device) => {
            let temp = 29.0;
            let hum = 75;
            let pressure = 1012;
            let rainfall = 0;
            let lastUpdate = "Terhubung";
            let history1h: SensorDataPoint[] = [];

            if (device.authToken) {
              try {
                // Fetch last 24 points to construct rich 1-hour time series
                const sensorData = await fetchSensorData(device.authToken, 24);
                if (sensorData && sensorData.length > 0) {
                  // Latest reading
                  const latest = sensorData[sensorData.length - 1];
                  temp = latest.temperature;
                  hum = latest.humidity;
                  pressure = latest.pressure || 1012;
                  rainfall = latest.rainfall || 0;
                  lastUpdate = latest.timeFormatted || "Baru saja";

                  history1h = sensorData.map((s) => ({
                    time: s.timeFormatted ? s.timeFormatted.substring(0, 5) : "--:--",
                    timestamp: s.timestamp,
                    temperature: s.temperature,
                    humidity: s.humidity,
                    pressure: s.pressure,
                    rainfall: s.rainfall,
                    rainrate: s.rainrate,
                    windSpeed: 0,
                  }));
                }
              } catch (e) {
                console.error("Error fetching sensor data for", device.name, e);
              }
            }

            if (history1h.length === 0) {
              history1h = generateRealistic1HourHistory(temp, hum, pressure, rainfall);
            }

            // If coordinates are missing, position relative to Kebumen area
            const lat = device.coordinates?.lat && device.coordinates.lat !== 0 ? device.coordinates.lat : -7.685;
            const lng = device.coordinates?.lng && device.coordinates.lng !== 0 ? device.coordinates.lng : 109.655;

            return {
              id: device.id,
              name: device.name,
              location: device.location || "Perangkat Lapangan Meteo-Sense",
              lat,
              lng,
              temp,
              hum,
              pressure,
              rainfall,
              status: "online" as const,
              lastUpdate,
              batteryVolt: 4.10,
              history1h,
            };
          });

          const userResults = await Promise.all(userDevicePromises);
          // Combine user devices with benchmark stations from Firestore
          mergedStations = [...userResults, ...benchmarkStations];
        }
      }

      setDeviceData(mergedStations);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Error loading map data", err);
      // Fallback to Kebumen default stations
      setDeviceData(KEBUMEN_DEFAULT_STATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Filtered devices based on search query
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return deviceData;
    const q = searchQuery.toLowerCase();
    return deviceData.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.location && d.location.toLowerCase().includes(q))
    );
  }, [deviceData, searchQuery]);

  // Aggregate Metrics Summary
  const stats = useMemo(() => {
    if (deviceData.length === 0) {
      return { avgTemp: 0, avgHum: 0, activeCount: 0 };
    }
    const temps = deviceData.map((d) => d.temp || 29);
    const hums = deviceData.map((d) => d.hum || 75);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const avgHum = hums.reduce((a, b) => a + b, 0) / hums.length;
    const activeCount = deviceData.filter((d) => d.status !== "offline").length;

    return {
      avgTemp: Number(avgTemp.toFixed(1)),
      avgHum: Math.round(avgHum),
      activeCount,
    };
  }, [deviceData]);

  // Dynamic import for Leaflet map component (SSR disabled)
  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/peta/Map"), {
        loading: () => (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Memuat Peta Wilayah Kebumen...
            </p>
          </div>
        ),
        ssr: false,
      }),
    []
  );

  return (
    <div className="h-full w-full p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Compass className="h-5 w-5" />
            </span>
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 text-[10px] uppercase font-bold tracking-wider">
              Sistem Informasi Geografis (SIG)
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Peta Persebaran Stasiun Cuaca
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Pemantauan geospasial real-time stasiun cuaca Meteo-Sense di wilayah Kabupaten Kebumen dan sekitarnya lengkap dengan grafik telemetri 1 jam terakhir.
          </p>
        </div>

        {/* Quick Refresh & Search */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari stasiun/lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-44 sm:w-56 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Titik Pantau Kebumen */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Stasiun Terpantau
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {filteredDevices.length}{" "}
              <span className="text-xs font-normal text-slate-500">Titik</span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Jaringan Wilayah Kebumen
            </span>
          </div>
        </div>

        {/* Rerata Suhu Kebumen */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Rerata Suhu Wilayah
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {stats.avgTemp}{" "}
              <span className="text-xs font-normal text-slate-500">°C</span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Mikroklimat Kebumen
            </span>
          </div>
        </div>

        {/* Rerata Kelembapan */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Kelembapan Udara
            </span>
            <div className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono">
              {stats.avgHum}{" "}
              <span className="text-xs font-normal text-slate-500">%</span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Rata-rata Terukur
            </span>
          </div>
        </div>

        {/* Status Jaringan Telemetri */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Jaringan Telemetri
            </span>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{stats.activeCount} Aktif Online</span>
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block -mt-0.5">
              Real-time Streaming
            </span>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="h-[calc(100vh-210px)] min-h-[550px] w-full rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md overflow-hidden relative bg-slate-100 dark:bg-slate-950">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Memperbarui Data Telemetri Geografis...
              </p>
            </div>
          </div>
        )}

        <Map devices={filteredDevices} />
      </div>
    </div>
  );
}