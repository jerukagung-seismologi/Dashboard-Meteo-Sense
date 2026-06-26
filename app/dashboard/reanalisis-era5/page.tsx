// app/dashboard/reanalisis-era5/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { 
  Loader2, 
  Sparkles, 
  MapPin, 
  Search, 
  Star, 
  Calendar, 
  Compass, 
  Check,
  AlertTriangle 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Sub-components
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
  { name: "Makassar", latitude: -5.1476, longitude: 119.4327 }
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Gagal memuat data dari server.");
  }
  return res.json();
};

export default function ReanalysisPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Monitor dark mode changes using MutationObserver
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Coordinates & search states
  const [latInput, setLatInput] = useState<string>("-6.2146");
  const [lngInput, setLngInput] = useState<string>( "106.8451");
  const [appliedCoords, setAppliedCoords] = useState<{ lat: number; lng: number }>({ lat: -6.2146, lng: 106.8451 });

  // Geocoding search states
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);

  // Time preset & custom dates
  const [timePreset, setTimePreset] = useState<string>("1y");
  
  // Calculate date boundaries
  // ERA5 has a delay of 5 days
  const maxEndDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return d.toISOString().substring(0, 10);
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>(maxEndDate);

  // Load favorites & initialize default location
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("meteo_reanalysis_favorites");
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch (e) {
          setFavorites(defaultFavorites);
        }
      } else {
        setFavorites(defaultFavorites);
        localStorage.setItem("meteo_reanalysis_favorites", JSON.stringify(defaultFavorites));
      }

      // Try geolocating on initial load
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const latStr = latitude.toFixed(4);
            const lngStr = longitude.toFixed(4);
            setLatInput(latStr);
            setLngInput(lngStr);
            setAppliedCoords({ lat: latitude, lng: longitude });
          },
          (err) => {
            console.log("Geolocation permission denied or timed out. Defaulting to Jakarta.");
          },
          { timeout: 5000 }
        );
      }
    }
  }, []);

  // Compute start & end dates based on preset/custom inputs
  const queryDates = useMemo(() => {
    const today = new Date();
    const end = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    let start = new Date(end);

    if (timePreset === "1y") {
      start.setFullYear(end.getFullYear() - 1);
    } else if (timePreset === "6m") {
      start.setMonth(end.getMonth() - 6);
    } else if (timePreset === "3m") {
      start.setMonth(end.getMonth() - 3);
    } else if (timePreset === "30d") {
      start.setDate(end.getDate() - 30);
    } else if (timePreset === "custom" && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }

    return {
      start: start.toISOString().substring(0, 10),
      end: end.toISOString().substring(0, 10)
    };
  }, [timePreset, customStartDate, customEndDate, todayDate()]);

  function todayDate() {
    return new Date().toISOString().substring(0, 10);
  }

  // Validate custom date range
  const dateRangeValidation = useMemo(() => {
    if (timePreset !== "custom") return { isValid: true, message: "" };
    if (!customStartDate || !customEndDate) return { isValid: false, message: "Tanggal Mulai dan Selesai harus diisi" };

    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const maxEnd = new Date(maxEndDate);

    if (start > end) return { isValid: false, message: "Tanggal Mulai tidak boleh setelah Tanggal Selesai" };
    if (end > maxEnd) return { isValid: false, message: `ERA5 Reanalysis memiliki delay data. Tanggal Selesai maks: ${maxEndDate}` };

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 366) {
      return { isValid: false, message: "Rentang maksimum adalah 1 tahun (366 hari) untuk resolusi tinggi" };
    }
    if (diffDays < 7) {
      return { isValid: false, message: "Rentang minimum adalah 7 hari untuk analisis yang bermakna" };
    }

    return { isValid: true, message: "" };
  }, [timePreset, customStartDate, customEndDate, maxEndDate]);

  // Autocomplete search handler
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

  // Apply inputs and fetch
  const handleApplyParams = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert("Latitude harus berupa angka antara -90 dan 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert("Longitude harus berupa angka antara -180 dan 180.");
      return;
    }
    if (!dateRangeValidation.isValid) {
      alert(dateRangeValidation.message);
      return;
    }

    setAppliedCoords({ lat, lng });
  };

  // Select suggestion
  const handleSelectSuggestion = (city: any) => {
    const latStr = city.latitude.toFixed(4);
    const lngStr = city.longitude.toFixed(4);
    setLatInput(latStr);
    setLngInput(lngStr);
    setSearchQuery("");
    setSuggestions([]);
    setAppliedCoords({ lat: city.latitude, lng: city.longitude });
  };

  // Add/Remove favorite
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
  };

  // Build SWR API path
  const apiPath = useMemo(() => {
    if (!appliedCoords) return null;
    return `/api/reanalysis/data?latitude=${appliedCoords.lat.toFixed(4)}&longitude=${appliedCoords.lng.toFixed(4)}&startDate=${queryDates.start}&endDate=${queryDates.end}`;
  }, [appliedCoords, queryDates]);

  const { data, error, isLoading, mutate } = useSWR(apiPath, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const triggerGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          setLatInput(lat);
          setLngInput(lng);
          setAppliedCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (err) => {
          alert("Gagal mengakses geolokasi browser. Pastikan izin telah diberikan.");
        }
      );
    } else {
      alert("Browser Anda tidak mendukung geolokasi.");
    }
  };

  // Render Skeletons for Loading State
  const renderLoading = () => (
    <div className="space-y-6">
      {/* Cards Skeleton */}
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

      {/* Main Content Skeleton */}
      <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
        <CardHeader className="pb-2 border-b dark:border-slate-800">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-1" />
        </CardHeader>
        <CardContent className="p-16 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Menghubungi Open-Meteo ERA5 Reanalysis Archive...</p>
            <p className="text-xs text-slate-400 max-w-md">Melakukan kompilasi meteorologi, perhitungan ketidakstabilan parsel udara (CAPE), dan penyusunan diagram Hovmöller di server...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 px-4 max-w-7xl mx-auto pt-6">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Compass className="h-8 w-8 text-indigo-500 animate-spin-slow" /> Reanalisis Klimatologi ERA5
            </h2>
            <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse hidden sm:inline" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Dataset iklim global ECMWF ERA5 generasi kelima.
          </p>
        </div>
      </div>

      {/* 2. Controls Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-sm dark:bg-slate-900 bg-white sticky top-6">
            <CardHeader className="pb-3 border-b dark:border-slate-800">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Konfigurasi Wilayah</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              
              {/* Geocoding City Search */}
              <div className="space-y-1 relative">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cari Kota / Wilayah</label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Contoh: Jakarta, Surabaya..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9 bg-slate-50 dark:bg-slate-950"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  {isSearchingGeocode && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Autocomplete Suggestion Dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-md shadow-lg max-h-60 overflow-y-auto text-xs divide-y dark:divide-slate-800">
                    {suggestions.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => handleSelectSuggestion(city)}
                        className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 flex justify-between items-center transition"
                      >
                        <div className="font-semibold text-slate-700 dark:text-slate-200">
                          {city.name}, <span className="text-slate-400">{city.admin1 || city.country}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Coordinates Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Latitude</label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    className="text-xs h-9 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Longitude</label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    value={lngInput}
                    onChange={(e) => setLngInput(e.target.value)}
                    className="text-xs h-9 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={triggerGeolocation}
                  variant="outline"
                  className="flex-1 text-xs h-9 gap-1 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                >
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" /> Deteksi GPS
                </Button>
                <Button
                  onClick={handleToggleFavorite}
                  variant={isCurrentFavorite ? "default" : "outline"}
                  className="px-3 h-9 border-slate-200 dark:border-slate-800"
                >
                  <Star className={`h-4 w-4 ${isCurrentFavorite ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
                </Button>
              </div>

              {/* Favorites Quick List */}
              {favorites.length > 0 && (
                <div className="space-y-2 border-t dark:border-slate-800 pt-3">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Daftar Lokasi Favorit</label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {favorites.map((fav, index) => {
                      const active = Math.abs(parseFloat(latInput) - fav.latitude) < 0.01 && 
                                     Math.abs(parseFloat(lngInput) - fav.longitude) < 0.01;
                      return (
                        <button
                          key={index}
                          onClick={() => handleSelectFavorite(fav)}
                          className={`text-[10px] px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${
                            active
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border-indigo-200 dark:border-indigo-900 font-bold"
                              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          <Star className={`h-3 w-3 ${active ? "fill-indigo-500 text-indigo-500" : "text-slate-400"}`} />
                          {fav.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Time Period Selector */}
              <div className="space-y-3 border-t dark:border-slate-800 pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rentang Waktu</label>
                  <div className="flex border rounded-lg p-1 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-xs">
                    <button
                      onClick={() => setTimePreset("1y")}
                      className={`flex-1 text-center py-1 font-semibold rounded-md transition duration-150 ${
                        timePreset === "1y" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      1 Tahun
                    </button>
                    <button
                      onClick={() => setTimePreset("6m")}
                      className={`flex-1 text-center py-1 font-semibold rounded-md transition duration-150 ${
                        timePreset === "6m" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      6 Bulan
                    </button>
                    <button
                      onClick={() => setTimePreset("custom")}
                      className={`flex-1 text-center py-1 font-semibold rounded-md transition duration-150 ${
                        timePreset === "custom" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      Kustom
                    </button>
                  </div>
                </div>

                {/* Custom date range inputs */}
                {timePreset === "custom" && (
                  <div className="space-y-2.5 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Tanggal Mulai</label>
                      <Input
                        type="date"
                        max={maxEndDate}
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="text-xs h-9 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Tanggal Selesai</label>
                      <Input
                        type="date"
                        max={maxEndDate}
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="text-xs h-9 bg-slate-50 dark:bg-slate-950"
                      />
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

              {/* Submit Button */}
              <Button
                onClick={handleApplyParams}
                disabled={timePreset === "custom" && !dateRangeValidation.isValid}
                className="w-full text-xs font-semibold h-10 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white gap-2 transition shadow-md"
              >
                <Check className="h-4 w-4" /> Terapkan Analisis
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 3. Main Dashboard Rendering Panel */}
        <div className="lg:col-span-3 space-y-6">
          {isLoading ? (
            renderLoading()
          ) : error ? (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 shadow-sm border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Gagal Memproses Reanalisis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {error.message || "Kesalahan koneksi atau format respon saat menghubungi backend proxy."}
                </p>
                <div className="bg-white dark:bg-slate-950 p-3 rounded-md text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed border dark:border-slate-800 space-y-1">
                  <strong>Rekomendasi Penyelesaian:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Periksa koneksi internet Anda atau pastikan server lokal berjalan.</li>
                    <li>Suhu dan reanalisis ERA5 dibatasi pada daerah yang didukung Open-Meteo.</li>
                    <li>Verifikasi apakah koordinat yang Anda masukkan berada dalam batas geospasial bumi.</li>
                  </ul>
                </div>
                <Button onClick={() => mutate()} variant="outline" size="sm" className="mt-2 text-xs border-red-200 hover:bg-red-100 text-red-700">
                  Ulangi Request
                </Button>
              </CardContent>
            </Card>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 border rounded-xl shadow-sm text-center">
              <Compass className="h-14 w-14 text-indigo-400 dark:text-indigo-600 mb-4 animate-spin-slow" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Belum Ada Lokasi Terpilih</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">
                Gunakan geolokasi browser, cari nama kota, atau masukkan koordinat bujur lintang di panel samping lalu klik "Terapkan Analisis".
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Area Info Badge */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg flex flex-wrap justify-between items-center gap-4 text-xs font-semibold border dark:border-slate-800 shadow-inner">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                  <span className="text-slate-700 dark:text-slate-200">
                    Posisi: {data.latitude.toFixed(4)}°N, {data.longitude.toFixed(4)}°E
                  </span>
                  <span className="text-slate-400 font-normal">|</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    Ketinggian: {data.elevation} m dpl
                  </span>
                  <span className="text-slate-400 font-normal">|</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    Zona: {data.timezone}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 font-normal">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span>Periode Analisis: </span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    {data.startDate} s.d. {data.endDate}
                  </strong>
                </div>
              </div>

              {/* Summary Metrics Banner */}
              <CurrentConditions current={data.current} />

              {/* Tabs Section */}
              <Tabs defaultValue="time-series" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-slate-100 dark:bg-slate-950 border dark:border-slate-800 rounded-lg text-xs gap-1">
                  <TabsTrigger value="time-series" className="py-2.5 font-bold">Deret Waktu</TabsTrigger>
                  <TabsTrigger value="hovmoller" className="py-2.5 font-bold">Diagram Hovmöller</TabsTrigger>
                  <TabsTrigger value="diurnal" className="py-2.5 font-bold">Siklus Distribusi</TabsTrigger>
                  <TabsTrigger value="climatology" className="py-2.5 font-bold">Tren Klimatologi</TabsTrigger>
                  <TabsTrigger value="wind-diagnostics" className="py-2.5 font-bold">Mawar Angin</TabsTrigger>
                </TabsList>

                {/* Tab content 1: Time Series */}
                <TabsContent value="time-series" className="mt-6 space-y-6">
                  <TimeSeriesCharts
                    times={data.hourly.times}
                    temperature={data.hourly.temperature}
                    humidity={data.hourly.humidity}
                    pressure={data.hourly.pressure}
                    rain={data.hourly.rain}
                    windSpeed={data.hourly.windSpeed}
                    windGust={data.hourly.windGust}
                    radiation={data.hourly.radiation}
                    isDarkMode={isDarkMode}
                  />
                </TabsContent>

                {/* Tab content 2: Hovmoller Diagrams */}
                <TabsContent value="hovmoller" className="mt-6">
                  <HovmollerDiagram
                    days={data.hovmoller.days}
                    hours={data.hovmoller.hours}
                    temperature={data.hovmoller.temperature}
                    humidity={data.hovmoller.humidity}
                    pressure={data.hovmoller.pressure}
                    rain={data.hovmoller.rain}
                    isDarkMode={isDarkMode}
                  />
                </TabsContent>

                {/* Tab content 3: Frequency distributions & Diurnal cycle */}
                <TabsContent value="diurnal" className="mt-6 space-y-6">
                  <DiurnalCycle data={data.diurnal} isDarkMode={isDarkMode} />
                  <DistributionAnalysis
                    temperature={data.hourly.temperature}
                    humidity={data.hourly.humidity}
                    pressure={data.hourly.pressure}
                    windSpeed={data.hourly.windSpeed}
                    rain={data.hourly.rain}
                    stats={data.stats}
                    isDarkMode={isDarkMode}
                  />
                </TabsContent>

                {/* Tab content 4: Climatology Seasonal trends */}
                <TabsContent value="climatology" className="mt-6 space-y-6">
                  <WeeklyAnalysis
                    days={data.weekly.days}
                    temperature={data.weekly.temperature}
                    humidity={data.weekly.humidity}
                    pressure={data.weekly.pressure}
                    windSpeed={data.weekly.windSpeed}
                    isDarkMode={isDarkMode}
                  />
                  <MonthlyAnalysis
                    months={data.monthly.months}
                    temperature={data.monthly.temperature}
                    humidity={data.monthly.humidity}
                    pressure={data.monthly.pressure}
                    rain={data.monthly.rain}
                    isDarkMode={isDarkMode}
                  />
                  <AnnualAnalysis
                    days={data.annual.days}
                    temperatureMean={data.annual.temperatureMean}
                    humidityMean={data.annual.humidityMean}
                    pressureMean={data.annual.pressureMean}
                    rainAccumulated={data.annual.rainAccumulated}
                    isDarkMode={isDarkMode}
                  />
                </TabsContent>

                {/* Tab content 5: Wind Rose & Scientific Diagnostics */}
                <TabsContent value="wind-diagnostics" className="mt-6 space-y-6">
                  <WindRose
                    data={data.windRose}
                    isDarkMode={isDarkMode}
                    windSpeedStats={data.stats.windSpeed}
                  />
                  <ForecastDiagnostics
                    scatter={data.scatter}
                    radiation={data.radiation}
                    cape={data.cape}
                    diagnostics={data.diagnostics}
                    isDarkMode={isDarkMode}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
