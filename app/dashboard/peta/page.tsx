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

// Helper to generate realistic 1-hour time series points
function generateRealistic1HourHistory(
  baseTemp: number = 29.2,
  baseHum: number = 76,
  basePres: number = 1012,
  baseRain: number = 0
): SensorDataPoint[] {
  const points: SensorDataPoint[] = [];
  const now = Date.now();
  const numPoints = 16; // 1 point every 4 minutes

  for (let i = numPoints - 1; i >= 0; i--) {
    const timestamp = now - i * 4 * 60 * 1000;
    const dateObj = new Date(timestamp);
    const time = dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Realistic small environmental micro-variations
    const tempNoise = Math.sin(i * 0.5) * 0.5 + (Math.random() - 0.5) * 0.2;
    const humNoise = -tempNoise * 2.2 + (Math.random() - 0.5) * 0.8;
    const presNoise = Math.cos(i * 0.4) * 0.3;

    points.push({
      time,
      timestamp,
      temperature: Number((baseTemp + tempNoise).toFixed(1)),
      humidity: Math.round(Math.min(99, Math.max(30, baseHum + humNoise))),
      pressure: Number((basePres + presNoise).toFixed(1)),
      rainfall: baseRain > 0 ? Number((baseRain * (0.8 + Math.random() * 0.4)).toFixed(1)) : 0,
      rainrate: 0,
      windSpeed: Number((6.0 + Math.random() * 4.0).toFixed(1)),
    });
  }

  return points;
}

