"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useTheme } from "next-themes";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Activity,
  Sliders,
  History,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  BookOpen,
  Info,
  Check,
  RotateCcw,
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
  getStoredActiveSensorId,
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

type CorrectionMethod = "offset" | "drift" | "clamp" | "scale" | "interpolate";

interface AnomalyFlag {
  index: number;
  timestamp: number;
  value: number;
  type: "wmo_boundary" | "spike_jump" | "flatline";
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

  // Data Loading & Operation State
  const [rawRecords, setRawRecords] = useState<SensorDate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [auditNotes, setAuditNotes] = useState<string>("");
  const [auditLogs, setAuditLogs] = useState<SensorCorrectionAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [showOnlyModifiedRows, setShowOnlyModifiedRows] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"workspace" | "audit" | "literature">("workspace");

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
  }, []);

  // Update clamp defaults when selected variable changes
  useEffect(() => {
    setClampMin(selectedVar.wmoMin);
    setClampMax(selectedVar.wmoMax);
    setOffsetValue(0);
    setDriftStart(0);
    setDriftEnd(0);
    setScaleFactor(1.0);
  }, [selectedVar]);

  // 2. Fetch Raw Sensor Data for Target Range
  const handleFetchData = useCallback(async () => {
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
      const startMs = new Date(`${startDateStr}T${startTimeStr}:00+07:00`).getTime();
      const endMs = new Date(`${endDateStr}T${endTimeStr}:59+07:00`).getTime();

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

      if (sorted.length === 0) {
        toast({
          title: "Data Kosong",
          description: "Tidak ditemukan data sensor pada rentang tanggal/waktu yang dipilih.",
        });
      } else {
        toast({
          title: "Data Berhasil Dimuat",
          description: `Berhasil mengambil ${sorted.length} titik observasi raw.`,
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
  }, [sensorId, startDateStr, startTimeStr, endDateStr, endTimeStr, toast]);

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

  // Quick Preset Handlers
  const handleApplyPreset = (preset: "today" | "yesterday" | "last3days" | "last7days") => {
    const now = new Date();
    if (preset === "today") {
      setStartDateStr(format(now, "yyyy-MM-dd"));
      setStartTimeStr("00:00");
      setEndDateStr(format(now, "yyyy-MM-dd"));
      setEndTimeStr("23:59");
    } else if (preset === "yesterday") {
      const yest = subDays(now, 1);
      setStartDateStr(format(yest, "yyyy-MM-dd"));
      setStartTimeStr("00:00");
      setEndDateStr(format(yest, "yyyy-MM-dd"));
      setEndTimeStr("23:59");
    } else if (preset === "last3days") {
      setStartDateStr(format(subDays(now, 2), "yyyy-MM-dd"));
      setStartTimeStr("00:00");
      setEndDateStr(format(now, "yyyy-MM-dd"));
      setEndTimeStr("23:59");
    } else if (preset === "last7days") {
      setStartDateStr(format(subDays(now, 6), "yyyy-MM-dd"));
      setStartTimeStr("00:00");
      setEndDateStr(format(now, "yyyy-MM-dd"));
      setEndTimeStr("23:59");
    }
  };

  // 4. Automatic Anomaly Detection (Spikes, Boundary Violations, Frozen)
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
  }, [rawRecords, selectedVar]);

  const anomalyIndexSet = useMemo(() => new Set(anomalies.map((a) => a.index)), [anomalies]);

  // 5. Scientific Batch Correction Calculation (Real-Time Preview)
  const correctedResults = useMemo(() => {
    if (rawRecords.length === 0) return [];
    const varKey = selectedVar.key;
    const n = rawRecords.length;
    const t0 = rawRecords[0].timestamp;
    const t1 = rawRecords[n - 1].timestamp;
    const span = Math.max(1, t1 - t0);

    // Prepare boundary anchor points for interpolation
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
          // Linear interpolation between endpoints (Gap-filling & Spike removal)
          const alpha = (rec.timestamp - t0) / span;
          targetVal = firstValidVal + alpha * (lastValidVal - firstValidVal);
          break;
        }
      }

      // Hard Meteorological Invariant: RH clamped strictly between 0% and 100%
      if (selectedVar.key === "humidity") {
        targetVal = Math.min(100, Math.max(0, targetVal));
      }
      // Non-negative precipitation & radiation
      if (selectedVar.key === "rainfall" || selectedVar.key === "rainrate" || selectedVar.key === "lux" || selectedVar.key === "volt") {
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
  ]);

  // Modified items count
  const modifiedItems = useMemo(() => {
    return correctedResults.filter((r) => r.isModified);
  }, [correctedResults]);

  // Statistics Comparison
  const stats = useMemo(() => {
    if (correctedResults.length === 0) return null;
    const rawVals = correctedResults.map((r) => r.rawVal);
    const corrVals = correctedResults.map((r) => r.correctedVal);

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = (arr: number[], m: number) =>
      Math.sqrt(arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / Math.max(1, arr.length - 1));

    const rawMean = mean(rawVals);
    const corrMean = mean(corrVals);
    const rawStd = stdDev(rawVals, rawMean);
    const corrStd = stdDev(corrVals, corrMean);

    return {
      count: correctedResults.length,
      modifiedCount: modifiedItems.length,
      modifiedPercent: ((modifiedItems.length / correctedResults.length) * 100).toFixed(1),
      rawMin: Math.min(...rawVals),
      rawMax: Math.max(...rawVals),
      rawMean: Number(rawMean.toFixed(selectedVar.decimals)),
      rawStd: Number(rawStd.toFixed(selectedVar.decimals)),
      corrMin: Math.min(...corrVals),
      corrMax: Math.max(...corrVals),
      corrMean: Number(corrMean.toFixed(selectedVar.decimals)),
      corrStd: Number(corrStd.toFixed(selectedVar.decimals)),
    };
  }, [correctedResults, modifiedItems, selectedVar]);

  // 6. ECharts Configuration for Before vs After Preview
  const chartOptions = useMemo(() => {
    if (correctedResults.length === 0) return {};

    const timeLabels = correctedResults.map((r) => {
      const d = new Date(r.timestamp);
      return `${format(d, "dd MMM HH:mm", { locale: localeId })}`;
    });

    const rawSeries = correctedResults.map((r) => r.rawVal);
    const corrSeries = correctedResults.map((r) => r.correctedVal);

    // Visual mark points for anomalies
    const markPointData = anomalies.map((a) => ({
      name: a.reason,
      coord: [a.index, a.value],
      value: a.type === "wmo_boundary" ? "WMO Limit" : "Spike",
      itemStyle: { color: "#EF4444" },
    }));

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

          const diffSign = item.diff > 0 ? `+${item.diff}` : `${item.diff}`;
          const diffColor = item.diff === 0 ? "text-slate-400" : item.diff > 0 ? "text-amber-500" : "text-sky-500";
          html += `<div class="flex items-center justify-between gap-4 text-xs pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-800">
            <span class="text-slate-500 dark:text-slate-400">Selisih Penyesuaian (Δ)</span>
            <span class="font-mono font-bold ${diffColor}">${diffSign} ${selectedVar.unit}</span>
          </div>`;

          if (item.isAnomaly) {
            const anom = anomalies.find((a) => a.index === idx);
            if (anom) {
              html += `<div class="mt-1 text-[11px] text-red-500 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded">
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
      series: [
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
      ],
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: "none", title: { zoom: "Zoom Area", back: "Reset Zoom" } },
          restore: { title: "Reset View" },
          saveAsImage: {
            title: "Simpan Gambar Grafik",
            pixelRatio: 2,
            name: `QC_Koreksi_${selectedVar.key}_${startDateStr}`,
          },
        },
        iconStyle: {
          borderColor: isDarkMode ? "#94A3B8" : "#64748B",
        },
        right: 20,
        top: 8,
      },
    };
  }, [correctedResults, isDarkMode, selectedVar, anomalies, startDateStr]);

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
        subtitle="Pembersihan anomali, eliminasi sensor drift, penyesuaian baseline shift, dan standardisasi batas fisik WMO No. 8"
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

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid grid-cols-3 max-w-md bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="workspace" className="text-xs flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Area Koreksi
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Riwayat Audit ({auditLogs.length})
          </TabsTrigger>
          <TabsTrigger value="literature" className="text-xs flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Dasar Ilmiah
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: WORKSPACE KOREKSI ================= */}
        <TabsContent value="workspace" className="space-y-6 mt-4">
          {/* Anomaly Detection Banner if detected */}
          {anomalies.length > 0 && (
            <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Terdeteksi {anomalies.length} Anomali Data pada Rentang Ini</span>
                <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-300 text-[10px]">
                  QC Alert
                </Badge>
              </AlertTitle>
              <AlertDescription className="text-xs mt-1 text-amber-800 dark:text-amber-300/90 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Sistem menemukan lonjakan tiba-tiba (*spike jump*) atau pelanggaran batas fisik WMO. Anda dapat memilih
                  opsi <strong>"Hanya Koreksi Titik Anomali"</strong> pada panel metode di bawah.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCorrectionMethod("clamp");
                    setClampMin(selectedVar.wmoMin);
                    setClampMax(selectedVar.wmoMax);
                    setOnlyAnomalies(true);
                  }}
                  className="h-7 text-xs border-amber-400 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100"
                >
                  <Sparkles className="h-3 w-3 mr-1" /> Bersihkan Anomali WMO
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Interactive Scientific Correction Methods Card */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-5 border-b bg-slate-50 dark:bg-slate-900/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-indigo-500" />
                    Metode Koreksi Ilmiah (Quality Control Pipeline)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pilih algoritma pembersihan data berdasarkan tipe deviasi sensor yang terobservasi
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Switch
                    id="onlyAnomaliesSwitch"
                    checked={onlyAnomalies}
                    onCheckedChange={setOnlyAnomalies}
                  />
                  <Label htmlFor="onlyAnomaliesSwitch" className="cursor-pointer text-xs font-medium">
                    Hanya Koreksi Titik Anomali ({anomalies.length} titik)
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
                {[
                  {
                    id: "offset",
                    title: "Offset Tetap (Step)",
                    desc: "Pergeseran baseline konstan (±Δ)",
                    icon: ArrowRight,
                  },
                  {
                    id: "drift",
                    title: "Sensor Drift",
                    desc: "Pergeseran bertahap seiring waktu",
                    icon: TrendingUp,
                  },
                  {
                    id: "clamp",
                    title: "Batas WMO (Clamp)",
                    desc: "Pangkas outlier ke rentang fisik",
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
                    title: "Interpolasi Celah",
                    desc: "Gap-filling titik rusak/lonjakan",
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Penyesuaian Offset Baseline (Additive Shift: y′ = y + Δ)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Digunakan saat seluruh sensor bergeser seragam (misal: pasca maintenance, shock mekanis, atau kalibrasi ulang).
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[-5.0, -2.0, -1.0, -0.5, 0.5, 1.0, 2.0, 5.0].map((v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => setOffsetValue(v)}
                          >
                            {v > 0 ? `+${v}` : v}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 max-w-sm pt-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        Nilai Offset (Δ):
                      </Label>
                      <Input
                        type="number"
                        step={selectedVar.step}
                        value={offsetValue}
                        onChange={(e) => setOffsetValue(parseFloat(e.target.value) || 0)}
                        className="h-9 font-mono text-sm"
                      />
                      <span className="text-xs font-semibold text-slate-500">{selectedVar.unit}</span>
                    </div>
                  </div>
                )}

                {/* 2. Sensor Drift */}
                {correctionMethod === "drift" && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Koreksi Sensor Drift Bertahap (Time-Drift: Δ(t) Linier dari Awal ke Akhir)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Rekomendasi Wang et al. (2017) & Talukder et al. (2022) untuk mengatasi akumulasi debu, penuaan komponen, atau penurunan baterai.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600 dark:text-slate-400">
                          Offset di Titik Awal Rentang (Δ₀):
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step={selectedVar.step}
                            value={driftStart}
                            onChange={(e) => setDriftStart(parseFloat(e.target.value) || 0)}
                            className="h-9 font-mono text-sm"
                          />
                          <span className="text-xs text-slate-500">{selectedVar.unit}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600 dark:text-slate-400">
                          Offset di Titik Akhir Rentang (Δ₁):
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step={selectedVar.step}
                            value={driftEnd}
                            onChange={(e) => setDriftEnd(parseFloat(e.target.value) || 0)}
                            className="h-9 font-mono text-sm"
                          />
                          <span className="text-xs text-slate-500">{selectedVar.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. WMO Clamping */}
                {correctionMethod === "clamp" && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Pemangkasan Batas Fisik & Outlier (WMO-No. 8 Clamping)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Nilai di bawah batas bawah dipotong ke Min; nilai di atas batas atas dipotong ke Max.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-indigo-400 text-indigo-700 dark:text-indigo-300"
                        onClick={() => {
                          setClampMin(selectedVar.wmoMin);
                          setClampMax(selectedVar.wmoMax);
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset Batas Baku WMO
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600 dark:text-slate-400">
                          Batas Bawah Minimum (Min):
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step={selectedVar.step}
                            value={clampMin}
                            onChange={(e) => setClampMin(parseFloat(e.target.value) || 0)}
                            className="h-9 font-mono text-sm"
                          />
                          <span className="text-xs text-slate-500">{selectedVar.unit}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600 dark:text-slate-400">
                          Batas Atas Maksimum (Max):
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step={selectedVar.step}
                            value={clampMax}
                            onChange={(e) => setClampMax(parseFloat(e.target.value) || 0)}
                            className="h-9 font-mono text-sm"
                          />
                          <span className="text-xs text-slate-500">{selectedVar.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Multiplicative Scale */}
                {correctionMethod === "scale" && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Faktor Kalibrasi Pengali (Multiplicative Gain: y′ = k × y)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Cocok untuk penyesuaian gain sensor penakar hujan tipping-bucket atau fotodioda radiasi matahari.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[0.8, 0.9, 0.95, 1.05, 1.1, 1.2].map((k) => (
                          <Button
                            key={k}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => setScaleFactor(k)}
                          >
                            ×{k}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 max-w-sm pt-2">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        Faktor Pengali (k):
                      </Label>
                      <Input
                        type="number"
                        step={0.01}
                        value={scaleFactor}
                        onChange={(e) => setScaleFactor(parseFloat(e.target.value) || 1.0)}
                        className="h-9 font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setScaleFactor(1.0)}
                      >
                        Reset (1.0)
                      </Button>
                    </div>
                  </div>
                )}

                {/* 5. Interpolation */}
                {correctionMethod === "interpolate" && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Interpolasi Linier (Gap-Filling & Rekonstruksi Titik Rusak)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Mengganti nilai titik-titik yang dipilih dengan garis lurus kontinu antara titik valid sebelum dan sesudah rentang terpilih.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Before vs After Interactive Visualizer */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Pratinjau Visual: Sebelum vs Sesudah Koreksi (Non-Destructive Live Preview)
                </CardTitle>
                <CardDescription className="text-xs">
                  Garis merah dashed = Data Mentah saat ini di database | Garis hijau solid = Hasil proyeksi koreksi
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs">
                {rawRecords.length} Titik Data Terpasang
              </Badge>
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

        {/* ================= TAB 3: LANDASAN ILMIAH & CITATIONS ================= */}
        <TabsContent value="literature" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-5 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                Landasan Ilmiah, Standar WMO, dan Publikasi Ilmiah arXiv
              </CardTitle>
              <CardDescription className="text-xs">
                Metodologi yang diimplementasikan pada modul ini mengacu pada panduan baku WMO dan literatur riset arXiv
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-indigo-900 dark:text-indigo-200 text-sm">
                  <ExternalLink className="h-4 w-4" />
                  1. Steckler et al. (2025) – arXiv:2502.05191v1
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  <em>&quot;Descriptor: Five years of meteorological surface data at Oak Ridge Reserve in Tennessee&quot;</em>
                </p>
                <p>
                  Menjabarkan metodologi kendali mutu komprehensif untuk stasiun meteorologi otomatis (AWS). Menggarisbawahi
                  pentingnya pengujian batas fisik (plausibility limits), deteksi pergeseran bertahap (drift), pergeseran
                  step-shift baseline akibat intervensi teknis, serta isolasi lonjakan buatan (*artefactual spikes*).
                </p>
                <a
                  href="https://arxiv.org/abs/2502.05191"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Tinjau Paper di arXiv: https://arxiv.org/abs/2502.05191
                </a>
              </div>

              <div className="p-4 rounded-xl border border-sky-200/60 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sky-900 dark:text-sky-200 text-sm">
                  <ExternalLink className="h-4 w-4" />
                  2. Kirkwood et al. (2022) – arXiv:2201.10544v1
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  <em>&quot;A deep mixture density network for outlier-corrected interpolation of crowd-sourced weather data&quot;</em>
                </p>
                <p>
                  Memformulasikan kalibrasi anomali sensor cuaca dengan pemisahan antara galat aditif (bias offset $\Delta$)
                  dan galat multiplikatif (gain skala $k$), sekaligus mendefinisikan boundary clamping agar tidak mengorbankan
                  sinyal dinamika atmosfer nyata seperti *cold pool outflow* atau hembusan angin konvektif.
                </p>
                <a
                  href="https://arxiv.org/abs/2201.10544"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                >
                  Tinjau Paper di arXiv: https://arxiv.org/abs/2201.10544
                </a>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                  <ExternalLink className="h-4 w-4" />
                  3. Wang et al. (2017) – arXiv:1707.03682v1 (IEEE Sensors Journal)
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  <em>&quot;A Deep Learning Approach for Blind Drift Calibration of Sensor Networks&quot;</em>
                </p>
                <p>
                  Membahas kalibrasi pergeseran sensor (<em>sensor drift</em>) linier seiring waktu akibat penuaan fisik sensor
                  dengan perumusan koreksi deret waktu dinamis: &Delta;(t) = &delta;&#8320; + [(t - t&#8320;)/(t&#8321; - t&#8320;)] &times; (&delta;&#8321; - &delta;&#8320;).
                </p>
                <a
                  href="https://arxiv.org/abs/1707.03682"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Tinjau Paper di arXiv: https://arxiv.org/abs/1707.03682
                </a>
              </div>

              <div className="p-4 rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-purple-900 dark:text-purple-200 text-sm">
                  <ExternalLink className="h-4 w-4" />
                  4. Talukder et al. (2022) – arXiv:2208.13819v1
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  <em>&quot;Dynamic Calibration of Nonlinear Sensors with Time-Drifts and Delays by Bayesian Inference&quot;</em>
                </p>
                <p>
                  Menekankan prinsip keselamatan data: validasi pratinjau sebelum penulisan permanen (<em>non-destructive preview</em>)
                  dan pencatatan jejak audit (<em>immutable audit trail</em>) atas seluruh parameter modifikasi.
                </p>
                <a
                  href="https://arxiv.org/abs/2208.13819"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                >
                  Tinjau Paper di arXiv: https://arxiv.org/abs/2208.13819
                </a>
              </div>

              <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  5. Standar WMO-No. 8 (Guide to Instruments and Methods of Observation)
                </div>
                <p>
                  Bagian II Bab 1 mengatur Quality Control Data Meteorologi:
                  batas fisik kelembapan relatif wajib berada dalam batas 0% &le; RH &le; 100%, presipitasi RR &ge; 0 mm,
                  serta tekanan atmosfer terestrial normal berkisar 850 s/d 1080 hPa.
                </p>
              </div>
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
                <span className="font-semibold">{correctionMethod.toUpperCase()}</span>
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
                placeholder="Contoh: Koreksi baseline shift pasca pembersihan tabung sensor"
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
