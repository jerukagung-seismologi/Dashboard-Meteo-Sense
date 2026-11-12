"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
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
  Download,
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
  batchWriteGapImputedNodes,
  logSensorCorrection,
  fetchSensorCorrectionLogs,
} from "@/lib/FetchingSensorData";
import {
  interpolateTimeLinear,
  interpolateCubicHermite,
  interpolateHermiteWithSlopes,
  computePchipSlopes,
  computeAkimaSlopes,
  interpolateModelGuided,
  recalculateRHMagnus,
  interpolateSolarCosineHermite,
} from "@/lib/meteorologicalInterpolation";
import type { ReferenceGuidePoint } from "@/app/api/weather/reference-guide/route";
import {
  runUniversalGapImputation,
  buildCompleteGapNodePayloads,
  getWibTimeComponents,
  ImputedGridPoint,
  ImputationSummary,
  GapSegment,
} from "@/lib/meteorologicalImputationEngine";
import { getCalibrationDocument } from "@/lib/calibration/calibrationCrud";

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
export type InterpolationSubMethod = "solar_cosine_hermite" | "model_guided" | "cubic_pchip" | "akima" | "time_linear";

interface AnomalyFlag {
  index: number;
  timestamp: number;
  value: number;
  type: "wmo_boundary" | "spike_jump" | "flatline" | "solar_overheating";
  reason: string;
}

interface LoadedDataContext {
  sensorId: string;
  startDateStr: string;
  startTimeStr: string;
  endDateStr: string;
  endTimeStr: string;
  startMs: number;
  endMs: number;
}

const WIB_TZ_OFFSET_MS = 7 * 3600 * 1000;
const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function parseWibEpochMs(dateStr: string, timeStr: string, secondsStr: string = "00"): number {
  return new Date(`${dateStr}T${timeStr}:${secondsStr}+07:00`).getTime();
}

