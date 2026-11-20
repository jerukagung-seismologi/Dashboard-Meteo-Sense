"use client";

import React from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { saveForecast, Forecast } from "@/lib/forecastService";
import { APP_CONFIG } from "@/lib/appConfig";
import { ForecastHistoryList } from "@/components/prakirawan/ForecastHistoryList";
import { ForecastDetailModal } from "@/components/prakirawan/ForecastDetailModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import { EnsembleProbabilityChart, EnsembleHourlyItem } from "@/components/prakirawan/EnsembleProbabilityChart";
import html2canvas from "html2canvas-pro";
import {
  WeatherCondition,
  ForecastRow,
  initialTimes,
  GLOBAL_NWP_MODELS,
  SingleModelPrediction,
  calculateMultiModelConsensus,
  translateModelToCondition,
} from "@/lib/forecast/nwpConsensusEngine";
import { KEBUMEN_LAT, KEBUMEN_LON } from "@/lib/forecast/locationPresets";
import { ForecastHeaderForm } from "@/components/prakirawan/form/ForecastHeaderForm";
import { ForecastHourlyTable } from "@/components/prakirawan/form/ForecastHourlyTable";
import { ForecastPrintableCard } from "@/components/prakirawan/export/ForecastPrintableCard";

export type { WeatherCondition, ForecastRow };
export { GLOBAL_NWP_MODELS, KEBUMEN_LAT, KEBUMEN_LON };

