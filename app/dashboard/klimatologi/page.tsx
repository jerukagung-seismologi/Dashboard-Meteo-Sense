// app/dashboard/klimatologi/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import {
  Loader2,
  Sparkles,
  MapPin,
  BarChart3,
  RefreshCw,
  ThermometerSun,
  Droplets,
  Wind,
  Sprout,
  CloudRain,
  Sun,
  Thermometer,
  AlertTriangle,
  Info,
  Gauge,
  Activity,
  Waves,
  Cloud,
  Calendar,
  Search,
  Star,
  Compass,
  Check,
  TrendingUp,
  Database,
  Globe,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Climatology Station Components ────────────────────────────────────────
import { PresetSelector } from "@/components/climatology/PresetSelector";
import { ClimateExtremesCards } from "@/components/climatology/ClimateExtremesCards";
import { computeClimateExtremes } from "@/lib/climatology/climateExtremes";
import { TemperatureCharts } from "@/components/climatology/TemperatureCharts";
import { RainfallCharts } from "@/components/climatology/RainfallCharts";
import { HumidityCharts } from "@/components/climatology/HumidityCharts";
import { PressureCharts } from "@/components/climatology/PressureCharts";
import { TempDewComparisonCharts } from "@/components/climatology/TempDewComparisonCharts";
import { Era5ClimatologyCharts } from "@/components/climatology/Era5ClimatologyCharts";
import { ClimateRepresentativenessOverview } from "@/components/climatology/ClimateRepresentativenessOverview";

// ─── ERA5 Reanalysis Components ────────────────────────────────────────────
import { CurrentConditions } from "@/components/reanalysis/CurrentConditions";
import { TimeSeriesCharts } from "@/components/reanalysis/TimeSeriesCharts";
import { HovmollerDiagram } from "@/components/reanalysis/HovmollerDiagram";
import { DistributionAnalysis } from "@/components/reanalysis/DistributionAnalysis";
import { DiurnalCycle } from "@/components/reanalysis/DiurnalCycle";
import { WeeklyAnalysis } from "@/components/reanalysis/WeeklyAnalysis";
import { MonthlyAnalysis } from "@/components/reanalysis/MonthlyAnalysis";
import { AnnualAnalysis } from "@/components/reanalysis/AnnualAnalysis";
import { WindRose } from "@/components/reanalysis/WindRose";
import { ForecastDiagnostics } from "@/components/reanalysis/ForecastDiagnostics";

// ─── Agrometeorologi Components ────────────────────────────────────────────
import { MonsoonAgrometSection } from "@/components/agromet/MonsoonAgrometSection";
import { EnsembleAgrometSection } from "@/components/agromet/EnsembleAgrometSection";
import { WaterBalanceDualChart } from "@/components/agromet/WaterBalanceDualChart";

// ─── Climate Glossary ──────────────────────────────────────────────────────
import { ClimateGlossary } from "@/components/climate-drivers/ClimateGlossary";

// ─── Dynamic Leaflet imports (SSR-safe) ───────────────────────────────────
import "leaflet/dist/leaflet.css";
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

// Setup Leaflet default icons (client-side only)
if (typeof window !== "undefined") {
  import("leaflet").then((L) => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  });
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface DeviceOption {
  label: string;
  value: string;
  coordinates?: { lat: number; lng: number };
  location?: string;
}

interface FavoriteLocation {
  name: string;
  latitude: number;
  longitude: number;
}

const defaultFavorites: FavoriteLocation[] = [
  { name: "Jakarta", latitude: -6.2146, longitude: 106.8451 },
  { name: "Surabaya", latitude: -7.2575, longitude: 112.7521 },
  { name: "Bandung", latitude: -6.9175, longitude: 107.6191 },
  { name: "Medan", latitude: 3.5952, longitude: 98.6722 },
  { name: "Makassar", latitude: -5.1476, longitude: 119.4327 },
];

// ─── Fetcher ───────────────────────────────────────────────────────────────
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Gagal memuat data dari server.");
  }
  return res.json();
};

const agrometFetcher = (url: string) => fetch(url).then((res) => res.json());