function formatWibYmd(ms: number): string {
  const wib = new Date(ms + WIB_TZ_OFFSET_MS);
  const yyyy = wib.getUTCFullYear();
  const mm = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(wib.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayWibDateStr(): string {
  return formatWibYmd(Date.now());
}

function shiftWibDateStr(dateStr: string, deltaDays: number): string {
  const baseMs = new Date(`${dateStr}T00:00:00+07:00`).getTime();
  return formatWibYmd(baseMs + deltaDays * 86400000);
}

function formatWibShortDateTime(ms: number): string {
  const wib = new Date(ms + WIB_TZ_OFFSET_MS);
  const dd = String(wib.getUTCDate()).padStart(2, "0");
  const mon = MONTH_SHORT_ID[wib.getUTCMonth()] || "";
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mi = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${dd} ${mon} ${hh}:${mi}`;
}

function formatWibFullDisplayDate(dateStr: string): string {
  return format(new Date(`${dateStr}T12:00:00+07:00`), "EEEE, dd MMMM yyyy", { locale: localeId });
}

function formatWibMediumDisplayDate(dateStr: string): string {
  return format(new Date(`${dateStr}T12:00:00+07:00`), "dd MMM yyyy", { locale: localeId });
}

function NumericInputField({
  value,
  onCommit,
  min,
  max,
  step,
  className,
}: {
  value: number;
  onCommit: (nextVal: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    let clamped = parsed;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    onCommit(clamped);
    setDraft(String(clamped));
  };

  return (
    <Input
      type="number"
      step={step}
      min={min}
      max={max}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() !== "" && raw.trim() !== "-") {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            let clamped = parsed;
            if (min !== undefined && clamped < min) clamped = min;
            if (max !== undefined && clamped > max) clamped = max;
            onCommit(clamped);
          }
        }
      }}
      onBlur={() => commitDraft(draft)}
      className={className}
    />
  );
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
  const [activeCalibrationVars, setActiveCalibrationVars] = useState<string[]>([]);

  // Parameter State
  const [selectedVarKey, setSelectedVarKey] = useState<string>("temperature");
  const selectedVar = useMemo(() => {
    return WEATHER_VARIABLES.find((v) => v.key === selectedVarKey) || WEATHER_VARIABLES[0];
  }, [selectedVarKey]);

  // Date Range State (Jakarta UTC+7 deterministik)
  const todayStr = useMemo(() => getTodayWibDateStr(), []);
  const [startDateStr, setStartDateStr] = useState<string>(todayStr);
  const [startTimeStr, setStartTimeStr] = useState<string>("00:00");
  const [endDateStr, setEndDateStr] = useState<string>(todayStr);
  const [endTimeStr, setEndTimeStr] = useState<string>("23:59");
  const [loadedContext, setLoadedContext] = useState<LoadedDataContext | null>(null);

  // Correction Method Configuration
  const [correctionMethod, setCorrectionMethod] = useState<CorrectionMethod>("offset");
  const [offsetValue, setOffsetValue] = useState<number>(0);
  const [driftStart, setDriftStart] = useState<number>(0);
  const [driftEnd, setDriftEnd] = useState<number>(0);
  const [clampMin, setClampMin] = useState<number>(selectedVar.wmoMin);
  const [clampMax, setClampMax] = useState<number>(selectedVar.wmoMax);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(false);
  const [enableSolarAnomalyCheck, setEnableSolarAnomalyCheck] = useState<boolean>(false);

  // Meteorological Interpolation Sub-methods
  const [interpolationSubMethod, setInterpolationSubMethod] = useState<InterpolationSubMethod>("solar_cosine_hermite");

  // Dual-Reference State (AWS Co-located Station vs Open-Meteo ECMWF Model)
  const [solarRefSource, setSolarRefSource] = useState<"station_aws" | "model_ecmwf">("station_aws");
  const [solarRefStationId, setSolarRefStationId] = useState<string>("");
  const [solarThreshold, setSolarThreshold] = useState<number>(0.7);
  const [syncRhRecovery, setSyncRhRecovery] = useState<boolean>(false);
  const [refStationRecords, setRefStationRecords] = useState<SensorDate[]>([]);
  const [loadingRefStation, setLoadingRefStation] = useState<boolean>(false);

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
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewPageSize, setPreviewPageSize] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<"workspace" | "audit">("workspace");

  // Mode Operasi: "point_correction" (Koreksi Nilai & Anomali) vs "gap_imputation" (Imputasi Celah 1440/Hari)
  const [operationMode, setOperationMode] = useState<"point_correction" | "gap_imputation">("point_correction");
  const [gapMicroLimitMinutes, setGapMicroLimitMinutes] = useState<number>(15);
  const [gapImputeMethod, setGapImputeMethod] = useState<"auto_hybrid" | "companion_ridge" | "model_guided" | "pchip_spline">("auto_hybrid");
  const [enableGapBridging, setEnableGapBridging] = useState<boolean>(true);
  const [enableGapPhysics, setEnableGapPhysics] = useState<boolean>(true);
  const [isApplyingImputation, setIsApplyingImputation] = useState<boolean>(false);
  const [showImputationConfirmModal, setShowImputationConfirmModal] = useState<boolean>(false);

  const isFilterDirty = useMemo(() => {
    if (!loadedContext) return false;
    return (
      loadedContext.sensorId !== sensorId ||
      loadedContext.startDateStr !== startDateStr ||
      loadedContext.startTimeStr !== startTimeStr ||
      loadedContext.endDateStr !== endDateStr ||
      loadedContext.endTimeStr !== endTimeStr
    );
  }, [loadedContext, sensorId, startDateStr, startTimeStr, endDateStr, endTimeStr]);

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

      const v0 = Number((p0 as any)[varKey]);
      const v1 = Number((p1 as any)[varKey]);
      if (!Number.isFinite(v0) || !Number.isFinite(v1)) {
        return Number.isFinite(v0) ? v0 : Number.isFinite(v1) ? v1 : null;
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
      const hasValidCoords =
        dev?.coordinates &&
        Number.isFinite(dev.coordinates.lat) &&
        Number.isFinite(dev.coordinates.lng) &&
        (dev.coordinates.lat !== 0 || dev.coordinates.lng !== 0);
      const lat = hasValidCoords ? dev!.coordinates!.lat : -7.7121;
      const lng = hasValidCoords ? dev!.coordinates!.lng : 109.6892;

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

  // Fetch Co-located AWS Reference Station Data from RTDB
  const fetchRefStationData = useCallback(
    async (
      targetRefId = solarRefStationId,
      sDate = startDateStr,
      sTime = startTimeStr,
      eDate = endDateStr,
      eTime = endTimeStr
    ) => {
      if (!targetRefId || targetRefId === sensorId) return;
      setLoadingRefStation(true);
      try {
        const startMs = parseWibEpochMs(sDate, sTime, "00");
        const endMs = parseWibEpochMs(eDate, eTime, "59");
        const data = await fetchSensorDataByDateRange(
          targetRefId,
          startMs,
          endMs,
          false,
          true,
          "raw"
        );
        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        setRefStationRecords(sorted);
      } catch (err) {
        console.warn("Gagal mengambil data stasiun acuan RTDB:", err);
      } finally {
        setLoadingRefStation(false);
      }
    },
    [solarRefStationId, sensorId, startDateStr, startTimeStr, endDateStr, endTimeStr]
  );

  // Continuous lookup helper for reference AWS station values at timestamp ts
  const getRefStationValAtTimestamp = useCallback(
    (ts: number, varKey: string): number | null => {
      if (refStationRecords.length === 0) return null;

      if (ts <= refStationRecords[0].timestamp) {
        const val = Number((refStationRecords[0] as any)[varKey]);
        return Number.isFinite(val) ? val : null;
      }
      if (ts >= refStationRecords[refStationRecords.length - 1].timestamp) {
        const last = refStationRecords[refStationRecords.length - 1];
        const val = Number((last as any)[varKey]);
        return Number.isFinite(val) ? val : null;
      }

      // Binary search for nearest surrounding points
      let low = 0;
      let high = refStationRecords.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (refStationRecords[mid].timestamp < ts) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      const p0 = refStationRecords[Math.max(0, low - 1)];
      const p1 = refStationRecords[Math.min(refStationRecords.length - 1, low)];
      if (!p0 || !p1) return null;

      const v0 = Number((p0 as any)[varKey]);
      const v1 = Number((p1 as any)[varKey]);
      if (!Number.isFinite(v0) || !Number.isFinite(v1)) {
        return Number.isFinite(v0) ? v0 : Number.isFinite(v1) ? v1 : null;
      }

      if (p1.timestamp === p0.timestamp) return v0;
      const ratio = (ts - p0.timestamp) / (p1.timestamp - p0.timestamp);
      return v0 + ratio * (v1 - v0);
    },
    [refStationRecords]
  );

  // Unified Reference Value Lookup (either AWS station or ECMWF model)
  const getUnifiedRefValAtTimestamp = useCallback(
    (ts: number, varKey: string): number | null => {
      if (solarRefSource === "station_aws" && refStationRecords.length > 0) {
        const awsVal = getRefStationValAtTimestamp(ts, varKey);
        if (awsVal !== null) return awsVal;
      }
      return getModelValAtTimestamp(ts, varKey);
    },
    [solarRefSource, refStationRecords.length, getRefStationValAtTimestamp, getModelValAtTimestamp]
  );

  // Baseline Night Offset between target sensor and reference series (00:00 - 05:59 & 20:00 - 23:59 WIB)
  const baselineNightOffset = useMemo(() => {
    if (rawRecords.length === 0) return 0;
    const nightDiffs: number[] = [];

    for (const rec of rawRecords) {
      const hour = Math.floor(getWibTimeComponents(rec.timestamp).hourFrac);
      if (hour <= 5 || hour >= 20) {
        const tVal = Number((rec as any)["temperature"]);
        const rVal = getUnifiedRefValAtTimestamp(rec.timestamp, "temperature");
        if (Number.isFinite(tVal) && rVal !== null && Number.isFinite(rVal)) {
          nightDiffs.push(tVal - rVal);
        }
      }
    }

    if (nightDiffs.length === 0) return 0;
    nightDiffs.sort((a, b) => a - b);
    const mid = Math.floor(nightDiffs.length / 2);
    return nightDiffs.length % 2 !== 0 ? nightDiffs[mid] : (nightDiffs[mid - 1] + nightDiffs[mid]) / 2;
  }, [rawRecords, getUnifiedRefValAtTimestamp]);

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

          // Auto-select sensible reference station (e.g. id-03 for id-05)
          let autoRef = "";
          if (resolved === "id-05") {
            const has03 = fetched.some((d) => (d.authToken || d.id) === "id-03");
            if (has03) autoRef = "id-03";
          }
          if (!autoRef) {
            const other = fetched.find((d) => (d.authToken || d.id) !== resolved);
            if (other) autoRef = (other.authToken || other.id) as string;
          }
          if (autoRef) setSolarRefStationId(autoRef);
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
        const startMs = parseWibEpochMs(sDate, sTime, "00");
        const endMs = parseWibEpochMs(eDate, eTime, "59");

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
        setLoadedContext({
          sensorId,
          startDateStr: sDate,
          startTimeStr: sTime,
          endDateStr: eDate,
          endTimeStr: eTime,
          startMs,
          endMs,
        });
        setPreviewPage(1);

        // Concurrently fetch the weather model reference guide and reference AWS station
        fetchReferenceGuide(undefined, sDate, eDate, referenceModelType);
        const effectiveRefId =
          solarRefStationId && solarRefStationId !== sensorId ? solarRefStationId : "";
        if (effectiveRefId) {
          fetchRefStationData(effectiveRefId, sDate, sTime, eDate, eTime);
        } else {
          setRefStationRecords([]);
        }

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
    [sensorId, startDateStr, startTimeStr, endDateStr, endTimeStr, toast, fetchReferenceGuide, referenceModelType, solarRefStationId, fetchRefStationData]
  );

  const handleFetchData = useCallback(() => {
    return fetchDataForRange(startDateStr, startTimeStr, endDateStr, endTimeStr);
  }, [fetchDataForRange, startDateStr, startTimeStr, endDateStr, endTimeStr]);

  // Cek status kalibrasi aktif di Firestore untuk memperingatkan operator bahwa Koreksi Data menyunting nilai RAW
  const loadCalibrationStatus = useCallback(async (sid: string) => {
    if (!sid) {
      setActiveCalibrationVars([]);
      return;
    }
    try {
      const calDoc = await getCalibrationDocument(sid);
      if (!calDoc || !calDoc.variables) {
        setActiveCalibrationVars([]);
        return;
      }
      const activeKeys = Object.entries(calDoc.variables)
        .filter(([, cfg]) => cfg && cfg.enabled && cfg.method !== "none")
        .map(([varKey]) => varKey);
      setActiveCalibrationVars(activeKeys);
    } catch {
      setActiveCalibrationVars([]);
    }
  }, []);

  // Load data automatically when sensorId is resolved
  useEffect(() => {
    if (sensorId) {
      handleFetchData();
      loadAuditTrail(sensorId);
      loadCalibrationStatus(sensorId);
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

  // Stepper: Geser 1 Hari ke Belakang (Hari Sebelumnya / H-1 dalam WIB +07:00)
  const handlePrevDay = useCallback(() => {
    try {
      const newDateStr = shiftWibDateStr(startDateStr, -1);

      setStartDateStr(newDateStr);
      setEndDateStr(newDateStr);
      setStartTimeStr("00:00");
      setEndTimeStr("23:59");

      fetchDataForRange(newDateStr, "00:00", newDateStr, "23:59");
    } catch (e) {
      console.error("Gagal geser hari sebelumnya:", e);
    }
  }, [startDateStr, fetchDataForRange]);

  // Stepper: Geser 1 Hari ke Depan (Hari Sesudahnya / H+1 dalam WIB +07:00)
  const handleNextDay = useCallback(() => {
    try {
      const nextDateStr = shiftWibDateStr(endDateStr, 1);
      const todayWib = getTodayWibDateStr();

      if (nextDateStr > todayWib) {
        toast({
          title: "Batas Waktu Maksimal",
          description: "Tidak dapat bergeser ke hari yang akan datang (masa depan).",
        });
        return;
      }

      setStartDateStr(nextDateStr);
      setEndDateStr(nextDateStr);
      setStartTimeStr("00:00");
      setEndTimeStr("23:59");

      fetchDataForRange(nextDateStr, "00:00", nextDateStr, "23:59");
    } catch (e) {
      console.error("Gagal geser hari sesudahnya:", e);
    }
  }, [endDateStr, fetchDataForRange, toast]);

  // Stepper: Lompat ke Hari Ini (WIB +07:00)
  const handleToday = useCallback(() => {
    const newDateStr = getTodayWibDateStr();

    setStartDateStr(newDateStr);
    setEndDateStr(newDateStr);
    setStartTimeStr("00:00");
    setEndTimeStr("23:59");

    fetchDataForRange(newDateStr, "00:00", newDateStr, "23:59");
  }, [fetchDataForRange]);

  // Status apakah tombol Hari Sesudahnya harus di-disable (sudah mencapai hari ini WIB)
  const isNextDayDisabled = useMemo(() => {
    try {
      return endDateStr >= getTodayWibDateStr();
    } catch {
      return false;
    }
  }, [endDateStr]);

  // Quick Preset Handlers with immediate fetch (WIB +07:00)
  const handleApplyPreset = (preset: "today" | "yesterday" | "last3days" | "last7days") => {
    const todayWib = getTodayWibDateStr();
    let sDate = todayWib;
    let eDate = todayWib;

    if (preset === "today") {
      sDate = todayWib;
      eDate = todayWib;
    } else if (preset === "yesterday") {
      const yest = shiftWibDateStr(todayWib, -1);
      sDate = yest;
      eDate = yest;
    } else if (preset === "last3days") {
      sDate = shiftWibDateStr(todayWib, -2);
      eDate = todayWib;
    } else if (preset === "last7days") {
      sDate = shiftWibDateStr(todayWib, -6);
      eDate = todayWib;
    }

    setStartDateStr(sDate);
    setStartTimeStr("00:00");
    setEndDateStr(eDate);
    setEndTimeStr("23:59");

    fetchDataForRange(sDate, "00:00", eDate, "23:59");
  };

  // Preset Cepat: Anomali Radiasi Surya (Cosine-Hermite S-Curve + Pemulihan RH Magnus)
  const handleApplySolarOverheatingPreset = useCallback(() => {
    setSelectedVarKey("temperature");
    setCorrectionMethod("interpolate");
    setInterpolationSubMethod("solar_cosine_hermite");
    setOnlyAnomalies(true);
    setEnableSolarAnomalyCheck(true);
    setShowReferenceGuide(true);
    setSyncRhRecovery(true);
    setSolarThreshold(0.7);

    // Auto-select co-located reference station (e.g. id-03 for id-05) if available
    let refId = solarRefStationId;
    if (!refId || refId === sensorId) {
      if (sensorId === "id-05") {
        const has03 = devices.some((d) => (d.authToken || d.id) === "id-03");
        if (has03) refId = "id-03";
      }
      if (!refId) {
        const alt = devices.find((d) => (d.authToken || d.id) !== sensorId);
        if (alt) refId = (alt.authToken || alt.id) as string;
      }
      if (refId) setSolarRefStationId(refId);
    }

    if (refId && refId !== sensorId) {
      fetchRefStationData(refId);
    }
    if (referenceGuidePoints.length === 0) {
      fetchReferenceGuide();
    }

    toast({
      title: "☀️ Preset Koreksi Radiasi Surya Diaktifkan",
      description:
        "Mode Cosine-Hermite S-Curve aktif dengan pemulihan termodinamika Kelembapan Relatif (RH via Magnus-Tetens).",
    });
  }, [
    solarRefStationId,
    sensorId,
    devices,
    fetchRefStationData,
    referenceGuidePoints.length,
    fetchReferenceGuide,
    toast,
  ]);

  // 4. Automatic Anomaly Detection (Spikes, Boundary Violations, Frozen, and Solar Overheating)
  const anomalies = useMemo<AnomalyFlag[]>(() => {
    if (rawRecords.length === 0) return [];
    const flags: AnomalyFlag[] = [];
    const varKey = selectedVar.key;
    const isSolarActive =
      selectedVar.key === "temperature" &&
      (enableSolarAnomalyCheck ||
        (correctionMethod === "interpolate" && interpolationSubMethod === "solar_cosine_hermite"));

    let lastCleanVal: number | null = null;
    let lastCleanTs: number | null = null;
    let lastWasSpike = false;
    let prevSpikeVal = NaN;

    for (let i = 0; i < rawRecords.length; i++) {
      const rec = rawRecords[i];
      const rawField = (rec as any)[varKey];

      if (rawField === null || rawField === undefined || rawField === "" || !Number.isFinite(Number(rawField))) {
        flags.push({
          index: i,
          timestamp: rec.timestamp,
          value: NaN,
          type: "wmo_boundary",
          reason: "Data hilang / null",
        });
        continue;
      }

      const numVal = Number(rawField);

      // 1. Cek Batas Fisik WMO
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

      // 2. Deteksi Anomali Radiasi Surya (hanya saat mode solar / toggle eksplisit aktif)
      if (isSolarActive) {
        const refTemp = getUnifiedRefValAtTimestamp(rec.timestamp, "temperature");
        if (refTemp !== null && Number.isFinite(refTemp)) {
          const { hourFrac } = getWibTimeComponents(rec.timestamp);
          if (hourFrac >= 9.0 && hourFrac <= 17.5) {
            const excessT = numVal - refTemp - baselineNightOffset;
            if (excessT >= solarThreshold) {
              flags.push({
                index: i,
                timestamp: rec.timestamp,
                value: numVal,
                type: "solar_overheating",
                reason: `Paparan radiasi surya siang: +${excessT.toFixed(2)}°C di atas acuan (${refTemp.toFixed(2)}°C, offset malam: ${baselineNightOffset >= 0 ? "+" : ""}${baselineNightOffset.toFixed(2)}°C)`,
              });
              lastWasSpike = false;
              continue;
            }
          }
        }
      }

      // 3. Deteksi Spike / Lonjakan Mendadak (ternormalisasi Δt & kebal terhadap poin pemulihan i+1)
      if (lastCleanVal !== null && lastCleanTs !== null) {
        const dtMinutes = Math.max(1, (rec.timestamp - lastCleanTs) / 60000);
        const scaledThreshold =
          selectedVar.spikeThreshold * Math.min(6, Math.max(1, Math.sqrt(dtMinutes / 5)));

        // Pengecualian reset counter kumulatif harian Curah Hujan pada 00:00 UTC (07:00 WIB)
        const utcResetBoundary =
          varKey === "rainfall" &&
          numVal < lastCleanVal &&
          numVal >= 0 &&
          (Math.floor(rec.timestamp / 86400000) > Math.floor(lastCleanTs / 86400000) ||
            (new Date(rec.timestamp).getUTCHours() === 0 && numVal <= 5.0));

        if (utcResetBoundary) {
          lastCleanVal = numVal;
          lastCleanTs = rec.timestamp;
          lastWasSpike = false;
        } else {
          const deltaFromClean = Math.abs(numVal - lastCleanVal);
          if (deltaFromClean > scaledThreshold) {
            // Jika sebelumnya adalah spike tunggal lalu stabil di level baru, perlakukan sebagai transisi level baru
            if (lastWasSpike && Math.abs(numVal - prevSpikeVal) <= scaledThreshold * 0.5) {
              lastCleanVal = numVal;
              lastCleanTs = rec.timestamp;
              lastWasSpike = false;
            } else {
              flags.push({
                index: i,
                timestamp: rec.timestamp,
                value: numVal,
                type: "spike_jump",
                reason: `Lonjakan Δ=${deltaFromClean.toFixed(2)} ${selectedVar.unit} dalam ${dtMinutes.toFixed(0)} mnt (ambang: ${scaledThreshold.toFixed(1)})`,
              });
              lastWasSpike = true;
              prevSpikeVal = numVal;
              continue;
            }
          } else {
            lastWasSpike = false;
          }
        }
      }

      // Titik dianggap non-spike, perbarui jangkar bersih
      lastCleanVal = numVal;
      lastCleanTs = rec.timestamp;

      // 4. Deteksi Flatline (kecualikan lux=0 malam, windSpeed=0 tenang, dan curah hujan)
      const isNaturalZero =
        (varKey === "lux" && numVal === 0) || (varKey === "windSpeed" && numVal === 0);
      if (i >= 12 && varKey !== "rainfall" && varKey !== "rainrate" && !isNaturalZero) {
        let isFlat = true;
        for (let k = 1; k <= 12; k++) {
          const pastRaw = (rawRecords[i - k] as any)[varKey];
          if (pastRaw === null || pastRaw === undefined || Number(pastRaw) !== numVal) {
            isFlat = false;
            break;
          }
        }
        if (isFlat) {
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
  }, [
    rawRecords,
    selectedVar,
    getUnifiedRefValAtTimestamp,
    baselineNightOffset,
    correctionMethod,
    interpolationSubMethod,
    solarThreshold,
    enableSolarAnomalyCheck,
  ]);

  const anomalyIndexSet = useMemo(() => new Set(anomalies.map((a) => a.index)), [anomalies]);

  // 5. Scientific Batch Correction Calculation (Real-Time Preview)
  const correctedResults = useMemo(() => {
    if (rawRecords.length === 0) return [];
    const varKey = selectedVar.key;
    const n = rawRecords.length;
    const t0 = rawRecords[0].timestamp;
    const t1 = rawRecords[n - 1].timestamp;
    const span = Math.max(1, t1 - t0);

    // Kumpulkan jangkar valid dan pra-hitung kemiringan sejati untuk PCHIP & Akima
    const validAnchors: Array<{ idx: number; timestamp: number; value: number }> = [];
    for (let i = 0; i < n; i++) {
      const raw = (rawRecords[i] as any)[varKey];
      if (raw !== null && raw !== undefined && raw !== "") {
        const v = Number(raw);
        if (Number.isFinite(v) && !anomalyIndexSet.has(i)) {
          validAnchors.push({ idx: i, timestamp: rawRecords[i].timestamp, value: v });
        }
      }
    }

    const firstValidVal = validAnchors.length > 0 ? validAnchors[0].value : 0;
    const pchipSlopes = computePchipSlopes(validAnchors);
    const akimaSlopes = computeAkimaSlopes(validAnchors);

    // Pembantu pencarian biner jangkar valid terdekat di kiri & kanan indeks i
    const findSurroundingAnchors = (targetIdx: number): { leftPos: number; rightPos: number } => {
      if (validAnchors.length === 0) return { leftPos: -1, rightPos: -1 };
      let lo = 0;
      let hi = validAnchors.length - 1;
      let leftPos = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (validAnchors[mid].idx < targetIdx) {
          leftPos = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      lo = 0;
      hi = validAnchors.length - 1;
      let rightPos = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (validAnchors[mid].idx > targetIdx) {
          rightPos = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      return { leftPos, rightPos };
    };

    return rawRecords.map((rec, idx) => {
      const rawVal = Number((rec as any)[varKey]);
      const isAnomaly = anomalyIndexSet.has(idx);
      const wibTime = getWibTimeComponents(rec.timestamp);

      // If user selected "Hanya Koreksi Anomali" and this point is clean, keep raw
      if (onlyAnomalies && !isAnomaly) {
        const rawRh = Number((rec as any)["humidity"]);
        return {
          timestamp: rec.timestamp,
          timestampInSeconds: Math.floor(rec.timestamp / 1000),
          timeFormatted: rec.timeFormatted || wibTime.timeFormatted,
          dateFormatted: rec.dateFormatted || wibTime.dateFormatted,
          rawVal: Number.isFinite(rawVal) ? rawVal : 0,
          correctedVal: Number.isFinite(rawVal) ? rawVal : 0,
          diff: 0,
          isModified: false,
          isAnomaly: false,
          recoveredRhVal: Number.isFinite(rawRh) ? rawRh : undefined,
          rawRhVal: Number.isFinite(rawRh) ? rawRh : undefined,
          diffRh: 0,
          isRhModified: false,
        };
      }

      let targetVal = Number.isFinite(rawVal) ? rawVal : firstValidVal;

      switch (correctionMethod) {
        case "offset": {
          targetVal = targetVal + offsetValue;
          break;
        }
        case "drift": {
          const alpha = Math.min(1, Math.max(0, (rec.timestamp - t0) / span));
          const currentDrift = driftStart + alpha * (driftEnd - driftStart);
          targetVal = targetVal + currentDrift;
          break;
        }
        case "clamp": {
          targetVal = Math.min(clampMax, Math.max(clampMin, targetVal));
          break;
        }
        case "scale": {
          targetVal = targetVal * scaleFactor;
          break;
        }
        case "interpolate": {
          if (validAnchors.length === 0) {
            break;
          }

          let leftPos = 0;
          let rightPos = validAnchors.length - 1;

          if (onlyAnomalies) {
            const pair = findSurroundingAnchors(idx);
            leftPos = pair.leftPos;
            rightPos = pair.rightPos;
          }

          // Kasus celah di awal/akhir seri (hanya satu jangkar tersedia)
          if (leftPos === -1 || rightPos === -1) {
            const edgePos = leftPos !== -1 ? leftPos : rightPos;
            const edgeAnchor = validAnchors[edgePos];
            if (interpolationSubMethod === "solar_cosine_hermite" || interpolationSubMethod === "model_guided") {
              const refT = getUnifiedRefValAtTimestamp(rec.timestamp, varKey);
              const refEdge = getUnifiedRefValAtTimestamp(edgeAnchor.timestamp, varKey);
              targetVal =
                refT !== null && refEdge !== null && Number.isFinite(refT) && Number.isFinite(refEdge)
                  ? refT + (edgeAnchor.value - refEdge)
                  : edgeAnchor.value;
            } else {
              targetVal = edgeAnchor.value;
            }
            break;
          }

          const anchorA = validAnchors[leftPos];
          const anchorB = validAnchors[rightPos];
          const slopeA = pchipSlopes[leftPos];
          const slopeB = pchipSlopes[rightPos];

          if (interpolationSubMethod === "solar_cosine_hermite") {
            const refT = getUnifiedRefValAtTimestamp(rec.timestamp, varKey);
            const refA = getUnifiedRefValAtTimestamp(anchorA.timestamp, varKey);
            const refB = getUnifiedRefValAtTimestamp(anchorB.timestamp, varKey);

            if (refT !== null && refA !== null && refB !== null) {
              targetVal = interpolateSolarCosineHermite(
                rec.timestamp,
                anchorA.timestamp,
                anchorB.timestamp,
                anchorA.value,
                anchorB.value,
                refT,
                refA,
                refB,
                baselineNightOffset
              );
            } else {
              targetVal = interpolateCubicHermite(
                rec.timestamp,
                anchorA.timestamp,
                anchorA.value,
                anchorB.timestamp,
                anchorB.value,
                slopeA,
                slopeB
              );
            }
          } else if (interpolationSubMethod === "model_guided") {
            targetVal = interpolateModelGuided(
              rec.timestamp,
              anchorA.timestamp,
              anchorA.value,
              anchorB.timestamp,
              anchorB.value,
              (ts) => getUnifiedRefValAtTimestamp(ts, varKey),
              slopeA,
              slopeB
            );
          } else if (interpolationSubMethod === "cubic_pchip") {
            targetVal = interpolateCubicHermite(
              rec.timestamp,
              anchorA.timestamp,
              anchorA.value,
              anchorB.timestamp,
              anchorB.value,
              slopeA,
              slopeB
            );
          } else if (interpolationSubMethod === "akima") {
            targetVal = interpolateHermiteWithSlopes(
              rec.timestamp,
              anchorA.timestamp,
              anchorA.value,
              anchorB.timestamp,
              anchorB.value,
              akimaSlopes[leftPos],
              akimaSlopes[rightPos]
            );
          } else {
            targetVal = interpolateTimeLinear(
              rec.timestamp,
              anchorA.timestamp,
              anchorA.value,
              anchorB.timestamp,
              anchorB.value
            );
          }
          break;
        }
      }

      // Hard Meteorological Invariant: RH clamped strictly between 0% and 100%
      if (selectedVar.key === "humidity") {
        targetVal = Math.min(100, Math.max(0, targetVal));
      }
      // Non-negative precipitation, radiation, wind & voltage
      if (
        selectedVar.key === "rainfall" ||
        selectedVar.key === "rainrate" ||
        selectedVar.key === "lux" ||
        selectedVar.key === "windSpeed" ||
        selectedVar.key === "volt"
      ) {
        targetVal = Math.max(0, targetVal);
      }

      // Rounding to designated decimals
      const roundedVal = Number(targetVal.toFixed(selectedVar.decimals));
      const diff = Number.isFinite(rawVal) ? roundedVal - rawVal : roundedVal;
      const isModified = Math.abs(diff) > 0.0001;

      // Thermodynamic Relative Humidity (RH) Recovery via Magnus-Tetens (opt-in eksplisit)
      let recoveredRhVal: number | undefined = undefined;
      let rawRhVal: number | undefined = undefined;
      let diffRh: number = 0;
      let isRhModified: boolean = false;

      if (selectedVar.key === "temperature" && syncRhRecovery) {
        const rawRh = Number((rec as any)["humidity"]);
        const rawDew = Number((rec as any)["dew"] ?? (rec as any)["dew_point"]);
        if (Number.isFinite(rawRh)) rawRhVal = rawRh;

        if (Number.isFinite(rawDew)) {
          const calcRh = recalculateRHMagnus(roundedVal, Math.min(rawDew, roundedVal));
          if (Number.isFinite(calcRh)) {
            recoveredRhVal = Number(Math.min(100, Math.max(0, calcRh)).toFixed(1));
            if (Number.isFinite(rawRh)) {
              diffRh = Number((recoveredRhVal - rawRh).toFixed(1));
              isRhModified = Math.abs(diffRh) > 0.1;
            }
          }
        }
      }

      return {
        timestamp: rec.timestamp,
        timestampInSeconds: Math.floor(rec.timestamp / 1000),
        timeFormatted: rec.timeFormatted || wibTime.timeFormatted,
        dateFormatted: rec.dateFormatted || wibTime.dateFormatted,
        rawVal: Number.isFinite(rawVal) ? rawVal : 0,
        correctedVal: roundedVal,
        diff: Number(diff.toFixed(selectedVar.decimals)),
        isModified,
        isAnomaly,
        recoveredRhVal,
        rawRhVal,
        diffRh,
        isRhModified,
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
    getUnifiedRefValAtTimestamp,
    baselineNightOffset,
    syncRhRecovery,
  ]);

  // Modified items count
  const modifiedItems = useMemo(() => {
    return correctedResults.filter((r) => r.isModified);
  }, [correctedResults]);

  // Active Reference Label for Charts & Legends
  const activeRefLabel = useMemo(() => {
    if (solarRefSource === "station_aws" && solarRefStationId) {
      const match = devices.find((d) => (d.authToken || d.id) === solarRefStationId);
      return match ? `${match.name} (${match.location || solarRefStationId})` : `AWS ${solarRefStationId}`;
    }
    return referenceModelName;
  }, [solarRefSource, solarRefStationId, devices, referenceModelName]);

  // Reference Guide Series for ECharts
  const refSeries = useMemo(() => {
    if (!showReferenceGuide) return [];
    return correctedResults.map((r) => {
      const v = getUnifiedRefValAtTimestamp(r.timestamp, selectedVar.key);
      return v != null ? Number(v.toFixed(selectedVar.decimals)) : null;
    });
  }, [showReferenceGuide, correctedResults, selectedVar, getUnifiedRefValAtTimestamp]);

  // 6. ECharts Configuration for Before vs After Preview
  const chartOptions = useMemo(() => {
    if (correctedResults.length === 0) return {};

    const timeLabels = correctedResults.map((r) => formatWibShortDateTime(r.timestamp));

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

    // Visual mark points for anomalies (filter NaN & downsample dense overlays cleanly)
    const finiteAnomalies = anomalies.filter((a) => Number.isFinite(a.value));
    const maxPins = 25;
    const step = finiteAnomalies.length > maxPins ? Math.ceil(finiteAnomalies.length / maxPins) : 1;
    const markPointData = finiteAnomalies
      .filter((_, idx) => idx % step === 0)
      .map((a) => ({
        name: a.reason,
        coord: [a.index, a.value],
        value:
          a.type === "wmo_boundary"
            ? "WMO"
            : a.type === "solar_overheating"
            ? "Surya"
            : a.type === "flatline"
            ? "Flat"
            : "Spike",
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
        name: `Acuan Baseline (${activeRefLabel.split(" ")[0]})`,
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
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Acuan (${activeRefLabel.split(" ")[0]})
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

          if (syncRhRecovery && item.recoveredRhVal != null && item.rawRhVal != null && selectedVar.key === "temperature") {
            const rhDiffSign = item.diffRh > 0 ? `+${item.diffRh}%` : `${item.diffRh}%`;
            html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5 border-t border-slate-100 dark:border-slate-800/60 mt-1 pt-1">
              <span class="flex items-center gap-1.5 text-blue-500 font-medium">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span> Pemulihan RH (Magnus)
              </span>
              <span class="font-mono font-semibold">${item.rawRhVal}% ➔ ${item.recoveredRhVal}% (${rhDiffSign})</span>
            </div>`;
          }

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
  }, [correctedResults, anomalies, selectedVar, isDarkMode, showReferenceGuide, refSeries, activeRefLabel, syncRhRecovery]);

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

    const rhModifiedItems = modifiedItems.filter(
      (m) => m.isRhModified && m.recoveredRhVal != null && m.rawRhVal != null
    );
    const meanRhRecovery = rhModifiedItems.length > 0
      ? rhModifiedItems.reduce((acc, m) => acc + (m.diffRh || 0), 0) / rhModifiedItems.length
      : 0;

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
      rhModifiedCount: rhModifiedItems.length,
      meanRhRecovery: meanRhRecovery.toFixed(1),
    };
  }, [correctedResults, modifiedItems, selectedVar]);

  // 6.5. Universal Gap Imputation Engine Execution (Projek_Rainfall / Model_Imputasi)
  const imputationResult = useMemo(() => {
    if (rawRecords.length === 0 || !loadedContext || loadedContext.sensorId !== sensorId) {
      return {
        grid: [] as ImputedGridPoint[],
        summary: {
          totalExpectedMinutes: 0,
          originalAvailableCount: 0,
          originalMissingCount: 0,
          microGapsCount: 0,
          microGapsMinutes: 0,
          macroGapsCount: 0,
          macroGapsMinutes: 0,
          filledMicroCount: 0,
          filledMacroCount: 0,
          completenessPercent: 0,
          segments: [] as GapSegment[],
        },
      };
    }

    // Gunakan rentang timestamp data yang benar-benar dimuat (WIB +07:00) agar perubahan draft tanggal tidak memicu celah palsu
    const startTs = loadedContext.startMs;
    const endTs = loadedContext.endMs;

    return runUniversalGapImputation(
      rawRecords,
      startTs,
      endTs,
      selectedVar.key,
      {
        microGapLimitMinutes: gapMicroLimitMinutes,
        enableSpatialTransfer: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "companion_ridge",
        enableModelGuided: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "model_guided",
        enableBoundaryBridging: enableGapBridging,
        enablePhysicsPostProcessing: enableGapPhysics,
      },
      refStationRecords,
      referenceGuidePoints
    );
  }, [
    rawRecords,
    loadedContext,
    sensorId,
    selectedVar.key,
    gapMicroLimitMinutes,
    gapImputeMethod,
    enableGapBridging,
    enableGapPhysics,
    refStationRecords,
    referenceGuidePoints,
  ]);

  // ECharts Option for Gap Imputation Preview
  const gapChartOptions = useMemo(() => {
    if (imputationResult.grid.length === 0) return {};

    const isMultiDay = imputationResult.grid.length > 1500;
    const timeLabels = imputationResult.grid.map((r) =>
      isMultiDay ? formatWibShortDateTime(r.timestamp) : r.timeFormatted.slice(0, 5)
    );
    const rawData = imputationResult.grid.map((r) => (r.isOriginal ? r.rawVal : null));
    const imputedData = imputationResult.grid.map((r) => r.imputedVal);

    // Calculate Y-axis bounds with meteorological invariants
    const allVals = imputationResult.grid.map((r) => r.imputedVal).filter((v) => Number.isFinite(v));
    const vMin = allVals.length > 0 ? Math.min(...allVals) : 20;
    const vMax = allVals.length > 0 ? Math.max(...allVals) : 35;
    const padding = Math.max(0.5, (vMax - vMin) * 0.1);
    let yMin = Number((vMin - padding).toFixed(1));
    let yMax = Number((vMax + padding).toFixed(1));
    if (selectedVar.key === "humidity") {
      yMin = Math.max(0, yMin);
      yMax = Math.min(100, yMax);
    } else if (["rainfall", "rainrate", "windSpeed", "lux", "volt"].includes(selectedVar.key)) {
      yMin = Math.max(0, yMin);
    }

    // Build MarkArea for gaps using category indices (aman pada multi-hari)
    const markAreaPieces: any[] = imputationResult.summary.segments.map((seg) => {
      const isMicro = seg.type === "micro";
      return [
        {
          name: isMicro ? `Gap Mikro (${seg.durationMinutes}m)` : `Gap Makro (${seg.durationMinutes}m)`,
          xAxis: seg.startIndex,
          itemStyle: {
            color: isMicro
              ? isDarkMode
                ? "rgba(251, 191, 36, 0.08)"
                : "rgba(251, 191, 36, 0.15)"
              : isDarkMode
              ? "rgba(168, 85, 247, 0.10)"
              : "rgba(168, 85, 247, 0.18)",
          },
        },
        {
          xAxis: seg.endIndex,
        },
      ];
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", snap: true },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return "";
          const idx = params[0].dataIndex;
          const pt = imputationResult.grid[idx];
          if (!pt) return "";

          let html = `<div class="font-sans text-xs">
            <div class="font-bold border-b border-slate-200 dark:border-slate-700 pb-1 mb-1.5 flex items-center justify-between gap-4">
              <span>Waktu: ${pt.dateFormatted} WIB</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${pt.isOriginal ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"}">
                ${pt.isOriginal ? "DATA ASLI" : `IMPUTASI (${pt.imputationPhase.toUpperCase()})`}
              </span>
            </div>`;

          if (pt.isOriginal) {
            html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
              <span class="text-emerald-600 font-medium">Observasi Sensor:</span>
              <span class="font-mono font-bold">${pt.rawVal} ${selectedVar.unit}</span>
            </div>`;
          } else {
            html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
              <span class="text-purple-600 font-medium">Nilai Terimputasi:</span>
              <span class="font-mono font-bold text-purple-600 dark:text-purple-400">${pt.imputedVal} ${selectedVar.unit}</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-1">
              Status Celah: <strong class="text-amber-600">${pt.gapType === "micro" ? "Gap Mikro (≤15m)" : "Gap Makro (>15m)"}</strong>
            </div>`;
          }

          html += `</div>`;
          return html;
        },
      },
      legend: {
        top: 8,
        right: 16,
        textStyle: { color: isDarkMode ? "#94A3B8" : "#475569", fontSize: 12 },
      },
      grid: { left: "3%", right: "3%", bottom: "8%", top: "14%", containLabel: true },
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
        nameTextStyle: { color: isDarkMode ? "#94A3B8" : "#64748B", fontSize: 12 },
        splitLine: { lineStyle: { color: isDarkMode ? "#1E293B" : "#F1F5F9", type: "dashed" } },
      },
      series: [
        {
          name: "Data Asli Sensor",
          type: "line",
          data: rawData,
          symbol: "circle",
          symbolSize: 4,
          connectNulls: false,
          itemStyle: { color: "#10B981" },
          lineStyle: { width: 2, color: "#10B981" },
        },
        {
          name: "Kurva Hasil Imputasi Celah (Model Hibrida)",
          type: "line",
          data: imputedData,
          symbol: "none",
          itemStyle: { color: "#8B5CF6" },
          lineStyle: { width: 2.5, color: "#8B5CF6", type: "solid" },
          markArea: {
            silent: true,
            data: markAreaPieces,
          },
        },
      ],
    };
  }, [imputationResult, isDarkMode, selectedVar]);

  // Cache invalidation helper for server /api/sensors range cache
  const invalidateServerSensorCache = useCallback(async (sid: string) => {
    try {
      await fetch("/api/sensors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invalidate", sensorId: sid }),
      });
    } catch {
      // Non-critical if offline or dev cache miss
    }
  }, []);

  // Handle Apply Gap Imputation to Firebase RTDB (full multi-variable telemetry nodes)
  const handleApplyGapImputation = async () => {
    if (!loadedContext || isFilterDirty) {
      toast({
        title: "Periode Belum Dimuat",
        description: "Klik tombol \"Ambil Data Target\" terlebih dahulu sebelum menyimpan imputasi.",
        variant: "destructive",
      });
      setShowImputationConfirmModal(false);
      return;
    }

    const imputedPoints = imputationResult.grid.filter((pt) => pt.isImputed);
    if (imputedPoints.length === 0) {
      toast({
        title: "Tidak Ada Celah Data",
        description: "Seluruh menit observasi telah terisi secara penuh (100%).",
      });
      setShowImputationConfirmModal(false);
      return;
    }

    try {
      setIsApplyingImputation(true);

      const nodePayloads = buildCompleteGapNodePayloads(
        imputationResult.grid,
        rawRecords,
        loadedContext.startMs,
        loadedContext.endMs,
        selectedVar.key,
        {
          microGapLimitMinutes: gapMicroLimitMinutes,
          enableSpatialTransfer: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "companion_ridge",
          enableModelGuided: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "model_guided",
          enableBoundaryBridging: enableGapBridging,
          enablePhysicsPostProcessing: enableGapPhysics,
        },
        refStationRecords,
        referenceGuidePoints
      );

      const writtenNodes = await batchWriteGapImputedNodes(sensorId, nodePayloads);

      const startEpoch = Math.floor(loadedContext.startMs / 1000);
      const endEpoch = Math.floor(loadedContext.endMs / 1000);

      await logSensorCorrection({
        sensorId,
        timestamp: Date.now(),
        field: selectedVar.key,
        method: `GAP_IMPUTATION_${gapImputeMethod.toUpperCase()}`,
        pointCount: writtenNodes,
        range: {
          start: startEpoch,
          end: endEpoch,
          startDateFormatted: `${loadedContext.startDateStr} ${loadedContext.startTimeStr} WIB`,
          endDateFormatted: `${loadedContext.endDateStr} ${loadedContext.endTimeStr} WIB`,
        },
        parameters: {
          microGapLimit: gapMicroLimitMinutes,
          gapMethod: gapImputeMethod,
          boundaryBridging: enableGapBridging,
          physicsPostProcess: enableGapPhysics,
          totalGapsFilled: writtenNodes,
          multiVarCompleted: true,
          companionStation:
            solarRefStationId && solarRefStationId !== sensorId ? solarRefStationId : undefined,
        },
        appliedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss") + " WIB",
        appliedBy: user?.displayName || user?.email || "Admin Operator",
        notes:
          auditNotes.trim() ||
          `Imputasi celah data ${writtenNodes} menit lengkap multi-variabel menggunakan algoritma 2-Fase Hibrida`,
      });

      await invalidateServerSensorCache(sensorId);

      toast({
        title: "Imputasi Celah Berhasil Disimpan",
        description: `Berhasil menuliskan ${writtenNodes} node waktu lengkap (multi-variabel + ${selectedVar.key}) ke Firebase RTDB.`,
      });

      setShowImputationConfirmModal(false);
      setAuditNotes("");
      await fetchDataForRange(
        loadedContext.startDateStr,
        loadedContext.startTimeStr,
        loadedContext.endDateStr,
        loadedContext.endTimeStr
      );
      await loadAuditTrail(sensorId);
    } catch (err: any) {
      console.error("Gagal menyimpan imputasi celah:", err);
      toast({
        title: "Gagal Menerapkan Imputasi",
        description: err.message || "Terjadi kesalahan saat menulis ke database.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingImputation(false);
    }
  };

  // 7. Apply Batch Correction to RTDB
  const handleApplyBatchCorrection = async () => {
    if (!loadedContext || isFilterDirty) {
      toast({
        title: "Periode Belum Dimuat",
        description: "Filter stasiun atau tanggal berubah. Klik \"Ambil Data Target\" terlebih dahulu.",
        variant: "destructive",
      });
      setShowConfirmModal(false);
      return;
    }

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
      const updates: BatchSensorFieldUpdate[] = [];
      let rhUpdateCount = 0;

      for (const item of modifiedItems) {
        updates.push({
          timestampInSeconds: item.timestampInSeconds,
          field: selectedVar.key,
          newValue: item.correctedVal,
        });

        if (
          syncRhRecovery &&
          selectedVar.key === "temperature" &&
          item.recoveredRhVal != null &&
          Number.isFinite(item.recoveredRhVal) &&
          item.isRhModified
        ) {
          updates.push({
            timestampInSeconds: item.timestampInSeconds,
            field: "humidity",
            newValue: item.recoveredRhVal,
          });
          rhUpdateCount++;
        }
      }

      // 1. Eksekusi batch updates ke RTDB
      const updatedCount = await batchUpdateSensorFields(sensorId, updates);

      // 2. Simpan rekaman audit trail (dibersihkan dari undefined/NaN di FetchingSensorData)
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
          interpolationSubMethod:
            correctionMethod === "interpolate" ? interpolationSubMethod : undefined,
          referenceModel:
            correctionMethod === "interpolate" ? activeRefLabel : undefined,
          solarRefSource:
            correctionMethod === "interpolate" && interpolationSubMethod === "solar_cosine_hermite"
              ? solarRefSource
              : undefined,
          solarThreshold:
            correctionMethod === "interpolate" &&
            (interpolationSubMethod === "solar_cosine_hermite" || enableSolarAnomalyCheck)
              ? solarThreshold
              : undefined,
          syncRhRecovery:
            selectedVar.key === "temperature" ? syncRhRecovery : undefined,
          rhPointsRecovered: rhUpdateCount > 0 ? rhUpdateCount : undefined,
          onlyAnomalies,
        },
        range: {
          start: loadedContext.startMs,
          end: loadedContext.endMs,
          startDateFormatted: `${loadedContext.startDateStr} ${loadedContext.startTimeStr} WIB`,
          endDateFormatted: `${loadedContext.endDateStr} ${loadedContext.endTimeStr} WIB`,
        },
        pointCount: updatedCount,
        notes: auditNotes.trim() || undefined,
        appliedBy: user?.email || user?.displayName || "Admin",
        appliedAt: format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: localeId }) + " WIB",
      };

      await logSensorCorrection(auditLog);
      await invalidateServerSensorCache(sensorId);

      toast({
        title: "Koreksi Berhasil Diterapkan!",
        description:
          rhUpdateCount > 0
            ? `${modifiedItems.length} titik ${selectedVar.label} diperbarui dan ${rhUpdateCount} titik Kelembapan (RH via Magnus) dipulihkan secara simultan di database.`
            : `${updatedCount} titik data untuk ${selectedVar.label} berhasil diperbarui di database.`,
      });

      setShowConfirmModal(false);
      setAuditNotes("");

      // Refresh data & audit trail
      await fetchDataForRange(
        loadedContext.startDateStr,
        loadedContext.startTimeStr,
        loadedContext.endDateStr,
        loadedContext.endTimeStr
      );
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

  const previewRows = useMemo(
    () => (showOnlyModifiedRows ? modifiedItems : correctedResults),
    [showOnlyModifiedRows, modifiedItems, correctedResults]
  );

  const previewTotalPages = useMemo(() => {
    if (previewPageSize <= 0 || previewRows.length === 0) return 1;
    return Math.max(1, Math.ceil(previewRows.length / previewPageSize));
  }, [previewRows.length, previewPageSize]);

  const safePreviewPage = Math.min(previewPage, previewTotalPages);

  const paginatedPreviewRows = useMemo(() => {
    if (previewPageSize <= 0) return previewRows;
    const startIdx = (safePreviewPage - 1) * previewPageSize;
    return previewRows.slice(startIdx, startIdx + previewPageSize);
  }, [previewRows, safePreviewPage, previewPageSize]);

  const handleExportPreviewCsv = useCallback(() => {
    if (previewRows.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada baris data pratinjau untuk diekspor ke CSV.",
      });
      return;
    }

    const escapeCsv = (val: string | number) => {
      const s = String(val);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const includeRh = syncRhRecovery && selectedVar.key === "temperature";
    const headers = [
      "Waktu (WIB)",
      "Timestamp (ms)",
      `Nilai Mentah (${selectedVar.unit})`,
      `Nilai Koreksi (${selectedVar.unit})`,
      `Selisih (${selectedVar.unit})`,
      "Status",
      ...(includeRh ? ["RH Mentah (%)", "RH Magnus (%)", "Selisih RH (%)"] : []),
    ];

    const lines = [headers.map(escapeCsv).join(",")];
    for (const row of previewRows) {
      const statusLabel = row.isAnomaly ? "Anomali" : row.isModified ? "Terkoreksi" : "Tetap";
      const baseCols = [
        row.dateFormatted,
        row.timestamp,
        row.rawVal,
        row.correctedVal,
        row.diff,
        statusLabel,
      ];
      if (includeRh) {
        baseCols.push(
          row.rawRhVal != null ? row.rawRhVal : "",
          row.recoveredRhVal != null ? row.recoveredRhVal : "",
          row.diffRh != null ? row.diffRh : ""
        );
      }
      lines.push(baseCols.map(escapeCsv).join(","));
    }

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateTag = loadedContext?.startDateStr || startDateStr;
    link.href = url;
    link.download = `koreksi-${sensorId || "aws"}-${selectedVar.key}-${dateTag}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [previewRows, syncRhRecovery, selectedVar, loadedContext, startDateStr, sensorId, toast]);

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
                  setRefStationRecords([]);
                  if (solarRefStationId === val) {
                    const alt =
                      val === "id-05" && devices.some((d) => (d.authToken || d.id) === "id-03")
                        ? devices.find((d) => (d.authToken || d.id) === "id-03")
                        : devices.find((d) => (d.authToken || d.id) !== val);
                    setSolarRefStationId(alt ? ((alt.authToken || alt.id) as string) : "");
                  }
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
                      ? formatWibFullDisplayDate(startDateStr)
                      : `${formatWibMediumDisplayDate(startDateStr)} – ${formatWibMediumDisplayDate(endDateStr)}`}
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

      {isFilterDirty && loadedContext && (
        <Alert className="border-amber-500/60 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-xs font-bold flex flex-wrap items-center justify-between gap-2">
            <span>Filter Stasiun / Rentang Waktu Belum Dimuat Ulang</span>
            <Button
              type="button"
              size="sm"
              onClick={handleFetchData}
              disabled={loading}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Muat Data Target Terbaru
            </Button>
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Data yang sedang tampil berasal dari stasiun <strong className="font-mono">{loadedContext.sensorId}</strong> periode{" "}
            <strong className="font-mono">
              {loadedContext.startDateStr} {loadedContext.startTimeStr} – {loadedContext.endDateStr} {loadedContext.endTimeStr} WIB
            </strong>
            . Klik &quot;Muat Data Target Terbaru&quot; atau &quot;Ambil Data Target&quot; sebelum menulis ke database.
          </AlertDescription>
        </Alert>
      )}

      {activeCalibrationVars.length > 0 && (
        <Alert className="border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200">
          <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <AlertTitle className="text-xs font-bold">
            Kalibrasi Otomatis Aktif di Lapisan Tampilan ({activeCalibrationVars.join(", ")})
          </AlertTitle>
          <AlertDescription className="text-xs mt-0.5">
            Stasiun ini memiliki profil kalibrasi aktif pada modul Kalibrasi Sensor. Halaman Koreksi Data ini menampilkan dan menyunting nilai <strong>RAW database</strong> secara langsung sebelum kalibrasi tampilan diterapkan.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs Navigation (2 Tabs: Workspace Koreksi & Riwayat Audit) */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid grid-cols-2 max-w-xs bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="workspace" className="text-xs flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Area Koreksi
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Riwayat Audit ({auditLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: WORKSPACE KOREKSI ================= */}
        <TabsContent value="workspace" className="space-y-6 mt-4">
          {/* Workspace Operation Mode Toggle Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mode Operasi:</span>
              <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setOperationMode("point_correction")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    operationMode === "point_correction"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" /> Koreksi Nilai &amp; Anomali
                </button>
                <button
                  type="button"
                  onClick={() => setOperationMode("gap_imputation")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    operationMode === "gap_imputation"
                      ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" /> Imputasi Celah Data (1440/Hari)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {operationMode === "gap_imputation" ? (
                <Badge variant="outline" className="text-xs border-purple-400 text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40">
                  {imputationResult.summary.originalMissingCount} Menit Celah Terdeteksi ({imputationResult.summary.segments.length} Segmen)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-indigo-400 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40">
                  {rawRecords.length} Titik Observasi Terpilih
                </Badge>
              )}
            </div>
          </div>

          {operationMode === "point_correction" ? (
            <div className="space-y-6">
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
                      Koreksi Radiasi Surya (Cosine-Hermite + Magnus RH)
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
                <div className="flex flex-wrap items-center gap-2">
                  {selectedVar.key === "temperature" && (
                    <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                      <Switch
                        id="enableSolarAnomalySwitch"
                        checked={
                          enableSolarAnomalyCheck ||
                          (correctionMethod === "interpolate" &&
                            interpolationSubMethod === "solar_cosine_hermite")
                        }
                        disabled={
                          correctionMethod === "interpolate" &&
                          interpolationSubMethod === "solar_cosine_hermite"
                        }
                        onCheckedChange={setEnableSolarAnomalyCheck}
                      />
                      <Label
                        htmlFor="enableSolarAnomalySwitch"
                        className="text-xs font-medium cursor-pointer text-amber-900 dark:text-amber-200"
                      >
                        Deteksi Overheating Surya
                      </Label>
                    </div>
                  )}
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
                      <NumericInputField
                        step={selectedVar.step}
                        value={offsetValue}
                        onCommit={setOffsetValue}
                        className="w-32 h-9 text-xs"
                      />
                      <input
                        type="range"
                        min={-10 * selectedVar.step * 10}
                        max={10 * selectedVar.step * 10}
                        step={selectedVar.step}
                        value={offsetValue}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v)) setOffsetValue(v);
                        }}
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
                        <NumericInputField
                          step={selectedVar.step}
                          value={driftStart}
                          onCommit={setDriftStart}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-slate-500">
                          Offset Akhir Rentang (δ₁): {driftEnd > 0 ? `+${driftEnd}` : driftEnd} {selectedVar.unit}
                        </Label>
                        <NumericInputField
                          step={selectedVar.step}
                          value={driftEnd}
                          onCommit={setDriftEnd}
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
                        <NumericInputField
                          step={selectedVar.step}
                          value={clampMin}
                          onCommit={setClampMin}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-slate-500">
                          Batas Atas Fisik (Max):
                        </Label>
                        <NumericInputField
                          step={selectedVar.step}
                          value={clampMax}
                          onCommit={setClampMax}
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
                      <NumericInputField
                        step={0.01}
                        min={0.1}
                        max={5.0}
                        value={scaleFactor}
                        onCommit={setScaleFactor}
                        className="w-32 h-9 text-xs"
                      />
                      <input
                        type="range"
                        min={0.5}
                        max={1.5}
                        step={0.005}
                        value={scaleFactor}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v)) setScaleFactor(v);
                        }}
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
                          Preset: Koreksi Radiasi Surya (S-Curve + Magnus RH)
                        </Button>
                      </div>
                    </div>

                    {/* Radio/Card Grid for 5 Sub-methods */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
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

                      {/* 5. Cosine-Hermite Solar Radiation + Magnus RH */}
                      <button
                        type="button"
                        onClick={() => {
                          setInterpolationSubMethod("solar_cosine_hermite");
                          if (solarRefSource === "station_aws" && refStationRecords.length === 0) {
                            fetchRefStationData(solarRefStationId);
                          } else if (solarRefSource === "model_ecmwf" && referenceGuidePoints.length === 0) {
                            fetchReferenceGuide();
                          }
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          interpolationSubMethod === "solar_cosine_hermite"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-500"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-700 dark:text-amber-300 mb-1">
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          Kosinus-Hermite + RH
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          Koreksi radiasi matahari kurva S bebas step-jump &amp; rekonstruksi RH sinkron via Magnus-Tetens.
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

                    {interpolationSubMethod === "solar_cosine_hermite" && (
                      <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-3.5 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-800/40 pb-2.5">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <Sun className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              Konfigurasi Koreksi Radiasi Panas Matahari (Cosine-Hermite S-Curve + Magnus RH)
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              Algoritma C0 &amp; C1 smooth transition mengeliminasi lonjakan akibat pemanasan radiasi surya langsung pada sensor, memulihkan RH termodinamika secara simultan.
                            </p>
                          </div>
                          {baselineNightOffset !== 0 && (
                            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 font-mono text-[11px] py-1">
                              Baseline Malam: {baselineNightOffset > 0 ? `+${baselineNightOffset.toFixed(2)}` : baselineNightOffset.toFixed(2)} °C
                            </Badge>
                          )}
                        </div>

                        {/* Dual Reference Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Sumber Data Referensi Cuaca:
                            </Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={solarRefSource === "station_aws" ? "default" : "outline"}
                                className={`h-8 text-xs flex-1 ${solarRefSource === "station_aws" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
                                onClick={() => {
                                  setSolarRefSource("station_aws");
                                  if (refStationRecords.length === 0) {
                                    fetchRefStationData(solarRefStationId);
                                  }
                                }}
                              >
                                <Database className="h-3.5 w-3.5 mr-1" /> Stasiun AWS Tetangga
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={solarRefSource === "model_ecmwf" ? "default" : "outline"}
                                className={`h-8 text-xs flex-1 ${solarRefSource === "model_ecmwf" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : ""}`}
                                onClick={() => {
                                  setSolarRefSource("model_ecmwf");
                                  if (referenceGuidePoints.length === 0) {
                                    fetchReferenceGuide();
                                  }
                                }}
                              >
                                <Sparkles className="h-3.5 w-3.5 mr-1" /> Model Atmosfer ECMWF
                              </Button>
                            </div>

                            {/* Source specific controls */}
                            {solarRefSource === "station_aws" ? (
                              <div className="flex items-center gap-2 pt-1">
                                <Select
                                  value={solarRefStationId}
                                  onValueChange={(val) => {
                                    setSolarRefStationId(val);
                                    fetchRefStationData(val);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs flex-1">
                                    <SelectValue placeholder="Pilih Stasiun Referensi" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {devices
                                      .filter((d) => (d.authToken || d.id) !== sensorId)
                                      .map((device) => {
                                        const devVal = (device.authToken || device.id) as string;
                                        return (
                                          <SelectItem key={device.id} value={devVal}>
                                            {device.name} ({devVal})
                                          </SelectItem>
                                        );
                                      })}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fetchRefStationData(solarRefStationId)}
                                  disabled={loadingRefStation}
                                  className="h-8 text-xs px-2.5"
                                  title="Segarkan data stasiun referensi"
                                >
                                  <RefreshCw className={`h-3 w-3 ${loadingRefStation ? "animate-spin" : ""}`} />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pt-1">
                                <Select
                                  value={referenceModelType}
                                  onValueChange={(val: "ecmwf_ifs" | "era5") => {
                                    setReferenceModelType(val);
                                    fetchReferenceGuide(undefined, startDateStr, endDateStr, val);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ecmwf_ifs">ECMWF IFS (9 km)</SelectItem>
                                    <SelectItem value="era5">ERA5 Reanalysis (31 km)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fetchReferenceGuide()}
                                  disabled={loadingReference}
                                  className="h-8 text-xs px-2.5"
                                  title="Segarkan data model ECMWF"
                                >
                                  <RefreshCw className={`h-3 w-3 ${loadingReference ? "animate-spin" : ""}`} />
                                </Button>
                              </div>
                            )}

                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              {solarRefSource === "station_aws" ? (
                                loadingRefStation ? (
                                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3 animate-spin" /> Mengunduh data stasiun {solarRefStationId}...
                                  </span>
                                ) : refStationRecords.length > 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    ✓ {refStationRecords.length} titik observasi stasiun {solarRefStationId} termuat.
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    ⚠ Belum ada titik data. Klik tombol segarkan untuk memuat stasiun {solarRefStationId}.
                                  </span>
                                )
                              ) : loadingReference ? (
                                <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                                  <RefreshCw className="h-3 w-3 animate-spin" /> Mengunduh model {referenceModelName}...
                                </span>
                              ) : referenceGuidePoints.length > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  ✓ {referenceGuidePoints.length} titik model {referenceModelName} siap digunakan.
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  ⚠ Model belum termuat. Klik tombol segarkan.
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Parameter Threshold */}
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  Ambang Batas Radiasi Surya (ΔT Excess): +{solarThreshold.toFixed(1)} °C
                                </Label>
                                <span className="text-[10px] text-slate-400 font-mono">09:00 - 17:30 WIB</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <NumericInputField
                                  step={0.1}
                                  min={0.5}
                                  max={10.0}
                                  value={solarThreshold}
                                  onCommit={setSolarThreshold}
                                  className="w-24 h-8 text-xs font-mono"
                                />
                                <input
                                  type="range"
                                  min={0.5}
                                  max={8.0}
                                  step={0.1}
                                  value={solarThreshold}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    if (Number.isFinite(v)) setSolarThreshold(v);
                                  }}
                                  className="flex-1 accent-amber-600 cursor-pointer"
                                />
                              </div>
                              <p className="text-[10px] text-slate-500">
                                Kelebihan suhu &Delta;T &gt; {solarThreshold.toFixed(1)}°C di atas baseline malam pada siang hari akan dikoreksi melengkung halus mengikuti referensi.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedVar.key === "temperature" && (
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-900/50">
                  <Switch
                    id="syncRhRecoverySwitch"
                    checked={syncRhRecovery}
                    onCheckedChange={setSyncRhRecovery}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="syncRhRecoverySwitch" className="text-xs font-semibold cursor-pointer text-cyan-900 dark:text-cyan-200">
                      Sinkronkan Pemulihan Kelembapan Relatif Termodinamika (Magnus-Tetens)
                    </Label>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Opsional untuk semua metode koreksi suhu: menghitung ulang kelembapan relatif fisis dari titik embun (T<sub>d</sub>) dan suhu terkoreksi, lalu menulis field <code className="font-mono text-indigo-600 dark:text-indigo-400">humidity</code> ke Firebase RTDB secara simultan.
                    </p>
                  </div>
                </div>
              )}
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
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 w-full md:w-auto">
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
                  {syncRhRecovery && selectedVar.key === "temperature" && (stats.rhModifiedCount ?? 0) > 0 && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Pemulihan RH (Magnus):</span>
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {Number(stats.meanRhRecovery) > 0 ? `+${stats.meanRhRecovery}` : stats.meanRhRecovery}% ({stats.rhModifiedCount} titik)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={modifiedItems.length === 0 || isApplying || isFilterDirty}
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
            <CardHeader className="py-3 px-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-slate-500" />
                  Rincian Titik Data Observasi ({previewRows.length.toLocaleString("id-ID")} Baris)
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Switch
                    id="showModifiedRowsSwitch"
                    checked={showOnlyModifiedRows}
                    onCheckedChange={(checked) => {
                      setShowOnlyModifiedRows(checked);
                      setPreviewPage(1);
                    }}
                  />
                  <Label htmlFor="showModifiedRowsSwitch" className="cursor-pointer text-xs">
                    Hanya Tampilkan Baris yang Berubah
                  </Label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleExportPreviewCsv}
                  disabled={previewRows.length === 0}
                  className="h-8 text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Ekspor CSV
                </Button>
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
                    {paginatedPreviewRows.map((row) => {
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
                            <div>{row.correctedVal} {selectedVar.unit}</div>
                            {row.isRhModified && row.recoveredRhVal !== undefined && (
                              <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">
                                RH: {row.rawRhVal}% → {row.recoveredRhVal}% ({row.diffRh && row.diffRh > 0 ? `+${row.diffRh}` : row.diffRh}%)
                              </div>
                            )}
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
                    {paginatedPreviewRows.length === 0 && (
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
            {previewRows.length > 0 && (
              <CardFooter className="py-2.5 px-5 border-t bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  {previewPageSize <= 0
                    ? `Menampilkan seluruh ${previewRows.length.toLocaleString("id-ID")} baris`
                    : `Menampilkan ${((safePreviewPage - 1) * previewPageSize + 1).toLocaleString("id-ID")}–${Math.min(safePreviewPage * previewPageSize, previewRows.length).toLocaleString("id-ID")} dari ${previewRows.length.toLocaleString("id-ID")} baris`}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={String(previewPageSize)}
                    onValueChange={(val) => {
                      setPreviewPageSize(Number(val));
                      setPreviewPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[118px] text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 / hal</SelectItem>
                      <SelectItem value="250">250 / hal</SelectItem>
                      <SelectItem value="0">Tampilkan Semua</SelectItem>
                    </SelectContent>
                  </Select>
                  {previewPageSize > 0 && previewTotalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={safePreviewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        className="h-7 px-2 text-[11px]"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="font-mono text-[11px] px-1.5">
                        {safePreviewPage}/{previewTotalPages}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={safePreviewPage >= previewTotalPages}
                        onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}
                        className="h-7 px-2 text-[11px]"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ================= GAP IMPUTATION WORKSPACE (PROJEK_RAINFALL / MODEL_IMPUTASI) ================= */}
          {/* 1. Summary KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <Card className="border shadow-2xs bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Grid Waktu Target
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                  {imputationResult.summary.totalExpectedMinutes.toLocaleString("id-ID")} Menit
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Resolusi Kontinu 1-Menit (1440/hari)
                </span>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Observasi Riil
                </span>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {imputationResult.summary.originalAvailableCount.toLocaleString("id-ID")} Menit
                </div>
                <span className="text-[10px] text-emerald-600/80 mt-0.5 block">
                  {((imputationResult.summary.originalAvailableCount / Math.max(1, imputationResult.summary.totalExpectedMinutes)) * 100).toFixed(1)}% Terisi Aktual
                </span>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Celah Kosong (Gaps)
                </span>
                <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                  {imputationResult.summary.originalMissingCount.toLocaleString("id-ID")} Menit
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {imputationResult.summary.microGapsCount} Mikro (≤15m) • {imputationResult.summary.macroGapsCount} Makro (&gt;15m)
                </span>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Kelengkapan Imputasi
                </span>
                <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {imputationResult.summary.completenessPercent}%
                </div>
                <span className="text-[10px] text-indigo-600/80 mt-0.5 block">
                  100% Kontinu Tanpa Celah
                </span>
              </CardContent>
            </Card>
          </div>

          {/* 2. Method Configuration Panel for Imputation */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-5 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Pilih Algoritma Imputasi Celah (Framework Model Imputasi)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Arsitektur Two-Phase Hybrid: Rekonstruksi mulus celah mikro dan transfer spasial makro bebas patahan vertikal
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Grid 4 Methods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  {
                    id: "auto_hybrid",
                    title: "2-Fase Hibrida Otomatis",
                    desc: "Micro Spline (≤15m) + Companion Ridge Transfer (>15m). Rekomendasi WMO & ML.",
                    icon: Sparkles,
                    color: "purple",
                  },
                  {
                    id: "companion_ridge",
                    title: "Companion Spatial Ridge",
                    desc: "Regresi harmonik diurnal antar stasiun AWS tetangga (id-03 / id-05 / id-01).",
                    icon: Database,
                    color: "indigo",
                  },
                  {
                    id: "model_guided",
                    title: "Panduan Model Cuaca",
                    desc: "ECMWF IFS (9 km) / ERA5 Reanalysis Open-Meteo via Boundary Residual Bridging.",
                    icon: Sun,
                    color: "cyan",
                  },
                  {
                    id: "pchip_spline",
                    title: "Harmonic PCHIP Spline",
                    desc: "Interpolasi polinomial kubik monoton bebas osilasi palsu (Runge overshoot).",
                    icon: Activity,
                    color: "emerald",
                  },
                ].map((m) => {
                  const IconComp = m.icon;
                  const isActive = gapImputeMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setGapImputeMethod(m.id as any)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isActive
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-500"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-purple-700 dark:text-purple-300 mb-1">
                        <IconComp className="h-3.5 w-3.5 text-purple-500" />
                        {m.title}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {m.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Imputation Settings Bar */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Companion station selector */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Stasiun Pendamping Acuan (Companion Node):
                  </Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={solarRefStationId}
                      onValueChange={(val) => {
                        setSolarRefStationId(val);
                        fetchRefStationData(val);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Pilih Stasiun" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices
                          .filter((d) => (d.authToken || d.id) !== sensorId)
                          .map((device) => {
                            const devVal = (device.authToken || device.id) as string;
                            return (
                              <SelectItem key={device.id} value={devVal}>
                                {device.name} ({devVal})
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fetchRefStationData(solarRefStationId)}
                      disabled={loadingRefStation}
                      className="h-8 text-xs px-2.5"
                      title="Segarkan data stasiun pendamping"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingRefStation ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {refStationRecords.length > 0 ? `✓ ${refStationRecords.length} titik observasi stasiun pendamping siap.` : "Memerlukan data stasiun tetangga untuk transfer Ridge."}
                  </span>
                </div>

                {/* Micro-gap threshold slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Batas Celah Mikro: {gapMicroLimitMinutes} Menit
                    </Label>
                    <span className="text-[10px] text-slate-400 font-mono">≤15m Spline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      value={Math.min(60, Math.max(5, gapMicroLimitMinutes))}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) setGapMicroLimitMinutes(v);
                      }}
                      className="flex-1 accent-purple-600 cursor-pointer"
                    />
                    <NumericInputField
                      min={5}
                      max={120}
                      step={5}
                      value={gapMicroLimitMinutes}
                      onCommit={(v) => setGapMicroLimitMinutes(Math.round(v))}
                      className="w-16 h-7 text-xs font-mono text-right px-2"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Celah di atas {gapMicroLimitMinutes} menit diisi via Macro Ridge Transfer / Model.
                  </span>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableBridgingSwitch"
                      checked={enableGapBridging}
                      onCheckedChange={setEnableGapBridging}
                    />
                    <Label htmlFor="enableBridgingSwitch" className="cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Boundary Residual Bridging (Δ=0.00 di Titik Batas)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enablePhysicsSwitch"
                      checked={enableGapPhysics}
                      onCheckedChange={setEnableGapPhysics}
                    />
                    <Label htmlFor="enablePhysicsSwitch" className="cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Physics Post-Processing (Savitzky-Golay &amp; Magnus)
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. ECharts Gap Imputation Visualizer */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4 px-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  Pratinjau Rekonstruksi Grid 1-Menit (Data Asli vs Celah Terimputasi)
                </CardTitle>
                <CardDescription className="text-xs">
                  Titik hijau = Observasi Riil | Garis ungu = Hasil Imputasi Mulus | Area berbayang = Segmen Celah Tertutup
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 text-xs">
                {imputationResult.grid.length} Menit Kontinu
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {imputationResult.grid.length === 0 ? (
                <div className="h-[360px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Database className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm">Silakan pilih stasiun dan rentang waktu lalu klik &quot;Ambil Data Target&quot;</p>
                </div>
              ) : (
                <ReactECharts
                  option={gapChartOptions}
                  style={{ height: "380px", width: "100%" }}
                  opts={{ renderer: "canvas" }}
                />
              )}
            </CardContent>

            <CardFooter className="py-3 px-5 border-t bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
                <div>
                  <span>Total Celah Diisi: </span>
                  <strong className="text-purple-600 dark:text-purple-400 font-mono">
                    {imputationResult.summary.originalMissingCount} Menit
                  </strong>
                </div>
                <div>
                  <span>Fase 1 (Mikro): </span>
                  <strong className="font-mono text-amber-600">{imputationResult.summary.filledMicroCount} m</strong>
                </div>
                <div>
                  <span>Fase 2 (Makro): </span>
                  <strong className="font-mono text-purple-600">{imputationResult.summary.filledMacroCount} m</strong>
                </div>
              </div>

              <Button
                onClick={() => setShowImputationConfirmModal(true)}
                disabled={imputationResult.summary.originalMissingCount === 0 || isApplyingImputation || isFilterDirty}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm h-9 px-4 ml-auto"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Tuliskan Data Imputasi ke Firebase ({imputationResult.summary.originalMissingCount} Menit)
              </Button>
            </CardFooter>
          </Card>

          {/* 4. Table of Gap Segments */}
          <Card className="border shadow-sm">
            <CardHeader className="py-3 px-5 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                Daftar Segmen Celah Data yang Terdeteksi &amp; Terisi ({imputationResult.summary.segments.length} Segmen)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-60">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 pl-5 font-semibold">Segmen ID</th>
                      <th className="p-2.5 font-semibold">Waktu Mulai (WIB)</th>
                      <th className="p-2.5 font-semibold">Waktu Selesai (WIB)</th>
                      <th className="p-2.5 font-semibold">Durasi</th>
                      <th className="p-2.5 font-semibold">Kategori</th>
                      <th className="p-2.5 font-semibold">Nilai Batas (Start → End)</th>
                      <th className="p-2.5 pr-5 font-semibold">Metode Rekonstruksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {imputationResult.summary.segments.map((seg, idx) => (
                      <tr key={seg.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-2.5 pl-5 font-mono text-slate-500">#{idx + 1}</td>
                        <td className="p-2.5 font-mono">{getWibTimeComponents(seg.startTs).dateFormatted}</td>
                        <td className="p-2.5 font-mono">{getWibTimeComponents(seg.endTs).dateFormatted}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-200">{seg.durationMinutes} Menit</td>
                        <td className="p-2.5">
                          {seg.type === "micro" ? (
                            <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 text-[10px] py-0 px-1.5">
                              Mikro (≤{gapMicroLimitMinutes}m)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-purple-400 text-purple-600 dark:text-purple-400 text-[10px] py-0 px-1.5">
                              Makro (&gt;{gapMicroLimitMinutes}m)
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">
                          {seg.valBefore !== null ? `${seg.valBefore} ${selectedVar.unit}` : "Awal Rentang"} ➔{" "}
                          {seg.valAfter !== null ? `${seg.valAfter} ${selectedVar.unit}` : "Akhir Rentang"}
                        </td>
                        <td className="p-2.5 pr-5">
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {seg.type === "micro" ? "Fase 1 (Spline Hermite)" : `Fase 2 (${gapImputeMethod.toUpperCase()})`}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {imputationResult.summary.segments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center p-6 text-slate-400">
                          Tidak ditemukan celah data kosong pada rentang waktu ini. Observasi 100% lengkap!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
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
                <span>
                  {loadedContext
                    ? `${loadedContext.startDateStr} ${loadedContext.startTimeStr} s/d ${loadedContext.endDateStr} ${loadedContext.endTimeStr}`
                    : `${startDateStr} ${startTimeStr} s/d ${endDateStr} ${endTimeStr}`}{" "}
                  WIB
                </span>
              </div>
            </div>

            {syncRhRecovery && selectedVar.key === "temperature" && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">⚡ Pembaruan Simultan Atomik Aktif:</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Menulis nilai Suhu Udara ({modifiedItems.length} titik) dan Kelembapan Relatif ({stats?.rhModifiedCount || 0} titik via formula Magnus-Tetens) secara bersamaan ke node Firebase RTDB.
                  </p>
                </div>
              </div>
            )}

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

      {/* 6. Gap Imputation Execution Confirmation Modal */}
      <Dialog open={showImputationConfirmModal} onOpenChange={setShowImputationConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Sparkles className="h-5 w-5 text-purple-500" /> Konfirmasi Penulisan Imputasi Celah ke Database
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tindakan ini akan mensintesis dan menuliskan titik-titik data baru yang sebelumnya kosong ke Firebase Realtime Database dengan status IMPUTED.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Stasiun Target:</span>
                <span className="font-semibold">{selectedStationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parameter:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{selectedVar.label} ({selectedVar.key})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode Imputasi:</span>
                <span className="font-semibold">{gapImputeMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Menit Kosong Diisi:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{imputationResult.summary.originalMissingCount} Menit ({imputationResult.summary.segments.length} Segmen)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rentang Waktu:</span>
                <span>
                  {loadedContext
                    ? `${loadedContext.startDateStr} ${loadedContext.startTimeStr} s/d ${loadedContext.endDateStr} ${loadedContext.endTimeStr}`
                    : `${startDateStr} ${startTimeStr} s/d ${endDateStr} ${endTimeStr}`}{" "}
                  WIB
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 text-purple-600 shrink-0" />
              <div>
                <span className="font-bold">⚡ Grid Kontinu 1-Menit (1440/Hari):</span>
                <p className="text-[11px] text-purple-700 dark:text-purple-400">
                  Data yang ditulis dijamin mulus (C0/C1 continuous), bebas patahan vertikal, dan tervalidasi batasan fisik meteorologi WMO.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="imputeAuditNotes" className="text-xs font-medium">
                Catatan Alasan Imputasi (Opsional):
              </Label>
              <Input
                id="imputeAuditNotes"
                placeholder="Contoh: Imputasi celah data pasca pemadaman listrik menggunakan model spatial transfer"
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
              onClick={() => setShowImputationConfirmModal(false)}
              disabled={isApplyingImputation}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleApplyGapImputation}
              disabled={isApplyingImputation}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs"
            >
              {isApplyingImputation ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Menerapkan...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Ya, Tuliskan Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
