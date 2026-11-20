// app/dashboard/klimatologi/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
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
  CloudSun,
  ShieldAlert,
  CalendarDays,
  Trees,
  Zap,
  Navigation2,
  Bookmark,
  ChevronRight,
  Radio,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import {
  getStoredActiveSensorId,
  setStoredActiveSensorId,
  resolveActiveSensorId,
} from "@/lib/activeSensorStorage";
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

// ─── Climatology Overview & Calculation Helpers ─────────────────────────────
import { computeClimateExtremes } from "@/lib/climatology/climateExtremes";
import { ClimateRepresentativenessOverview } from "@/components/climatology/ClimateRepresentativenessOverview";

// ─── Modular Climatology Sub-Tabs ───────────────────────────────────────────
import { ClimateProfileTab } from "@/components/klimatologi/tabs/ClimateProfileTab";
import { AgrometTab } from "@/components/klimatologi/tabs/AgrometTab";
import { StandardClimatologyTab } from "@/components/klimatologi/tabs/StandardClimatologyTab";
import { ExtremesSpiTab } from "@/components/klimatologi/tabs/ExtremesSpiTab";
import { ZomDynamicsTab } from "@/components/klimatologi/tabs/ZomDynamicsTab";
import { Era5ReanalysisTab } from "@/components/klimatologi/tabs/Era5ReanalysisTab";
import { ChcEstimatesTab } from "@/components/klimatologi/tabs/ChcEstimatesTab";

// ─── Types & Presets ─────────────────────────────────────────────────────────
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

interface PresetRegion {
  name: string;
  lat: number;
  lng: number;
  province: string;
  climateZone: string;
}

const INDONESIAN_CLIMATE_REGIONS: PresetRegion[] = [
  { name: "Jakarta", lat: -6.2146, lng: 106.8451, province: "DKI Jakarta", climateZone: "Monsunal Tropis (Aw)" },
  { name: "Surabaya", lat: -7.2575, lng: 112.7521, province: "Jawa Timur", climateZone: "Kering Jawa Timur (Aw)" },
  { name: "Bandung", lat: -6.9175, lng: 107.6191, province: "Jawa Barat", climateZone: "Dataran Tinggi (Am/Cfb)" },
  { name: "Medan", lat: 3.5952, lng: 98.6722, province: "Sumatera Utara", climateZone: "Ekuatorial Tropis (Af)" },
  { name: "Makassar", lat: -5.1476, lng: 119.4327, province: "Sulawesi Selatan", climateZone: "Monsunal Sulawesi (Am)" },
  { name: "Kupang", lat: -10.1772, lng: 123.6070, province: "Nusa Tenggara Timur", climateZone: "Semi-Arid Tropis (As/Aw)" },
  { name: "Balikpapan", lat: -1.2654, lng: 116.8312, province: "Kalimantan Timur", climateZone: "Ekuatorial Kalimantan (Af)" },
  { name: "Jayapura", lat: -2.5337, lng: 140.7181, province: "Papua", climateZone: "Ekuatorial Pasifik (Af)" },
  { name: "Yogyakarta", lat: -7.7956, lng: 110.3695, province: "DI Yogyakarta", climateZone: "Monsunal Jawa (Am)" },
  { name: "Denpasar", lat: -8.6705, lng: 115.2126, province: "Bali", climateZone: "Monsunal Kepulauan (Aw)" },
  { name: "Manado", lat: 1.4748, lng: 124.8428, province: "Sulawesi Utara", climateZone: "Ekuatorial Utara (Af)" },
  { name: "Ambon", lat: -3.6547, lng: 128.1906, province: "Maluku", climateZone: "Lokal Basah (Af)" },
];

const defaultFavorites: FavoriteLocation[] = [
  { name: "Jakarta", latitude: -6.2146, longitude: 106.8451 },
  { name: "Surabaya", latitude: -7.2575, longitude: 112.7521 },
  { name: "Bandung", latitude: -6.9175, longitude: 107.6191 },
  { name: "Medan", latitude: 3.5952, longitude: 98.6722 },
  { name: "Makassar", latitude: -5.1476, longitude: 119.4327 },
  { name: "Kupang", latitude: -10.1772, longitude: 123.6070 },
];

