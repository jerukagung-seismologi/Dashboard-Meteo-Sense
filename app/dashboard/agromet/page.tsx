"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  RefreshCw,
  ThermometerSun,
  Droplets,
  Wind,
  Sprout,
  CloudRain,
  Sun,
  Thermometer,
  MapPin,
  AlertTriangle,
  Info
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import ReactECharts from "echarts-for-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamic imports for Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// Setup Leaflet default icon
if (typeof window !== 'undefined') {
  import('leaflet').then(L => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  });
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SensorOption {
  label: string;
  value: string;
  lat: number;
  lng: number;
}

export default function AgrometPage() {
  const { user } = useAuth();
  const [sensorOptions, setSensorOptions] = useState<SensorOption[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<SensorOption | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  useEffect(() => {
    if (user?.uid) {
      const loadUserDevices = async () => {
        try {
          const devices = await fetchAllDevices(user.uid);
          const options = devices
            .filter((device) => device.authToken && device.coordinates)
            .map((device) => ({
              label: device.name,
              value: device.authToken!,
              lat: device.coordinates?.lat || -6.2,
              lng: device.coordinates?.lng || 106.8,
            }));
          setSensorOptions(options);
          if (options.length > 0) setSelectedSensor(options[0]);
        } catch (err) {
          console.error("Gagal memuat daftar perangkat.", err);
        }
      };
      loadUserDevices();
    }
  }, [user]);

  const apiUrl = selectedSensor ? `/api/weather/agromet?lat=${selectedSensor.lat}&lon=${selectedSensor.lng}` : null;
  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, { refreshInterval: 300000 });

  if (sensorOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="text-gray-500">Memuat konfigurasi perangkat atau tidak ada perangkat dengan koordinat yang tersedia.</p>
      </div>
    );
  }

  // Helper functions
  const getCardinalDirection = (deg: number) => {
    const directions = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
    return directions[Math.round(deg / 45) % 8];
  };

  const current = data?.current || {};
  const daily = data?.daily || {};
  const hourly = data?.hourly || {};

  // Metrics
  const temp = current.temperature_2m;
  const tempMin = daily.temperature_2m_min?.[0];
  const tempMax = daily.temperature_2m_max?.[0];
  const rh = current.relative_humidity_2m;
  
  const rainToday = daily.precipitation_sum?.[0] || 0;
  const rain7d = daily.precipitation_sum?.slice(0, 7).reduce((a: number, b: number) => a + b, 0) || 0;
  
  const solarCurrent = current.shortwave_radiation;
  const solarDaily = daily.shortwave_radiation_sum?.[0];
  
  const windSpeed = current.wind_speed_10m ? (current.wind_speed_10m / 3.6).toFixed(1) : 0; // m/s
  const windDir = current.wind_direction_10m;

  // Soil Data
  const soilMoistureSurface = hourly.soil_moisture_0_to_1cm?.[0] * 100 || 0;
  const soilMoistureRoot = hourly.soil_moisture_9_to_27cm?.[0] * 100 || 0;
  const soilTempSurface = hourly.soil_temperature_0cm?.[0] || 0;
  const soilTempRoot = hourly.soil_temperature_18cm?.[0] || 0;

  // Water Balance
  const et0Today = daily.et0_fao_evapotranspiration_sum?.[0] || 0;
  const waterDeficit = rainToday - et0Today;

  // Crop Stress Logic
  const isHeatStress = temp > 35 && rh < 40;
  const isDroughtRisk = soilMoistureRoot < 15 && rain7d < 10;
  const isDiseaseRisk = rh > 85 && temp > 20 && temp < 30 && rainToday > 0;

  // Chart Colors
  const textColor = isDarkMode ? '#cbd5e1' : '#475569';
  const gridColor = isDarkMode ? 'rgba(71, 85, 105, 0.2)' : 'rgba(203, 213, 225, 0.2)';

  // Chart Configurations
  const waterBalanceOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Curah Hujan', 'Evapotranspirasi (ET0)'], textStyle: { color: textColor } },
    grid: { left: '5%', right: '5%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: daily.time?.slice(0, 7), axisLabel: { color: textColor } },
    yAxis: { type: 'value', name: 'mm', axisLabel: { color: textColor }, splitLine: { lineStyle: { color: gridColor } } },
    series: [
      { name: 'Curah Hujan', type: 'bar', data: daily.precipitation_sum?.slice(0, 7), itemStyle: { color: '#3b82f6' } },
      { name: 'Evapotranspirasi (ET0)', type: 'line', data: daily.et0_fao_evapotranspiration_sum?.slice(0, 7), itemStyle: { color: '#f59e0b' }, smooth: true }
    ]
  };

  const soilMoistureOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Permukaan (0-1cm)', 'Zona Akar (9-27cm)'], textStyle: { color: textColor } },
    grid: { left: '5%', right: '5%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: hourly.time?.slice(0, 24).map((t: string) => t.substring(11, 16)), axisLabel: { color: textColor } },
    yAxis: { type: 'value', name: '%', axisLabel: { color: textColor }, splitLine: { lineStyle: { color: gridColor } } },
    series: [
      { name: 'Permukaan (0-1cm)', type: 'line', data: hourly.soil_moisture_0_to_1cm?.slice(0, 24).map((v: number) => v * 100), itemStyle: { color: '#8b5cf6' }, smooth: true },
      { name: 'Zona Akar (9-27cm)', type: 'line', data: hourly.soil_moisture_9_to_27cm?.slice(0, 24).map((v: number) => v * 100), itemStyle: { color: '#10b981' }, smooth: true }
    ]
  };

  const solarOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '5%', right: '5%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: hourly.time?.slice(0, 24).map((t: string) => t.substring(11, 16)), axisLabel: { color: textColor } },
    yAxis: { type: 'value', name: 'W/m²', axisLabel: { color: textColor }, splitLine: { lineStyle: { color: gridColor } } },
    series: [
      { name: 'Radiasi Matahari', type: 'line', areaStyle: { opacity: 0.3 }, data: hourly.shortwave_radiation?.slice(0, 24), itemStyle: { color: '#fcd34d' }, smooth: true }
    ]
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Agrometeorologi Dashboard</h2>
          <p className="text-muted-foreground dark:text-gray-400 mt-1">Monitoring kondisi lingkungan pertanian, air, dan tanah secara real-time.</p>
        </div>
      </div>

      <Card className="bg-slate-50 dark:bg-slate-800/50 border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <Select
            value={selectedSensor?.value}
            onValueChange={(val) => {
              const sensor = sensorOptions.find(s => s.value === val);
              if (sensor) setSelectedSensor(sensor);
            }}
          >
            <SelectTrigger className="w-full sm:w-[250px] bg-white dark:bg-slate-900">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Pilih Lokasi Perangkat" />
            </SelectTrigger>
            <SelectContent>
              {sensorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => mutate()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Perbarui Data
          </Button>
          <span className="text-sm text-muted-foreground ml-auto">
            Koordinat: {selectedSensor?.lat.toFixed(4)}, {selectedSensor?.lng.toFixed(4)}
          </span>
        </CardContent>
      </Card>

      {isLoading && !data ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">Gagal memuat data agrometeorologi.</div>
      ) : (
        <>
          {/* 1. Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Suhu Udara</span>
                  <ThermometerSun className="h-4 w-4 text-red-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{temp}°</span>
                  <div className="text-xs text-muted-foreground mt-1">Min: {tempMin}° | Max: {tempMax}°</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Kelembapan</span>
                  <Droplets className="h-4 w-4 text-blue-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{rh}%</span>
                  <div className="text-xs text-muted-foreground mt-1">Kondisi Udara Saat Ini</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Curah Hujan</span>
                  <CloudRain className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{rainToday}<span className="text-xl">mm</span></span>
                  <div className="text-xs text-muted-foreground mt-1">Total 7 Hari: {rain7d.toFixed(1)} mm</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Radiasi Surya</span>
                  <Sun className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{solarCurrent}<span className="text-xl">W/m²</span></span>
                  <div className="text-xs text-muted-foreground mt-1">Total Harian: {solarDaily} MJ/m²</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Angin</span>
                  <Wind className="h-4 w-4 text-slate-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{windSpeed}<span className="text-xl">m/s</span></span>
                  <div className="text-xs text-muted-foreground mt-1">Arah: {windDir}° ({getCardinalDirection(windDir)})</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 2. Soil & Crop Status (Left Column) */}
            <div className="lg:col-span-1 space-y-6">
              
              <Card>
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-lg flex items-center gap-2"><Sprout className="h-5 w-5 text-emerald-500"/> Profil Tanah</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Kelembapan Permukaan (0-1cm)</span>
                      <span className="text-sm font-bold">{soilMoistureSurface.toFixed(1)}%</span>
                    </div>
                    <Progress value={soilMoistureSurface} className="h-2 bg-slate-200" />
                    <p className="text-xs text-muted-foreground mt-1">Suhu: {soilTempSurface}°C</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Kelembapan Zona Akar (9-27cm)</span>
                      <span className="text-sm font-bold text-emerald-600">{soilMoistureRoot.toFixed(1)}%</span>
                    </div>
                    <Progress value={soilMoistureRoot} className="h-3 bg-slate-200 [&>div]:bg-emerald-500" />
                    <p className="text-xs text-muted-foreground mt-1">Suhu: {soilTempRoot}°C</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-lg flex items-center gap-2"><Droplets className="h-5 w-5 text-blue-500"/> Neraca Air Harian (Water Balance)</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-center mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                      <div className="text-xs text-muted-foreground mb-1">Input (Hujan)</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{rainToday} mm</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-800">
                      <div className="text-xs text-muted-foreground mb-1">Output (ET0)</div>
                      <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{et0Today.toFixed(1)} mm</div>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${waterDeficit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
                    <div className="flex items-center gap-2 font-semibold">
                      <Info className="h-4 w-4" />
                      Status: {waterDeficit >= 0 ? 'Surplus Air' : 'Defisit Air'}
                    </div>
                    <div className="text-sm mt-1">
                      Selisih: {waterDeficit > 0 ? '+' : ''}{waterDeficit.toFixed(1)} mm
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500"/> Indikator Risiko Pertanian</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-medium">Stres Panas (Heat Stress)</span>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${isHeatStress ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isHeatStress ? 'Tinggi' : 'Rendah'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-medium">Risiko Kekeringan (Drought)</span>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${isDroughtRisk ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isDroughtRisk ? 'Tinggi' : 'Rendah'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-medium">Risiko Penyakit Daun</span>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${isDiseaseRisk ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isDiseaseRisk ? 'Waspada' : 'Aman'}
                    </span>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* 3. Charts & Maps (Right Column) */}
            <div className="lg:col-span-2 space-y-6">
              
              <Card>
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-lg">Neraca Air: Hujan vs Evapotranspirasi (7 Hari)</CardTitle>
                  <CardDescription>Perbandingan curah hujan aktual dengan penguapan air dari tanah dan tanaman.</CardDescription>
                </CardHeader>
                <CardContent className="p-2 h-[300px]">
                  <ReactECharts option={waterBalanceOption} style={{ height: '100%', width: '100%' }} theme={isDarkMode ? 'dark' : 'light'} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-lg">Kelembapan Tanah (24 Jam)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 h-[250px]">
                    <ReactECharts option={soilMoistureOption} style={{ height: '100%', width: '100%' }} theme={isDarkMode ? 'dark' : 'light'} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-lg">Radiasi Matahari Aktif (24 Jam)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 h-[250px]">
                    <ReactECharts option={solarOption} style={{ height: '100%', width: '100%' }} theme={isDarkMode ? 'dark' : 'light'} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-lg">Peta Lokasi Lahan</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[300px] overflow-hidden rounded-b-xl relative z-0">
                  {selectedSensor && (
                    <MapContainer center={[selectedSensor.lat, selectedSensor.lng]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[selectedSensor.lat, selectedSensor.lng]}>
                        <Popup>
                          Lokasi Sensor: {selectedSensor.label} <br />
                          {selectedSensor.lat.toFixed(4)}, {selectedSensor.lng.toFixed(4)}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>

          {/* 4. Forecast Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg">Prakiraan 24 Jam Kedepan</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Suhu</th>
                      <th className="px-4 py-3">Hujan</th>
                      <th className="px-4 py-3">Kelembapan Tanah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourly.time?.slice(0, 24).map((timeStr: string, idx: number) => (
                      <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-2 font-medium">{timeStr.substring(11, 16)}</td>
                        <td className="px-4 py-2">{hourly.temperature_2m[idx]}°C</td>
                        <td className="px-4 py-2 text-blue-500">{hourly.precipitation[idx]} mm</td>
                        <td className="px-4 py-2 text-emerald-500">{(hourly.soil_moisture_9_to_27cm[idx] * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg">Prakiraan 7 Hari Kedepan</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Min/Max Suhu</th>
                      <th className="px-4 py-3">Hujan</th>
                      <th className="px-4 py-3">Radiasi Surya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.time?.slice(0, 7).map((timeStr: string, idx: number) => (
                      <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-2 font-medium">{timeStr.substring(5, 10)}</td>
                        <td className="px-4 py-2">{daily.temperature_2m_min[idx]}° - {daily.temperature_2m_max[idx]}°C</td>
                        <td className="px-4 py-2 text-blue-500">{daily.precipitation_sum[idx]} mm</td>
                        <td className="px-4 py-2 text-yellow-500">{daily.shortwave_radiation_sum[idx]} MJ/m²</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

        </>
      )}
    </div>
  );
}