// ─── Main Component ────────────────────────────────────────────────────────
export default function KlimatologiPage() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Monitor dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ── Active main tab ───────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState("agromet");

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 1 & 2 SHARED: Station/Device Selection
  // ═══════════════════════════════════════════════════════════════════════════
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [sensorId, setSensorId] = useState<string>("");

  useEffect(() => {
    if (user?.uid) {
      const loadDevices = async () => {
        try {
          const res = await fetchAllDevices(user.uid);
          const options = res
            .filter((d) => d.authToken)
            .map((d) => ({
              label: d.name,
              value: d.authToken!,
              coordinates: d.coordinates,
              location: d.location,
            }));
          setDevices(options);
          if (options.length > 0) {
            setSensorId(options[0].value);
          }
        } catch (err) {
          console.error("Gagal memuat stasiun perangkat:", err);
        }
      };
      loadDevices();
    }
  }, [user]);

  const currentDevice = useMemo(() => devices.find((d) => d.value === sensorId), [devices, sensorId]);

  const currentCoords = useMemo(() => {
    if (
      currentDevice?.coordinates &&
      (currentDevice.coordinates.lat !== 0 || currentDevice.coordinates.lng !== 0)
    ) {
      return currentDevice.coordinates;
    }
    return { lat: -7.5361, lng: 110.2312 }; // Fallback: AWS Jerukagung, Jawa Tengah
  }, [currentDevice]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 1: AGROMETEOROLOGI STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [refreshKeyAgromet, setRefreshKeyAgromet] = useState<number>(0);

  const selectedSensorOption = useMemo(() => {
    if (!currentDevice) return null;
    return {
      label: currentDevice.label,
      value: currentDevice.value,
      lat: currentDevice.coordinates?.lat ?? -7.5361,
      lng: currentDevice.coordinates?.lng ?? 110.2312,
    };
  }, [currentDevice]);

  const agrometApiUrl = selectedSensorOption
    ? `/api/weather/agromet?lat=${selectedSensorOption.lat}&lon=${selectedSensorOption.lng}${refreshKeyAgromet ? `&_t=${refreshKeyAgromet}` : ""}`
    : null;

  const {
    data: agrometData,
    error: agrometError,
    isLoading: isAgrometLoading,
    mutate: mutateAgromet,
  } = useSWR(agrometApiUrl, agrometFetcher, {
    refreshInterval: 300000,
    dedupingInterval: 0,
  });

  const handleRefreshAgromet = () => {
    setRefreshKeyAgromet(Date.now());
    mutateAgromet();
  };

  // Agromet computed values
  const agroCurrentData = agrometData?.current || {};
  const agroDailyData = agrometData?.daily || {};
  const agroHourlyData = agrometData?.hourly || {};

  const temp = agroCurrentData.temperature_2m ?? 0;
  const tempMin = agroDailyData.temperature_2m_min?.[0] ?? "-";
  const tempMax = agroDailyData.temperature_2m_max?.[0] ?? "-";
  const apparentTemp = agroCurrentData.apparent_temperature ?? temp;
  const rh = agroCurrentData.relative_humidity_2m ?? 0;
  const dewPoint = agroCurrentData.dew_point_2m ?? (temp - (100 - rh) / 5);
  const dewPointDepression = Math.max(0, Number((temp - dewPoint).toFixed(1)));
  const surfacePressure = agroCurrentData.surface_pressure ?? 1012;
  const vpd = agroCurrentData.vapour_pressure_deficit ?? Number((0.61078 * Math.exp((17.27 * temp) / (temp + 237.3)) * (1 - rh / 100)).toFixed(2));
  const rainToday = agroDailyData.precipitation_sum?.[0] || 0;
  const rain7d = agroDailyData.precipitation_sum?.slice(0, 7).reduce((a: number, b: number) => a + b, 0) || 0;
  const solarCurrent = agroCurrentData.shortwave_radiation ?? 0;
  const solarDaily = agroDailyData.shortwave_radiation_sum?.[0] ?? 0;
  const cloudCover = agroCurrentData.cloud_cover ?? 0;
  const uvIndex = agroDailyData.uv_index_max?.[0] ?? "-";
  const windSpeed = agroCurrentData.wind_speed_10m ? (agroCurrentData.wind_speed_10m / 3.6).toFixed(1) : "0.0";
  const windDir = agroCurrentData.wind_direction_10m ?? 0;
  const soilMoistureSurface = agroHourlyData.soil_moisture_0_to_1cm?.[0] ? agroHourlyData.soil_moisture_0_to_1cm[0] * 100 : 0;
  const soilMoistureRoot = agroHourlyData.soil_moisture_9_to_27cm?.[0] ? agroHourlyData.soil_moisture_9_to_27cm[0] * 100 : 0;
  const soilTempSurface = agroHourlyData.soil_temperature_0cm?.[0] || 0;
  const soilTempRoot = agroHourlyData.soil_temperature_18cm?.[0] || 0;
  const et0Today = agroDailyData.et0_fao_evapotranspiration_sum?.[0] || 0;
  const waterDeficit = rainToday - et0Today;

  const isHeatStress = temp > 35 && rh < 40;
  const isDroughtRisk = soilMoistureRoot < 15 && rain7d < 10;
  const isDiseaseRisk = rh > 85 && temp > 20 && temp < 30 && (rainToday > 0 || dewPointDepression <= 1.5);
  const isVpdStress = vpd > 2.0;

  const textColor = isDarkMode ? "#cbd5e1" : "#475569";
  const gridColor = isDarkMode ? "rgba(71, 85, 105, 0.2)" : "rgba(203, 213, 225, 0.2)";

  const soilMoistureOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: { data: ["Permukaan (0-1cm)", "Zona Akar (9-27cm)"], textStyle: { color: textColor } },
      grid: { left: "4%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: { type: "category", data: agroHourlyData.time?.slice(0, 24).map((t: string) => t.substring(11, 16)), axisLabel: { color: textColor } },
      yAxis: { type: "value", name: "%", scale: true, axisLabel: { color: textColor }, splitLine: { lineStyle: { color: gridColor } } },
      series: [
        { name: "Permukaan (0-1cm)", type: "line", data: agroHourlyData.soil_moisture_0_to_1cm?.slice(0, 24).map((v: number) => Number((v * 100).toFixed(1))), itemStyle: { color: "#8b5cf6" }, smooth: true },
        { name: "Zona Akar (9-27cm)", type: "line", data: agroHourlyData.soil_moisture_9_to_27cm?.slice(0, 24).map((v: number) => Number((v * 100).toFixed(1))), itemStyle: { color: "#10b981" }, smooth: true },
      ],
    }),
    [agroHourlyData, textColor, gridColor]
  );

  const solarOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: "4%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: { type: "category", data: agroHourlyData.time?.slice(0, 24).map((t: string) => t.substring(11, 16)), axisLabel: { color: textColor } },
      yAxis: { type: "value", name: "W/m²", scale: true, axisLabel: { color: textColor }, splitLine: { lineStyle: { color: gridColor } } },
      series: [
        { name: "Radiasi Surya", type: "line", areaStyle: { opacity: 0.3 }, data: agroHourlyData.shortwave_radiation?.slice(0, 24), itemStyle: { color: "#fcd34d" }, smooth: true },
      ],
    }),
    [agroHourlyData, textColor, gridColor]
  );

  const getCardinalDirection = (deg: number) => {
    const directions = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
    return directions[Math.round(deg / 45) % 8];
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 2: STATISTIK KLIMATOLOGI STASIUN STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [preset, setPreset] = useState<string>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getUTCFullYear());
  const [selectedDasarian, setSelectedDasarian] = useState<number>(1);
  const [refreshKeyKlim, setRefreshKeyKlim] = useState<number>(0);

  const klimApiPath = useMemo(() => {
    if (!sensorId) return null;
    let queryParams = `sensorId=${sensorId}&preset=${preset}&calibration=true`;
    if (preset === "monthly") queryParams += `&month=${selectedMonth}&year=${selectedYear}`;
    else if (preset === "dasarian") queryParams += `&month=${selectedMonth}&year=${selectedYear}&dasarian=${selectedDasarian}`;
    else if (preset === "yearly") queryParams += `&year=${selectedYear}`;
    if (refreshKeyKlim) queryParams += `&_t=${refreshKeyKlim}`;
    return `/api/climatology?${queryParams}`;
  }, [sensorId, preset, selectedMonth, selectedYear, selectedDasarian, refreshKeyKlim]);

  const { data: klimData, error: klimError, isLoading: isKlimLoading, mutate: mutateKlim } = useSWR(klimApiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 0,
  });

  // ERA5 baseline for klimatologi station data
  const era5BaselinePath = useMemo(() => {
    if (!currentCoords?.lat || !currentCoords?.lng) return null;
    const targetYear = selectedYear || new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;
    let url = `/api/reanalysis/data?latitude=${currentCoords.lat}&longitude=${currentCoords.lng}&startDate=${startDate}&endDate=${endDate}`;
    if (refreshKeyKlim) url += `&_t=${refreshKeyKlim}`;
    return url;
  }, [currentCoords, selectedYear, refreshKeyKlim]);

  const { data: era5BaselineData, isLoading: isEra5BaselineLoading, mutate: mutateEra5Baseline } = useSWR(era5BaselinePath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const handleRefreshKlim = useCallback(() => {
    setRefreshKeyKlim(Date.now());
    mutateKlim();
    mutateEra5Baseline();
  }, [mutateKlim, mutateEra5Baseline]);

  const periodNormals = useMemo(() => {
    if (!era5BaselineData || !era5BaselineData.monthly) return null;
    const mIdx = Math.max(0, Math.min(11, (selectedMonth || 1) - 1));

    let normalTemp = era5BaselineData.stats.temperature.mean;
    let normalHum = era5BaselineData.stats.humidity.mean;
    let normalPress = era5BaselineData.stats.pressure.mean;
    let normalRain = era5BaselineData.monthly.rain.reduce((a: number, b: number) => a + b, 0) / 12;

    if (preset === "monthly") {
      normalTemp = era5BaselineData.monthly.temperature.mean[mIdx] ?? normalTemp;
      normalHum = era5BaselineData.monthly.humidity.mean[mIdx] ?? normalHum;
      normalPress = era5BaselineData.monthly.pressure.mean[mIdx] ?? normalPress;
      normalRain = era5BaselineData.monthly.rain[mIdx] ?? normalRain;
    } else if (preset === "dasarian") {
      normalTemp = era5BaselineData.monthly.temperature.mean[mIdx] ?? normalTemp;
      normalHum = era5BaselineData.monthly.humidity.mean[mIdx] ?? normalHum;
      normalPress = era5BaselineData.monthly.pressure.mean[mIdx] ?? normalPress;
      normalRain = (era5BaselineData.monthly.rain[mIdx] ?? normalRain) / 3;
    } else if (preset === "weekly") {
      const currentM = new Date().getMonth();
      normalTemp = era5BaselineData.monthly.temperature.mean[currentM] ?? normalTemp;
      normalHum = era5BaselineData.monthly.humidity.mean[currentM] ?? normalHum;
      normalPress = era5BaselineData.monthly.pressure.mean[currentM] ?? normalPress;
      normalRain = (era5BaselineData.monthly.rain[currentM] ?? normalRain) / 4;
    } else if (preset === "yearly") {
      normalTemp = era5BaselineData.stats.temperature.mean;
      normalHum = era5BaselineData.stats.humidity.mean;
      normalPress = era5BaselineData.stats.pressure.mean;
      normalRain = era5BaselineData.monthly.rain.reduce((a: number, b: number) => a + b, 0);
    }

    return {
      temperature: { mean: normalTemp, monthly: era5BaselineData.monthly.temperature.mean },
      humidity: { mean: normalHum, monthly: era5BaselineData.monthly.humidity.mean },
      pressure: { mean: normalPress, monthly: era5BaselineData.monthly.pressure.mean },
      rainfall: { normal: normalRain, monthly: era5BaselineData.monthly.rain },
    };
  }, [era5BaselineData, preset, selectedMonth]);

  const climateExtremes = useMemo(() => {
    return computeClimateExtremes(klimData?.points || [], era5BaselineData || null);
  }, [klimData?.points, era5BaselineData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 3: ERA5 REANALISIS STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [latInput, setLatInput] = useState<string>("-6.2146");
  const [lngInput, setLngInput] = useState<string>("106.8451");
  const [appliedCoords, setAppliedCoords] = useState<{ lat: number; lng: number }>({ lat: -6.2146, lng: 106.8451 });
  const [appliedLocationName, setAppliedLocationName] = useState<string>("Jakarta");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [timePreset, setTimePreset] = useState<string>("1y");

  const maxEndDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return d.toISOString().substring(0, 10);
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>(maxEndDate);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("meteo_reanalysis_favorites");
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch {
          setFavorites(defaultFavorites);
        }
      } else {
        setFavorites(defaultFavorites);
        localStorage.setItem("meteo_reanalysis_favorites", JSON.stringify(defaultFavorites));
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLatInput(latitude.toFixed(4));
            setLngInput(longitude.toFixed(4));
            setAppliedCoords({ lat: latitude, lng: longitude });
          },
          () => {
            console.log("Geolocation permission denied. Defaulting to Jakarta.");
          },
          { timeout: 5000 }
        );
      }
    }
  }, []);

  const era5QueryDates = useMemo(() => {
    const today = new Date();
    const end = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
    let start = new Date(end);

    if (timePreset === "1y") start.setFullYear(end.getFullYear() - 1);
    else if (timePreset === "6m") start.setMonth(end.getMonth() - 6);
    else if (timePreset === "3m") start.setMonth(end.getMonth() - 3);
    else if (timePreset === "30d") start.setDate(end.getDate() - 30);
    else if (timePreset === "custom" && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }

    return {
      start: start.toISOString().substring(0, 10),
      end: end.toISOString().substring(0, 10),
    };
  }, [timePreset, customStartDate, customEndDate]);

  const dateRangeValidation = useMemo(() => {
    if (timePreset !== "custom") return { isValid: true, message: "" };
    if (!customStartDate || !customEndDate) return { isValid: false, message: "Tanggal Mulai dan Selesai harus diisi" };
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const maxEnd = new Date(maxEndDate);
    if (start > end) return { isValid: false, message: "Tanggal Mulai tidak boleh setelah Tanggal Selesai" };
    if (end > maxEnd) return { isValid: false, message: `ERA5 Reanalysis memiliki delay data. Tanggal Selesai maks: ${maxEndDate}` };
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) return { isValid: false, message: "Rentang maksimum adalah 1 tahun (366 hari)" };
    if (diffDays < 7) return { isValid: false, message: "Rentang minimum adalah 7 hari untuk analisis yang bermakna" };
    return { isValid: true, message: "" };
  }, [timePreset, customStartDate, customEndDate, maxEndDate]);

  // Geocoding autocomplete
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingGeocode(true);
      try {
        const res = await fetch(`/api/reanalysis/geocode?name=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
        }
      } catch (err) {
        console.error("Geocode fetch error:", err);
      } finally {
        setIsSearchingGeocode(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleApplyEra5Params = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || lat < -90 || lat > 90) { alert("Latitude harus berupa angka antara -90 dan 90."); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { alert("Longitude harus berupa angka antara -180 dan 180."); return; }
    if (!dateRangeValidation.isValid) { alert(dateRangeValidation.message); return; }
    setAppliedCoords({ lat, lng });
  };

  const handleSelectSuggestion = (city: any) => {
    setLatInput(city.latitude.toFixed(4));
    setLngInput(city.longitude.toFixed(4));
    setSearchQuery("");
    setSuggestions([]);
    setAppliedCoords({ lat: city.latitude, lng: city.longitude });
    setAppliedLocationName(`${city.name}, ${city.admin1 || city.country}`);
  };

  const isCurrentFavorite = useMemo(() => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    return favorites.some((f) => Math.abs(f.latitude - lat) < 0.01 && Math.abs(f.longitude - lng) < 0.01);
  }, [latInput, lngInput, favorites]);

  const handleToggleFavorite = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) return;
    let updated: FavoriteLocation[];
    if (isCurrentFavorite) {
      updated = favorites.filter((f) => !(Math.abs(f.latitude - lat) < 0.01 && Math.abs(f.longitude - lng) < 0.01));
    } else {
      const name = prompt("Masukkan nama lokasi favorit Anda:", "Lokasi Baru") || "Favorit";
      updated = [...favorites, { name, latitude: lat, longitude: lng }];
    }
    setFavorites(updated);
    localStorage.setItem("meteo_reanalysis_favorites", JSON.stringify(updated));
  };

  const handleSelectFavorite = (fav: FavoriteLocation) => {
    setLatInput(fav.latitude.toString());
    setLngInput(fav.longitude.toString());
    setAppliedCoords({ lat: fav.latitude, lng: fav.longitude });
    setAppliedLocationName(fav.name);
  };

  const triggerGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          setLatInput(lat);
          setLngInput(lng);
          setAppliedCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
          setAppliedLocationName("Lokasi GPS Pengguna");
        },
        () => { alert("Gagal mengakses geolokasi browser. Pastikan izin telah diberikan."); }
      );
    } else {
      alert("Browser Anda tidak mendukung geolokasi.");
    }
  };

  const era5ApiPath = useMemo(() => {
    if (!appliedCoords) return null;
    return `/api/reanalysis/data?latitude=${appliedCoords.lat.toFixed(4)}&longitude=${appliedCoords.lng.toFixed(4)}&startDate=${era5QueryDates.start}&endDate=${era5QueryDates.end}`;
  }, [appliedCoords, era5QueryDates]);

  const { data: era5Data, error: era5Error, isLoading: isEra5Loading, mutate: mutateEra5 } = useSWR(era5ApiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Loading skeletons
  // ═══════════════════════════════════════════════════════════════════════════
  const renderKlimLoading = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Card key={idx} className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardContent className="p-3.5 flex flex-col justify-between h-[155px]">
              <div className="flex justify-between items-start">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardContent className="p-8 h-[400px] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400 font-medium">Melakukan perhitungan & agregasi data klimatologi di server...</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderEra5Loading = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx} className="border-none shadow-sm dark:bg-slate-900 bg-white">
            <CardContent className="p-4 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardContent className="p-16 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Menghubungi Open-Meteo ERA5 Reanalysis Archive...</p>
            <p className="text-xs text-slate-400 max-w-md">Melakukan kompilasi meteorologi, perhitungan CAPE, dan penyusunan diagram Hovmöller di server...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Main JSX
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-12">

      {/* ── A. Page Header (Single Compact Banner) ────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 sm:p-5 bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-teal-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1.5 z-10 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Analisis Klimatologi Terpadu
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">ERA5 · Agrometeorologi · Statistik Iklim</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5 text-white">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-teal-400 shrink-0" /> Analisis Klimatologi &amp; Agrometeorologi
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Platform analisis iklim terpadu: pemantauan kondisi terkini lahan, statistik iklim berbasis sensor stasiun, dan reanalisis ERA5 global (1940–sekarang).
          </p>
        </div>
      </div>

      {/* ── B. Shared Station Selector ──────────────────────────────────────── */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-[220px]">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Stasiun Sensor</span>
            <Select value={sensorId} onValueChange={setSensorId} disabled={devices.length === 0}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <MapPin className="w-4 h-4 mr-2 text-teal-500" />
                <SelectValue placeholder="Pilih Sensor/Device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {currentDevice && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
              <MapPin className="h-3.5 w-3.5 text-teal-500 shrink-0" />
              <span className="font-mono">{currentCoords.lat.toFixed(4)}°, {currentCoords.lng.toFixed(4)}°</span>
            </div>
          )}
          <p className="text-xs text-slate-400 ml-auto hidden sm:block">Stasiun digunakan pada Tab 1 & 2 · Tab 3 menggunakan koordinat bebas</p>
        </CardContent>
      </Card>

      {/* ── B.2 Executive Climate Representativeness Overview ────────────────── */}
      <ClimateRepresentativenessOverview
        coordinates={currentCoords}
        stationName={currentDevice?.label || "Stasiun Terpilih"}
        preset={preset}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedDasarian={selectedDasarian}
        observedRainTotal={klimData?.stats?.rainfall?.total ?? rainToday}
        normalRainTotal={periodNormals?.rainfall?.normal}
        observedTempMean={klimData?.stats?.temperature?.mean ?? temp}
        normalTempMean={periodNormals?.temperature?.mean}
        pointsCount={klimData?.points?.length ?? 0}
        consecutiveDryDays={climateExtremes?.rainfall?.consecutiveDryDays ?? 0}
        consecutiveWetDays={climateExtremes?.rainfall?.consecutiveWetDays ?? 0}
        waterDeficit={waterDeficit}
        soilMoistureRoot={soilMoistureRoot}
        vpd={vpd}
        era5Elevation={era5BaselineData?.elevation ?? era5Data?.elevation}
      />

      {/* ── C. Main 4-Tab Layout ─────────────────────────────────────────────── */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl gap-1">
          <TabsTrigger value="agromet" className="py-3 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <Sprout className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Agroklimatologi & Neraca Air</span>
          </TabsTrigger>
          <TabsTrigger value="klimatologi" className="py-3 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <BarChart3 className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>Statistik Stasiun & Anomali</span>
          </TabsTrigger>
          <TabsTrigger value="era5" className="py-3 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <Globe className="h-4 w-4 text-purple-500 shrink-0" />
            <span>Reanalisis Atmosfer ERA5</span>
          </TabsTrigger>
          <TabsTrigger value="glosarium" className="py-3 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <Database className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Glosarium & Metodologi Iklim</span>
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1: AGROKLIMATOLOGI & NERACA AIR LAHAN
            ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="agromet" className="mt-6 space-y-8">
          {/* Tab 1 Sub-header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
            <div>
              <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                <Sprout className="h-5 w-5 text-emerald-500" />
                Analisis Agroklimatologi, Neraca Air Lahan & Proyeksi Ekosistem
              </h2>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Ketercukupan air lahan (P vs ET0) · Profil perakaran tanah · Prediksi ensemble ECMWF IFS (15 Hari) · Dinamika Monsun BMKG
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefreshAgromet} disabled={isAgrometLoading} className="h-8 px-3 text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 shrink-0">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isAgrometLoading ? "animate-spin" : ""}`} /> Perbarui
            </Button>
          </div>

          {isAgrometLoading && !agrometData ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-xs text-slate-500">Mengambil data agrometeorologi & ensemble...</p>
            </div>
          ) : agrometError ? (
            <div className="p-4 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-2xl border border-red-200 dark:border-red-900 text-sm">
              Gagal memuat data agrometeorologi. Silakan periksa koneksi atau klik tombol perbarui.
            </div>
          ) : !devices.length ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <Sprout className="h-10 w-10 text-emerald-500 animate-bounce" />
              <p className="text-sm text-slate-500">Memuat konfigurasi stasiun sensor agrometeorologi...</p>
            </div>
          ) : (
            <>
              {/* 1a. Neraca Air Lahan & Profil Tanah (Agroclimate Core) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  {/* Profil Lapisan Tanah */}
                  <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                    <CardHeader className="pb-3 border-b dark:border-slate-800">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Sprout className="h-5 w-5 text-emerald-500" /> Profil Lapisan Tanah Bertingkat
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">Monitoring kelembapan & suhu perakaran tanah</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-5">
                      <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Lapisan Permukaan (0–1 cm)</span>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-blue-500" /> Kelembapan</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{soilMoistureSurface.toFixed(1)}%</span>
                          </div>
                          <Progress value={soilMoistureSurface} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-blue-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-red-500" /> Suhu Tanah</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{soilTempSurface.toFixed(1)}°C</span>
                          </div>
                          <Progress value={Math.min(Math.max((soilTempSurface / 50) * 100, 0), 100)} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-red-500" />
                        </div>
                      </div>
                      <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Zona Perakaran Aktif (9–27 cm)</span>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-emerald-500" /> Kelembapan Akar</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{soilMoistureRoot.toFixed(1)}%</span>
                          </div>
                          <Progress value={soilMoistureRoot} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-emerald-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-orange-500" /> Suhu Zona Akar</span>
                            <span className="font-bold text-orange-600 dark:text-orange-400">{soilTempRoot.toFixed(1)}°C</span>
                          </div>
                          <Progress value={Math.min(Math.max((soilTempRoot / 50) * 100, 0), 100)} className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-orange-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Deteksi Risiko Iklim Mikro */}
                  <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
                    <CardHeader className="pb-3 border-b dark:border-slate-800">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" /> Deteksi Risiko Iklim Mikro
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2.5">
                      {[
                        { label: "Stres Panas (Heat Stress)", active: isHeatStress, activeLabel: "⚠️ Tinggi", inactiveLabel: "Aman" },
                        { label: "Risiko Kekeringan Perakaran", active: isDroughtRisk, activeLabel: "⚠️ Kering", inactiveLabel: "Kecukupan Baik" },
                        { label: "Risiko Jamur & Penyakit Daun", active: isDiseaseRisk, activeLabel: "⚠️ Waspada Spora", inactiveLabel: "Rendah" },
                        { label: "Stres Transpirasi (VPD)", active: isVpdStress, activeLabel: "⚠️ Stomata Tertutup", inactiveLabel: "Optimal" },
                      ].map(({ label, active, activeLabel, inactiveLabel }) => (
                        <div key={label} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
                          <Badge variant="outline" className={`text-[10px] font-bold ${active ? "bg-red-100 text-red-700 border-red-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"}`}>
                            {active ? activeLabel : inactiveLabel}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Water Balance & Charts (Right Column) */}
                <div className="lg:col-span-2 space-y-6">
                  <WaterBalanceDualChart hourly={agroHourlyData} daily={agroDailyData} isDarkMode={isDarkMode} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                      <CardHeader className="pb-2 border-b dark:border-slate-800">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                          <Droplets className="h-4 w-4 text-purple-500" /> Dinamika Kelembapan Tanah (24 Jam)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 flex-grow h-[260px]">
                        <ReactECharts option={soilMoistureOption} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={true} />
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                      <CardHeader className="pb-2 border-b dark:border-slate-800">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                          <Sun className="h-4 w-4 text-yellow-500" /> Fluks Radiasi Surya Aktif (24 Jam)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 flex-grow h-[260px]">
                        <ReactECharts option={solarOption} style={{ height: "100%", width: "100%" }} notMerge={true} lazyUpdate={true} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* 1b. 10-Variabel Parameter Cuaca Mikro */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Activity className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Parameter Cuaca Mikro & Dinamika Tanaman Terkini
                  </h3>
                  <span className="text-xs text-slate-400 ml-auto">Pembaruan: Real-Time</span>
                </div>

                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {/* Suhu Udara */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Suhu Udara (2m)</span>
                        <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-500"><ThermometerSun className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{temp}°C</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Min: {tempMin}° | Max: {tempMax}°</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">Terasa: {apparentTemp}°C</Badge>
                    </CardContent>
                  </Card>

                  {/* Titik Embun */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Titik Embun (Td)</span>
                        <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-500"><Droplets className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">{dewPoint.toFixed(1)}°C</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Depresi T-Td: {dewPointDepression}°C</div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] w-fit font-bold ${dewPointDepression <= 1.5 ? "bg-teal-100 text-teal-800 border-teal-300" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {dewPointDepression <= 1.5 ? "💧 Embun Pekat" : "Embun Ringan"}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* Tekanan Barometrik */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Tekanan Barometrik</span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500"><Gauge className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{surfacePressure.toFixed(0)} <span className="text-xs font-normal">hPa</span></span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Tingkat Permukaan Lahan</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{surfacePressure < 1008 ? "Sistem Rendah" : "Stabil Normal"}</Badge>
                    </CardContent>
                  </Card>

                  {/* Kelembapan Relatif */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Kelembapan Udara</span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-500"><Waves className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{rh}%</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Kondisi Kanopi Lahan</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{rh > 85 ? "Sangat Lembap" : rh < 50 ? "Kering" : "Optimal"}</Badge>
                    </CardContent>
                  </Card>

                  {/* VPD */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Defisit Uap (VPD)</span>
                        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500"><Sprout className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{vpd} <span className="text-xs font-normal">kPa</span></span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Transpirasi Stomata</div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] w-fit font-bold ${vpd >= 0.8 && vpd <= 1.5 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : vpd > 1.5 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-blue-100 text-blue-800 border-blue-300"}`}>
                        {vpd >= 0.8 && vpd <= 1.5 ? "Transpirasi Ideal" : vpd > 1.5 ? "Stres Transpirasi" : "Transpirasi Rendah"}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* Curah Hujan */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Curah Hujan Hari Ini</span>
                        <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-500"><CloudRain className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{rainToday} <span className="text-xs font-normal">mm</span></span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Akumulasi 7 Hari: {rain7d.toFixed(1)} mm</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{rainToday > 20 ? "Hujan Lebat" : rainToday > 5 ? "Hujan Sedang" : "Nihil / Ringan"}</Badge>
                    </CardContent>
                  </Card>

                  {/* ET0 */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Evapotranspirasi (ET0)</span>
                        <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-500"><Sun className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">{et0Today.toFixed(1)} <span className="text-xs font-normal">mm</span></span>
                        <div className="text-[10px] text-slate-400 mt-0.5">FAO Penman-Monteith</div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] w-fit font-bold ${waterDeficit >= 0 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"}`}>
                        {waterDeficit >= 0 ? `Surplus +${waterDeficit.toFixed(1)}mm` : `Defisit ${waterDeficit.toFixed(1)}mm`}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* Radiasi Surya */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Radiasi Surya</span>
                        <div className="p-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/60 text-yellow-600"><Sun className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400 font-mono">{solarCurrent} <span className="text-xs font-normal">W/m²</span></span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Total Harian: {solarDaily} MJ/m²</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">Fotosintesis Aktif</Badge>
                    </CardContent>
                  </Card>

                  {/* Angin */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Angin (10m)</span>
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Wind className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{windSpeed} <span className="text-xs font-normal">m/s</span></span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Arah: {windDir}° ({getCardinalDirection(windDir)})</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{Number(windSpeed) > 5 ? "Angin Kencang" : "Angin Tenang"}</Badge>
                    </CardContent>
                  </Card>

                  {/* Tutupan Awan & UV */}
                  <Card className="border-none shadow-sm hover:shadow-md transition dark:bg-slate-900 bg-white">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500">Tutupan Awan & UV</span>
                        <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600"><Cloud className="h-4 w-4" /></div>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">{cloudCover}%</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Indeks UV Maks: {uvIndex}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] w-fit font-normal text-slate-500">{cloudCover > 75 ? "Mendung Tebal" : cloudCover > 30 ? "Sebagian Berawan" : "Cerah Terbuka"}</Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 1c. Prediksi Ensemble 15 Hari ECMWF */}
              {selectedSensorOption && (
                <EnsembleAgrometSection lat={selectedSensorOption.lat} lon={selectedSensorOption.lng} isDarkMode={isDarkMode} />
              )}

              {/* 1d. Dinamika Monsun & Kalender Tanam BMKG */}
              <MonsoonAgrometSection isDarkMode={isDarkMode} />

              {/* 1e. Peta Lahan & Distribusi Agregasi Waktu */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm dark:bg-slate-900 bg-white lg:col-span-1 flex flex-col h-full overflow-hidden">
                  <CardHeader className="pb-2 border-b dark:border-slate-800">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-500" /> Peta Koordinat Lahan Pertanian
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-grow h-[380px] relative z-0">
                    {selectedSensorOption && (
                      <MapContainer center={[selectedSensorOption.lat, selectedSensorOption.lng]} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[selectedSensorOption.lat, selectedSensorOption.lng]}>
                          <Popup>
                            <strong>{selectedSensorOption.label}</strong><br />
                            Lat: {selectedSensorOption.lat.toFixed(4)}, Lon: {selectedSensorOption.lng.toFixed(4)}
                          </Popup>
                        </Marker>
                      </MapContainer>
                    )}
                  </CardContent>
                </Card>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Prakiraan Per Jam 24 Jam */}
                  <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                    <CardHeader className="pb-2 border-b dark:border-slate-800">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Activity className="h-4 w-4 text-teal-500" /> Prakiraan Per Jam (24 Jam)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow h-[340px] overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                          <tr>
                            <th className="px-3 py-2.5">Jam</th>
                            <th className="px-3 py-2.5">Suhu / Td</th>
                            <th className="px-3 py-2.5">Hujan</th>
                            <th className="px-3 py-2.5">Kel. Akar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agroHourlyData.time?.slice(0, 24).map((timeStr: string, idx: number) => (
                            <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2 font-medium">{timeStr.substring(11, 16)}</td>
                              <td className="px-3 py-2 font-mono">{agroHourlyData.temperature_2m[idx]}° <span className="text-teal-600 text-[10px]">({agroHourlyData.dew_point_2m?.[idx] ?? "-"}°)</span></td>
                              <td className="px-3 py-2 text-cyan-600 font-semibold">{agroHourlyData.precipitation[idx]} mm</td>
                              <td className="px-3 py-2 text-emerald-600 font-semibold">{(agroHourlyData.soil_moisture_9_to_27cm[idx] * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* Ringkasan Harian 7 Hari */}
                  <Card className="border-none shadow-sm dark:bg-slate-900 bg-white flex flex-col">
                    <CardHeader className="pb-2 border-b dark:border-slate-800">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Calendar className="h-4 w-4 text-emerald-500" /> Ringkasan Harian (7 Hari)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow h-[340px] overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                          <tr>
                            <th className="px-3 py-2.5">Tanggal</th>
                            <th className="px-3 py-2.5">Min / Max</th>
                            <th className="px-3 py-2.5">Hujan</th>
                            <th className="px-3 py-2.5">ET0</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agroDailyData.time?.slice(0, 7).map((timeStr: string, idx: number) => (
                            <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2 font-medium">{timeStr.substring(5, 10)}</td>
                              <td className="px-3 py-2 font-mono">{agroDailyData.temperature_2m_min[idx]}° – {agroDailyData.temperature_2m_max[idx]}°</td>
                              <td className="px-3 py-2 text-cyan-600 font-semibold">{agroDailyData.precipitation_sum[idx]} mm</td>
                              <td className="px-3 py-2 text-orange-600 font-semibold">{agroDailyData.et0_fao_evapotranspiration_sum?.[idx]?.toFixed(1) ?? "-"} mm</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2: STATISTIK KLIMATOLOGI STASIUN
            ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="klimatologi" className="mt-6 space-y-6">
          {/* Tab 2 Sub-header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50">
            <div>
              <h2 className="text-base font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                Statistik Observasi Stasiun, Anomali Iklim & Acuan Normal ERA5
              </h2>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Pengamatan sensor mikro vs acuan normal 30-tahun · Evaluasi Sifat Hujan BMKG · Nilai ekstremitas Dasarian/Bulanan/Tahunan
              </p>
            </div>
          </div>

          {/* Preset & Filter Controls */}
          <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm">
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <PresetSelector
                preset={preset}
                setPreset={setPreset}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedDasarian={selectedDasarian}
                setSelectedDasarian={setSelectedDasarian}
                isLoading={isKlimLoading}
                onRefresh={handleRefreshKlim}
              />
            </CardContent>
          </Card>

          {/* Persistent Station vs ERA5 Normal Comparative KPI Bar */}
          {klimData?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-red-500" /> Rerata Suhu Observasi
                </span>
                <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                  {klimData.stats.temperature.mean.toFixed(1)}°C
                </div>
                <div className="text-[10px] text-slate-500">
                  Normal ERA5: <strong className="text-slate-700 dark:text-slate-300">{periodNormals?.temperature.mean?.toFixed(1) ?? "-"}°C</strong>
                  {periodNormals?.temperature.mean && (
                    <span className={`ml-1 font-bold ${klimData.stats.temperature.mean - periodNormals.temperature.mean > 0 ? "text-rose-500" : "text-sky-500"}`}>
                      ({klimData.stats.temperature.mean - periodNormals.temperature.mean > 0 ? "+" : ""}
                      {(klimData.stats.temperature.mean - periodNormals.temperature.mean).toFixed(1)}°)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                  <CloudRain className="h-3.5 w-3.5 text-cyan-500" /> Akumulasi Curah Hujan
                </span>
                <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                  {klimData.stats.rainfall.total.toFixed(1)} mm
                </div>
                <div className="text-[10px] text-slate-500">
                  Normal ERA5: <strong className="text-slate-700 dark:text-slate-300">{periodNormals?.rainfall.normal?.toFixed(1) ?? "-"} mm</strong>
                  {periodNormals?.rainfall.normal && periodNormals.rainfall.normal > 0 && (
                    <span className="ml-1 font-bold text-cyan-600 dark:text-cyan-400">
                      ({((klimData.stats.rainfall.total / periodNormals.rainfall.normal) * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                  <Waves className="h-3.5 w-3.5 text-blue-500" /> Rerata Kelembaban
                </span>
                <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                  {klimData.stats.humidity.mean.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">
                  Normal ERA5: <strong className="text-slate-700 dark:text-slate-300">{periodNormals?.humidity.mean?.toFixed(1) ?? "-"}%</strong>
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5 text-indigo-500" /> Rerata Tekanan Barometrik
                </span>
                <div className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                  {klimData.stats.pressure.mean.toFixed(1)} hPa
                </div>
                <div className="text-[10px] text-slate-500">
                  Normal ERA5: <strong className="text-slate-700 dark:text-slate-300">{periodNormals?.pressure.mean?.toFixed(1) ?? "-"} hPa</strong>
                </div>
              </div>
            </div>
          )}

          {/* Data Rendering */}
          {isKlimLoading ? (
            renderKlimLoading()
          ) : klimError ? (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="p-6 text-center">
                <p className="text-red-600 dark:text-red-400 font-semibold">{klimError.message || "Gagal memuat data iklim."}</p>
              </CardContent>
            </Card>
          ) : !klimData || !klimData.points || klimData.points.length === 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">Tidak ada rekaman sensor stasiun untuk periode ini.</span>
                    <span className="ml-1 text-amber-700/80 dark:text-amber-300/80">Anda tetap dapat menganalisis acuan Normal Klimatologis ERA5 untuk lokasi ini di bawah.</span>
                  </div>
                </div>
              </div>
              <Era5ClimatologyCharts era5Data={era5BaselineData} isLoading={isEra5BaselineLoading} stationPoints={[]} stationName={currentDevice?.label || "Stasiun Terpilih"} coordinates={currentCoords} isDarkMode={isDarkMode} selectedYear={selectedYear} />
            </div>
          ) : (
            <>
              {/* Climate Extremes KPI Cards */}
              <ClimateExtremesCards extremes={climateExtremes} stats={klimData.stats} />

              {/* Detailed Parameter Analytics Tabs */}
              <Tabs defaultValue="temperature" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1 bg-slate-100 dark:bg-slate-900 border rounded-lg">
                  <TabsTrigger value="temperature" className="py-2.5">Suhu Udara</TabsTrigger>
                  <TabsTrigger value="comparison" className="py-2.5">Titik Embun</TabsTrigger>
                  <TabsTrigger value="humidity" className="py-2.5">Kelembaban Relatif</TabsTrigger>
                  <TabsTrigger value="rainfall" className="py-2.5">Curah Hujan</TabsTrigger>
                  <TabsTrigger value="pressure" className="py-2.5">Tekanan Udara</TabsTrigger>
                  <TabsTrigger value="era5_normal" className="py-2.5 font-medium flex items-center justify-center gap-1.5">
                    <span>Normal ERA5</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">Iklim</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="temperature" className="mt-6">
                  <TemperatureCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} stdDev={klimData.stats.temperature.stdDev} observedMean={klimData.stats.temperature.mean} era5NormalTemp={periodNormals?.temperature.mean} monthlyNormals={periodNormals?.temperature.monthly} />
                </TabsContent>
                <TabsContent value="rainfall" className="mt-6">
                  <RainfallCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} totalRainfall={klimData.stats.rainfall.total} era5NormalRain={periodNormals?.rainfall.normal} monthlyNormals={periodNormals?.rainfall.monthly} />
                </TabsContent>
                <TabsContent value="humidity" className="mt-6">
                  <HumidityCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} stdDev={klimData.stats.humidity.stdDev} observedMean={klimData.stats.humidity.mean} era5NormalHum={periodNormals?.humidity.mean} monthlyNormals={periodNormals?.humidity.monthly} />
                </TabsContent>
                <TabsContent value="pressure" className="mt-6">
                  <PressureCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} stdDev={klimData.stats.pressure.stdDev} observedMean={klimData.stats.pressure.mean} era5NormalPress={periodNormals?.pressure.mean} monthlyNormals={periodNormals?.pressure.monthly} />
                </TabsContent>
                <TabsContent value="comparison" className="mt-6">
                  <TempDewComparisonCharts points={klimData.points} preset={preset} isDarkMode={isDarkMode} />
                </TabsContent>
                <TabsContent value="era5_normal" className="mt-6">
                  <Era5ClimatologyCharts era5Data={era5BaselineData} isLoading={isEra5BaselineLoading} stationPoints={klimData.points} stationName={currentDevice?.label || "Stasiun Terpilih"} coordinates={currentCoords} isDarkMode={isDarkMode} selectedYear={selectedYear} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 3: REANALISIS ERA5
            ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="era5" className="mt-6 space-y-6">
          {/* Tab 3 Info Sub-Header (Compact Tab Sub-Bar) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Reanalisis Global ECMWF ERA5 (1940–sekarang)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Compass className="h-4 w-4 text-purple-500" /> Analisis Reanalisis Atmosfer Resolusi Tinggi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Analisis komprehensif parameter meteorologi &amp; klimatologi di seluruh koordinat Indonesia.
              </p>
            </div>
            {appliedCoords && (
              <div className="flex items-center gap-2 self-start md:self-auto bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium shadow-xs shrink-0">
                <MapPin className="h-3.5 w-3.5 text-purple-500" />
                <span>Lokasi: <strong className="text-slate-900 dark:text-white">{appliedLocationName}</strong> ({appliedCoords.lat.toFixed(4)}°, {appliedCoords.lng.toFixed(4)}°)</span>
              </div>
            )}
          </div>

          {/* ERA5 Controls + Data Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Controls */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-none shadow-sm dark:bg-slate-900 bg-white sticky top-6">
                <CardHeader className="pb-3 border-b dark:border-slate-800">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Konfigurasi Wilayah</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-5">
                  {/* Geocoding Search */}
                  <div className="space-y-1 relative">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cari Kota / Wilayah</label>
                    <div className="relative">
                      <Input type="text" placeholder="Contoh: Jakarta, Surabaya..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-xs h-9 bg-slate-50 dark:bg-slate-950" />
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      {isSearchingGeocode && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                    </div>
                    {suggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-md shadow-lg max-h-60 overflow-y-auto text-xs divide-y dark:divide-slate-800">
                        {suggestions.map((city) => (
                          <button key={city.id} onClick={() => handleSelectSuggestion(city)} className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 flex justify-between items-center transition">
                            <div className="font-semibold text-slate-700 dark:text-slate-200">{city.name}, <span className="text-slate-400">{city.admin1 || city.country}</span></div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Coordinate Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Latitude</label>
                      <Input type="number" step="0.0001" min="-90" max="90" value={latInput} onChange={(e) => setLatInput(e.target.value)} className="text-xs h-9 bg-slate-50 dark:bg-slate-950" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Longitude</label>
                      <Input type="number" step="0.0001" min="-180" max="180" value={lngInput} onChange={(e) => setLngInput(e.target.value)} className="text-xs h-9 bg-slate-50 dark:bg-slate-950" />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button onClick={triggerGeolocation} variant="outline" className="flex-1 text-xs h-9 gap-1 border-slate-200 dark:border-slate-800 hover:bg-slate-50">
                      <MapPin className="h-3.5 w-3.5 text-indigo-500" /> Deteksi GPS
                    </Button>
                    <Button onClick={handleToggleFavorite} variant={isCurrentFavorite ? "default" : "outline"} className="px-3 h-9 border-slate-200 dark:border-slate-800">
                      <Star className={`h-4 w-4 ${isCurrentFavorite ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
                    </Button>
                  </div>

                  {/* Favorites */}
                  {favorites.length > 0 && (
                    <div className="space-y-2 border-t dark:border-slate-800 pt-3">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Daftar Lokasi Favorit</label>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {favorites.map((fav, index) => {
                          const active = Math.abs(parseFloat(latInput) - fav.latitude) < 0.01 && Math.abs(parseFloat(lngInput) - fav.longitude) < 0.01;
                          return (
                            <button key={index} onClick={() => handleSelectFavorite(fav)} className={`text-[10px] px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${active ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border-indigo-200 dark:border-indigo-900 font-bold" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"}`}>
                              <Star className={`h-3 w-3 ${active ? "fill-indigo-500 text-indigo-500" : "text-slate-400"}`} />{fav.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Time Preset Selector */}
                  <div className="space-y-3 border-t dark:border-slate-800 pt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rentang Waktu</label>
                      <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-xs">
                        {[["1y", "1 Tahun"], ["6m", "6 Bulan"], ["custom", "Kustom"]].map(([val, lbl]) => (
                          <button key={val} onClick={() => setTimePreset(val)} className={`flex-1 text-center py-1 font-semibold rounded-md transition duration-150 ${timePreset === val ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"}`}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                    {timePreset === "custom" && (
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Tanggal Mulai</label>
                          <Input type="date" max={maxEndDate} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="text-xs h-9 bg-slate-50 dark:bg-slate-950" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Tanggal Selesai</label>
                          <Input type="date" max={maxEndDate} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="text-xs h-9 bg-slate-50 dark:bg-slate-950" />
                        </div>
                        {!dateRangeValidation.isValid && (
                          <div className="bg-red-50 dark:bg-red-950/20 p-2.5 rounded text-[10px] text-red-600 dark:text-red-400 flex gap-1.5 leading-relaxed">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{dateRangeValidation.message}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Apply Button */}
                  <Button onClick={handleApplyEra5Params} disabled={timePreset === "custom" && !dateRangeValidation.isValid} className="w-full text-xs font-semibold h-10 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white gap-2 transition shadow-md">
                    <Check className="h-4 w-4" /> Terapkan Analisis
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* ERA5 Data Display */}
            <div className="lg:col-span-3 space-y-6">
              {isEra5Loading ? (
                renderEra5Loading()
              ) : era5Error ? (
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 shadow-sm border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> Gagal Memproses Reanalisis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">{era5Error.message || "Kesalahan koneksi atau format respon."}</p>
                    <Button onClick={() => mutateEra5()} variant="outline" size="sm" className="mt-2 text-xs border-red-200 hover:bg-red-100 text-red-700">Ulangi Request</Button>
                  </CardContent>
                </Card>
              ) : !era5Data ? (
                <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 border rounded-xl shadow-sm text-center">
                  <Compass className="h-14 w-14 text-indigo-400 dark:text-indigo-600 mb-4 animate-spin-slow" />
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Belum Ada Lokasi Terpilih</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">Gunakan geolokasi browser, cari nama kota, atau masukkan koordinat di panel samping lalu klik "Terapkan Analisis".</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Location Info Badge */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg flex flex-wrap justify-between items-center gap-4 text-xs font-semibold border dark:border-slate-800 shadow-inner">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-500" />
                      <span className="text-slate-700 dark:text-slate-200">Posisi: {era5Data.latitude.toFixed(4)}°N, {era5Data.longitude.toFixed(4)}°E</span>
                      <span className="text-slate-400 font-normal">|</span>
                      <span className="text-slate-700 dark:text-slate-200">Ketinggian: {era5Data.elevation} m dpl</span>
                      <span className="text-slate-400 font-normal">|</span>
                      <span className="text-slate-700 dark:text-slate-200">Zona: {era5Data.timezone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 font-normal">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      <span>Periode Analisis: </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold">{era5Data.startDate} s.d. {era5Data.endDate}</strong>
                    </div>
                  </div>

                  {/* Current Conditions Summary */}
                  <CurrentConditions current={era5Data.current} />

                  {/* ERA5 Analysis Tabs */}
                  <Tabs defaultValue="time-series" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1 bg-slate-100 dark:bg-slate-950 border dark:border-slate-800 rounded-xl text-xs gap-1">
                      <TabsTrigger value="time-series" className="py-2.5 font-bold">Deret Waktu</TabsTrigger>
                      <TabsTrigger value="hovmoller" className="py-2.5 font-bold">Diagram Hovmöller</TabsTrigger>
                      <TabsTrigger value="diurnal" className="py-2.5 font-bold">Siklus Distribusi</TabsTrigger>
                      <TabsTrigger value="climatology" className="py-2.5 font-bold">Tren Klimatologi</TabsTrigger>
                      <TabsTrigger value="wind-diagnostics" className="py-2.5 font-bold">Mawar Angin</TabsTrigger>
                    </TabsList>

                    <TabsContent value="time-series" className="mt-6 space-y-6">
                      <TimeSeriesCharts times={era5Data.hourly.times} temperature={era5Data.hourly.temperature} humidity={era5Data.hourly.humidity} pressure={era5Data.hourly.pressure} rain={era5Data.hourly.rain} windSpeed={era5Data.hourly.windSpeed} windGust={era5Data.hourly.windGust} radiation={era5Data.hourly.radiation} isDarkMode={isDarkMode} />
                    </TabsContent>

                    <TabsContent value="hovmoller" className="mt-6">
                      <HovmollerDiagram days={era5Data.hovmoller.days} hours={era5Data.hovmoller.hours} temperature={era5Data.hovmoller.temperature} humidity={era5Data.hovmoller.humidity} pressure={era5Data.hovmoller.pressure} rain={era5Data.hovmoller.rain} isDarkMode={isDarkMode} />
                    </TabsContent>

                    <TabsContent value="diurnal" className="mt-6 space-y-6">
                      <DiurnalCycle data={era5Data.diurnal} isDarkMode={isDarkMode} />
                      <DistributionAnalysis temperature={era5Data.hourly.temperature} humidity={era5Data.hourly.humidity} pressure={era5Data.hourly.pressure} windSpeed={era5Data.hourly.windSpeed} rain={era5Data.hourly.rain} stats={era5Data.stats} isDarkMode={isDarkMode} />
                    </TabsContent>

                    <TabsContent value="climatology" className="mt-6 space-y-6">
                      <WeeklyAnalysis days={era5Data.weekly.days} temperature={era5Data.weekly.temperature} humidity={era5Data.weekly.humidity} pressure={era5Data.weekly.pressure} windSpeed={era5Data.weekly.windSpeed} isDarkMode={isDarkMode} />
                      <MonthlyAnalysis months={era5Data.monthly.months} temperature={era5Data.monthly.temperature} humidity={era5Data.monthly.humidity} pressure={era5Data.monthly.pressure} rain={era5Data.monthly.rain} isDarkMode={isDarkMode} />
                      <AnnualAnalysis days={era5Data.annual.days} temperatureMean={era5Data.annual.temperatureMean} humidityMean={era5Data.annual.humidityMean} pressureMean={era5Data.annual.pressureMean} rainAccumulated={era5Data.annual.rainAccumulated} isDarkMode={isDarkMode} />
                    </TabsContent>

                    <TabsContent value="wind-diagnostics" className="mt-6 space-y-6">
                      <WindRose data={era5Data.windRose} isDarkMode={isDarkMode} windSpeedStats={era5Data.stats.windSpeed} />
                      <ForecastDiagnostics scatter={era5Data.scatter} radiation={era5Data.radiation} cape={era5Data.cape} diagnostics={era5Data.diagnostics} isDarkMode={isDarkMode} />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 4: GLOSARIUM IKLIM
            ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="glosarium" className="mt-6 space-y-6">
          <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
            <h2 className="text-base font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-500" />
              Glosarium Terminologi Ilmu Iklim & Meteorologi
            </h2>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Referensi istilah teknis ERA5, agrometeorologi, statistik iklim, dan analisis dinamika atmosfer
            </p>
          </div>
          <ClimateGlossary initialCategory="era5" />
        </TabsContent>

      </Tabs>
    </div>
  );
}