// ─── Fetchers ───────────────────────────────────────────────────────────────
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Gagal memuat data dari server.");
  }
  return res.json();
};

const agrometFetcher = (url: string) => fetch(url).then((res) => res.json());

// ─── Inner Component with SearchParams ───────────────────────────────────────
function KlimatologiInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
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
  const [mainTab, setMainTab] = useState("profil-iklim");

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIVERSAL LOCATION HUB: Station Devices vs Free Arbitrary Region
  // ═══════════════════════════════════════════════════════════════════════════
  const [locationMode, setLocationMode] = useState<"station" | "region">("station");
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [sensorId, setSensorId] = useState<string>(
    () => searchParams.get("sensorId") || getStoredActiveSensorId() || ""
  );

  // Arbitrary Free Region States
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number }>({ lat: -6.2146, lng: 106.8451 });
  const [customRegionName, setCustomRegionName] = useState<string>("Jakarta");
  const [latInput, setLatInput] = useState<string>("-6.2146");
  const [lngInput, setLngInput] = useState<string>("106.8451");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>(defaultFavorites);

  // Load user IoT devices
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
            const activeId = resolveActiveSensorId(options, searchParams.get("sensorId"));
            setSensorId(activeId);
            const matched = options.find((o) => o.value === activeId);
            setStoredActiveSensorId(activeId, { label: matched?.label });
          } else {
            setLocationMode("region");
          }
        } catch (err) {
          console.error("Gagal memuat stasiun perangkat:", err);
          setLocationMode("region");
        }
      };
      loadDevices();
    }
  }, [user, searchParams]);

  // Load favorites & geolocation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("meteo_reanalysis_favorites");
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch {
          setFavorites(defaultFavorites);
        }
      }
    }
  }, []);

  // Sync URL search parameters (?tab=era5, ?lat=..., ?lng=..., ?name=...)
  useEffect(() => {
    if (!searchParams) return;
    const tabParam = searchParams.get("tab");
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const nameParam = searchParams.get("name");

    if (tabParam && ["profil-iklim", "klimatologi", "ekstrem-spi", "zom-musim", "agromet", "era5", "chc-estimates"].includes(tabParam)) {
      setMainTab(tabParam);
    }
    if (latParam && lngParam) {
      const latNum = parseFloat(latParam);
      const lngNum = parseFloat(lngParam);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setLocationMode("region");
        setCustomCoords({ lat: latNum, lng: lngNum });
        setLatInput(latNum.toFixed(4));
        setLngInput(lngNum.toFixed(4));
        if (nameParam) setCustomRegionName(decodeURIComponent(nameParam));
      }
    }
  }, [searchParams]);

  const currentDevice = useMemo(() => devices.find((d) => d.value === sensorId), [devices, sensorId]);

  // Unified Active Location Object
  const activeLocation = useMemo(() => {
    if (locationMode === "station" && currentDevice) {
      const coords =
        currentDevice.coordinates &&
        (currentDevice.coordinates.lat !== 0 || currentDevice.coordinates.lng !== 0)
          ? currentDevice.coordinates
          : { lat: -7.5361, lng: 110.2312 }; // Fallback: AWS Jerukagung
      return {
        mode: "station" as const,
        name: currentDevice.label,
        detail: currentDevice.location || "Stasiun Sensor IoT Terdaftar",
        lat: coords.lat,
        lng: coords.lng,
        sensorId: currentDevice.value,
      };
    }
    return {
      mode: "region" as const,
      name: customRegionName,
      detail: `Analisis Wilayah Bebas (${customCoords.lat.toFixed(4)}°, ${customCoords.lng.toFixed(4)}°)`,
      lat: customCoords.lat,
      lng: customCoords.lng,
      sensorId: null,
    };
  }, [locationMode, currentDevice, customCoords, customRegionName]);

  const activeCoords = useMemo(() => ({ lat: activeLocation.lat, lng: activeLocation.lng }), [activeLocation]);

  // Geocoding Autocomplete Search
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

  const handleSelectPresetRegion = (region: PresetRegion) => {
    setLocationMode("region");
    setCustomCoords({ lat: region.lat, lng: region.lng });
    setCustomRegionName(`${region.name}, ${region.province}`);
    setLatInput(region.lat.toFixed(4));
    setLngInput(region.lng.toFixed(4));
    setSearchQuery("");
    setSuggestions([]);
  };

  const handleSelectSuggestion = (city: any) => {
    setLocationMode("region");
    setCustomCoords({ lat: city.latitude, lng: city.longitude });
    setCustomRegionName(`${city.name}, ${city.admin1 || city.country}`);
    setLatInput(city.latitude.toFixed(4));
    setLngInput(city.longitude.toFixed(4));
    setSearchQuery("");
    setSuggestions([]);
  };

  const handleApplyCoordinates = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert("Latitude harus berupa angka valid antara -90 dan 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert("Longitude harus berupa angka valid antara -180 dan 180.");
      return;
    }
    setLocationMode("region");
    setCustomCoords({ lat, lng });
    setCustomRegionName(`Koordinat (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
  };

  const triggerGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocationMode("region");
          setCustomCoords({ lat, lng });
          setLatInput(lat.toFixed(4));
          setLngInput(lng.toFixed(4));
          setCustomRegionName("Lokasi GPS Pengguna");
        },
        () => {
          alert("Gagal mengakses geolokasi browser. Pastikan izin telah diberikan.");
        }
      );
    } else {
      alert("Browser Anda tidak mendukung geolokasi.");
    }
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
      const name = prompt("Masukkan nama lokasi favorit Anda:", customRegionName) || "Favorit";
      updated = [...favorites, { name, latitude: lat, longitude: lng }];
    }
    setFavorites(updated);
    localStorage.setItem("meteo_reanalysis_favorites", JSON.stringify(updated));
  };

  const handleSelectFavorite = (fav: FavoriteLocation) => {
    setLocationMode("region");
    setCustomCoords({ lat: fav.latitude, lng: fav.longitude });
    setCustomRegionName(fav.name);
    setLatInput(fav.latitude.toFixed(4));
    setLngInput(fav.longitude.toFixed(4));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AGROMETEOROLOGI STATE (Synchronized with activeCoords)
  // ═══════════════════════════════════════════════════════════════════════════
  const [refreshKeyAgromet, setRefreshKeyAgromet] = useState<number>(0);

  const agrometApiUrl = `/api/weather/agromet?lat=${activeCoords.lat}&lon=${activeCoords.lng}${refreshKeyAgromet ? `&_t=${refreshKeyAgromet}` : ""}`;

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
  const dewPointCondition = dewPointDepression <= 1.5
    ? { label: "Embun Pekat", className: "bg-teal-100 text-teal-800 border-teal-300" }
    : dewPointDepression <= 3
      ? { label: "Sangat Lembap", className: "bg-cyan-100 text-cyan-800 border-cyan-300" }
      : dewPointDepression <= 6
        ? { label: "Lembap", className: "bg-sky-100 text-sky-800 border-sky-300" }
        : dewPointDepression <= 10
          ? { label: "Sedang", className: "bg-slate-100 text-slate-600 border-slate-200" }
          : { label: "Kering", className: "bg-amber-100 text-amber-800 border-amber-300" };
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
  // STATISTIK KLIMATOLOGI STASIUN STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [preset, setPreset] = useState<string>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getUTCFullYear());
  const [selectedDasarian, setSelectedDasarian] = useState<number>(1);
  const [refreshKeyKlim, setRefreshKeyKlim] = useState<number>(0);

  // Klim Station Database Query (only if mode === "station" and sensorId exists)
  const klimApiPath = useMemo(() => {
    if (locationMode !== "station" || !activeLocation.sensorId) return null;
    let queryParams = `sensorId=${activeLocation.sensorId}&preset=${preset}&calibration=true`;
    if (preset === "monthly") queryParams += `&month=${selectedMonth}&year=${selectedYear}`;
    else if (preset === "dasarian") queryParams += `&month=${selectedMonth}&year=${selectedYear}&dasarian=${selectedDasarian}`;
    else if (preset === "yearly") queryParams += `&year=${selectedYear}`;
    if (refreshKeyKlim) queryParams += `&_t=${refreshKeyKlim}`;
    return `/api/climatology?${queryParams}`;
  }, [locationMode, activeLocation.sensorId, preset, selectedMonth, selectedYear, selectedDasarian, refreshKeyKlim]);

  const { data: klimData, error: klimError, isLoading: isKlimLoading, mutate: mutateKlim } = useSWR(klimApiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 0,
  });

  // ERA5 baseline for klimatologi station data (driven by activeCoords)
  const era5BaselinePath = useMemo(() => {
    if (!activeCoords?.lat || !activeCoords?.lng) return null;
    const now = new Date();
    const currentYear = now.getFullYear();
    const targetYear = selectedYear || currentYear;
    const startDate = `${targetYear}-01-01`;
    let endDate = `${targetYear}-12-31`;
    if (targetYear >= currentYear) {
      const d = new Date();
      d.setDate(d.getDate() - 5);
      endDate = d.toISOString().substring(0, 10);
    }
    let url = `/api/reanalysis/data?latitude=${activeCoords.lat}&longitude=${activeCoords.lng}&startDate=${startDate}&endDate=${endDate}`;
    if (refreshKeyKlim) url += `&_t=${refreshKeyKlim}`;
    return url;
  }, [activeCoords, selectedYear, refreshKeyKlim]);

  const { data: era5BaselineData, isLoading: isEra5BaselineLoading, mutate: mutateEra5Baseline } = useSWR(era5BaselinePath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // WMO 30-Year Climatological Standard Normal (1991–2020) & Classification API (driven by activeCoords)
  const wmoNormalsPath = useMemo(() => {
    if (!activeCoords?.lat || !activeCoords?.lng) return null;
    let url = `/api/climatology/normals?lat=${activeCoords.lat}&lng=${activeCoords.lng}`;
    if (refreshKeyKlim) url += `&_t=${refreshKeyKlim}`;
    return url;
  }, [activeCoords, refreshKeyKlim]);

  const {
    data: wmoNormalsData,
    isLoading: isWmoNormalsLoading,
    mutate: mutateWmoNormals,
  } = useSWR(wmoNormalsPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const handleRefreshKlim = useCallback(() => {
    setRefreshKeyKlim(Date.now());
    mutateKlim();
    mutateEra5Baseline();
    mutateWmoNormals();
  }, [mutateKlim, mutateEra5Baseline, mutateWmoNormals]);

  const periodNormals = useMemo(() => {
    const wmo = wmoNormalsData?.normals;
    const mIdx = Math.max(0, Math.min(11, (selectedMonth || 1) - 1));

    if (wmo) {
      const monthlyRain = wmo.monthly.map((m: any) => m.precipMean);
      const monthlyTemp = wmo.monthly.map((m: any) => m.tempMean);
      const monthlyHum = era5BaselineData?.monthly?.humidity?.mean || Array(12).fill(80);
      const monthlyPress = era5BaselineData?.monthly?.pressure?.mean || Array(12).fill(1012);

      let normalTemp = wmo.annual.tempMean;
      let normalHum = era5BaselineData?.stats?.humidity?.mean ?? 80;
      let normalPress = era5BaselineData?.stats?.pressure?.mean ?? 1012;
      let normalRain = wmo.annual.precipMean / 12;

      if (preset === "monthly") {
        normalTemp = wmo.monthly[mIdx]?.tempMean ?? normalTemp;
        normalRain = wmo.monthly[mIdx]?.precipMean ?? normalRain;
      } else if (preset === "dasarian") {
        normalTemp = wmo.monthly[mIdx]?.tempMean ?? normalTemp;
        const dasIdx = mIdx * 3 + Math.max(0, Math.min(2, selectedDasarian - 1));
        normalRain = wmo.dasarians[dasIdx]?.precipMean ?? normalRain / 3;
      } else if (preset === "weekly") {
        const currentM = new Date().getMonth();
        normalTemp = wmo.monthly[currentM]?.tempMean ?? normalTemp;
        normalRain = (wmo.monthly[currentM]?.precipMean ?? normalRain) / 4;
      } else if (preset === "yearly") {
        normalTemp = wmo.annual.tempMean;
        normalRain = wmo.annual.precipMean;
      }

      return {
        temperature: { mean: normalTemp, monthly: monthlyTemp },
        humidity: { mean: normalHum, monthly: monthlyHum },
        pressure: { mean: normalPress, monthly: monthlyPress },
        rainfall: { normal: normalRain, monthly: monthlyRain },
      };
    }

    if (!era5BaselineData || !era5BaselineData.monthly) return null;

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
  }, [wmoNormalsData, era5BaselineData, preset, selectedMonth, selectedDasarian]);

  const climateExtremes = useMemo(() => {
    return computeClimateExtremes(klimData?.points || [], era5BaselineData || null);
  }, [klimData?.points, era5BaselineData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ERA5 REANALISIS STATE (Driven by activeCoords)
  // ═══════════════════════════════════════════════════════════════════════════
  const [timePreset, setTimePreset] = useState<string>("1y");

  const maxEndDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return d.toISOString().substring(0, 10);
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>(maxEndDate);

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

  const era5ApiPath = useMemo(() => {
    if (!activeCoords) return null;
    return `/api/reanalysis/data?latitude=${activeCoords.lat.toFixed(4)}&longitude=${activeCoords.lng.toFixed(4)}&startDate=${era5QueryDates.start}&endDate=${era5QueryDates.end}`;
  }, [activeCoords, era5QueryDates]);

  const { data: era5Data, error: era5Error, isLoading: isEra5Loading, mutate: mutateEra5 } = useSWR(era5ApiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Skeletons
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
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Mengambil Data Reanalisis Atmosfer ERA5</p>
            <p className="text-xs text-slate-400 max-w-md">Menghitung profil suhu, kelembaban, tekanan, CAPE, dan diagram Hovmöller untuk {activeLocation.name}...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* ── A. Page Header Banner ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 sm:p-5 bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-teal-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1.5 z-10 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5 text-white">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-teal-400 shrink-0" /> Analisis Klimatologi dan Agroklimatologi
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Pusat analisis iklim menyeluruh: Normal Standar WMO,Iklim Oldeman &amp; Köppen, Kekeringan SPI, ekstrem ETCCDI, prediksi ensemble, serta reanalisis atmosfer ERA5 untuk seluruh wilayah Indonesia &amp; Dunia.
          </p>
        </div>
      </div>

      {/* ── B. UNIVERSAL LOCATION HUB (Multi-Region & Stasiun IoT) ────────────── */}
      <Card className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Top Row: Mode Switcher & Active Location Summary Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-semibold w-fit">
              <button
                onClick={() => setLocationMode("station")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  locationMode === "station"
                    ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Radio className="h-3.5 w-3.5 text-teal-500" />
                <span>Stasiun Cuaca</span>
                {devices.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                    {devices.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setLocationMode("region")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  locationMode === "region"
                    ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Globe className="h-3.5 w-3.5 text-indigo-500" />
                <span>Pencarian Wilayah</span>
              </button>
            </div>

            {/* Current Active Location Indicator */}
            <div className="flex items-center gap-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className={`p-1 rounded-md ${locationMode === "station" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"}`}>
                {locationMode === "station" ? <Radio className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {locationMode === "station" ? "Stasiun IoT Terpasang" : "Wilayah Regional Bebas"}
                </span>
                <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[260px] sm:max-w-md">
                  {activeLocation.name}
                  <span className="text-[11px] font-normal font-mono text-slate-500 ml-1.5">
                    ({activeCoords.lat.toFixed(4)}°, {activeCoords.lng.toFixed(4)}°)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mode 1: Station Selector Controls */}
          {locationMode === "station" ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1 w-full sm:w-[280px]">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Stasiun Cuaca Terdaftar</label>
                <Select
                  value={sensorId}
                  onValueChange={(val) => {
                    setSensorId(val);
                    const matched = devices.find((d) => d.value === val);
                    setStoredActiveSensorId(val, { label: matched?.label });
                  }}
                  disabled={devices.length === 0}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-9 text-xs">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-teal-500" />
                    <SelectValue placeholder={devices.length === 0 ? "Tidak ada stasiun terdaftar" : "Pilih Stasiun Sensor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold">{opt.label}</span>
                          {opt.location && <span className="text-[10px] text-slate-400">{opt.location}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentDevice && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Stasiun: <strong className="text-slate-800 dark:text-slate-200">{currentDevice.label}</strong></span>
                  <span className="font-mono text-[11px] text-slate-400">[{activeCoords.lat.toFixed(3)}°, {activeCoords.lng.toFixed(3)}°]</span>
                </div>
              )}

              <div className="ml-auto text-xs text-slate-400 flex items-center gap-2">
                <span>Ingin menganalisis daerah lain di Indonesia?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocationMode("region")}
                  className="h-7 text-[11px] px-2.5 bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                >
                  <Globe className="h-3 w-3 mr-1" /> Buka Pencarian Wilayah
                </Button>
              </div>
            </div>
          ) : (
            /* Mode 2: Free Region / Coordinates Selector */
            <div className="space-y-3.5">
              {/* Search Bar + Direct Coordinate Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Geocoding Search Input */}
                <div className="md:col-span-5 space-y-1 relative">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Cari Kota / Kabupaten / Kecamatan (Indonesia &amp; Dunia)</span>
                    {isSearchingGeocode && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Ketik nama kota... Contoh: Surabaya, Kupang, Tokyo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  {/* Geocode Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-60 overflow-y-auto text-xs divide-y divide-slate-100 dark:divide-slate-800">
                      {suggestions.map((city) => (
                        <button
                          key={city.id}
                          onClick={() => handleSelectSuggestion(city)}
                          className="w-full text-left p-2.5 hover:bg-indigo-50/50 dark:hover:bg-slate-900 flex justify-between items-center transition"
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">{city.name}</div>
                            <div className="text-[10px] text-slate-400">{city.admin1 ? `${city.admin1}, ` : ""}{city.country}</div>
                          </div>
                          <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Latitude & Longitude Inputs */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lintang (Lat)</label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    placeholder="-6.2146"
                    className="text-xs h-9 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bujur (Lng)</label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    value={lngInput}
                    onChange={(e) => setLngInput(e.target.value)}
                    placeholder="106.8451"
                    className="text-xs h-9 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                {/* Action Buttons */}
                <div className="md:col-span-3 flex items-center gap-1.5">
                  <Button
                    onClick={handleApplyCoordinates}
                    size="sm"
                    className="h-9 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex-1"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Terapkan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={triggerGeolocation}
                    title="Deteksi Lokasi GPS Anda"
                    className="h-9 px-2.5 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-indigo-600"
                  >
                    <Navigation2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={isCurrentFavorite ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleFavorite}
                    title={isCurrentFavorite ? "Hapus dari Favorit" : "Simpan ke Favorit"}
                    className="h-9 px-2.5 text-xs border-slate-200 dark:border-slate-800"
                  >
                    <Star className={`h-3.5 w-3.5 ${isCurrentFavorite ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
                  </Button>
                </div>
              </div>

              {/* Quick Preset Indonesian Climate Regions Chips */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5 text-teal-500" />
                    Pilihan Cepat Wilayah Iklim Utama Indonesia:
                  </span>
                  {favorites.length > 0 && (
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      Klik salah satu untuk memuat profil klimatologis WMO &amp; reanalisis ERA5 seketika
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {INDONESIAN_CLIMATE_REGIONS.map((region) => {
                    const isSelected =
                      locationMode === "region" &&
                      Math.abs(customCoords.lat - region.lat) < 0.01 &&
                      Math.abs(customCoords.lng - region.lng) < 0.01;
                    return (
                      <button
                        key={region.name}
                        onClick={() => handleSelectPresetRegion(region)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <MapPin className={`h-3 w-3 ${isSelected ? "text-white" : "text-teal-500"}`} />
                        <span>{region.name}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded ${isSelected ? "bg-indigo-700/60 text-indigo-100" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                          {region.climateZone.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saved Favorite Locations */}
              {favorites.length > 0 && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" /> Favorit:
                  </span>
                  {favorites.map((fav, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectFavorite(fav)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100"
                    >
                      {fav.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── B.2 Executive Climate Representativeness Overview ────────────────── */}
      <ClimateRepresentativenessOverview
        coordinates={activeCoords}
        stationName={activeLocation.name}
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
        locationMode={locationMode}
      />

      {/* ── C. Main Climatology & Meteorology Navigation ──────────────────── */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl gap-1">
          <TabsTrigger value="profil-iklim" className="py-2.5 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <CloudSun className="h-4 w-4 text-blue-500 shrink-0" />
            <span>Profil Iklim WMO</span>
          </TabsTrigger>
          <TabsTrigger value="klimatologi" className="py-2.5 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <BarChart3 className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>{locationMode === "region" ? "Klimatologi Grid ERA5" : "Observasi Sensor vs Normal"}</span>
          </TabsTrigger>
          <TabsTrigger value="ekstrem-spi" className="py-2.5 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Ekstrem &amp; SPI</span>
          </TabsTrigger>
          <TabsTrigger value="zom-musim" className="py-2.5 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <CalendarDays className="h-4 w-4 text-teal-500 shrink-0" />
            <span>36 Dasarian &amp; ZOM</span>
          </TabsTrigger>
          <TabsTrigger value="agromet" className="py-2.5 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <Sprout className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Agroklimatologi</span>
          </TabsTrigger>
          <TabsTrigger value="era5" className="py-2.5 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <Globe className="h-4 w-4 text-purple-500 shrink-0" />
            <span>Reanalisis ERA5</span>
          </TabsTrigger>
          <TabsTrigger value="chc-estimates" className="py-2.5 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-bold rounded-lg">
            <CloudRain className="h-4 w-4 text-cyan-500 shrink-0" />
            <span>Satelit CHC CHIRPS</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB: PROFIL IKLIM WMO (1991–2020) & KLASIFIKASI BIOKLIMATIK ─── */}
        <TabsContent value="profil-iklim" className="mt-6 space-y-6">
          <ClimateProfileTab
            activeLocation={activeLocation}
            handleRefreshKlim={handleRefreshKlim}
            isWmoNormalsLoading={isWmoNormalsLoading}
            wmoNormalsData={wmoNormalsData}
            isDarkMode={isDarkMode}
          />
        </TabsContent>

{/* ─── TAB 1: AGROKLIMATOLOGI & NERACA AIR LAHAN ─── */}
        <TabsContent value="agromet" className="mt-6 space-y-8">
          <AgrometTab
            activeLocation={activeLocation}
            activeCoords={activeCoords}
            isAgrometLoading={isAgrometLoading}
            agrometData={agrometData}
            agrometError={agrometError}
            handleRefreshAgromet={handleRefreshAgromet}
            isDarkMode={isDarkMode}
            soilMoistureSurface={soilMoistureSurface}
            soilTempSurface={soilTempSurface}
            soilMoistureRoot={soilMoistureRoot}
            soilTempRoot={soilTempRoot}
            isHeatStress={isHeatStress}
            isDroughtRisk={isDroughtRisk}
            isDiseaseRisk={isDiseaseRisk}
            isVpdStress={isVpdStress}
            agroHourlyData={agroHourlyData}
            agroDailyData={agroDailyData}
            soilMoistureOption={soilMoistureOption}
            solarOption={solarOption}
            temp={temp}
            tempMin={tempMin}
            tempMax={tempMax}
            apparentTemp={apparentTemp}
            dewPoint={dewPoint}
            dewPointDepression={dewPointDepression}
            dewPointCondition={dewPointCondition}
            surfacePressure={surfacePressure}
            rh={rh}
            vpd={vpd}
            rainToday={rainToday}
            rain7d={rain7d}
            et0Today={et0Today}
            waterDeficit={waterDeficit}
            solarCurrent={solarCurrent}
            solarDaily={solarDaily}
            windSpeed={windSpeed}
            windDir={windDir}
            getCardinalDirection={getCardinalDirection}
            cloudCover={cloudCover}
            uvIndex={uvIndex}
          />
        </TabsContent>

{/* ─── TAB 2: OBSERVASI SENSOR VS NORMAL KLIMATOLOGI ─── */}
        <TabsContent value="klimatologi" className="mt-6 space-y-6">
          <StandardClimatologyTab
            locationMode={locationMode}
            setLocationMode={setLocationMode}
            activeLocation={activeLocation}
            activeCoords={activeCoords}
            isEra5BaselineLoading={isEra5BaselineLoading}
            era5BaselineData={era5BaselineData}
            handleRefreshKlim={handleRefreshKlim}
            devices={devices}
            currentDevice={currentDevice}
            preset={preset}
            setPreset={setPreset}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedDasarian={selectedDasarian}
            setSelectedDasarian={setSelectedDasarian}
            isKlimLoading={isKlimLoading}
            klimData={klimData}
            klimError={klimError}
            periodNormals={periodNormals}
            climateExtremes={climateExtremes}
            isDarkMode={isDarkMode}
            renderKlimLoading={renderKlimLoading}
          />
        </TabsContent>

{/* ─── TAB: DETEKSI INDEKS IKLIM EKSTREM ETCCDI & MONITORING KEKERINGAN SPI ─── */}
        <TabsContent value="ekstrem-spi" className="mt-6 space-y-6">
          <ExtremesSpiTab
            locationMode={locationMode}
            klimData={klimData}
            activeLocation={activeLocation}
            isDarkMode={isDarkMode}
            wmoNormalsData={wmoNormalsData}
          />
        </TabsContent>

{/* ─── TAB: DINAMIKA 36 DASARIAN & PREDIKSI ONSET MUSIM BMKG (ZONA MUSIM) ─── */}
        <TabsContent value="zom-musim" className="mt-6 space-y-6">
          <ZomDynamicsTab
            activeLocation={activeLocation}
            wmoNormalsData={wmoNormalsData}
            isDarkMode={isDarkMode}
          />
        </TabsContent>

{/* ─── TAB 3: REANALISIS ERA5 (ECMWF GLOBAL REANALYSIS) ─── */}
        <TabsContent value="era5" className="mt-6 space-y-6">
          <Era5ReanalysisTab
            activeLocation={activeLocation}
            timePreset={timePreset}
            setTimePreset={setTimePreset}
            mutateEra5={mutateEra5}
            isEra5Loading={isEra5Loading}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            maxEndDate={maxEndDate}
            dateRangeValidation={dateRangeValidation}
            era5Data={era5Data}
            era5Error={era5Error}
            isDarkMode={isDarkMode}
            renderEra5Loading={renderEra5Loading}
          />
        </TabsContent>

{/* ─── TAB: CHC EARLY ESTIMATES (UC SANTA BARBARA) — ASIA TENGGARA ─── */}
        <TabsContent value="chc-estimates" className="mt-6 space-y-6">
          <ChcEstimatesTab />
        </TabsContent>
            </Tabs>
    </div>
  );
}

// ─── Main Export with Suspense wrapper for SearchParams ─────────────────────
export default function KlimatologiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      }
    >
      <KlimatologiInner />
    </Suspense>
  );
}
