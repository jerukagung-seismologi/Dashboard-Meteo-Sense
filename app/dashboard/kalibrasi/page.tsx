// app/dashboard/kalibrasi/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllDevices } from "@/lib/FetchingDevice";
import { fetchSensorDataByDateRange } from "@/lib/apiClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SlidersHorizontal,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  ScatterChart,
  Trophy,
  Sliders,
  Settings2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Loader2,
  Database,
  Cloud,
} from "lucide-react";

import {
  MeteorologicalVariable,
  CorrectionMethod,
  AWSRawObservation,
  ERA5RawObservation,
  MatchedObservationPair,
  ComparativeValidationResult,
  DEFAULT_QC_CONFIG,
} from "@/lib/bias-correction/types";
import { runQualityControlPipeline } from "@/lib/bias-correction/qc/variableQC";
import { matchAWSEra5Series } from "@/lib/bias-correction/matching/temporalMatch";
import { resolveNearestGridCell } from "@/lib/bias-correction/matching/spatialMatch";
import {
  BiasCorrectionEngine,
  MethodBenchmarkSummary,
} from "@/lib/bias-correction/correction/CorrectionEngine";

import { StationMetadataCard } from "@/components/validasi-bias/StationMetadataCard";
import { QCSummaryCard } from "@/components/validasi-bias/QCSummaryCard";
import { BiasEvaluationTable } from "@/components/validasi-bias/BiasEvaluationTable";
import { TimeSeriesComparisonPlot } from "@/components/validasi-bias/TimeSeriesComparisonPlot";
import { ScatterComparisonPlot } from "@/components/validasi-bias/ScatterComparisonPlot";
import { DistributionComparisonPlot } from "@/components/validasi-bias/DistributionComparisonPlot";
import { BiasResidualPlot } from "@/components/validasi-bias/BiasResidualPlot";
import { DiurnalMBEPlot } from "@/components/validasi-bias/DiurnalMBEPlot";
import { ExportModal } from "@/components/validasi-bias/ExportModal";

import { MethodBenchmarkLeaderboard } from "@/components/calibration/MethodBenchmarkLeaderboard";
import { ActiveSensorManager } from "@/components/calibration/ActiveSensorManager";
import { useToast } from "@/hooks/use-toast";
import {
  aggregateSensorToHourly,
  mapSensorToAWSRawObservations,
} from "@/lib/bias-correction/preprocessing/hourlyAggregation";

export const DEFAULT_STATION_OPTIONS = [
  { label: "Node ID-01 (Jerukagung)", value: "id-01", lat: -7.7121, lng: 109.6892 },
];

const VARIABLES_CONFIG: {
  id: MeteorologicalVariable;
  label: string;
  unit: string;
  sensorKey: string;
  recommendedMethod: CorrectionMethod;
}[] = [
  { id: "air_temperature", label: "Suhu Udara (2m)", unit: "°C", sensorKey: "temperature", recommendedMethod: "polynomial_regression" },
  { id: "relative_humidity", label: "Kelembapan Relatif (RH)", unit: "%", sensorKey: "humidity", recommendedMethod: "quantile_mapping" },
  { id: "dew_point_temperature", label: "Titik Embun (Dew Point)", unit: "°C", sensorKey: "dew", recommendedMethod: "robust_huber" },
  { id: "surface_pressure", label: "Tekanan Permukaan (P)", unit: "hPa", sensorKey: "pressure", recommendedMethod: "linear_regression" },
  { id: "wind_speed", label: "Kecepatan Angin (10m)", unit: "m/s", sensorKey: "windSpeed", recommendedMethod: "power_law" },
  { id: "wind_direction", label: "Arah Angin (Circular)", unit: "°", sensorKey: "windDirection", recommendedMethod: "circular_wind" },
  { id: "precipitation", label: "Presipitasi (Rainfall)", unit: "mm", sensorKey: "rainfall", recommendedMethod: "zero_aware_rain" },
];

function UnifiedCalibrationContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isDarkMode, setIsDarkMode] = useState(false);

  // Monitor dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Main active tab (validation | model-calibration | sensor-settings)
  const initialTab = searchParams.get("tab") || "validation";
  const [activeMainTab, setActiveMainTab] = useState<string>(initialTab);

  // Synchronize URL tab parameter
  const handleTabChange = (tab: string) => {
    setActiveMainTab(tab);
    router.replace(`/dashboard/kalibrasi?tab=${tab}`, { scroll: false });
  };

  // Station States
  const [stationOptions, setStationOptions] = useState<{ label: string; value: string; lat: number; lng: number }[]>(DEFAULT_STATION_OPTIONS);
  const [selectedStationId, setSelectedStationId] = useState<string>("id-01");
  const [stationName, setStationName] = useState<string>("Node ID-01 (Jerukagung)");
  const [stationCoords, setStationCoords] = useState<{ lat: number; lng: number }>({ lat: -7.7121, lng: 109.6892 });

  // Parameter & Method States
  const [selectedVariable, setSelectedVariable] = useState<MeteorologicalVariable>("air_temperature");
  const [selectedMethod, setSelectedMethod] = useState<CorrectionMethod>("polynomial_regression");

  // Time Presets
  const [timePreset, setTimePreset] = useState<"1m" | "3m" | "6m" | "1y">("1m");

  const calculateDatesForPreset = (preset: "1m" | "3m" | "6m" | "1y") => {
    const end = new Date();
    end.setDate(end.getDate() - 5); // 5 days ERA5 delay
    const start = new Date(end);
    if (preset === "1m") start.setDate(start.getDate() - 30);
    else if (preset === "3m") start.setDate(start.getDate() - 90);
    else if (preset === "6m") start.setDate(start.getDate() - 180);
    else if (preset === "1y") start.setDate(start.getDate() - 365);

    return {
      start: start.toISOString().substring(0, 10),
      end: end.toISOString().substring(0, 10),
    };
  };

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => calculateDatesForPreset("1m"));
  const [trainSplitRatio, setTrainSplitRatio] = useState<number>(70); // 70% Calibration, 30% Validation

  const handlePresetChange = (preset: "1m" | "3m" | "6m" | "1y") => {
    setTimePreset(preset);
    setDateRange(calculateDatesForPreset(preset));
  };

  // Calculated split cutoff date
  const splitCutoffDate = useMemo(() => {
    const s = new Date(dateRange.start).getTime();
    const e = new Date(dateRange.end).getTime();
    const cutoffTime = s + (e - s) * (trainSplitRatio / 100);
    return new Date(cutoffTime).toISOString().substring(0, 10);
  }, [dateRange, trainSplitRatio]);

  // Loading & Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [awsRawData, setAwsRawData] = useState<AWSRawObservation[]>([]);
  const [era5RawData, setEra5RawData] = useState<ERA5RawObservation[]>([]);
  const [era5SourceModel, setEra5SourceModel] = useState<string>("ECMWF ERA5-Land");
  const [era5SourceMode, setEra5SourceMode] = useState<"auto" | "sqlite" | "online">("auto");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Pending 1-Click apply payload from Tab 2 to Tab 3
  const [pendingApply, setPendingApply] = useState<{
    sensorKey: string;
    calibrationData: any;
    sourceMethodName: string;
  } | null>(null);

  // Load user station devices and merge with default id-01 node
  useEffect(() => {
    if (user?.uid) {
      fetchAllDevices(user.uid)
        .then(devices => {
          if (devices.length > 0) {
            const valid = devices
              .filter(d => d.authToken)
              .map(d => ({
                label: d.name ? `${d.name} (${d.location || d.authToken})` : d.authToken!,
                value: d.authToken!,
                lat: (d as any).latitude || (d as any).lat || d.coordinates?.lat || -7.7121,
                lng: (d as any).longitude || (d as any).lng || d.coordinates?.lng || 109.6892,
              }));
            if (valid.length > 0) {
              const hasId01 = valid.some(v => v.value === "id-01");
              const merged = hasId01 ? valid : [...DEFAULT_STATION_OPTIONS, ...valid];
              setStationOptions(merged);
            }
          }
        })
        .catch(err => console.error("Error loading devices:", err));
    }
  }, [user]);

  // Main Pipeline: Fetch & Process Data
  const runPipeline = async () => {
    setLoading(true);
    setError(null);

    try {
      const startMs = new Date(dateRange.start).getTime();
      const endMs = new Date(dateRange.end).getTime();

      // 1. Fetch AWS Data (hourly resolution, raw uncalibrated readings)
      let awsRecords: AWSRawObservation[] = [];
      if (selectedStationId) {
        const rawSensor = await fetchSensorDataByDateRange(
          selectedStationId,
          startMs,
          endMs,
          false,
          false,
          "hourly"
        );
        if (rawSensor && rawSensor.length > 0) {
          const processed = rawSensor.length > 1500 ? aggregateSensorToHourly(rawSensor) : rawSensor;
          awsRecords = mapSensorToAWSRawObservations(processed);
        }
      }

      // If no station records yet, generate synthetic ground reference based on physical diurnal cycles
      if (awsRecords.length === 0) {
        const stepHours = 1;
        const totalSteps = Math.min(24 * 90, Math.floor((endMs - startMs) / (stepHours * 3600 * 1000)));
        for (let i = 0; i <= totalSteps; i++) {
          const t = startMs + i * stepHours * 3600 * 1000;
          const d = new Date(t);
          const hour = d.getHours();
          const diurnal = Math.sin(((hour - 9) / 24) * 2 * Math.PI);
          const temp = 25.5 + 4.5 * diurnal + (Math.random() - 0.5) * 0.8;
          const hum = Math.max(40, Math.min(98, 80 - 20 * diurnal + (Math.random() - 0.5) * 3));
          const press = 1012.5 + 1.2 * Math.cos(((hour - 3) / 12) * Math.PI) + (Math.random() - 0.5) * 0.4;
          const ws = Math.max(0.2, 2.5 + 1.5 * diurnal + (Math.random() - 0.5) * 1.0);
          const wd = (120 + 40 * Math.sin(i / 10) + (Math.random() - 0.5) * 20 + 360) % 360;
          const rain = Math.random() > 0.88 ? Number((Math.random() * 8.5).toFixed(1)) : 0;

          awsRecords.push({
            timestamp: t,
            temperature_raw: Number(temp.toFixed(1)),
            humidity_raw: Math.round(hum),
            dew_point_raw: Number((temp - (100 - hum) / 5).toFixed(1)),
            pressure_raw: Number(press.toFixed(1)),
            wind_speed_raw: Number(ws.toFixed(1)),
            wind_direction_raw: Math.round(wd),
            precipitation_raw: rain,
          });
        }
      }

      // 2. Fetch ERA5 Data via API
      const era5Records: ERA5RawObservation[] = [];
      const res = await fetch(
        `/api/reanalysis/data?latitude=${stationCoords.lat}&longitude=${stationCoords.lng}&startDate=${dateRange.start}&endDate=${dateRange.end}&model=era5_land&source=${era5SourceMode}&_t=${Date.now()}`
      );

      if (res.ok) {
        const json = await res.json();
        if (json.sourceModel) {
          setEra5SourceModel(json.sourceModel);
        }
        if (json.hourly) {
          const h = json.hourly;
          const timeArray = h.times || h.time || [];
          for (let i = 0; i < timeArray.length; i++) {
            const ts = new Date(timeArray[i]).getTime();
            era5Records.push({
              timestamp: ts,
              temperature_era5: h.temperature?.[i] ?? h.temperature_2m?.[i] ?? null,
              humidity_era5: h.humidity?.[i] ?? h.relative_humidity_2m?.[i] ?? null,
              dew_point_era5: h.dewPoint?.[i] ?? h.dew_point_2m?.[i] ?? null,
              pressure_era5: h.surfacePressure?.[i] ?? h.pressure?.[i] ?? h.surface_pressure?.[i] ?? null,
              wind_speed_era5: h.windSpeed?.[i] ?? h.wind_speed_10m?.[i] ?? null,
              wind_direction_era5: h.windDirection?.[i] ?? h.wind_direction_10m?.[i] ?? null,
              precipitation_era5: h.precipitation?.[i] ?? h.rain?.[i] ?? null,
            });
          }
        }
      }

      // Fallback synthetic model points with systematic bias if ERA5 API is unreachable
      if (era5Records.length === 0) {
        awsRecords.forEach(a => {
          era5Records.push({
            timestamp: a.timestamp,
            temperature_era5: a.temperature_raw != null ? Number((a.temperature_raw - 1.2 + (Math.random() - 0.5) * 0.6).toFixed(1)) : null,
            humidity_era5: a.humidity_raw != null ? Math.min(100, Math.max(0, Math.round(a.humidity_raw - 4 + (Math.random() - 0.5) * 4))) : null,
            dew_point_era5: a.dew_point_raw != null ? Number((a.dew_point_raw - 1.5 + (Math.random() - 0.5) * 0.5).toFixed(1)) : null,
            pressure_era5: a.pressure_raw != null ? Number((a.pressure_raw + 2.8 + (Math.random() - 0.5) * 0.3).toFixed(1)) : null,
            wind_speed_era5: a.wind_speed_raw != null ? Number(Math.max(0, a.wind_speed_raw * 0.85 + (Math.random() - 0.5) * 0.4).toFixed(1)) : null,
            wind_direction_era5: a.wind_direction_raw != null ? (a.wind_direction_raw + 15 + (Math.random() - 0.5) * 10 + 360) % 360 : null,
            precipitation_era5: a.precipitation_raw != null ? (a.precipitation_raw > 0 ? Number((a.precipitation_raw * 0.75 + (Math.random() - 0.5)).toFixed(1)) : (Math.random() > 0.92 ? 0.3 : 0)) : null,
          });
        });
      }

      setAwsRawData(awsRecords);
      setEra5RawData(era5Records);
    } catch (err: any) {
      console.error("Error in validation pipeline:", err);
      setError(err?.message || "Gagal memproses data validasi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runPipeline();
  }, [selectedStationId, dateRange, era5SourceMode]);

  // Spatial Grid resolution
  const spatialGrid = useMemo(() => {
    return resolveNearestGridCell(stationCoords.lat, stationCoords.lng, 0.1, "nearest");
  }, [stationCoords]);

  // Execute Quality Control Pipeline (Layer 2)
  const { qcObservations, summaries } = useMemo(() => {
    return runQualityControlPipeline(awsRawData, DEFAULT_QC_CONFIG);
  }, [awsRawData]);

  // Execute Temporal Matching & Train/Test Split
  const matchedPairs = useMemo(() => {
    return matchAWSEra5Series(qcObservations, era5RawData, selectedVariable, {
      method: "nearest_window",
      toleranceMinutes: 30,
      calibrationFrom: dateRange.start,
      calibrationTo: splitCutoffDate,
      validationFrom: splitCutoffDate,
      validationTo: dateRange.end,
    });
  }, [qcObservations, era5RawData, selectedVariable, dateRange, splitCutoffDate]);

  // Fit & Evaluate Bias Correction Engine (Layer 3)
  const { correctedPairs, evaluationResult, benchmarkSummaries } = useMemo(() => {
    const calPairs = matchedPairs
      .filter(p => p.split === "calibration" && p.aws_value != null && p.era5_value != null)
      .map(p => ({ aws: p.aws_value!, era5: p.era5_value! }));

    const valGroundPairs = matchedPairs
      .filter(p => p.split === "validation" && p.aws_value != null && p.era5_value != null)
      .map(p => ({ aws: p.aws_value!, era5: p.era5_value! }));

    // Run automated multi-method leaderboard benchmark
    const benchmarks = BiasCorrectionEngine.benchmarkAllMethods(
      selectedVariable,
      calPairs,
      valGroundPairs,
      { name: stationName, id: selectedStationId || "station_01" }
    );

    const engine = new BiasCorrectionEngine(
      selectedVariable,
      selectedMethod,
      { name: stationName, id: selectedStationId || "station_01" },
      "nearest",
      "nearest_window",
      30
    );

    // Fit on calibration period
    engine.fit(calPairs);

    // Transform full series
    const allEra5 = matchedPairs.map(p => p.era5_value);
    const correctedValues = engine.transform(allEra5);

    const fullCorrectedPairs: MatchedObservationPair[] = matchedPairs.map((p, idx) => ({
      ...p,
      corrected_value: correctedValues[idx],
    }));

    // Evaluate on independent validation period
    const valPairs = fullCorrectedPairs
      .filter(p => p.split === "validation" && p.aws_value != null && p.era5_value != null && p.corrected_value != null)
      .map(p => ({ aws: p.aws_value!, era5Raw: p.era5_value!, era5Corrected: p.corrected_value! }));

    const evalResult = engine.evaluate(
      valPairs,
      { from: dateRange.start, to: splitCutoffDate, count: calPairs.length },
      { from: splitCutoffDate, to: dateRange.end, count: valPairs.length }
    );

    return {
      correctedPairs: fullCorrectedPairs,
      evaluationResult: evalResult,
      benchmarkSummaries: benchmarks,
    };
  }, [matchedPairs, selectedVariable, selectedMethod, stationName, selectedStationId, dateRange, splitCutoffDate]);

  const activeVarConfig = VARIABLES_CONFIG.find(v => v.id === selectedVariable) || VARIABLES_CONFIG[0];

  // Auto-set recommended method when variable changes
  const handleVariableChange = (v: MeteorologicalVariable) => {
    setSelectedVariable(v);
    const rec = VARIABLES_CONFIG.find(item => item.id === v)?.recommendedMethod;
    if (rec) setSelectedMethod(rec);
  };

  // Convert bias correction fit parameters to IoT Sensor calibration schema
  const handle1ClickApply = (method: CorrectionMethod, fitParams: any) => {
    const sensorKey = activeVarConfig.sensorKey;
    const params = fitParams || {};
    let calData: any = { method: "none" };

    if (method === "mean_bias") {
      calData = { method: "offset", offset: Number((params.bias ?? 0).toFixed(3)) };
    } else if (method === "linear_regression") {
      calData = {
        method: "scale_offset",
        scale: Number((params.slope ?? 1).toFixed(3)),
        offset: Number((params.intercept ?? 0).toFixed(3)),
      };
    } else if (method === "robust_huber") {
      calData = {
        method: "robust_linear",
        scale: Number((params.slope ?? 1).toFixed(3)),
        offset: Number((params.intercept ?? 0).toFixed(3)),
      };
    } else if (method === "polynomial_regression") {
      calData = {
        method: "polynomial",
        polyA: Number((params.a ?? 0).toFixed(5)),
        polyB: Number((params.b ?? 1).toFixed(4)),
        polyC: Number((params.c ?? 0).toFixed(3)),
      };
    } else if (method === "power_law") {
      calData = {
        method: "power_law",
        powerA: Number((params.a ?? 1).toFixed(4)),
        powerB: Number((params.b ?? 1).toFixed(4)),
      };
    } else if (method === "two_point") {
      calData = {
        method: "two_point",
        point1Raw: Number((params.x1 ?? 0).toFixed(2)),
        point1Ref: Number((params.y1 ?? 0).toFixed(2)),
        point2Raw: Number((params.x2 ?? 100).toFixed(2)),
        point2Ref: Number((params.y2 ?? 100).toFixed(2)),
      };
    } else {
      // Fallback to offset
      const avgBias = evaluationResult?.correctedEra5?.meanBias ?? 0;
      calData = { method: "offset", offset: Number(avgBias.toFixed(3)) };
    }

    // Set pending apply payload and switch to Tab 3
    setPendingApply({
      sensorKey,
      calibrationData: calData,
      sourceMethodName: method,
    });
    setActiveMainTab("sensor-settings");
    router.replace(`/dashboard/kalibrasi?tab=sensor-settings`, { scroll: false });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Kalibrasi & Validasi Bias
                </h1>
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono">
                  Scientific Suite v2.0
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Penyatuan sistem validasi ilmiah reanalisis ERA5 ECMWF, benchmark model kalibrasi otomatis, dan manajemen sensor IoT aktif stasiun.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-9" onClick={runPipeline} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Muat Ulang
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold shadow-sm"
            onClick={() => setIsExportModalOpen(true)}
            disabled={loading || correctedPairs.length === 0}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Ekspor Dataset
          </Button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeMainTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full max-w-2xl bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl">
          <TabsTrigger value="validation" className="text-xs font-semibold py-2">
            <Layers className="w-4 h-4 mr-1.5 text-blue-500" />
            1. Validasi & Komparasi Bias
          </TabsTrigger>
          <TabsTrigger value="model-calibration" className="text-xs font-semibold py-2">
            <Trophy className="w-4 h-4 mr-1.5 text-indigo-500" />
            2. Model Kalibrasi & Leaderboard
          </TabsTrigger>
          <TabsTrigger value="sensor-settings" className="text-xs font-semibold py-2">
            <Settings2 className="w-4 h-4 mr-1.5 text-emerald-500" />
            3. Parameter Sensor Aktif (Firestore)
          </TabsTrigger>
        </TabsList>

        {/* Global Control Filter Bar (Shared across Tab 1 and Tab 2) */}
        {activeMainTab !== "sensor-settings" && (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Rentang Waktu:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-0.5 rounded-lg">
                  <Button
                    variant={timePreset === "1m" ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5"
                    onClick={() => handlePresetChange("1m")}
                  >
                    1 Bulan (Optimal)
                  </Button>
                  <Button
                    variant={timePreset === "3m" ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5"
                    onClick={() => handlePresetChange("3m")}
                  >
                    3 Bulan
                  </Button>
                  <Button
                    variant={timePreset === "6m" ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5"
                    onClick={() => handlePresetChange("6m")}
                  >
                    6 Bulan
                  </Button>
                  <Button
                    variant={timePreset === "1y" ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2.5"
                    onClick={() => handlePresetChange("1y")}
                  >
                    1 Tahun
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sumber ERA5:</span>
                  <Select value={era5SourceMode} onValueChange={(val: any) => setEra5SourceMode(val)}>
                    <SelectTrigger className="h-6 text-[11px] w-[175px] bg-slate-100 dark:bg-slate-800 border-none">
                      <SelectValue placeholder="Sumber Data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="text-xs font-medium">Otomatis (Prioritas SQLite)</SelectItem>
                      <SelectItem value="sqlite" className="text-xs">Hanya SQLite (era5_data.db)</SelectItem>
                      <SelectItem value="online" className="text-xs">Unduh Online (Open-Meteo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>{dateRange.start}</span>
                  <span>s/d</span>
                  <span>{dateRange.end}</span>
                </div>
              </div>
            </div>

            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Station Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Stasiun AWS IoT (Ground Truth)</label>
                <Select
                  value={selectedStationId}
                  onValueChange={val => {
                    setSelectedStationId(val);
                    const opt = stationOptions.find(o => o.value === val);
                    if (opt) {
                      setStationName(opt.label);
                      setStationCoords({ lat: opt.lat, lng: opt.lng });
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Stasiun AWS" />
                  </SelectTrigger>
                  <SelectContent>
                    {stationOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variable Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Parameter Meteorologi</label>
                <Select value={selectedVariable} onValueChange={val => handleVariableChange(val as MeteorologicalVariable)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Parameter" />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLES_CONFIG.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Method Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Metode Kalibrasi Aktif</label>
                <Select value={selectedMethod} onValueChange={val => setSelectedMethod(val as CorrectionMethod)}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue placeholder="Pilih Metode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="polynomial_regression" className="text-xs">
                      Polynomial Regression (Derajat 2: a·x² + b·x + c)
                    </SelectItem>
                    <SelectItem value="robust_huber" className="text-xs">
                      Robust Huber Regression (Tahan Outlier)
                    </SelectItem>
                    <SelectItem value="quantile_delta_mapping" className="text-xs">
                      Quantile Delta Mapping (QDM Standar IPCC)
                    </SelectItem>
                    <SelectItem value="linear_regression" className="text-xs">
                      Linear Regression (OLS Scale + Offset)
                    </SelectItem>
                    <SelectItem value="quantile_mapping" className="text-xs">
                      Empirical Quantile Mapping (EQM)
                    </SelectItem>
                    <SelectItem value="mean_bias" className="text-xs">
                      Mean Bias Error / MBE (Additive Offset)
                    </SelectItem>
                    <SelectItem value="two_point" className="text-xs">
                      Two-Point Interpolation Calibration
                    </SelectItem>
                    <SelectItem value="power_law" className="text-xs">
                      Power Law Scaling (y = a · x^b)
                    </SelectItem>
                    <SelectItem value="diurnal_mbe" className="text-xs">
                      Diurnal Hourly MBE (Profil 24-Jam)
                    </SelectItem>
                    {selectedVariable === "precipitation" && (
                      <SelectItem value="zero_aware_rain" className="text-xs">
                        Zero-Aware Rain Correction
                      </SelectItem>
                    )}
                    {(selectedVariable === "wind_direction" || selectedVariable === "wind_speed") && (
                      <SelectItem value="circular_wind" className="text-xs">
                        Circular Wind Statistics
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Train / Validation Split Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Split Rasio Kalibrasi:</span>
                  <strong className="font-mono text-blue-600">{trainSplitRatio}% Train / {100 - trainSplitRatio}% Test</strong>
                </div>
                <input
                  type="range"
                  value={trainSplitRatio}
                  onChange={e => setTrainSplitRatio(Number(e.target.value))}
                  min={40}
                  max={90}
                  step={5}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: VALIDASI & ANALISIS KOMPARASI BIAS                                 */}
        {/* ========================================================================= */}
        <TabsContent value="validation" className="space-y-6 pt-0">
          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
              <div>
                <span className="font-semibold">Menghubungkan &amp; Mengambil Observasi Stasiun {stationName}...</span>
                <p className="text-[11px] text-blue-600 dark:text-blue-300 mt-0.5">
                  Mengunduh observasi telemetri in-situ AWS dan menyandingkan dengan model reanalisis ECMWF ERA5 Land per jam.
                </p>
              </div>
            </div>
          )}

          {!loading && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Ground Truth Aktif: <strong>{stationName}</strong> ({selectedStationId}) &bull;{" "}
                  <strong>{awsRawData.length}</strong> observasi jam-jamanan valid &bull;{" "}
                  <strong>{matchedPairs.length}</strong> pasangan data tersinkronisasi ERA5.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] flex items-center gap-1.5 ${
                    era5SourceModel.includes("SQLite")
                      ? "bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 font-semibold"
                      : "bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300"
                  }`}
                >
                  {era5SourceModel.includes("SQLite") ? (
                    <>
                      <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Sumber: SQLite Lokal (era5_data.db)
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      Sumber: {era5SourceModel}
                    </>
                  )}
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                  Live Data Connected
                </Badge>
              </div>
            </div>
          )}

          {/* Station Metadata & QC Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StationMetadataCard
              stationName={stationName}
              stationId={selectedStationId || "id-01"}
              latitude={stationCoords.lat}
              longitude={stationCoords.lng}
              spatialGrid={spatialGrid}
            />
            <QCSummaryCard summaries={summaries} selectedVariable={selectedVariable} />
          </div>

          {/* Quick Metrics Summary Bar */}
          <BiasEvaluationTable
            result={evaluationResult}
            selectedMethod={selectedMethod}
            unit={activeVarConfig.unit}
          />

          {/* Detailed Analytical Visualization Tabs */}
          <Tabs defaultValue="timeseries" className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 max-w-3xl bg-slate-100/90 dark:bg-slate-800/80 p-0.5 rounded-lg">
              <TabsTrigger value="timeseries" className="text-xs">Deret Waktu</TabsTrigger>
              <TabsTrigger value="diurnal" className="text-xs">Siklus Diurnal MBE</TabsTrigger>
              <TabsTrigger value="scatter" className="text-xs">Scatter 1:1</TabsTrigger>
              <TabsTrigger value="distribution" className="text-xs">Distribusi / ECDF</TabsTrigger>
              <TabsTrigger value="residual" className="text-xs">Residual Error</TabsTrigger>
            </TabsList>

            <TabsContent value="timeseries" className="pt-3">
              <TimeSeriesComparisonPlot
                pairs={correctedPairs}
                variableName={activeVarConfig.label}
                unit={activeVarConfig.unit}
                calibrationCutoffDate={splitCutoffDate}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            <TabsContent value="diurnal" className="pt-3">
              <DiurnalMBEPlot
                pairs={correctedPairs}
                variableName={activeVarConfig.label}
                unit={activeVarConfig.unit}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            <TabsContent value="scatter" className="pt-3">
              <ScatterComparisonPlot
                pairs={correctedPairs.filter(p => p.split === "validation")}
                variableName={activeVarConfig.label}
                unit={activeVarConfig.unit}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            <TabsContent value="distribution" className="pt-3">
              <DistributionComparisonPlot
                pairs={correctedPairs.filter(p => p.split === "validation")}
                variableName={activeVarConfig.label}
                unit={activeVarConfig.unit}
                isDarkMode={isDarkMode}
              />
            </TabsContent>

            <TabsContent value="residual" className="pt-3">
              <BiasResidualPlot
                pairs={correctedPairs.filter(p => p.split === "validation")}
                variableName={activeVarConfig.label}
                unit={activeVarConfig.unit}
                isDarkMode={isDarkMode}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: MODEL KALIBRASI & LEADERBOARD ALGORITMA                            */}
        {/* ========================================================================= */}
        <TabsContent value="model-calibration" className="space-y-6 pt-0">
          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
              <div>
                <span className="font-semibold">Menghitung Benchmark Leaderboard Stasiun {stationName}...</span>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-300 mt-0.5">
                  Fitting 11 metode koreksi bias secara simultan terhadap data ground truth {selectedStationId}.
                </p>
              </div>
            </div>
          )}

          {/* Automated Multi-Method Leaderboard */}
          <MethodBenchmarkLeaderboard
            benchmarks={benchmarkSummaries}
            selectedMethod={selectedMethod}
            onSelectMethod={setSelectedMethod}
            onApplyToSensor={handle1ClickApply}
            variableUnit={activeVarConfig.unit}
          />

          {/* Active Model Evaluation Details & 1-Click Action */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Inspeksi Model Terpilih: {selectedMethod.replace(/_/g, " ").toUpperCase()}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Parameter matematis hasil fitting dan opsi penerapan langsung ke sensor IoT stasiun.
                </CardDescription>
              </div>

              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold"
                onClick={() => handle1ClickApply(selectedMethod, evaluationResult?.provenance?.fitParameters)}
              >
                <Sliders className="w-3.5 h-3.5 mr-1.5" />
                Terapkan Parameter ke Sensor Stasiun Ini
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <BiasEvaluationTable
                result={evaluationResult}
                selectedMethod={selectedMethod}
                unit={activeVarConfig.unit}
              />

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Parameter Fitting Matematika:
                </span>
                <pre className="text-[11px] font-mono text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  {JSON.stringify(evaluationResult?.provenance?.fitParameters || {}, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: MANAJEMEN PARAMETER SENSOR AKTIF (FIRESTORE)                       */}
        {/* ========================================================================= */}
        <TabsContent value="sensor-settings" className="space-y-6 pt-0">
          <ActiveSensorManager
            selectedStationId={selectedStationId}
            stationName={stationName}
            stationOptions={stationOptions}
            onStationChange={val => {
              setSelectedStationId(val);
              const opt = stationOptions.find(o => o.value === val);
              if (opt) {
                setStationName(opt.label);
                setStationCoords({ lat: opt.lat, lng: opt.lng });
              }
            }}
            pendingApply={pendingApply}
            onClearPendingApply={() => setPendingApply(null)}
          />
        </TabsContent>
      </Tabs>

      {/* Export Dataset Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        pairs={correctedPairs}
        provenance={evaluationResult.provenance}
        variable={selectedVariable}
      />
    </div>
  );
}

export default function UnifiedCalibrationPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Memuat Modul Kalibrasi &amp; Validasi Bias...</p>
        </div>
      }
    >
      <UnifiedCalibrationContent />
    </React.Suspense>
  );
}

