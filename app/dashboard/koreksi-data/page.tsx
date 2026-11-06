"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { format, subDays, addDays, startOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useTheme } from "next-themes";
import {
  Wrench,
  AlertTriangle,
  Activity,
  Sliders,
  History,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Database,
  Info,
  Check,
  SlidersHorizontal,
  Flame,
  Droplets,
  Gauge,
  CloudRain,
  Sun,
  Zap,
  Wind,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeaderBanner } from "@/components/ui/PageHeaderBanner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices, Device } from "@/lib/FetchingDevice";
import {
  setStoredActiveSensorId,
  resolveActiveSensorId,
} from "@/lib/activeSensorStorage";
import { fetchSensorDataByDateRange } from "@/lib/apiClient";
import {
  SensorDate,
  BatchSensorFieldUpdate,
  SensorCorrectionAuditLog,
  batchUpdateSensorFields,
  logSensorCorrection,
  fetchSensorCorrectionLogs,
} from "@/lib/FetchingSensorData";
import {
  interpolateTimeLinear,
  interpolateCubicHermite,
  interpolateAkima,
  interpolateModelGuided,
} from "@/lib/meteorologicalInterpolation";
import type { ReferenceGuidePoint } from "@/app/api/weather/reference-guide/route";

// Dynamically import ECharts with SSR disabled for optimal Next.js performance
const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <Skeleton className="h-[380px] w-full rounded-xl" />,
});

// Variable Definitions & Scientific Ranges (WMO Standards)
export interface WeatherVarMeta {
  key: string;
  label: string;
  unit: string;
  icon: React.ElementType;
  wmoMin: number;
  wmoMax: number;
  step: number;
  spikeThreshold: number; // Max realistic change between consecutive timestamps (5-min interval)
  decimals: number;
}

const WEATHER_VARIABLES: WeatherVarMeta[] = [
  {
    key: "temperature",
    label: "Suhu Udara",
    unit: "°C",
    icon: Flame,
    wmoMin: 15.0,
    wmoMax: 45.0,
    step: 0.1,
    spikeThreshold: 3.5,
    decimals: 2,
  },
  {
    key: "humidity",
    label: "Kelembapan Relatif (RH)",
    unit: "%",
    icon: Droplets,
    wmoMin: 0.0,
    wmoMax: 100.0,
    step: 0.5,
    spikeThreshold: 20.0,
    decimals: 1,
  },
  {
    key: "pressure",
    label: "Tekanan Udara",
    unit: "hPa",
    icon: Gauge,
    wmoMin: 850.0,
    wmoMax: 1080.0,
    step: 0.5,
    spikeThreshold: 4.0,
    decimals: 2,
  },
  {
    key: "dew",
    label: "Titik Embun",
    unit: "°C",
    icon: Droplets,
    wmoMin: 10.0,
    wmoMax: 35.0,
    step: 0.1,
    spikeThreshold: 4.0,
    decimals: 2,
  },
  {
    key: "rainfall",
    label: "Curah Hujan",
    unit: "mm",
    icon: CloudRain,
    wmoMin: 0.0,
    wmoMax: 120.0,
    step: 0.2,
    spikeThreshold: 40.0,
    decimals: 2,
  },
  {
    key: "rainrate",
    label: "Laju Hujan",
    unit: "mm/jam",
    icon: CloudRain,
    wmoMin: 0.0,
    wmoMax: 300.0,
    step: 1.0,
    spikeThreshold: 150.0,
    decimals: 2,
  },
  {
    key: "lux",
    label: "Intensitas Radiasi / Lux",
    unit: "lux",
    icon: Sun,
    wmoMin: 0.0,
    wmoMax: 150000.0,
    step: 50.0,
    spikeThreshold: 80000.0,
    decimals: 0,
  },
  {
    key: "soil_temp",
    label: "Suhu Tanah",
    unit: "°C",
    icon: Activity,
    wmoMin: 15.0,
    wmoMax: 45.0,
    step: 0.1,
    spikeThreshold: 3.0,
    decimals: 2,
  },
  {
    key: "volt",
    label: "Tegangan Baterai / Catu Daya",
    unit: "V",
    icon: Zap,
    wmoMin: 2.5,
    wmoMax: 15.0,
    step: 0.05,
    spikeThreshold: 2.0,
    decimals: 2,
  },
  {
    key: "windSpeed",
    label: "Kecepatan Angin",
    unit: "m/s",
    icon: Wind,
    wmoMin: 0.0,
    wmoMax: 50.0,
    step: 0.2,
    spikeThreshold: 15.0,
    decimals: 2,
  },
];

export type CorrectionMethod = "offset" | "drift" | "clamp" | "scale" | "interpolate";
export type InterpolationSubMethod = "model_guided" | "cubic_pchip" | "akima" | "time_linear";

interface AnomalyFlag {
  index: number;
  timestamp: number;
  value: number;
  type: "wmo_boundary" | "spike_jump" | "flatline" | "solar_overheating";
  reason: string;
}