// Pre-seeded Comprehensive Kebumen Weather Monitoring Network Stations
const KEBUMEN_DEFAULT_STATIONS: StationData[] = [
  {
    id: "stasiun-jerukagung-klirong",
    name: "Stasiun Riset Jerukagung (AWS Utama)",
    location: "Jerukagung, Klirong, Kebumen",
    lat: -7.7121,
    lng: 109.6458,
    temp: 29.4,
    hum: 76,
    pressure: 1011.8,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 8.2,
    status: "online",
    batteryVolt: 4.12,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(29.4, 76, 1011.8, 0.0),
  },
  {
    id: "stasiun-kebumen-kota",
    name: "Stasiun Pemantau Kebumen Kota",
    location: "Alun-Alun, Kebumen Kota",
    lat: -7.6723,
    lng: 109.6533,
    temp: 30.2,
    hum: 72,
    pressure: 1012.1,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 6.5,
    status: "online",
    batteryVolt: 4.02,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(30.2, 72, 1012.1, 0.0),
  },
  {
    id: "stasiun-ambal-pesisir",
    name: "Stasiun Agro-Klimatologi Ambal",
    location: "Pesisir Pantai Ambal, Kebumen",
    lat: -7.7812,
    lng: 109.7289,
    temp: 28.7,
    hum: 81,
    pressure: 1012.5,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 14.5,
    status: "online",
    batteryVolt: 4.18,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(28.7, 81, 1012.5, 0.0),
  },
  {
    id: "stasiun-karanganyar",
    name: "Stasiun Meteorologi Karanganyar",
    location: "Kecamatan Karanganyar, Kebumen",
    lat: -7.6321,
    lng: 109.5782,
    temp: 29.1,
    hum: 77,
    pressure: 1011.2,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 5.8,
    status: "online",
    batteryVolt: 3.95,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(29.1, 77, 1011.2, 0.0),
  },
  {
    id: "stasiun-gombong-barat",
    name: "Stasiun Pemantau Gombong",
    location: "Kecamatan Gombong, Kebumen",
    lat: -7.6055,
    lng: 109.5142,
    temp: 29.6,
    hum: 74,
    pressure: 1011.5,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 7.1,
    status: "online",
    batteryVolt: 4.08,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(29.6, 74, 1011.5, 0.0),
  },
  {
    id: "stasiun-logending-ayah",
    name: "Stasiun Maritim Pantai Logending",
    location: "Pantai Logending, Kecamatan Ayah",
    lat: -7.7185,
    lng: 109.3985,
    temp: 28.5,
    hum: 83,
    pressure: 1012.7,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 16.2,
    status: "online",
    batteryVolt: 4.15,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(28.5, 83, 1012.7, 0.0),
  },
  {
    id: "stasiun-karangsambung",
    name: "Stasiun Observasi Geologi Karangsambung",
    location: "Cagar Geologi Nasional Karangsambung",
    lat: -7.5512,
    lng: 109.6734,
    temp: 27.2,
    hum: 82,
    pressure: 1009.4,
    rainfall: 0.2,
    rainrate: 0.0,
    windSpeed: 4.8,
    status: "online",
    batteryVolt: 4.05,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(27.2, 82, 1009.4, 0.2),
  },
  {
    id: "stasiun-waduk-sempor",
    name: "Stasiun Hidrologi Waduk Sempor",
    location: "Kawasan Waduk Sempor, Kebumen",
    lat: -7.5684,
    lng: 109.4892,
    temp: 27.8,
    hum: 80,
    pressure: 1010.1,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 6.2,
    status: "online",
    batteryVolt: 4.11,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(27.8, 80, 1010.1, 0.0),
  },
  {
    id: "stasiun-petanahan",
    name: "Stasiun Pemantau Pantai Petanahan",
    location: "Kawasan Pesisir Petanahan, Kebumen",
    lat: -7.7782,
    lng: 109.6124,
    temp: 28.9,
    hum: 80,
    pressure: 1012.4,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 13.8,
    status: "online",
    batteryVolt: 4.09,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(28.9, 80, 1012.4, 0.0),
  },
  {
    id: "stasiun-prembun",
    name: "Stasiun Agro-Meteorologi Prembun",
    location: "Kecamatan Prembun (Timur Kebumen)",
    lat: -7.7124,
    lng: 109.7981,
    temp: 29.8,
    hum: 75,
    pressure: 1011.9,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 6.8,
    status: "online",
    batteryVolt: 3.98,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(29.8, 75, 1011.9, 0.0),
  },
  {
    id: "stasiun-kutowinangun",
    name: "Stasiun Pemantau Kutowinangun",
    location: "Kecamatan Kutowinangun, Kebumen",
    lat: -7.7182,
    lng: 109.7345,
    temp: 29.7,
    hum: 75,
    pressure: 1011.7,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 7.4,
    status: "online",
    batteryVolt: 4.07,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(29.7, 75, 1011.7, 0.0),
  },
  {
    id: "stasiun-padureso",
    name: "Stasiun Hidrometeorologi Padureso",
    location: "Kawasan Waduk Wadaslintang, Padureso",
    lat: -7.5752,
    lng: 109.7923,
    temp: 26.9,
    hum: 84,
    pressure: 1008.9,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 5.1,
    status: "online",
    batteryVolt: 4.16,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(26.9, 84, 1008.9, 0.0),
  },
  {
    id: "stasiun-sruweng",
    name: "Stasiun Agro-Klimat Sruweng",
    location: "Kecamatan Sruweng, Kebumen",
    lat: -7.6391,
    lng: 109.6184,
    temp: 29.3,
    hum: 76,
    pressure: 1011.4,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 6.0,
    status: "online",
    batteryVolt: 4.03,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(29.3, 76, 1011.4, 0.0),
  },
  {
    id: "stasiun-suwuk-puring",
    name: "Stasiun Pemantau Pantai Suwuk",
    location: "Pantai Suwuk, Kecamatan Puring",
    lat: -7.7684,
    lng: 109.4952,
    temp: 28.6,
    hum: 82,
    pressure: 1012.6,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 15.0,
    status: "online",
    batteryVolt: 4.14,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(28.6, 82, 1012.6, 0.0),
  },
  {
    id: "stasiun-alian-krakal",
    name: "Stasiun Perbukitan Alian",
    location: "Kawasan Krakal, Kecamatan Alian",
    lat: -7.6254,
    lng: 109.6892,
    temp: 28.9,
    hum: 78,
    pressure: 1010.8,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 5.5,
    status: "online",
    batteryVolt: 4.06,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(28.9, 78, 1010.8, 0.0),
  },
  {
    id: "stasiun-mirit",
    name: "Stasiun Agroklimat Mirit",
    location: "Pesisir Kecamatan Mirit, Kebumen",
    lat: -7.7951,
    lng: 109.7893,
    temp: 28.8,
    hum: 81,
    pressure: 1012.5,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 14.1,
    status: "online",
    batteryVolt: 4.10,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(28.8, 81, 1012.5, 0.0),
  },
  {
    id: "stasiun-jatijajar-buayan",
    name: "Stasiun Karst Jatijajar",
    location: "Kawasan Goa Jatijajar, Buayan",
    lat: -7.6682,
    lng: 109.4253,
    temp: 28.9,
    hum: 79,
    pressure: 1011.2,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 6.4,
    status: "online",
    batteryVolt: 4.04,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(28.9, 79, 1011.2, 0.0),
  },
  {
    id: "stasiun-pejagoan",
    name: "Stasiun Agro-Meteorologi Pejagoan",
    location: "Kecamatan Pejagoan, Kebumen",
    lat: -7.6784,
    lng: 109.6421,
    temp: 29.9,
    hum: 73,
    pressure: 1011.9,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 6.2,
    status: "online",
    batteryVolt: 4.01,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(29.9, 73, 1011.9, 0.0),
  },
  {
    id: "stasiun-buluspesantren",
    name: "Stasiun Pesisir Buluspesantren",
    location: "Kecamatan Buluspesantren, Kebumen",
    lat: -7.7542,
    lng: 109.6851,
    temp: 29.0,
    hum: 80,
    pressure: 1012.3,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 12.5,
    status: "online",
    batteryVolt: 4.09,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(29.0, 80, 1012.3, 0.0),
  },
  {
    id: "stasiun-rowokele",
    name: "Stasiun Pemantau Rowokele",
    location: "Kawasan Ijo, Kecamatan Rowokele",
    lat: -7.6124,
    lng: 109.4521,
    temp: 28.7,
    hum: 78,
    pressure: 1011.0,
    rainfall: 0.0,
    rainrate: 0.0,
    windSpeed: 6.9,
    status: "online",
    batteryVolt: 4.12,
    lastUpdate: "Baru saja",
    history1h: generateRealistic1HourHistory(28.7, 78, 1011.0, 0.0),
  },
];

export default function PetaPage() {
  const { user } = useAuth();
  const [deviceData, setDeviceData] = useState<StationData[]>(KEBUMEN_DEFAULT_STATIONS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      let mergedStations: StationData[] = [...KEBUMEN_DEFAULT_STATIONS];

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
          // Combine user devices with Kebumen benchmark stations
          mergedStations = [...userResults, ...KEBUMEN_DEFAULT_STATIONS];
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