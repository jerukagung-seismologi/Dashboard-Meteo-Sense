// hooks/climatology/useClimatologyWorkspace.ts
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import {
  getStoredActiveSensorId,
  setStoredActiveSensorId,
  resolveActiveSensorId,
} from "@/lib/activeSensorStorage";
import { computeClimateExtremes } from "@/lib/climatology/climateExtremes";

export interface DeviceOption {
  label: string;
  value: string;
  coordinates?: { lat: number; lng: number };
  location?: string;
}

export interface FavoriteLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface PresetRegion {
  name: string;
  lat: number;
  lng: number;
  province: string;
  climateZone: string;
}

export const INDONESIAN_CLIMATE_REGIONS: PresetRegion[] = [
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

export const DEFAULT_FAVORITES: FavoriteLocation[] = [
  { name: "Jakarta", latitude: -6.2146, longitude: 106.8451 },
  { name: "Surabaya", latitude: -7.2575, longitude: 112.7521 },
  { name: "Bandung", latitude: -6.9175, longitude: 107.6191 },
  { name: "Medan", latitude: 3.5952, longitude: 98.6722 },
  { name: "Makassar", latitude: -5.1476, longitude: 119.4327 },
  { name: "Kupang", latitude: -10.1772, longitude: 123.6070 },
];

export type ClimatologyWorkspaceTab =
  | "ringkasan"
  | "observasi"
  | "reanalisis"
  | "ekstrem-hidro"
  | "agroklimat";

const VALID_TABS: ClimatologyWorkspaceTab[] = [
  "ringkasan",
  "observasi",
  "reanalisis",
  "ekstrem-hidro",
  "agroklimat",
];

// Backward-compatibility mapping from old tab parameters to new workspace tabs
function mapLegacyTab(tab: string | null): ClimatologyWorkspaceTab {
  if (!tab) return "ringkasan";
  if (VALID_TABS.includes(tab as ClimatologyWorkspaceTab)) {
    return tab as ClimatologyWorkspaceTab;
  }
  switch (tab) {
    case "profil-iklim":
      return "ringkasan";
    case "klimatologi":
      return "observasi";
    case "era5":
    case "zom-musim":
    case "chc-estimates":
      return "reanalisis";
    case "ekstrem-spi":
    case "curah-hujan-rencana":
      return "ekstrem-hidro";
    case "agromet":
      return "agroklimat";
    default:
      return "ringkasan";
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Gagal memuat data dari server.");
  }
  return res.json();
};

const agrometFetcher = (url: string) => fetch(url).then((res) => res.json());

export function useClimatologyWorkspace() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Dark mode detector
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ── 1. ACTIVE WORKSPACE TAB WITH URL SYNC ──────────────────────────────────
  const activeTab: ClimatologyWorkspaceTab = useMemo(() => {
    const rawTab = searchParams ? searchParams.get("tab") : null;
    return mapLegacyTab(rawTab);
  }, [searchParams]);

  const setActiveTab = useCallback(
    (newTab: ClimatologyWorkspaceTab) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("tab", newTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // ── 2. UNIVERSAL LOCATION HUB STATE ───────────────────────────────────────
  const [locationMode, setLocationMode] = useState<"station" | "region">("station");
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [sensorId, setSensorId] = useState<string>(
    () => (searchParams ? searchParams.get("sensorId") : null) || getStoredActiveSensorId() || ""
  );

  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number }>({
    lat: -6.2146,
    lng: 106.8451,
  });
  const [customRegionName, setCustomRegionName] = useState<string>("Jakarta");
  const [latInput, setLatInput] = useState<string>("-6.2146");
  const [lngInput, setLngInput] = useState<string>("106.8451");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>(DEFAULT_FAVORITES);

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
            const activeId = resolveActiveSensorId(options, searchParams ? searchParams.get("sensorId") : null);
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

  // Load favorites from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("meteo_reanalysis_favorites");
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch {
          setFavorites(DEFAULT_FAVORITES);
        }
      }
    }
  }, []);

  // Sync coordinates from URL if present
  useEffect(() => {
    if (!searchParams) return;
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const nameParam = searchParams.get("name");

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

  const currentDevice = useMemo(
    () => devices.find((d) => d.value === sensorId),
    [devices, sensorId]
  );

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

  const activeCoords = useMemo(
    () => ({ lat: activeLocation.lat, lng: activeLocation.lng }),
    [activeLocation]
  );

  // Geocoding Autocomplete Search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingGeocode(true);
      try {
        const res = await fetch(
          `/api/reanalysis/geocode?name=${encodeURIComponent(searchQuery)}`
        );
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
    return favorites.some(
      (f) => Math.abs(f.latitude - lat) < 0.01 && Math.abs(f.longitude - lng) < 0.01
    );
  }, [latInput, lngInput, favorites]);

  const handleToggleFavorite = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) return;
    let updated: FavoriteLocation[];
    if (isCurrentFavorite) {
      updated = favorites.filter(
        (f) => !(Math.abs(f.latitude - lat) < 0.01 && Math.abs(f.longitude - lng) < 0.01)
      );
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

  // ── 3. CLIMATOLOGY STATION DATA QUERY ─────────────────────────────────────
  const [preset, setPreset] = useState<string>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getUTCFullYear());
  const [selectedDasarian, setSelectedDasarian] = useState<number>(1);
  const [refreshKeyKlim, setRefreshKeyKlim] = useState<number>(0);

  const klimApiPath = useMemo(() => {
    if (locationMode !== "station" || !activeLocation.sensorId) return null;
    let queryParams = `sensorId=${activeLocation.sensorId}&preset=${preset}&calibration=true`;
    if (preset === "monthly") queryParams += `&month=${selectedMonth}&year=${selectedYear}`;
    else if (preset === "dasarian") queryParams += `&month=${selectedMonth}&year=${selectedYear}&dasarian=${selectedDasarian}`;
    else if (preset === "yearly") queryParams += `&year=${selectedYear}`;
    if (refreshKeyKlim) queryParams += `&_t=${refreshKeyKlim}`;
    return `/api/climatology?${queryParams}`;
  }, [locationMode, activeLocation.sensorId, preset, selectedMonth, selectedYear, selectedDasarian, refreshKeyKlim]);

  const {
    data: klimData,
    error: klimError,
    isLoading: isKlimLoading,
    mutate: mutateKlim,
  } = useSWR(klimApiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 0,
  });

  // ── 4. ERA5 BASELINE & WMO NORMALS ─────────────────────────────────────────
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

  const {
    data: era5BaselineData,
    isLoading: isEra5BaselineLoading,
    mutate: mutateEra5Baseline,
  } = useSWR(era5BaselinePath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

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

  // Computed period normals comparison
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

  // ── 5. ERA5 REANALISIS RANGE QUERY ─────────────────────────────────────────
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

  const {
    data: era5Data,
    error: era5Error,
    isLoading: isEra5Loading,
    mutate: mutateEra5,
  } = useSWR(era5ApiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // ── 6. AGROMETEOROLOGI STATE & DATA ────────────────────────────────────────
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

  // Agromet derived metrics
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

  const getCardinalDirection = (deg: number) => {
    const directions = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
    return directions[Math.round(deg / 45) % 8];
  };

  return {
    isDarkMode,
    activeTab,
    setActiveTab,
    // Location
    locationMode,
    setLocationMode,
    devices,
    sensorId,
    setSensorId,
    currentDevice,
    activeLocation,
    activeCoords,
    customCoords,
    customRegionName,
    latInput,
    setLatInput,
    lngInput,
    setLngInput,
    searchQuery,
    setSearchQuery,
    suggestions,
    isSearchingGeocode,
    favorites,
    isCurrentFavorite,
    handleSelectPresetRegion,
    handleSelectSuggestion,
    handleApplyCoordinates,
    triggerGeolocation,
    handleToggleFavorite,
    handleSelectFavorite,
    // Climatology Station
    preset,
    setPreset,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    selectedDasarian,
    setSelectedDasarian,
    klimData,
    klimError,
    isKlimLoading,
    handleRefreshKlim,
    periodNormals,
    climateExtremes,
    // WMO Normals
    wmoNormalsData,
    isWmoNormalsLoading,
    // ERA5 Baseline
    era5BaselineData,
    isEra5BaselineLoading,
    // ERA5 Diagnostics Range
    timePreset,
    setTimePreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    maxEndDate,
    dateRangeValidation,
    era5Data,
    era5Error,
    isEra5Loading,
    mutateEra5,
    // Agromet
    agrometData,
    agrometError,
    isAgrometLoading,
    handleRefreshAgromet,
    agroHourlyData,
    agroDailyData,
    temp,
    tempMin,
    tempMax,
    apparentTemp,
    rh,
    dewPoint,
    dewPointDepression,
    dewPointCondition,
    surfacePressure,
    vpd,
    rainToday,
    rain7d,
    solarCurrent,
    solarDaily,
    cloudCover,
    uvIndex,
    windSpeed,
    windDir,
    soilMoistureSurface,
    soilMoistureRoot,
    soilTempSurface,
    soilTempRoot,
    et0Today,
    waterDeficit,
    isHeatStress,
    isDroughtRisk,
    isDiseaseRisk,
    isVpdStress,
    getCardinalDirection,
  };
}

export type ClimatologyWorkspaceHook = ReturnType<typeof useClimatologyWorkspace>;