export default function KoreksiDataPage() {
  const { user } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  const isDarkMode = resolvedTheme === "dark" || theme === "dark";

  // Station State
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [selectedStationName, setSelectedStationName] = useState<string>("Stasiun AWS");

  // Parameter State
  const [selectedVarKey, setSelectedVarKey] = useState<string>("temperature");
  const selectedVar = useMemo(() => {
    return WEATHER_VARIABLES.find((v) => v.key === selectedVarKey) || WEATHER_VARIABLES[0];
  }, [selectedVarKey]);

  // Date Range State (Jakarta UTC+7)
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [startDateStr, setStartDateStr] = useState<string>(todayStr);
  const [startTimeStr, setStartTimeStr] = useState<string>("00:00");
  const [endDateStr, setEndDateStr] = useState<string>(todayStr);
  const [endTimeStr, setEndTimeStr] = useState<string>("23:59");

  // Correction Method Configuration
  const [correctionMethod, setCorrectionMethod] = useState<CorrectionMethod>("offset");
  const [offsetValue, setOffsetValue] = useState<number>(0);
  const [driftStart, setDriftStart] = useState<number>(0);
  const [driftEnd, setDriftEnd] = useState<number>(0);
  const [clampMin, setClampMin] = useState<number>(selectedVar.wmoMin);
  const [clampMax, setClampMax] = useState<number>(selectedVar.wmoMax);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(false);

  // Meteorological Interpolation Sub-methods
  const [interpolationSubMethod, setInterpolationSubMethod] = useState<InterpolationSubMethod>("model_guided");

  // Open-Meteo Reference Guide State (ECMWF IFS / ERA5)
  const [showReferenceGuide, setShowReferenceGuide] = useState<boolean>(true);
  const [referenceGuidePoints, setReferenceGuidePoints] = useState<ReferenceGuidePoint[]>([]);
  const [referenceModelName, setReferenceModelName] = useState<string>("ECMWF IFS (9 km Operasional)");
  const [referenceModelType, setReferenceModelType] = useState<"ecmwf_ifs" | "era5">("ecmwf_ifs");
  const [loadingReference, setLoadingReference] = useState<boolean>(false);

  // Data Loading & Operation State
  const [rawRecords, setRawRecords] = useState<SensorDate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [auditNotes, setAuditNotes] = useState<string>("");
  const [auditLogs, setAuditLogs] = useState<SensorCorrectionAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [showOnlyModifiedRows, setShowOnlyModifiedRows] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"workspace" | "audit">("workspace");

  // Continuous lookup helper for reference model values at timestamp ts
  const getModelValAtTimestamp = useCallback(
    (ts: number, varKey: string): number | null => {
      if (referenceGuidePoints.length === 0) return null;

      if (ts <= referenceGuidePoints[0].timestamp) {
        const val = (referenceGuidePoints[0] as any)[varKey];
        return typeof val === "number" && Number.isFinite(val) ? val : null;
      }
      if (ts >= referenceGuidePoints[referenceGuidePoints.length - 1].timestamp) {
        const last = referenceGuidePoints[referenceGuidePoints.length - 1];
        const val = (last as any)[varKey];
        return typeof val === "number" && Number.isFinite(val) ? val : null;
      }

      // Binary search for nearest surrounding hourly points
      let low = 0;
      let high = referenceGuidePoints.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (referenceGuidePoints[mid].timestamp < ts) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      const p0 = referenceGuidePoints[Math.max(0, low - 1)];
      const p1 = referenceGuidePoints[Math.min(referenceGuidePoints.length - 1, low)];
      if (!p0 || !p1) return null;

      const v0 = (p0 as any)[varKey];
      const v1 = (p1 as any)[varKey];
      if (typeof v0 !== "number" || typeof v1 !== "number") {
        return typeof v0 === "number" ? v0 : typeof v1 === "number" ? v1 : null;
      }

      if (p1.timestamp === p0.timestamp) return v0;
      const ratio = (ts - p0.timestamp) / (p1.timestamp - p0.timestamp);
      return v0 + ratio * (v1 - v0);
    },
    [referenceGuidePoints]
  );

  // Fetch Open-Meteo Reference Guide
  const fetchReferenceGuide = useCallback(
    async (
      targetDevice?: Device,
      sDate = startDateStr,
      eDate = endDateStr,
      mType = referenceModelType
    ) => {
      const dev = targetDevice || devices.find((d) => (d.authToken || d.id) === sensorId);
      const lat = dev?.coordinates?.lat ?? -7.7121;
      const lng = dev?.coordinates?.lng ?? 109.6892;

      setLoadingReference(true);
      try {
        const params = new URLSearchParams({
          latitude: lat.toString(),
          longitude: lng.toString(),
          start_date: sDate,
          end_date: eDate,
          model: mType,
        });

        const res = await fetch(`/api/weather/reference-guide?${params.toString()}`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          console.warn("Peringatan pengambilan model penuntun Open-Meteo:", errJson);
          return;
        }

        const data = await res.json();
        if (Array.isArray(data.points)) {
          setReferenceGuidePoints(data.points);
          if (data.modelName) setReferenceModelName(data.modelName);
        }
      } catch (err) {
        console.error("Gagal mengambil data penuntun model cuaca:", err);
      } finally {
        setLoadingReference(false);
      }
    },
    [devices, sensorId, startDateStr, endDateStr, referenceModelType]
  );

  // 1. Initial Load of Devices
  useEffect(() => {
    async function loadDevices() {
      try {
        const fetched = await fetchAllDevices(user?.uid || "");
        setDevices(fetched);
        const options = fetched
          .filter((d) => d.authToken || d.id)
          .map((d) => ({
            label: `${d.name} (${d.location})`,
            value: (d.authToken || d.id) as string,
          }));

        if (options.length > 0) {
          const resolved = resolveActiveSensorId(options);
          setSensorId(resolved);
          const matched = fetched.find((d) => (d.authToken || d.id) === resolved);
          if (matched) setSelectedStationName(`${matched.name} (${matched.location})`);
        }
      } catch (err) {
        console.error("Gagal memuat perangkat:", err);
      }
    }
    loadDevices();
  }, [user]);

  // Update clamp defaults when selected variable changes
  useEffect(() => {
    setClampMin(selectedVar.wmoMin);
    setClampMax(selectedVar.wmoMax);
    setOffsetValue(0);
    setDriftStart(0);
    setDriftEnd(0);
    setScaleFactor(1.0);
  }, [selectedVar]);

  // 2. Fetch Raw Sensor Data for Target Range (Parameterized)
  const fetchDataForRange = useCallback(
    async (
      sDate = startDateStr,
      sTime = startTimeStr,
      eDate = endDateStr,
      eTime = endTimeStr
    ) => {
      if (!sensorId) {
        toast({
          title: "Pilih Sensor",
          description: "Harap pilih stasiun sensor terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        const startMs = new Date(`${sDate}T${sTime}:00+07:00`).getTime();
        const endMs = new Date(`${eDate}T${eTime}:59+07:00`).getTime();

        if (startMs >= endMs) {
          toast({
            title: "Rentang Waktu Salah",
            description: "Waktu mulai harus lebih awal daripada waktu selesai.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Fetch raw uncalibrated data directly from RTDB to show ground reality
        const data = await fetchSensorDataByDateRange(
          sensorId,
          startMs,
          endMs,
          false, // calibration=false (we edit raw database values)
          true,  // forceRefresh
          "raw"  // raw temporal points
        );

        // Sort chronological ascending
        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        setRawRecords(sorted);

        // Concurrently fetch the weather model reference guide
        fetchReferenceGuide(undefined, sDate, eDate, referenceModelType);

        if (sorted.length === 0) {
          toast({
            title: "Data Kosong",
            description: `Tidak ditemukan data sensor pada rentang ${sDate} s/d ${eDate}.`,
          });
        } else {
          toast({
            title: "Data Berhasil Dimuat",
            description: `Berhasil mengambil ${sorted.length} titik observasi raw (${sDate}).`,
          });
        }
      } catch (err: any) {
        console.error("Gagal mengambil data observasi:", err);
        toast({
          title: "Gagal Mengambil Data",
          description: err.message || "Terjadi kesalahan saat menghubungi server.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [sensorId, startDateStr, startTimeStr, endDateStr, endTimeStr, toast, fetchReferenceGuide, referenceModelType]
  );

  const handleFetchData = useCallback(() => {
    return fetchDataForRange(startDateStr, startTimeStr, endDateStr, endTimeStr);
  }, [fetchDataForRange, startDateStr, startTimeStr, endDateStr, endTimeStr]);

  // Load data automatically when sensorId is resolved
  useEffect(() => {
    if (sensorId) {
      handleFetchData();
      loadAuditTrail(sensorId);
    }
  }, [sensorId]);

  // 3. Load Audit Trail
  const loadAuditTrail = async (sid: string) => {
    if (!sid) return;
    try {
      setLoadingAudit(true);
      const logs = await fetchSensorCorrectionLogs(sid, 20);
      setAuditLogs(logs);
    } catch (e) {
      console.warn("Gagal memuat histori audit:", e);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Stepper: Geser 1 Hari ke Belakang (Hari Sebelumnya / H-1)
  const handlePrevDay = useCallback(() => {
    try {
      const current = new Date(`${startDateStr}T00:00:00`);
      const prev = subDays(current, 1);
      const newDateStr = format(prev, "yyyy-MM-dd");

      setStartDateStr(newDateStr);
      setEndDateStr(newDateStr);
      setStartTimeStr("00:00");
      setEndTimeStr("23:59");

      fetchDataForRange(newDateStr, "00:00", newDateStr, "23:59");
    } catch (e) {
      console.error("Gagal geser hari sebelumnya:", e);
    }
  }, [startDateStr, fetchDataForRange]);

  // Stepper: Geser 1 Hari ke Depan (Hari Sesudahnya / H+1)
  const handleNextDay = useCallback(() => {
    try {
      const current = new Date(`${endDateStr}T00:00:00`);
      const next = addDays(current, 1);
      const now = new Date();

      if (startOfDay(next) > startOfDay(now)) {
        toast({
          title: "Batas Waktu Maksimal",
          description: "Tidak dapat bergeser ke hari yang akan datang (masa depan).",
        });
        return;
      }

      const newDateStr = format(next, "yyyy-MM-dd");

      setStartDateStr(newDateStr);
      setEndDateStr(newDateStr);
      setStartTimeStr("00:00");
      setEndTimeStr("23:59");

      fetchDataForRange(newDateStr, "00:00", newDateStr, "23:59");
    } catch (e) {
      console.error("Gagal geser hari sesudahnya:", e);
    }
  }, [endDateStr, fetchDataForRange, toast]);

  // Stepper: Lompat ke Hari Ini
  const handleToday = useCallback(() => {
    const now = new Date();
    const newDateStr = format(now, "yyyy-MM-dd");

    setStartDateStr(newDateStr);
    setEndDateStr(newDateStr);
    setStartTimeStr("00:00");
    setEndTimeStr("23:59");

    fetchDataForRange(newDateStr, "00:00", newDateStr, "23:59");
  }, [fetchDataForRange]);

  // Status apakah tombol Hari Sesudahnya harus di-disable (sudah mencapai hari ini)
  const isNextDayDisabled = useMemo(() => {
    try {
      const currentEnd = new Date(`${endDateStr}T00:00:00`);
      const now = new Date();
      return startOfDay(currentEnd) >= startOfDay(now);
    } catch {
      return false;
    }
  }, [endDateStr]);

  // Quick Preset Handlers with immediate fetch
  const handleApplyPreset = (preset: "today" | "yesterday" | "last3days" | "last7days") => {
    const now = new Date();
    let sDate = format(now, "yyyy-MM-dd");
    let eDate = format(now, "yyyy-MM-dd");

    if (preset === "today") {
      sDate = format(now, "yyyy-MM-dd");
      eDate = format(now, "yyyy-MM-dd");
    } else if (preset === "yesterday") {
      const yest = subDays(now, 1);
      sDate = format(yest, "yyyy-MM-dd");
      eDate = format(yest, "yyyy-MM-dd");
    } else if (preset === "last3days") {
      sDate = format(subDays(now, 2), "yyyy-MM-dd");
      eDate = format(now, "yyyy-MM-dd");
    } else if (preset === "last7days") {
      sDate = format(subDays(now, 6), "yyyy-MM-dd");
      eDate = format(now, "yyyy-MM-dd");
    }

    setStartDateStr(sDate);
    setStartTimeStr("00:00");
    setEndDateStr(eDate);
    setEndTimeStr("23:59");

    fetchDataForRange(sDate, "00:00", eDate, "23:59");
  };

  // Preset Cepat: Anomali Panas Radiasi Matahari (Solar Radiation Shield Overheating)
  const handleApplySolarOverheatingPreset = useCallback(() => {
    setSelectedVarKey("temperature");
    setCorrectionMethod("interpolate");
    setInterpolationSubMethod("model_guided");
    setOnlyAnomalies(true);
    setShowReferenceGuide(true);

    if (referenceGuidePoints.length === 0) {
      fetchReferenceGuide();
    }

    toast({
      title: "Preset Sengatan Radiasi Matahari Diaktifkan",
      description:
        "Suhu udara dialihkan ke mode interpolasi berpenuntun model ECMWF IFS / ERA5 untuk merekonstruksi bias pemanasan shield.",
    });
  }, [referenceGuidePoints.length, fetchReferenceGuide, toast]);

  // 4. Automatic Anomaly Detection (Spikes, Boundary Violations, Frozen, and Solar Overheating)
  const anomalies = useMemo<AnomalyFlag[]>(() => {
    if (rawRecords.length === 0) return [];
    const flags: AnomalyFlag[] = [];
    const varKey = selectedVar.key;

    for (let i = 0; i < rawRecords.length; i++) {
      const rec = rawRecords[i];
      const val = (rec as any)[varKey];

      if (val === null || val === undefined || !Number.isFinite(Number(val))) {
        flags.push({
          index: i,
          timestamp: rec.timestamp,
          value: NaN,
          type: "wmo_boundary",
          reason: "Data hilang / null",
        });
        continue;
      }

      const numVal = Number(val);

      // Check WMO Physical boundaries
      if (numVal < selectedVar.wmoMin || numVal > selectedVar.wmoMax) {
        flags.push({
          index: i,
          timestamp: rec.timestamp,
          value: numVal,
          type: "wmo_boundary",
          reason: `Melebihi batas WMO [${selectedVar.wmoMin} s/d ${selectedVar.wmoMax} ${selectedVar.unit}]`,
        });
        continue;
      }

      // Check Daytime Solar Overheating Bias vs Atmospheric Model (09:00 - 15:30 WIB)
      if (selectedVar.key === "temperature" && referenceGuidePoints.length > 0) {
        const refTemp = getModelValAtTimestamp(rec.timestamp, "temperature");
        if (refTemp !== null) {
          const dLocal = new Date(rec.timestamp);
          const hour = dLocal.getHours();
          if (hour >= 9 && hour <= 16) {
            const diffModel = numVal - refTemp;
            if (diffModel >= 3.5) {
              flags.push({
                index: i,
                timestamp: rec.timestamp,
                value: numVal,
                type: "solar_overheating",
                reason: `Paparan panas radiasi matahari: +${diffModel.toFixed(1)}°C di atas model ambient (${refTemp.toFixed(1)}°C)`,
              });
              continue;
            }
          }
        }
      }

      // Check Abrupt Spike / Step Jump vs previous record
      if (i > 0) {
        const prevVal = Number((rawRecords[i - 1] as any)[varKey]);
        if (Number.isFinite(prevVal)) {
          const delta = Math.abs(numVal - prevVal);
          if (delta > selectedVar.spikeThreshold) {
            flags.push({
              index: i,
              timestamp: rec.timestamp,
              value: numVal,
              type: "spike_jump",
              reason: `Lonjakan drastis Δ=${delta.toFixed(2)} ${selectedVar.unit} (ambang: ${selectedVar.spikeThreshold})`,
            });
            continue;
          }
        }
      }

      // Check Flatline / Frozen sensor (same value for 12+ steps)
      if (i >= 12) {
        let isFlat = true;
        for (let k = 1; k <= 12; k++) {
          if (Number((rawRecords[i - k] as any)[varKey]) !== numVal) {
            isFlat = false;
            break;
          }
        }
        if (isFlat && selectedVar.key !== "rainfall" && selectedVar.key !== "rainrate") {
          flags.push({
            index: i,
            timestamp: rec.timestamp,
            value: numVal,
            type: "flatline",
            reason: "Sensor konstan/macet (flatline 12+ langkah)",
          });
        }
      }
    }

    return flags;
  }, [rawRecords, selectedVar, referenceGuidePoints.length, getModelValAtTimestamp]);

  const anomalyIndexSet = useMemo(() => new Set(anomalies.map((a) => a.index)), [anomalies]);

  // 5. Scientific Batch Correction Calculation (Real-Time Preview)
  const correctedResults = useMemo(() => {
    if (rawRecords.length === 0) return [];
    const varKey = selectedVar.key;
    const n = rawRecords.length;
    const t0 = rawRecords[0].timestamp;
    const t1 = rawRecords[n - 1].timestamp;
    const span = Math.max(1, t1 - t0);

    // Global boundary valid anchors
    let firstValidVal = 0;
    let lastValidVal = 0;
    for (let i = 0; i < n; i++) {
      const v = Number((rawRecords[i] as any)[varKey]);
      if (Number.isFinite(v) && !anomalyIndexSet.has(i)) {
        firstValidVal = v;
        break;
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      const v = Number((rawRecords[i] as any)[varKey]);
      if (Number.isFinite(v) && !anomalyIndexSet.has(i)) {
        lastValidVal = v;
        break;
      }
    }

    return rawRecords.map((rec, idx) => {
      const rawVal = Number((rec as any)[varKey]);
      const isAnomaly = anomalyIndexSet.has(idx);

      // If user selected "Hanya Koreksi Anomali" and this point is clean, keep raw
      if (onlyAnomalies && !isAnomaly) {
        return {
          timestamp: rec.timestamp,
          timestampInSeconds: Math.floor(rec.timestamp / 1000),
          timeFormatted: rec.timeFormatted || format(new Date(rec.timestamp), "HH:mm:ss"),
          dateFormatted: rec.dateFormatted || format(new Date(rec.timestamp), "dd/MM/yyyy HH:mm"),
          rawVal: Number.isFinite(rawVal) ? rawVal : 0,
          correctedVal: Number.isFinite(rawVal) ? rawVal : 0,
          diff: 0,
          isModified: false,
          isAnomaly: false,
        };
      }

      let targetVal = Number.isFinite(rawVal) ? rawVal : firstValidVal;

      switch (correctionMethod) {
        case "offset": {
          // y'(t) = y(t) + delta (Steckler et al., 2025; Kirkwood et al., 2022)
          targetVal = targetVal + offsetValue;
          break;
        }
        case "drift": {
          // Time-dependent linear drift: delta(t) = delta0 + ((t - t0)/(t1 - t0))*(delta1 - delta0)
          // (Wang et al., 2017 IEEE Sensors J.; Talukder et al., 2022)
          const alpha = Math.min(1, Math.max(0, (rec.timestamp - t0) / span));
          const currentDrift = driftStart + alpha * (driftEnd - driftStart);
          targetVal = targetVal + currentDrift;
          break;
        }
        case "clamp": {
          // Physical Clamping: [wmoMin, wmoMax] (WMO-No. 8)
          targetVal = Math.min(clampMax, Math.max(clampMin, targetVal));
          break;
        }
        case "scale": {
          // Multiplicative sensitivity scaling: y'(t) = k * y(t)
          targetVal = targetVal * scaleFactor;
          break;
        }
        case "interpolate": {
          // Determine the nearest clean anchor points surrounding this timestamp
          let tAnchor0 = t0;
          let yAnchor0 = firstValidVal;
          let tAnchor1 = t1;
          let yAnchor1 = lastValidVal;

          if (onlyAnomalies) {
            // Find closest preceding valid point
            for (let k = idx - 1; k >= 0; k--) {
              const v = Number((rawRecords[k] as any)[varKey]);
              if (Number.isFinite(v) && !anomalyIndexSet.has(k)) {
                tAnchor0 = rawRecords[k].timestamp;
                yAnchor0 = v;
                break;
              }
            }
            // Find closest succeeding valid point
            for (let k = idx + 1; k < n; k++) {
              const v = Number((rawRecords[k] as any)[varKey]);
              if (Number.isFinite(v) && !anomalyIndexSet.has(k)) {
                tAnchor1 = rawRecords[k].timestamp;
                yAnchor1 = v;
                break;
              }
            }
          }

          // Execute selected meteorological interpolation algorithm
          if (interpolationSubMethod === "model_guided") {
            targetVal = interpolateModelGuided(
              rec.timestamp,
              tAnchor0,
              yAnchor0,
              tAnchor1,
              yAnchor1,
              (ts) => getModelValAtTimestamp(ts, varKey)
            );
          } else if (interpolationSubMethod === "cubic_pchip") {
            targetVal = interpolateCubicHermite(
              rec.timestamp,
              tAnchor0,
              yAnchor0,
              tAnchor1,
              yAnchor1
            );
          } else if (interpolationSubMethod === "akima") {
            targetVal = interpolateAkima(
              rec.timestamp,
              tAnchor0,
              yAnchor0,
              tAnchor1,
              yAnchor1
            );
          } else {
            // time_linear
            targetVal = interpolateTimeLinear(
              rec.timestamp,
              tAnchor0,
              yAnchor0,
              tAnchor1,
              yAnchor1
            );
          }
          break;
        }
      }

      // Hard Meteorological Invariant: RH clamped strictly between 0% and 100%
      if (selectedVar.key === "humidity") {
        targetVal = Math.min(100, Math.max(0, targetVal));
      }
      // Non-negative precipitation & radiation
      if (
        selectedVar.key === "rainfall" ||
        selectedVar.key === "rainrate" ||
        selectedVar.key === "lux" ||
        selectedVar.key === "volt"
      ) {
        targetVal = Math.max(0, targetVal);
      }

      // Rounding to designated decimals
      const roundedVal = Number(targetVal.toFixed(selectedVar.decimals));
      const diff = Number.isFinite(rawVal) ? roundedVal - rawVal : roundedVal;
      const isModified = Math.abs(diff) > 0.0001;

      return {
        timestamp: rec.timestamp,
        timestampInSeconds: Math.floor(rec.timestamp / 1000),
        timeFormatted: rec.timeFormatted || format(new Date(rec.timestamp), "HH:mm:ss"),
        dateFormatted: rec.dateFormatted || format(new Date(rec.timestamp), "dd/MM/yyyy HH:mm"),
        rawVal: Number.isFinite(rawVal) ? rawVal : 0,
        correctedVal: roundedVal,
        diff: Number(diff.toFixed(selectedVar.decimals)),
        isModified,
        isAnomaly,
      };
    });
  }, [
    rawRecords,
    selectedVar,
    correctionMethod,
    offsetValue,
    driftStart,
    driftEnd,
    clampMin,
    clampMax,
    scaleFactor,
    onlyAnomalies,
    anomalyIndexSet,
    interpolationSubMethod,
    getModelValAtTimestamp,
  ]);

  // Modified items count
  const modifiedItems = useMemo(() => {
    return correctedResults.filter((r) => r.isModified);
  }, [correctedResults]);

  // Reference Guide Series for ECharts
  const refSeries = useMemo(() => {
    if (!showReferenceGuide || referenceGuidePoints.length === 0) return [];
    return correctedResults.map((r) => {
      const v = getModelValAtTimestamp(r.timestamp, selectedVar.key);
      return v != null ? Number(v.toFixed(selectedVar.decimals)) : null;
    });
  }, [showReferenceGuide, referenceGuidePoints, correctedResults, selectedVar, getModelValAtTimestamp]);

  // 6. ECharts Configuration for Before vs After Preview
  const chartOptions = useMemo(() => {
    if (correctedResults.length === 0) return {};

    const timeLabels = correctedResults.map((r) => {
      const d = new Date(r.timestamp);
      return `${format(d, "dd MMM HH:mm", { locale: localeId })}`;
    });

    const rawSeries = correctedResults.map((r) => r.rawVal);
    const corrSeries = correctedResults.map((r) => r.correctedVal);

    // Kalkulasi nilai batas sumbu Y berbasis data aktual (BUKAN 0!)
    const validRefVals = (showReferenceGuide && refSeries.length > 0)
      ? refSeries.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
      : [];

    const allVals = [
      ...rawSeries,
      ...corrSeries,
      ...validRefVals,
    ].filter((v) => typeof v === "number" && Number.isFinite(v));

    let yMin: number | undefined = undefined;
    let yMax: number | undefined = undefined;

    if (allVals.length > 0) {
      const minVal = Math.min(...allVals);
      const maxVal = Math.max(...allVals);

      if (selectedVar.key === "rainfall" || selectedVar.key === "rainrate") {
        yMin = 0;
        yMax = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 10;
      } else if (selectedVar.key === "humidity") {
        yMin = Math.max(0, Math.floor(minVal));
        yMax = Math.min(100, Math.ceil(maxVal));
      } else if (selectedVar.key === "windSpeed") {
        yMin = Math.max(0, Math.floor(minVal));
        yMax = Math.ceil(maxVal);
      } else {
        // Suhu, Tekanan, Titik Embun, Suhu Tanah, Tegangan, Lux:
        // WAJIB data-driven: nilai minimum adalah nilai minimum data aktual, BUKAN 0!
        yMin = Math.floor(minVal);
        yMax = Math.ceil(maxVal);
      }

      if (yMin === yMax) {
        yMin = yMin - 1;
        yMax = yMax + 1;
      }
    }

    // Visual mark points for anomalies
    const markPointData = anomalies.map((a) => ({
      name: a.reason,
      coord: [a.index, a.value],
      value: a.type === "wmo_boundary" ? "WMO Limit" : a.type === "solar_overheating" ? "Panas Matahari" : "Spike",
      itemStyle: { color: a.type === "solar_overheating" ? "#F59E0B" : "#EF4444" },
    }));

    const seriesList: any[] = [
      {
        name: "Observasi Mentah (Sebelum)",
        type: "line",
        data: rawSeries,
        showSymbol: correctedResults.length < 50,
        symbolSize: 4,
        lineStyle: {
          color: "#F43F5E",
          width: 2,
          type: "dashed",
        },
        itemStyle: { color: "#F43F5E" },
        markPoint: markPointData.length > 0 ? { data: markPointData } : undefined,
        z: 5,
      },
      {
        name: "Hasil Koreksi (Sesudah)",
        type: "line",
        data: corrSeries,
        showSymbol: correctedResults.length < 50,
        symbolSize: 5,
        lineStyle: {
          color: "#10B981",
          width: 3,
          type: "solid",
        },
        itemStyle: { color: "#10B981" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16, 185, 129, 0.18)" },
              { offset: 1, color: "rgba(16, 185, 129, 0.0)" },
            ],
          },
        },
        z: 10,
      },
    ];

    if (showReferenceGuide && refSeries.length > 0) {
      seriesList.push({
        name: `Penuntun Model (${referenceModelName})`,
        type: "line",
        data: refSeries,
        showSymbol: false,
        lineStyle: {
          color: "#06B6D4",
          width: 2,
          type: "dashed",
        },
        itemStyle: { color: "#06B6D4" },
        z: 4,
      });
    }

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.96)",
        borderColor: isDarkMode ? "#334155" : "#E2E8F0",
        borderWidth: 1,
        textStyle: {
          color: isDarkMode ? "#F8FAFC" : "#0F172A",
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const idx = params[0].dataIndex;
          const item = correctedResults[idx];
          if (!item) return "";

          let html = `<div class="font-semibold text-xs mb-1.5">${item.dateFormatted}</div>`;
          html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
            <span class="flex items-center gap-1.5 text-rose-500 font-medium">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span> Observasi Raw (Sebelum)
            </span>
            <span class="font-mono font-semibold">${item.rawVal} ${selectedVar.unit}</span>
          </div>`;
          html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
            <span class="flex items-center gap-1.5 text-emerald-500 font-medium">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Hasil Koreksi (Sesudah)
            </span>
            <span class="font-mono font-semibold">${item.correctedVal} ${selectedVar.unit}</span>
          </div>`;

          if (showReferenceGuide && refSeries[idx] != null) {
            html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
              <span class="flex items-center gap-1.5 text-cyan-500 font-medium">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Penuntun Model (${referenceModelName.split(" ")[0]})
              </span>
              <span class="font-mono font-semibold">${refSeries[idx]} ${selectedVar.unit}</span>
            </div>`;
          }

          const diffSign = item.diff > 0 ? `+${item.diff}` : `${item.diff}`;
          const diffColor = item.diff === 0 ? "text-slate-400" : item.diff > 0 ? "text-amber-500" : "text-sky-500";
          html += `<div class="flex items-center justify-between gap-4 text-xs pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-800">
            <span class="text-slate-500 dark:text-slate-400">Selisih Penyesuaian (Δ)</span>
            <span class="font-mono font-bold ${diffColor}">${diffSign} ${selectedVar.unit}</span>
          </div>`;

          if (item.isAnomaly) {
            const anom = anomalies.find((a) => a.index === idx);
            if (anom) {
              const bgClass = anom.type === "solar_overheating" ? "text-amber-500 bg-amber-500/10" : "text-red-500 bg-red-500/10";
              html += `<div class="mt-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${bgClass}">
                ⚠ Anomali: ${anom.reason}
              </div>`;
            }
          }

          return html;
        },
      },
      legend: {
        top: 8,
        right: 16,
        textStyle: {
          color: isDarkMode ? "#94A3B8" : "#475569",
          fontSize: 12,
        },
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "8%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: timeLabels,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#CBD5E1" } },
        axisLabel: {
          color: isDarkMode ? "#94A3B8" : "#64748B",
          fontSize: 11,
          interval: Math.max(1, Math.floor(timeLabels.length / 8)),
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        min: yMin,
        max: yMax,
        name: `${selectedVar.label} (${selectedVar.unit})`,
        nameTextStyle: {
          color: isDarkMode ? "#94A3B8" : "#64748B",
          fontSize: 12,
          padding: [0, 0, 8, 0],
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode ? "rgba(51, 65, 85, 0.4)" : "rgba(226, 232, 240, 0.8)",
            type: "dashed",
          },
        },
        axisLabel: {
          color: isDarkMode ? "#94A3B8" : "#64748B",
          fontSize: 11,
        },
      },
      series: seriesList,
      toolbox: {
        show: true,
        right: 16,
        bottom: 8,
        iconStyle: { borderColor: isDarkMode ? "#94A3B8" : "#64748B" },
        feature: {
          dataZoom: { yAxisIndex: "none", title: { zoom: "Zoom Area", back: "Reset Zoom" } },
          restore: { title: "Reset View" },
          saveAsImage: { title: "Simpan Gambar (PNG)", pixelRatio: 2 },
        },
      },
    };
  }, [correctedResults, anomalies, selectedVar, isDarkMode, showReferenceGuide, refSeries, referenceModelName]);

  // Impact summary statistics
  const stats = useMemo(() => {
    if (correctedResults.length === 0) return null;
    const rawVals = correctedResults.map((r) => r.rawVal);
    const corrVals = correctedResults.map((r) => r.correctedVal);

    const count = rawVals.length;
    const modifiedCount = modifiedItems.length;

    const rawMean = rawVals.reduce((a, b) => a + b, 0) / count;
    const corrMean = corrVals.reduce((a, b) => a + b, 0) / count;

    const rawStd = Math.sqrt(
      rawVals.map((x) => Math.pow(x - rawMean, 2)).reduce((a, b) => a + b, 0) / count
    );
    const corrStd = Math.sqrt(
      corrVals.map((x) => Math.pow(x - corrMean, 2)).reduce((a, b) => a + b, 0) / count
    );

    return {
      count,
      modifiedCount,
      modifiedPercent: ((modifiedCount / count) * 100).toFixed(1),
      rawMean: rawMean.toFixed(selectedVar.decimals),
      corrMean: corrMean.toFixed(selectedVar.decimals),
      rawStd: rawStd.toFixed(selectedVar.decimals),
      corrStd: corrStd.toFixed(selectedVar.decimals),
      corrMin: Math.min(...corrVals).toFixed(selectedVar.decimals),
      corrMax: Math.max(...corrVals).toFixed(selectedVar.decimals),
    };
  }, [correctedResults, modifiedItems, selectedVar]);

  // 7. Apply Batch Correction to RTDB
  const handleApplyBatchCorrection = async () => {
    if (modifiedItems.length === 0) {
      toast({
        title: "Tidak Ada Perubahan",
        description: "Nilai koreksi identik dengan data asli. Tidak ada titik yang perlu diperbarui.",
      });
      setShowConfirmModal(false);
      return;
    }

    try {
      setIsApplying(true);
      const updates: BatchSensorFieldUpdate[] = modifiedItems.map((item) => ({
        timestampInSeconds: item.timestampInSeconds,
        field: selectedVar.key,
        newValue: item.correctedVal,
      }));

      // 1. Eksekusi batch updates ke RTDB
      const updatedCount = await batchUpdateSensorFields(sensorId, updates);

      // 2. Simpan rekaman audit trail
      const auditLog: SensorCorrectionAuditLog = {
        timestamp: Date.now(),
        sensorId,
        field: selectedVar.key,
        method: correctionMethod,
        parameters: {
          offsetValue: correctionMethod === "offset" ? offsetValue : undefined,
          driftStart: correctionMethod === "drift" ? driftStart : undefined,
          driftEnd: correctionMethod === "drift" ? driftEnd : undefined,
          clampMin: correctionMethod === "clamp" ? clampMin : undefined,
          clampMax: correctionMethod === "clamp" ? clampMax : undefined,
          scaleFactor: correctionMethod === "scale" ? scaleFactor : undefined,
          interpolationSubMethod: correctionMethod === "interpolate" ? interpolationSubMethod : undefined,
          referenceModel:
            correctionMethod === "interpolate" && interpolationSubMethod === "model_guided"
              ? referenceModelName
              : undefined,
          onlyAnomalies,
        },
        range: {
          start: new Date(`${startDateStr}T${startTimeStr}:00+07:00`).getTime(),
          end: new Date(`${endDateStr}T${endTimeStr}:59+07:00`).getTime(),
          startDateFormatted: `${startDateStr} ${startTimeStr} WIB`,
          endDateFormatted: `${endDateStr} ${endTimeStr} WIB`,
        },
        pointCount: updatedCount,
        notes: auditNotes.trim() || undefined,
        appliedBy: user?.email || user?.displayName || "Admin",
        appliedAt: format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: localeId }) + " WIB",
      };

      await logSensorCorrection(auditLog);

      toast({
        title: "Koreksi Berhasil Diterapkan!",
        description: `${updatedCount} titik data untuk ${selectedVar.label} berhasil diperbarui di database.`,
      });

      setShowConfirmModal(false);
      setAuditNotes("");

      // Refresh data
      await handleFetchData();
      await loadAuditTrail(sensorId);
    } catch (err: any) {
      console.error("Gagal menerapkan koreksi batch:", err);
      toast({
        title: "Gagal Menerapkan Koreksi",
        description: err.message || "Terjadi kesalahan saat menulis ke basis data.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Standard Header Banner */}
      <PageHeaderBanner
        gradient="indigo"
        icon={Wrench}
        title="Koreksi Data & Kontrol Kualitas (QC)"
        subtitle="Pembersihan anomali, eliminasi sensor drift, rekonstruksi radiasi matahari berpenuntun ECMWF IFS / ERA5, dan standar WMO No. 8"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchData}
              disabled={loading}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Muat Ulang
            </Button>
          </div>
        }
      />

      {/* 2. Top Station & Navigation Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Station Selector */}
            <div className="md:col-span-4 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-indigo-500" /> Stasiun Sensor AWS
              </Label>
              <Select
                value={sensorId}
                onValueChange={(val) => {
                  setSensorId(val);
                  const matched = devices.find((d) => (d.authToken || d.id) === val);
                  if (matched) {
                    setSelectedStationName(`${matched.name} (${matched.location})`);
                    setStoredActiveSensorId(val, { label: matched.name });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Stasiun Sensor" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => {
                    const devVal = (device.authToken || device.id) as string;
                    return (
                      <SelectItem key={device.id} value={devVal}>
                        {device.name} ({device.location})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Parameter Selector */}
            <div className="md:col-span-4 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-500" /> Parameter Cuaca Target
              </Label>
              <Select value={selectedVarKey} onValueChange={setSelectedVarKey}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Parameter" />
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_VARIABLES.map((v) => {
                    const IconComp = v.icon;
                    return (
                      <SelectItem key={v.key} value={v.key}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4 text-slate-500" />
                          <span>{v.label} ({v.unit})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Preset Buttons */}
            <div className="md:col-span-4 flex flex-col justify-end space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Preset Rentang Cepat
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 px-2"
                  onClick={() => handleApplyPreset("today")}
                >
                  Hari Ini
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 px-2"
                  onClick={() => handleApplyPreset("yesterday")}
                >
                  Kemarin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 px-2"
                  onClick={() => handleApplyPreset("last3days")}
                >
                  3 Hari
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 px-2"
                  onClick={() => handleApplyPreset("last7days")}
                >
                  7 Hari
                </Button>
              </div>
            </div>
          </div>

          {/* Stepper Bar: Tombol Geser Hari Sebelumnya & Hari Sesudahnya */}
          <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Periode Target Observasi Koreksi
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40">
                    {startDateStr === endDateStr ? "24 Jam Penuh" : "Rentang Multi-Hari"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                    {startDateStr === endDateStr
                      ? format(new Date(`${startDateStr}T00:00:00`), "EEEE, dd MMMM yyyy", { locale: localeId })
                      : `${format(new Date(`${startDateStr}T00:00:00`), "dd MMM yyyy", { locale: localeId })} – ${format(new Date(`${endDateStr}T00:00:00`), "dd MMM yyyy", { locale: localeId })}`}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({startTimeStr} - {endTimeStr} WIB)
                  </span>
                </div>
              </div>
            </div>

            {/* Tombol Geser Hari Sebelumnya & Hari Sesudahnya */}
            <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevDay}
                disabled={loading}
                title="Geser Mundur 1 Hari (Hari Sebelumnya)"
                className="h-8 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 gap-1 shadow-2xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Hari Sebelumnya
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDay}
                disabled={loading || isNextDayDisabled}
                title="Geser Maju 1 Hari (Hari Sesudahnya)"
                className="h-8 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 gap-1 shadow-2xs disabled:opacity-40"
              >
                Hari Sesudahnya
                <ChevronRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                disabled={loading}
                title="Lompat ke Hari Ini"
                className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 gap-1 shadow-2xs"
              >
                <RotateCcw className="h-3 w-3" />
                Hari Ini
              </Button>
            </div>
          </div>

          {/* Granular Date & Time Selection */}
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Tanggal Mulai (WIB)</Label>
              <Input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Jam Mulai</Label>
              <Input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Tanggal Selesai (WIB)</Label>
              <Input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Jam Selesai</Label>
              <Input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Button
                className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                onClick={handleFetchData}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Memuat...
                  </>
                ) : (
                  <>
                    <Database className="h-3.5 w-3.5 mr-1.5" /> Ambil Data Target
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs Navigation (2 Tabs: Workspace Koreksi & Riwayat Audit) */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList variant="line" className="w-full justify-start border-b mb-4">
          <TabsTrigger value="workspace" className="text-xs flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Area Koreksi
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Riwayat Audit ({auditLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: WORKSPACE KOREKSI ================= */}
        <TabsContent value="workspace" className="space-y-6 mt-4">
          {/* Anomaly Detection Banner if detected */}
          {anomalies.length > 0 && (
            <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-sm font-semibold flex items-center justify-between">
                <span>
                  Terdeteksi {anomalies.length} Titik Anomali Meteorologi pada Parameter {selectedVar.label}
                </span>
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px]">
                  QC Flag Aktif
                </Badge>
              </AlertTitle>
              <AlertDescription className="text-xs mt-1.5 space-y-2">
                <p>
                  Sistem otomatis mendeteksi titik yang melanggar batas fisik WMO, mengalami lonjakan ekstrem (spike jump),
                  sensor macet (flatline), atau lonjakan suhu akibat paparan radiasi panas matahari siang hari.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20"
                    onClick={() => {
                      setCorrectionMethod("clamp");
                      setOnlyAnomalies(true);
                      toast({
                        title: "Metode Clamping Dipilih",
                        description: "Koreksi disetel untuk menjepit nilai anomali ke rentang batas WMO.",
                      });
                    }}
                  >
                    Jepit Nilai ke Batas WMO
                  </Button>
                  {selectedVar.key === "temperature" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-semibold"
                      onClick={handleApplySolarOverheatingPreset}
                    >
                      <Sun className="h-3.5 w-3.5 mr-1 text-amber-500" />
                      Koreksi Radiasi Panas Matahari (ECMWF IFS Guide)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20"
                    onClick={() => {
                      setCorrectionMethod("interpolate");
                      setInterpolationSubMethod("cubic_pchip");
                      setOnlyAnomalies(true);
                      toast({
                        title: "Interpolasi PCHIP Dipilih",
                        description: "Titik anomali akan direkonstruksi mulus bebas overshoot.",
                      });
                    }}
                  >
                    Rekonstruksi Kubik PCHIP
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Method Selection Panel */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-5 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-indigo-500" />
                    Pilih Formula & Metode Koreksi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Metode matematis untuk menyelaraskan bias sensor ke standar fisik meteorologi
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Switch
                    id="onlyAnomaliesSwitch"
                    checked={onlyAnomalies}
                    onCheckedChange={setOnlyAnomalies}
                  />
                  <Label htmlFor="onlyAnomaliesSwitch" className="text-xs font-medium cursor-pointer">
                    Hanya Koreksi Titik Anomali ({anomalies.length} Terdeteksi)
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Radio-like Methods Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  {
                    id: "offset",
                    title: "Offset Tetap (Δ)",
                    desc: "Penambahan/pengurangan seragam",
                    icon: SlidersHorizontal,
                  },
                  {
                    id: "drift",
                    title: "Pergeseran Linier",
                    desc: "Koreksi drift seiring waktu",
                    icon: Activity,
                  },
                  {
                    id: "clamp",
                    title: "Batas Fisik (Clamp)",
                    desc: "Penjepitan batas WMO",
                    icon: ShieldAlert,
                  },
                  {
                    id: "scale",
                    title: "Faktor Skala (k)",
                    desc: "Pengali rasio sensitivitas",
                    icon: Activity,
                  },
                  {
                    id: "interpolate",
                    title: "Interpolasi Celah & Model",
                    desc: "ECMWF / PCHIP / Akima / Linier",
                    icon: Sparkles,
                  },
                ].map((m) => {
                  const IconComp = m.icon;
                  const isActive = correctionMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCorrectionMethod(m.id as CorrectionMethod)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <IconComp className={`h-4 w-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                        <span className={`text-xs font-semibold ${isActive ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}>
                          {m.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{m.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Sub-panel Parameter Input Based on Method */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80">
                {/* 1. Offset Tetap */}
                {correctionMethod === "offset" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Nilai Offset Penyesuaian (Δ): {offsetValue > 0 ? `+${offsetValue}` : offsetValue} {selectedVar.unit}
                      </Label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Formula: y&apos;(t) = y(t) + Δ
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        step={selectedVar.step}
                        value={offsetValue}
                        onChange={(e) => setOffsetValue(parseFloat(e.target.value) || 0)}
                        className="w-32 h-9 text-xs"
                      />
                      <input
                        type="range"
                        min={-10 * selectedVar.step * 10}
                        max={10 * selectedVar.step * 10}
                        step={selectedVar.step}
                        value={offsetValue}
                        onChange={(e) => setOffsetValue(parseFloat(e.target.value) || 0)}
                        className="flex-1 accent-indigo-600 cursor-pointer"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-9"
                        onClick={() => setOffsetValue(0)}
                      >
                        Reset 0
                      </Button>
                    </div>
                  </div>
                )}

                {/* 2. Linear Drift */}
                {correctionMethod === "drift" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Parameter Sensor Drift Linier Sepanjang Rentang Waktu
                      </Label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Formula: Δ(t) = δ₀ + ((t - t₀)/(t₁ - t₀)) × (δ₁ - δ₀)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-slate-500">
                          Offset Awal Rentang (δ₀): {driftStart > 0 ? `+${driftStart}` : driftStart} {selectedVar.unit}
                        </Label>
                        <Input
                          type="number"
                          step={selectedVar.step}
                          value={driftStart}
                          onChange={(e) => setDriftStart(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-slate-500">
                          Offset Akhir Rentang (δ₁): {driftEnd > 0 ? `+${driftEnd}` : driftEnd} {selectedVar.unit}
                        </Label>
                        <Input
                          type="number"
                          step={selectedVar.step}
                          value={driftEnd}
                          onChange={(e) => setDriftEnd(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Clamp WMO */}
                {correctionMethod === "clamp" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Batas Penjepitan Fisik (WMO No. 8 Physical Clamping)
                      </Label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Formula: y&apos;(t) = min(Max, max(Min, y(t)))
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-slate-500">
                          Batas Bawah Fisik (Min):
                        </Label>
                        <Input
                          type="number"
                          step={selectedVar.step}
                          value={clampMin}
                          onChange={(e) => setClampMin(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-slate-500">
                          Batas Atas Fisik (Max):
                        </Label>
                        <Input
                          type="number"
                          step={selectedVar.step}
                          value={clampMax}
                          onChange={(e) => setClampMax(parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Multiplicative Scaling Factor */}
                {correctionMethod === "scale" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Faktor Pengali Sensitivitas Sensor (k): {scaleFactor.toFixed(3)}x
                      </Label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Formula: y&apos;(t) = k × y(t)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        step={0.01}
                        value={scaleFactor}
                        onChange={(e) => setScaleFactor(parseFloat(e.target.value) || 1.0)}
                        className="w-32 h-9 text-xs"
                      />
                      <input
                        type="range"
                        min={0.5}
                        max={1.5}
                        step={0.005}
                        value={scaleFactor}
                        onChange={(e) => setScaleFactor(parseFloat(e.target.value) || 1.0)}
                        className="flex-1 accent-indigo-600 cursor-pointer"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-9"
                        onClick={() => setScaleFactor(1.0)}
                      >
                        Reset 1.0
                      </Button>
                    </div>
                  </div>
                )}

                {/* 5. Meteorological Interpolation & Weather Model Guide */}
                {correctionMethod === "interpolate" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          Metode Rekonstruksi & Interpolasi Meteorologi
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Pilih algoritma interpolasi fisik untuk rekonstruksi celah data, lonjakan, atau anomali radiasi matahari.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleApplySolarOverheatingPreset}
                          className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold gap-1.5 h-8"
                        >
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          Preset: Koreksi Radiasi Panas Matahari
                        </Button>
                      </div>
                    </div>

                    {/* Radio/Card Grid for 4 Sub-methods */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {/* 1. Model Guided */}
                      <button
                        type="button"
                        onClick={() => setInterpolationSubMethod("model_guided")}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          interpolationSubMethod === "model_guided"
                            ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/30 ring-1 ring-cyan-500"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-cyan-700 dark:text-cyan-300 mb-1">
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          Penuntun Model Cuaca
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          ECMWF IFS / ERA5 Open-Meteo. Rekonstruksi kurva diurnal alami saat sensor terpapar sengatan panas matahari.
                        </div>
                      </button>

                      {/* 2. Cubic Hermite PCHIP */}
                      <button
                        type="button"
                        onClick={() => setInterpolationSubMethod("cubic_pchip")}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          interpolationSubMethod === "cubic_pchip"
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-700 dark:text-indigo-300 mb-1">
                          <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                          Kubik Monoton (PCHIP)
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          Standar WMO No. 8. Kurva kubik mulus yang dijamin bebas osilasi palsu (Runge&apos;s overshoot).
                        </div>
                      </button>

                      {/* 3. Akima Sub-Spline */}
                      <button
                        type="button"
                        onClick={() => setInterpolationSubMethod("akima")}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          interpolationSubMethod === "akima"
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-700 dark:text-emerald-300 mb-1">
                          <Activity className="h-3.5 w-3.5 text-emerald-500" />
                          Akima Sub-Spline
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          Pembobotan gradien 5-titik Hiroshi Akima. Sangat stabil saat terjadi front dingin atau perubahan tajam mendadak.
                        </div>
                      </button>

                      {/* 4. Time-Weighted Linear */}
                      <button
                        type="button"
                        onClick={() => setInterpolationSubMethod("time_linear")}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          interpolationSubMethod === "time_linear"
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-500"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-purple-700 dark:text-purple-300 mb-1">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-purple-500" />
                          Linier Berbobot Waktu
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          Interpolasi linier dengan pembobotan delta waktu presisi milidetik untuk interval data tidak seragam.
                        </div>
                      </button>
                    </div>

                    {/* Detail Info for Current Sub-method */}
                    {interpolationSubMethod === "model_guided" && (
                      <div className="p-3 rounded-lg bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="font-semibold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                            Penuntun Model Aktif: {referenceModelName}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Nilai anomali dihitung dengan mengadaptasi fluktuasi diurnal model atmosfer terhadap titik valid awal dan akhir.
                            {referenceGuidePoints.length > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                                ✓ {referenceGuidePoints.length} titik model penuntun siap digunakan.
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">
                                ⚠ Data penuntun belum dimuat. Klik tombol &quot;Muat Penuntun Cuaca&quot;.
                              </span>
                            )}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => fetchReferenceGuide()}
                          disabled={loadingReference}
                          className="text-xs h-8 border-cyan-300 dark:border-cyan-700 hover:bg-cyan-100/50"
                        >
                          {loadingReference ? (
                            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          Muat Ulang Model
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Before vs After Interactive Visualizer */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Pratinjau Visual: Sebelum vs Sesudah Koreksi (Non-Destructive Live Preview)
                </CardTitle>
                <CardDescription className="text-xs">
                  Garis merah dashed = Data Mentah saat ini di database | Garis hijau solid = Hasil proyeksi koreksi
                  {showReferenceGuide && referenceGuidePoints.length > 0 && " | Garis cyan dashed = Penuntun Model Cuaca"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Switch
                    id="toggle-ref-guide"
                    checked={showReferenceGuide}
                    onCheckedChange={setShowReferenceGuide}
                  />
                  <Label htmlFor="toggle-ref-guide" className="text-xs font-medium cursor-pointer text-cyan-600 dark:text-cyan-400">
                    Penuntun Model ({referenceModelType === "ecmwf_ifs" ? "ECMWF IFS" : "ERA5"})
                  </Label>
                </div>
                <Select
                  value={referenceModelType}
                  onValueChange={(val: "ecmwf_ifs" | "era5") => {
                    setReferenceModelType(val);
                    fetchReferenceGuide(undefined, startDateStr, endDateStr, val);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecmwf_ifs">ECMWF IFS</SelectItem>
                    <SelectItem value="era5">ERA5 Reanalysis</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs">
                  {rawRecords.length} Titik Observasi
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {rawRecords.length === 0 ? (
                <div className="h-[360px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Database className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm">Silakan pilih stasiun dan rentang waktu lalu klik &quot;Ambil Data Target&quot;</p>
                </div>
              ) : (
                <ReactECharts
                  option={chartOptions}
                  style={{ height: "380px", width: "100%" }}
                  opts={{ renderer: "canvas" }}
                />
              )}
            </CardContent>

            {/* Statistical Impact Metrics */}
            {stats && (
              <CardFooter className="py-3 px-5 border-t bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Titik Terkoreksi:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {stats.modifiedCount} / {stats.count} ({stats.modifiedPercent}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Rata-rata (μ):</span>
                    <span className="font-mono font-medium">
                      {stats.rawMean} → <strong className="text-emerald-600 dark:text-emerald-400">{stats.corrMean}</strong> {selectedVar.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Rentang [Min, Max]:</span>
                    <span className="font-mono font-medium">
                      [{stats.corrMin}, {stats.corrMax}] {selectedVar.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Deviasi Standar (σ):</span>
                    <span className="font-mono font-medium">
                      {stats.rawStd} → {stats.corrStd}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={modifiedItems.length === 0 || isApplying}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm h-9 px-4"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Terapkan Koreksi ({modifiedItems.length} Titik)
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>

          {/* 4. Table of Affected Records */}
          <Card className="border shadow-sm">
            <CardHeader className="py-3 px-5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-slate-500" />
                  Rincian Titik Data Observasi
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Switch
                  id="showModifiedRowsSwitch"
                  checked={showOnlyModifiedRows}
                  onCheckedChange={setShowOnlyModifiedRows}
                />
                <Label htmlFor="showModifiedRowsSwitch" className="cursor-pointer text-xs">
                  Hanya Tampilkan Baris yang Berubah
                </Label>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 pl-5 font-semibold">Waktu (WIB)</th>
                      <th className="p-2.5 font-semibold">Nilai Mentah</th>
                      <th className="p-2.5 font-semibold">Nilai Koreksi</th>
                      <th className="p-2.5 font-semibold">Selisih (Δ)</th>
                      <th className="p-2.5 pr-5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(showOnlyModifiedRows ? modifiedItems : correctedResults).slice(0, 150).map((row) => {
                      const isMod = row.isModified;
                      return (
                        <tr
                          key={row.timestamp}
                          className={
                            row.isAnomaly
                              ? "bg-rose-50/50 dark:bg-rose-950/20"
                              : isMod
                              ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                              : ""
                          }
                        >
                          <td className="p-2.5 pl-5 font-mono text-slate-600 dark:text-slate-400">
                            {row.dateFormatted}
                          </td>
                          <td className="p-2.5 font-mono">{row.rawVal} {selectedVar.unit}</td>
                          <td className="p-2.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {row.correctedVal} {selectedVar.unit}
                          </td>
                          <td className="p-2.5 font-mono">
                            {row.diff > 0 ? `+${row.diff}` : row.diff} {selectedVar.unit}
                          </td>
                          <td className="p-2.5 pr-5">
                            {row.isAnomaly ? (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                Anomali
                              </Badge>
                            ) : isMod ? (
                              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] py-0 px-1.5">
                                Terkoreksi
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Tetap</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {(showOnlyModifiedRows ? modifiedItems : correctedResults).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-6 text-slate-400">
                          Tidak ada baris data yang ditampilkan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: AUDIT TRAIL HISTORI ================= */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-500" />
                  Histori & Catatan Audit Koreksi Data
                </CardTitle>
                <CardDescription className="text-xs">
                  Rekaman jejak permanen seluruh pembaruan batch yang pernah diterapkan pada stasiun {selectedStationName}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadAuditTrail(sensorId)}
                disabled={loadingAudit}
                className="text-xs h-8"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingAudit ? "animate-spin" : ""}`} />
                Segarkan Histori
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Belum ada riwayat koreksi batch yang tercatat pada stasiun ini.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {auditLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-indigo-400 text-indigo-600 dark:text-indigo-300 font-mono text-[10px]">
                            {log.method.toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Parameter: <span className="font-mono text-indigo-600 dark:text-indigo-400">{log.field}</span>
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {log.pointCount} Titik Data Terkoreksi
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {log.appliedAt} oleh <strong>{log.appliedBy}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                        <div>
                          <strong>Rentang Waktu:</strong> {log.range.startDateFormatted} s/d {log.range.endDateFormatted}
                        </div>
                        <div>
                          <strong>Parameter Operasi:</strong> {JSON.stringify(log.parameters)}
                        </div>
                        {log.notes && (
                          <div className="col-span-full pt-1 text-slate-700 dark:text-slate-300 italic">
                            &quot;{log.notes}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 5. Execution Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ShieldAlert className="h-5 w-5 text-amber-500" /> Konfirmasi Penulisan Koreksi ke Database
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tindakan ini akan langsung memperbarui titik-titik data mentah di Firebase Realtime Database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Stasiun:</span>
                <span className="font-semibold">{selectedStationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parameter:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedVar.label} ({selectedVar.key})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode:</span>
                <span className="font-semibold">
                  {correctionMethod === "interpolate"
                    ? `INTERPOLASI (${interpolationSubMethod.toUpperCase()})`
                    : correctionMethod.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Titik Terkoreksi:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{modifiedItems.length} Titik</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rentang Waktu:</span>
                <span>{startDateStr} {startTimeStr} s/d {endDateStr} {endTimeStr} WIB</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="auditNotes" className="text-xs font-medium">
                Catatan Alasan Koreksi (Opsional):
              </Label>
              <Input
                id="auditNotes"
                placeholder="Contoh: Koreksi lonjakan radiasi matahari menggunakan penuntun ECMWF IFS"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
              disabled={isApplying}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleApplyBatchCorrection}
              disabled={isApplying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Menerapkan...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Ya, Terapkan Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