export default function ForecastForm() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const [rows, setRows] = React.useState<ForecastRow[]>(
    initialTimes.map((t) => ({
      time: t,
      conditionMain: "",
      probMain: "80",
      conditionSub: "",
      probSub: "",
      temperature: "",
      temperatureError: 3,
      humidity: "",
      humidityError: 5,
      heatIndex: "",
      heatIndexError: 2,
    }))
  );

  const [location, setLocation] = React.useState<string>("Kebumen");
  const [selectedCoords, setSelectedCoords] = React.useState<{ lat: number; lon: number }>({
    lat: KEBUMEN_LAT,
    lon: KEBUMEN_LON,
  });
  const currentLocationName = location || "Kebumen";

  const [forecastSource, setForecastSource] = React.useState<string>("Manual Analysis");
  const [notes, setNotes] = React.useState<string>("");
  const [selectedForecast, setSelectedForecast] = React.useState<Forecast | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("input");

  const [consensusData, setConsensusData] = React.useState<{
    location: string;
    forecastDate: string;
    modelsUsed: { id: string; name: string; country: string; category: string }[];
    rows: EnsembleHourlyItem[];
  } | null>(null);

  const [loadingFetch, setLoadingFetch] = React.useState<boolean>(false);
  const [isSharing, setIsSharing] = React.useState<boolean>(false);
  const [copiedNarrative, setCopiedNarrative] = React.useState<boolean>(false);

  const printRef = React.useRef<HTMLDivElement>(null);
  const isEditingHistoryRef = React.useRef<boolean>(false);

  // Target Tanggal Prakiraan
  const [targetDateMode, setTargetDateMode] = React.useState<"today" | "tomorrow" | "dayAfter" | "custom">("tomorrow");
  const [customTargetDate, setCustomTargetDate] = React.useState<string>("");

  const selectedDateObj = React.useMemo(() => {
    const d = new Date();
    if (targetDateMode === "today") {
      return d;
    } else if (targetDateMode === "tomorrow") {
      d.setDate(d.getDate() + 1);
      return d;
    } else if (targetDateMode === "dayAfter") {
      d.setDate(d.getDate() + 2);
      return d;
    } else if (targetDateMode === "custom" && customTargetDate) {
      const parts = customTargetDate.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      }
      const parsed = new Date(customTargetDate);
      return isNaN(parsed.getTime()) ? d : parsed;
    }
    d.setDate(d.getDate() + 1);
    return d;
  }, [targetDateMode, customTargetDate]);

  const targetDateIsoStr = React.useMemo(() => {
    if (targetDateMode === "custom" && customTargetDate) {
      return customTargetDate;
    }
    return selectedDateObj.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  }, [selectedDateObj, targetDateMode, customTargetDate]);

  const forecastDisplayDateStr = React.useMemo(() => {
    return selectedDateObj.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDateObj]);

  const tomorrowStr = forecastDisplayDateStr;

  const currentTimeStr = React.useMemo(() => {
    const now = new Date();
    const formatted = now.toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return `${formatted} WIB`;
  }, [rows]);

  // Generator Ringkasan Prospek Cuaca
  const autoNarrative = React.useMemo(() => {
    const loc = currentLocationName.trim() || "Kebumen";
    const temps = rows
      .map((r) => r.temperature)
      .filter((t): t is number => typeof t === "number" && !isNaN(t));
    const minTemp = temps.length > 0 ? Math.min(...temps) : 22;
    const maxTemp = temps.length > 0 ? Math.max(...temps) : 30;

    const hums = rows
      .map((r) => r.humidity)
      .filter((h): h is number => typeof h === "number" && !isNaN(h));
    const minHum = hums.length > 0 ? Math.min(...hums) : 60;
    const maxHum = hums.length > 0 ? Math.max(...hums) : 88;

    const conditions = rows.map((r) => r.conditionMain).filter(Boolean);
    const freq: Record<string, number> = {};
    for (const c of conditions) {
      freq[c] = (freq[c] || 0) + 1;
    }

    const sortedConds = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const dominantCond = sortedConds.length > 0 ? sortedConds[0][0] : "Cerah Berawan";

    const adverseEvents: string[] = [];
    const adverseTimes: string[] = [];

    rows.forEach((r) => {
      const isMainAdverse =
        r.conditionMain &&
        (r.conditionMain.includes("Hujan") ||
          r.conditionMain.includes("Petir") ||
          r.conditionMain.includes("Angin"));
      const isSubAdverse =
        r.conditionSub &&
        (r.conditionSub.includes("Hujan") ||
          r.conditionSub.includes("Petir") ||
          r.conditionSub.includes("Angin"));

      if (isMainAdverse || isSubAdverse) {
        if (r.time) adverseTimes.push(r.time);
        if (isMainAdverse && r.conditionMain) adverseEvents.push(r.conditionMain);
        if (isSubAdverse && r.conditionSub) adverseEvents.push(r.conditionSub);
      }
    });

    let rainNote = "nihil indikasi cuaca ekstrem atau potensi hujan signifikan";
    if (adverseEvents.length > 0) {
      const rainTimes = Array.from(new Set(adverseTimes)).filter(Boolean).join(", ");
      const rainTypes = Array.from(new Set(adverseEvents)).filter(Boolean).join("/");
      rainNote = `waspadai potensi ${rainTypes.toLowerCase()} di sekitar jam ${rainTimes} WIB`;
    }

    const cleanLocTag = loc.replace(/\s+/g, "");
    return `Prospek Cuaca ${loc} ${forecastDisplayDateStr}, cuaca diprediksi dominan ${dominantCond} dengan suhu kisaran ${minTemp}-${maxTemp}°C dan kelembapan ${minHum}-${maxHum}%, ${rainNote}. #WeatherOutlook #${cleanLocTag}`;
  }, [currentLocationName, forecastDisplayDateStr, rows]);

  const handleCopyNarrative = () => {
    navigator.clipboard.writeText(autoNarrative);
    setCopiedNarrative(true);
    setTimeout(() => setCopiedNarrative(false), 2000);
    toast({
      title: "✓ Teks Tersalin",
      description: "Ringkasan prospek cuaca berhasil disalin ke clipboard.",
    });
  };

  const handleApplyNarrativeToNotes = () => {
    setNotes(autoNarrative);
    toast({
      title: "✓ Disalin ke Catatan",
      description: "Ringkasan cuaca berhasil dimasukkan ke Catatan Prakirawan.",
    });
  };

  const updateRow = (index: number, patch: Partial<ForecastRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        time: "",
        conditionMain: "",
        probMain: "80",
        conditionSub: "",
        probSub: "",
        temperature: "",
        temperatureError: 10,
        humidity: "",
        humidityError: 10,
        heatIndex: "",
        heatIndexError: 12,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Direct Open-Meteo Fallback
  const fetchDirectOpenMeteoFallback = async (
    lat: number,
    lon: number,
    locName: string,
    targetDateStr: string
  ) => {
    const coreModelIds = "ecmwf_ifs,gfs_seamless,icon_seamless,jma_seamless,cma_grapes_global";
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: "temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,precipitation",
      models: coreModelIds,
      timezone: "Asia/Bangkok",
      start_date: targetDateStr,
      end_date: targetDateStr,
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo Direct API status ${res.status}`);

    const fcJson = await res.json();
    if (!fcJson?.hourly?.time) throw new Error("Format respons Open-Meteo tidak valid.");

    const times: string[] = fcJson.hourly.time || [];
    const TARGET_HOURS = ["07:00", "10:00", "13:00", "16:00", "19:00"];
    const usedModels = GLOBAL_NWP_MODELS.filter((m) =>
      ["ecmwf_ifs", "gfs_seamless", "icon_seamless", "jma_seamless", "cma_grapes_global"].includes(m.id)
    );

    const findIndexFor = (targetTime: string): number => {
      const targetPrefix = `${targetDateStr}T${targetTime}`;
      const exactIdx = times.findIndex((t) => t === targetPrefix || t.startsWith(targetPrefix));
      if (exactIdx !== -1) return exactIdx;

      const targetDateTime = new Date(`${targetDateStr}T${targetTime}:00`);
      let bestIdx = -1;
      let bestDiff = Infinity;

      for (let i = 0; i < times.length; i++) {
        const forecastDateTime = new Date(times[i]);
        const forecastDate = times[i].split("T")[0];
        const diff = Math.abs(forecastDateTime.getTime() - targetDateTime.getTime());
        if (diff < bestDiff && forecastDate === targetDateStr) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const outRows = TARGET_HOURS.map((targetTime) => {
      const idx = findIndexFor(targetTime);
      if (idx === -1) {
        return {
          time: targetTime,
          conditionMain: "Berawan" as WeatherCondition,
          probMain: "80",
          conditionSub: "" as WeatherCondition | "",
          probSub: "",
          temperature: "" as number | "",
          temperatureError: 2,
          humidity: "" as number | "",
          humidityError: 5,
          heatIndex: "" as number | "",
          heatIndexError: 2,
          modelPredictions: [],
          votingBreakdown: [],
        };
      }

      const modelPredictions: SingleModelPrediction[] = usedModels
        .map((m) => {
          const rawTemp = fcJson.hourly[`temperature_2m_${m.id}`]?.[idx] ?? fcJson.hourly.temperature_2m?.[idx];
          const rawHum = fcJson.hourly[`relative_humidity_2m_${m.id}`]?.[idx] ?? fcJson.hourly.relative_humidity_2m?.[idx];
          const rawCode = fcJson.hourly[`weather_code_${m.id}`]?.[idx] ?? fcJson.hourly.weather_code?.[idx];
          const rawPrecip = fcJson.hourly[`precipitation_${m.id}`]?.[idx] ?? fcJson.hourly.precipitation?.[idx] ?? 0;
          const rawRainProb = fcJson.hourly[`precipitation_probability_${m.id}`]?.[idx] ?? null;

          const temp = typeof rawTemp === "number" && !isNaN(rawTemp) ? rawTemp : null;
          const hum = typeof rawHum === "number" && !isNaN(rawHum) ? rawHum : null;
          const code = typeof rawCode === "number" && !isNaN(rawCode) ? rawCode : null;
          const precip = typeof rawPrecip === "number" && !isNaN(rawPrecip) ? rawPrecip : 0;
          const rainProb = typeof rawRainProb === "number" && !isNaN(rawRainProb) ? rawRainProb : null;
          const condition = code !== null ? translateModelToCondition(code, precip, rainProb) : null;

          return {
            modelId: m.id,
            modelName: `${m.name} (${m.country})`,
            condition: condition as WeatherCondition,
            temperature: temp,
            humidity: hum,
            precipitation: precip,
            rainProb,
          };
        })
        .filter((p) => p.condition !== null && p.temperature !== null);

      const consensus = calculateMultiModelConsensus(modelPredictions);

      return {
        time: targetTime,
        conditionMain: consensus.conditionMain,
        probMain: consensus.probMain,
        conditionSub: consensus.conditionSub,
        probSub: consensus.probSub,
        temperature: consensus.temperature,
        temperatureError: consensus.temperatureError,
        humidity: consensus.humidity,
        humidityError: consensus.humidityError,
        heatIndex: consensus.heatIndex,
        heatIndexError: consensus.heatIndexError,
        modelPredictions,
        votingBreakdown: consensus.breakdown,
      };
    });

    return {
      success: true,
      location: locName,
      forecastDate: targetDateStr,
      modelsUsed: usedModels,
      rows: outRows,
      isFallback: true,
    };
  };

  const fetchForecast = async (
    isManual = false,
    customLat?: number,
    customLon?: number,
    customLocName?: string
  ) => {
    let lat = customLat ?? selectedCoords.lat;
    let lon = customLon ?? selectedCoords.lon;
    let locationName = customLocName || currentLocationName;

    setLoadingFetch(true);

    try {
      if (customLat === undefined && customLon === undefined && locationName) {
        try {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=id&format=json`
          );
          const geoJson = await geoRes.json();
          if (geoJson.results && geoJson.results.length > 0) {
            const place = geoJson.results[0];
            lat = place.latitude;
            lon = place.longitude;
            locationName = place.name || locationName;
            setSelectedCoords({ lat, lon });
          }
        } catch (geoErr) {
          console.error("Geocoding error:", geoErr);
        }
      }

      if (isManual) {
        toast({
          title: "Menghubungi Server Model...",
          description: `Mengambil konsensus model global untuk ${locationName} (${forecastDisplayDateStr})...`,
        });
      }

      const edgeUrl = `/api/weather/consensus?lat=${lat}&lon=${lon}&location=${encodeURIComponent(locationName)}&date=${targetDateIsoStr}`;
      let data: any = null;
      let isFallback = false;

      try {
        const response = await fetch(edgeUrl);
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        data = await response.json();
        if (!data?.rows || !Array.isArray(data.rows)) {
          throw new Error("Format respon konsensus API tidak valid.");
        }
      } catch (apiErr: any) {
        console.warn("API internal fallback:", apiErr?.message);
        data = await fetchDirectOpenMeteoFallback(lat, lon, locationName, targetDateIsoStr);
        isFallback = true;
      }

      setRows((prev) =>
        prev.map((r, i) => {
          const f = data.rows.find((row: any) => row.time === r.time) || data.rows[i] || {};
          return {
            ...r,
            time: f.time ?? r.time,
            conditionMain: f.conditionMain ? (f.conditionMain as WeatherCondition) : r.conditionMain,
            probMain: f.probMain ?? r.probMain,
            conditionSub: f.conditionSub !== undefined ? (f.conditionSub as WeatherCondition | "") : r.conditionSub,
            probSub: f.probSub !== undefined ? f.probSub : r.probSub,
            temperature: f.temperature !== undefined && f.temperature !== "" ? (f.temperature as number) : r.temperature,
            temperatureError: f.temperatureError !== undefined && f.temperatureError !== "" ? (f.temperatureError as number) : r.temperatureError,
            humidity: f.humidity !== undefined && f.humidity !== "" ? (f.humidity as number) : r.humidity,
            humidityError: f.humidityError !== undefined && f.humidityError !== "" ? (f.humidityError as number) : r.humidityError,
            heatIndex: f.heatIndex !== undefined && f.heatIndex !== "" ? (f.heatIndex as number) : r.heatIndex,
            heatIndexError: f.heatIndexError !== undefined && f.heatIndexError !== "" ? (f.heatIndexError as number) : r.heatIndexError,
          } as ForecastRow;
        })
      );
      setForecastSource(isFallback ? "Multi-Model Consensus (Direct)" : "Multi-Model Consensus");

      setConsensusData({
        location: data.location || locationName,
        forecastDate: data.forecastDate || forecastDisplayDateStr,
        modelsUsed: data.modelsUsed || (GLOBAL_NWP_MODELS as any),
        rows: data.rows,
      });

      if (isManual || isFallback) {
        toast({
          title: isFallback ? "✓ Konsensus Dimuat (Koneksi Langsung)" : "✓ Konsensus Multi-Model Selesai",
          description: `Probabilitas dan parameter cuaca untuk ${forecastDisplayDateStr} berhasil dihitung (${data.modelsUsed?.length || 10} model global).`,
        });
      }
    } catch (err) {
      console.error("fetchForecast error:", err);
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({
        title: "Gagal memuat konsensus cuaca",
        description: `${errorMsg}. Silakan tekan tombol 'Ambil Otomatis' untuk mencoba kembali.`,
        variant: "destructive",
      });
    } finally {
      setLoadingFetch(false);
    }
  };

  React.useEffect(() => {
    if (isEditingHistoryRef.current) {
      isEditingHistoryRef.current = false;
      return;
    }
    fetchForecast(false, selectedCoords.lat, selectedCoords.lon, location);
  }, [targetDateIsoStr]);

  const handleUseCurrentGPS = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({
        title: "GPS Tidak Didukung",
        description: "Browser Anda tidak mendukung Geolocation API.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Mencari Koordinat GPS...",
      description: "Meminta izin lokasi akurat dari perangkat...",
    });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setSelectedCoords({ lat, lon });
        const gpsLabel = `Lokasi Saya (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
        setLocation(gpsLabel);
        toast({
          title: "✓ Koordinat GPS Ditemukan",
          description: `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}. Mengambil konsensus model cuaca...`,
        });
        fetchForecast(true, lat, lon, gpsLabel);
      },
      (err) => {
        console.error("GPS error:", err);
        toast({
          title: "Akses GPS Ditolak",
          description: err.message || "Gagal mendapatkan lokasi dari sensor GPS perangkat.",
          variant: "destructive",
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const onSaveForecast = async () => {
    if (!currentLocationName || currentLocationName.trim() === "") {
      toast({ title: "Error", description: "Pilih lokasi/kota terlebih dahulu.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const forecastData: Omit<Forecast, "id" | "createdAt" | "version"> = {
        deviceId: "custom",
        deviceName: currentLocationName,
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lon,
        forecastDate: targetDateIsoStr,
        forecasterId: user?.uid || "anonymous",
        forecasterName: profile?.displayName || user?.email || "Unknown Forecaster",
        forecastSource: forecastSource,
        engineVersion: APP_CONFIG.version,
        notes: notes,
        status: "published",
        hourlyData: rows.map((r) => ({
          time: r.time,
          conditionMain: r.conditionMain,
          probMain: r.probMain,
          conditionSub: r.conditionSub,
          probSub: r.probSub,
          temperature: r.temperature,
          temperatureError: r.temperatureError,
          humidity: r.humidity,
          humidityError: r.humidityError,
          heatIndex: r.heatIndex,
          heatIndexError: r.heatIndexError,
        })),
      };

      await saveForecast(forecastData);
      toast({
        title: "Berhasil",
        description: `Prakiraan cuaca untuk ${forecastDisplayDateStr} berhasil disimpan ke database.`,
      });
    } catch (error) {
      console.error("Failed to save forecast", error);
      toast({ title: "Gagal", description: "Gagal menyimpan prakiraan cuaca.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onSaveAsImage = async () => {
    if (!printRef.current) return;
    try {
      toast({ title: "Memproses Gambar...", description: "Mohon tunggu..." });
      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = await html2canvas(printRef.current, {
        scale: 4,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        width: 800,
        windowWidth: 1200,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const fileName = `Outlook_${currentLocationName || "Kota"}_${targetDateIsoStr}.png`;

      link.href = image;
      link.download = fileName;
      link.click();

      toast({ title: "Berhasil!", description: "Gambar tersimpan." });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const getInfographicBlob = async (): Promise<{ blob: Blob; fileName: string; canvas: HTMLCanvasElement } | null> => {
    if (!printRef.current) return null;
    const canvas = await html2canvas(printRef.current, {
      scale: 3,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      width: 800,
      windowWidth: 1200,
    });

    const cleanLoc = (currentLocationName || "Kota").replace(/\s+/g, "_");
    const fileName = `Outlook_${cleanLoc}_${targetDateIsoStr}.png`;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ blob, fileName, canvas });
        } else {
          resolve(null);
        }
      }, "image/png");
    });
  };

  const handleShareSocial = async (target: "native" | "whatsapp" | "twitter" | "clipboard" = "native") => {
    if (!printRef.current) return;
    setIsSharing(true);

    try {
      toast({
        title: "Menyiapkan Media...",
        description: "Merender infografis kartu cuaca...",
      });

      await new Promise((resolve) => setTimeout(resolve, 200));
      const result = await getInfographicBlob();

      if (!result) {
        throw new Error("Gagal merender gambar infografis.");
      }

      const { blob, fileName, canvas } = result;
      const file = new File([blob], fileName, { type: "image/png" });

      if (target === "whatsapp") {
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            toast({
              title: "Gambar Tersalin ke Clipboard!",
              description: "Membuka WhatsApp... Tekan Ctrl + V di kolom chat untuk menempelkan gambar.",
            });
          }
        } catch (clipErr) {
          console.warn("Clipboard write failed:", clipErr);
        }
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(autoNarrative)}`;
        window.open(waUrl, "_blank");
        return;
      }

      if (target === "twitter") {
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            toast({
              title: "Gambar Tersalin ke Clipboard!",
              description: "Membuka X (Twitter)... Tekan Ctrl + V untuk melampirkan gambar.",
            });
          }
        } catch (clipErr) {
          console.warn("Clipboard write failed:", clipErr);
        }
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(autoNarrative)}`;
        window.open(tweetUrl, "_blank");
        return;
      }

      if (target === "clipboard") {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          toast({
            title: "✓ Gambar Tersalin ke Clipboard!",
            description: "Gambar infografis siap ditempel (Ctrl + V) di WhatsApp, Telegram, atau Medsos.",
          });
        } else {
          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = fileName;
          link.click();
          toast({
            title: "✓ Gambar Diunduh",
            description: "Browser tidak mengizinkan salin clipboard langsung, berkas telah diunduh.",
          });
        }
        return;
      }

      // Native Share
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Prakiraan Cuaca ${currentLocationName} - ${forecastDisplayDateStr}`,
            text: autoNarrative,
            files: [file],
          });
          toast({
            title: "✓ Berhasil Dibagikan",
            description: "Infografis dan narasi berhasil dikirim ke aplikasi pilihan Anda.",
          });
        } catch (shareErr: any) {
          if (shareErr?.name !== "AbortError") {
            console.error("Share error:", shareErr);
            toast({
              title: "Gagal membagikan",
              description: shareErr?.message || "Terjadi kesalahan.",
              variant: "destructive",
            });
          }
        }
      } else {
        let clipboardOk = false;
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            clipboardOk = true;
          }
        } catch {
          clipboardOk = false;
        }

        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = fileName;
        link.click();

        toast({
          title: clipboardOk ? "✓ Gambar Disalin & Diunduh!" : "✓ Gambar Diunduh",
          description: clipboardOk
            ? "Gambar tersalin di clipboard (siap Ctrl+V di WhatsApp/Twitter/Medsos) dan file PNG telah tersimpan di folder Unduhan."
            : "Berkas infografis berhasil diunduh.",
        });
      }
    } catch (err: any) {
      console.error("Gagal share media sosial:", err);
      toast({
        title: "Gagal",
        description: err?.message || "Terjadi kesalahan saat memproses gambar.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleEditFromHistory = (forecast: Forecast) => {
    isEditingHistoryRef.current = true;
    if (forecast.deviceName) setLocation(forecast.deviceName);
    if (forecast.latitude && forecast.longitude) {
      setSelectedCoords({ lat: forecast.latitude, lon: forecast.longitude });
    }
    if (forecast.forecastSource) setForecastSource(forecast.forecastSource);
    if (forecast.notes !== undefined) setNotes(forecast.notes || "");
    if (forecast.hourlyData && Array.isArray(forecast.hourlyData)) {
      setRows(
        forecast.hourlyData.map((h) => ({
          time: h.time,
          conditionMain: (h.conditionMain as WeatherCondition) || "",
          probMain: h.probMain || "80",
          conditionSub: (h.conditionSub as WeatherCondition) || "",
          probSub: h.probSub || "",
          temperature: h.temperature ?? "",
          temperatureError: h.temperatureError ?? 2,
          humidity: h.humidity ?? "",
          humidityError: h.humidityError ?? 5,
          heatIndex: h.heatIndex ?? "",
          heatIndexError: h.heatIndexError ?? 2,
        }))
      );
    }
    setActiveTab("input");
    toast({
      title: "Prakiraan dimuat ke Editor",
      description: `Data untuk ${forecast.deviceName} (${forecast.forecastDate}) berhasil dimuat ke form input.`,
    });
  };

  const handleCreateNew = () => {
    setRows(
      initialTimes.map((t) => ({
        time: t,
        conditionMain: "",
        probMain: "80",
        conditionSub: "",
        probSub: "",
        temperature: "",
        temperatureError: 2,
        humidity: "",
        humidityError: 5,
        heatIndex: "",
        heatIndexError: 2,
      }))
    );
    setNotes("");
    setLocation("Kebumen");
    setSelectedCoords({ lat: KEBUMEN_LAT, lon: KEBUMEN_LON });
    setActiveTab("input");
    toast({
      title: "Form Baru",
      description: "Form input prakiraan telah direset untuk pembuatan data baru.",
    });
  };

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Forecaster Tools</h1>
          <p className="text-muted-foreground">Buat dan simpan prakiraan cuaca manual</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="input">Input Prakiraan</TabsTrigger>
          <TabsTrigger value="history">Riwayat Prakiraan</TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <ForecastHeaderForm
            location={location}
            selectedCoords={selectedCoords}
            forecastSource={forecastSource}
            targetDateMode={targetDateMode}
            customTargetDate={customTargetDate}
            targetDateIsoStr={targetDateIsoStr}
            forecastDisplayDateStr={forecastDisplayDateStr}
            notes={notes}
            autoNarrative={autoNarrative}
            copiedNarrative={copiedNarrative}
            loadingFetch={loadingFetch}
            saving={saving}
            isSharing={isSharing}
            onLocationSelect={(loc) => {
              setLocation(loc.name);
              setSelectedCoords({ lat: loc.lat, lon: loc.lon });
              toast({
                title: `✓ Lokasi Dipilih: ${loc.name}`,
                description: `Koordinat: ${loc.lat.toFixed(4)}°, ${loc.lon.toFixed(4)}°. Mengambil konsensus model global...`,
              });
              fetchForecast(true, loc.lat, loc.lon, loc.name);
            }}
            onCustomTypedLocation={(customName) => {
              const trimmed = customName.trim();
              if (!trimmed) return;
              setLocation(trimmed);
              fetchForecast(true, undefined, undefined, trimmed);
            }}
            onUseCurrentGPS={handleUseCurrentGPS}
            onForecastSourceChange={setForecastSource}
            onTargetDateModeChange={setTargetDateMode}
            onCustomTargetDateChange={setCustomTargetDate}
            onNotesChange={setNotes}
            onApplyNarrativeToNotes={handleApplyNarrativeToNotes}
            onCopyNarrative={handleCopyNarrative}
            onAddRow={addRow}
            onFetchConsensus={() => fetchForecast(true)}
            onSaveAsImage={onSaveAsImage}
            onShareSocial={handleShareSocial}
            onSaveForecast={onSaveForecast}
          />
        </TabsContent>

        <TabsContent value="history">
          <ForecastHistoryList
            onViewDetail={setSelectedForecast}
            onEditForecast={handleEditFromHistory}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>
      </Tabs>

      <ForecastDetailModal
        forecast={selectedForecast}
        onClose={() => setSelectedForecast(null)}
        onEdit={handleEditFromHistory}
      />

      {/* FORM INPUT TABEL */}
      <ForecastHourlyTable
        rows={rows}
        updateRow={updateRow}
        deleteRow={removeRow}
        setRows={setRows}
      />

      {/* VISUALISASI PROBABILITAS ENSEMBLE MULTI-MODEL */}
      {activeTab === "input" && (
        <div className="mt-5">
          <EnsembleProbabilityChart
            data={consensusData?.rows || null}
            modelsUsed={consensusData?.modelsUsed || (GLOBAL_NWP_MODELS as any)}
            locationName={currentLocationName}
            forecastDateStr={forecastDisplayDateStr}
            isLoading={loadingFetch}
            onRefresh={() => fetchForecast(true)}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* HIDDEN AREA (OUTPUT IMAGE) */}
      <ForecastPrintableCard
        printRef={printRef}
        currentLocationName={currentLocationName}
        tomorrowStr={tomorrowStr}
        currentTimeStr={currentTimeStr}
        rows={rows}
      />
    </div>
  );
}
