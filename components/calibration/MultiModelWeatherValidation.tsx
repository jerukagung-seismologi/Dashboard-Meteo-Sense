// components/calibration/MultiModelWeatherValidation.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchSensorDataByDateRange } from "@/lib/apiClient";
import { aggregateSensorToHourly } from "@/lib/bias-correction/preprocessing/hourlyAggregation";
import {
  SUPPORTED_NWP_MODELS,
  NWPModelMeta,
} from "@/app/api/weather/multi-model-validation/route";
import {
  Trophy,
  RefreshCw,
  Sliders,
  Layers,
  Thermometer,
  Droplets,
  Gauge,
  CloudFog,
  Wind,
  CloudRain,
  ShieldCheck,
  TrendingUp,
  Info,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MultiModelWeatherValidationProps {
  selectedStationId: string;
  stationName: string;
  stationCoords: { lat: number; lng: number };
  isDarkMode?: boolean;
}

type MetricVariableKey =
  | "temperature_2m"
  | "relative_humidity_2m"
  | "surface_pressure"
  | "dew_point_2m"
  | "wind_speed_10m"
  | "precipitation";

const VARIABLE_OPTIONS: {
  id: MetricVariableKey;
  label: string;
  unit: string;
  sensorField: string;
  icon: React.ElementType;
}[] = [
  { id: "temperature_2m", label: "Suhu Udara (2m)", unit: "°C", sensorField: "temperature", icon: Thermometer },
  { id: "relative_humidity_2m", label: "Kelembapan Relatif (RH)", unit: "%", sensorField: "humidity", icon: Droplets },
  { id: "surface_pressure", label: "Tekanan Permukaan (P)", unit: "hPa", sensorField: "pressure", icon: Gauge },
  { id: "dew_point_2m", label: "Titik Embun (Dew Point)", unit: "°C", sensorField: "dew", icon: CloudFog },
  { id: "wind_speed_10m", label: "Kecepatan Angin (10m)", unit: "m/s", sensorField: "windSpeed", icon: Wind },
  { id: "precipitation", label: "Curah Hujan (Hourly)", unit: "mm", sensorField: "rainTotal", icon: CloudRain },
];

const PRESET_OPTIONS: { label: string; days: number }[] = [
  { label: "24 Jam", days: 1 },
  { label: "3 Hari", days: 3 },
  { label: "7 Hari", days: 7 },
  { label: "14 Hari", days: 14 },
  { label: "30 Hari", days: 30 },
  { label: "90 Hari (Maksimal NWP)", days: 90 },
];

interface ModelVerificationMetric {
  modelId: string;
  modelName: string;
  country: string;
  category: string;
  color: string;
  rmse: number;
  mae: number;
  mbe: number;
  correlation: number;
  validPairs: number;
}

export const MultiModelWeatherValidation: React.FC<MultiModelWeatherValidationProps> = ({
  selectedStationId,
  stationName,
  stationCoords,
  isDarkMode = false,
}) => {
  const { toast } = useToast();

  // Control States
  const [pastDays, setPastDays] = useState<number>(7);
  const [selectedVariable, setSelectedVariable] = useState<MetricVariableKey>("temperature_2m");
  const [visibleModelIds, setVisibleModelIds] = useState<Set<string>>(() => {
    return new Set(SUPPORTED_NWP_MODELS.map((m) => m.id));
  });
  const [showEnsembleMean, setShowEnsembleMean] = useState<boolean>(true);

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nwpTimes, setNwpTimes] = useState<string[]>([]);
  const [nwpSeries, setNwpSeries] = useState<Record<string, { models: Record<string, (number | null)[]>; ensembleMean: (number | null)[] }>>({});
  const [awsHourlyMap, setAwsHourlyMap] = useState<Map<string, number>>(new Map());
  const [modelsMeta, setModelsMeta] = useState<NWPModelMeta[]>(SUPPORTED_NWP_MODELS);

  const activeVariableConfig = useMemo(() => {
    return VARIABLE_OPTIONS.find((v) => v.id === selectedVariable) || VARIABLE_OPTIONS[0];
  }, [selectedVariable]);

  // Main Data Fetcher
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const endMs = now.getTime();
      const startMs = endMs - pastDays * 24 * 3600 * 1000;

      // 1. Fetch AWS Ground Observation from Firestore / Database
      let hourlyAws = new Map<string, number>();
      if (selectedStationId) {
        try {
          const rawSensor = await fetchSensorDataByDateRange(
            selectedStationId,
            startMs,
            endMs,
            false,
            false,
            "hourly"
          );
          if (rawSensor && rawSensor.length > 0) {
            const aggregated = rawSensor.length > 1000 ? aggregateSensorToHourly(rawSensor) : rawSensor;
            aggregated.forEach((item) => {
              if (item.timestamp) {
                // Map timestamp to WIB ISO string "YYYY-MM-DDTHH:00"
                const d = new Date(item.timestamp);
                const isoWib =
                  d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }) +
                  "T" +
                  String(d.getHours()).padStart(2, "0") +
                  ":00";

                let val: number | null = null;
                if (selectedVariable === "temperature_2m") val = item.temperature ?? null;
                else if (selectedVariable === "relative_humidity_2m") val = item.humidity ?? null;
                else if (selectedVariable === "surface_pressure") val = item.pressure ?? null;
                else if (selectedVariable === "dew_point_2m") val = item.dew ?? null;
                else if (selectedVariable === "wind_speed_10m") val = item.windSpeed ?? null;
                else if (selectedVariable === "precipitation") val = (item as any).rainTotal ?? item.rainfall ?? 0;

                if (val !== null && !isNaN(Number(val))) {
                  hourlyAws.set(isoWib, Number(Number(val).toFixed(2)));
                }
              }
            });
          }
        } catch (awsErr) {
          console.warn("Gagal mengambil data observasi AWS stasiun:", awsErr);
        }
      }

      // 2. Fetch Multi-Model NWP Data from Internal API Route
      const res = await fetch(
        `/api/weather/multi-model-validation?latitude=${stationCoords.lat}&longitude=${stationCoords.lng}&past_days=${pastDays}&_t=${Date.now()}`
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Gagal memuat data multi-model.`);
      }

      const json = await res.json();
      setNwpTimes(json.times || []);
      setNwpSeries(json.series || {});
      if (json.models) {
        setModelsMeta(json.models);
      }
      setAwsHourlyMap(hourlyAws);
    } catch (err: any) {
      console.error("Error fetching multi-model validation data:", err);
      setError(err.message || "Terjadi kesalahan saat memuat data multi-model.");
    } finally {
      setLoading(false);
    }
  }, [selectedStationId, stationCoords, pastDays, selectedVariable]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Model Toggle Handlers
  const toggleModel = (modelId: string) => {
    setVisibleModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        if (next.size > 1) next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  const selectAllModels = () => {
    setVisibleModelIds(new Set(modelsMeta.map((m) => m.id)));
  };

  const selectCoreModelsOnly = () => {
    setVisibleModelIds(new Set(["ecmwf_ifs", "gfs_seamless", "icon_seamless"]));
  };

  // Compute Verification Metrics (RMSE, MAE, MBE, Pearson r) for each model
  const verificationLeaderboard = useMemo(() => {
    const variableSeries = nwpSeries[selectedVariable]?.models;
    if (!variableSeries || nwpTimes.length === 0) return [];

    const results: ModelVerificationMetric[] = [];

    // Also evaluate Ensemble Mean
    const ensembleSeries = nwpSeries[selectedVariable]?.ensembleMean || [];
    const modelsToEvaluate: (NWPModelMeta | { id: string; name: string; country: string; category: string; color: string })[] = [
      ...modelsMeta,
      {
        id: "ensemble_mean",
        name: "Ensemble Multi-Model Mean",
        country: "Konsensus",
        category: "Consensus",
        color: "#64748B",
      },
    ];

    modelsToEvaluate.forEach((m) => {
      const mSeries = m.id === "ensemble_mean" ? ensembleSeries : variableSeries[m.id];
      if (!mSeries || mSeries.length === 0) return;

      const pairs: { model: number; aws: number }[] = [];
      for (let i = 0; i < nwpTimes.length; i++) {
        const timeKey = nwpTimes[i];
        const mVal = mSeries[i];
        const aVal = awsHourlyMap.get(timeKey);

        if (mVal !== null && mVal !== undefined && aVal !== null && aVal !== undefined) {
          pairs.push({ model: mVal, aws: aVal });
        }
      }

      if (pairs.length === 0) {
        results.push({
          modelId: m.id,
          modelName: m.name,
          country: m.country,
          category: m.category,
          color: m.color,
          rmse: 0,
          mae: 0,
          mbe: 0,
          correlation: 0,
          validPairs: 0,
        });
        return;
      }

      const N = pairs.length;
      let sumSqErr = 0;
      let sumAbsErr = 0;
      let sumErr = 0;
      let sumM = 0;
      let sumO = 0;

      pairs.forEach((p) => {
        const diff = p.model - p.aws;
        sumSqErr += diff * diff;
        sumAbsErr += Math.abs(diff);
        sumErr += diff;
        sumM += p.model;
        sumO += p.aws;
      });

      const rmse = Math.sqrt(sumSqErr / N);
      const mae = sumAbsErr / N;
      const mbe = sumErr / N;

      // Pearson Correlation
      const meanM = sumM / N;
      const meanO = sumO / N;
      let num = 0;
      let denM = 0;
      let denO = 0;

      pairs.forEach((p) => {
        const devM = p.model - meanM;
        const devO = p.aws - meanO;
        num += devM * devO;
        denM += devM * devM;
        denO += devO * devO;
      });

      const denom = Math.sqrt(denM * denO);
      const correlation = denom > 0 ? num / denom : 0;

      results.push({
        modelId: m.id,
        modelName: m.name,
        country: m.country,
        category: m.category,
        color: m.color,
        rmse: Number(rmse.toFixed(2)),
        mae: Number(mae.toFixed(2)),
        mbe: Number(mbe.toFixed(2)),
        correlation: Number(correlation.toFixed(3)),
        validPairs: N,
      });
    });

    // Sort by RMSE ascending (lowest error first)
    return results.sort((a, b) => {
      if (a.validPairs === 0 && b.validPairs === 0) return 0;
      if (a.validPairs === 0) return 1;
      if (b.validPairs === 0) return -1;
      return a.rmse - b.rmse;
    });
  }, [nwpSeries, nwpTimes, selectedVariable, awsHourlyMap, modelsMeta]);

  // Best model (excluding ensemble mean)
  const bestIndividualModel = useMemo(() => {
    return verificationLeaderboard.find((m) => m.modelId !== "ensemble_mean" && m.validPairs > 0);
  }, [verificationLeaderboard]);

  // ECharts Configuration
  const chartOption = useMemo(() => {
    if (nwpTimes.length === 0) return {};

    const formattedTimes = nwpTimes.map((t) => {
      const d = new Date(t);
      return (
        d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) +
        " " +
        String(d.getHours()).padStart(2, "0") +
        ":00"
      );
    });

    // 1. AWS Ground Truth Series
    const awsSeriesData = nwpTimes.map((t) => awsHourlyMap.get(t) ?? null);

    const seriesList: any[] = [
      {
        name: `Observasi AWS (${stationName})`,
        type: selectedVariable === "precipitation" ? "bar" : "line",
        data: awsSeriesData,
        itemStyle: {
          color: isDarkMode ? "#F8FAFC" : "#0F172A",
        },
        lineStyle: {
          width: 3.5,
          type: "solid",
        },
        symbol: "circle",
        symbolSize: 6,
        z: 20,
      },
    ];

    // 2. Ensemble Mean Series (Dashed Line)
    if (showEnsembleMean) {
      const ensembleData = nwpSeries[selectedVariable]?.ensembleMean || [];
      seriesList.push({
        name: "Ensemble Konsensus Multi-Model",
        type: "line",
        data: ensembleData,
        itemStyle: { color: "#64748B" },
        lineStyle: {
          width: 2.5,
          type: "dashed",
        },
        symbol: "none",
        z: 15,
      });
    }

    // 3. Multi-Model Lines
    const varModelsData = nwpSeries[selectedVariable]?.models || {};
    modelsMeta.forEach((model) => {
      if (visibleModelIds.has(model.id)) {
        const mData = varModelsData[model.id] || [];
        seriesList.push({
          name: model.name,
          type: "line",
          data: mData,
          itemStyle: { color: model.color },
          lineStyle: {
            width: 1.8,
            type: "solid",
            opacity: 0.85,
          },
          symbol: "none",
          z: 10,
        });
      }
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
        borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        textStyle: {
          color: isDarkMode ? "#f8fafc" : "#0f172a",
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          let html = `<div class="p-1 space-y-1 font-sans text-xs">`;
          html += `<div class="font-bold border-b border-slate-200 dark:border-slate-700 pb-1 text-slate-500">${params[0].axisValue}</div>`;

          // Find AWS value if present
          const awsItem = params.find((p: any) => p.seriesName.startsWith("Observasi AWS"));
          const awsVal = awsItem?.value != null ? Number(awsItem.value) : null;

          params.forEach((item: any) => {
            const val = item.value != null ? `${Number(item.value).toFixed(2)} ${activeVariableConfig.unit}` : "—";
            let diffTag = "";
            if (awsVal !== null && item.value != null && !item.seriesName.startsWith("Observasi AWS")) {
              const diff = Number(item.value) - awsVal;
              const diffColor = diff > 0 ? "text-rose-500" : diff < 0 ? "text-sky-500" : "text-emerald-500";
              const diffSign = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
              diffTag = `<span class="${diffColor} text-[10px] font-mono ml-1.5">(${diffSign})</span>`;
            }

            html += `<div class="flex items-center justify-between gap-3 py-0.5">
              <span class="flex items-center gap-1.5">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};"></span>
                <span>${item.seriesName}</span>
              </span>
              <span class="font-mono font-semibold">${val} ${diffTag}</span>
            </div>`;
          });
          html += `</div>`;
          return html;
        },
      },
      legend: {
        show: false, // controlled by our custom UI chips
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "12%",
        top: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: formattedTimes,
        boundaryGap: selectedVariable === "precipitation",
        axisLine: { lineStyle: { color: isDarkMode ? "#475569" : "#cbd5e1" } },
        axisLabel: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 10,
          rotate: formattedTimes.length > 30 ? 30 : 0,
        },
      },
      yAxis: {
        type: "value",
        scale: selectedVariable !== "precipitation" && selectedVariable !== "wind_speed_10m",
        name: `${activeVariableConfig.label} (${activeVariableConfig.unit})`,
        nameTextStyle: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontSize: 11,
          padding: [0, 0, 0, 10],
        },
        axisLine: { lineStyle: { color: isDarkMode ? "#475569" : "#cbd5e1" } },
        splitLine: { lineStyle: { color: isDarkMode ? "#334155" : "#f1f5f9" } },
        axisLabel: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          bottom: "1%",
          height: 20,
          borderColor: isDarkMode ? "#334155" : "#e2e8f0",
          fillerColor: isDarkMode ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)",
          textStyle: { color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 10 },
        },
        {
          type: "inside",
        },
      ],
      series: seriesList,
    };
  }, [
    nwpTimes,
    nwpSeries,
    awsHourlyMap,
    selectedVariable,
    visibleModelIds,
    showEnsembleMean,
    modelsMeta,
    stationName,
    isDarkMode,
    activeVariableConfig,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 py-0.5 px-2.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verifikasi Model Cuaca Operasional (NWP vs AWS)
                </Badge>
                <Badge variant="outline" className="text-[10px] font-medium text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <Clock className="h-3 w-3 mr-1 text-sky-500" />
                  0-Day Lag · Interval 1 Jam Sinkron
                </Badge>
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="h-5 w-5 text-sky-500" />
                Validasi Presisi Prediksi Model Cuaca Dunia terhadap Stasiun Lapangan
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 max-w-4xl leading-relaxed">
                Menyandingkan titik observasi darat AWS jam-jaman dengan 9 model cuaca terkemuka (ECMWF IFS, AIFS, GFS, ICON, JMA, GEM, BoM, ARPEGE, CMA) hingga 92 hari riwayat operasional untuk mengidentifikasi model dengan galat terendah.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="self-start lg:self-center gap-1.5 text-xs font-semibold h-9 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Sinkronkan Ulang
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Controls: Preset & Variable Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Preset Hari Masa Lalu */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-500" />
                Rentang Hari Masa Lalu (Past Days)
              </label>
              <Select
                value={pastDays.toString()}
                onValueChange={(val) => setPastDays(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_OPTIONS.map((opt) => (
                    <SelectItem key={opt.days} value={opt.days.toString()} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Maksimal 92 hari ke belakang tanpa jeda hari (lag 0 hari).
              </p>
            </div>

            {/* 2. Variabel Meteorologi */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-sky-500" />
                Variabel Parameter Evaluasi
              </label>
              <Select
                value={selectedVariable}
                onValueChange={(val: any) => setSelectedVariable(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VARIABLE_OPTIONS.map((opt) => {
                    const IconComp = opt.icon;
                    return (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        <span className="flex items-center gap-2">
                          <IconComp className="h-3.5 w-3.5 text-sky-500" />
                          <span>{opt.label}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Satuan: {activeVariableConfig.unit} · Agregasi per 1 jam sinkron.
              </p>
            </div>

            {/* 3. Ringkasan Stasiun Acuan */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Stasiun Acuan Lapangan (Ground Truth)
              </span>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {stationName}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Lat: {stationCoords.lat.toFixed(4)}° · Lng: {stationCoords.lng.toFixed(4)}°
              </div>
            </div>
          </div>

          {/* Model Filter Pills */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-sky-500" />
                Pilihan Model Cuaca Ditampilkan di Grafik:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllModels}
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium"
                >
                  Pilih Semua (9 Model)
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={selectCoreModelsOnly}
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium"
                >
                  Model Utama (ECMWF, GFS, ICON)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {/* Observasi AWS Badge (Always On) */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 border border-transparent shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Observasi AWS (Ground Truth)</span>
              </div>

              {/* Ensemble Mean Toggle */}
              <button
                type="button"
                onClick={() => setShowEnsembleMean((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  showEnsembleMean
                    ? "bg-slate-200/80 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                    : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800 line-through opacity-60"
                }`}
              >
                <span className="w-2 h-0.5 border-t border-dashed border-slate-600 dark:border-slate-300"></span>
                <span>Ensemble Mean Konsensus</span>
              </button>

              {/* Individual Model Buttons */}
              {modelsMeta.map((m) => {
                const isVisible = visibleModelIds.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModel(m.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      isVisible
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 line-through opacity-60"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    ></span>
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interactive Chart */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-500" />
                Deret Waktu Perbandingan Jam-ke-Jam: {activeVariableConfig.label}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Garis tebal merupakan observasi stasiun AWS lapangan. Arahkan kursor pada grafik untuk melihat deviasi per model.
              </CardDescription>
            </div>
            {bestIndividualModel && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-bold gap-1 self-start sm:self-auto">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Model Terbaik: {bestIndividualModel.modelName} (RMSE: {bestIndividualModel.rmse} {activeVariableConfig.unit})
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="h-80 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="h-7 w-7 animate-spin text-sky-500" />
              <p className="text-xs">Mengunduh riwayat operasional 9 model cuaca dan menyinkronkan data AWS...</p>
            </div>
          ) : error ? (
            <div className="h-80 flex flex-col items-center justify-center gap-3 text-rose-500 p-6 text-center">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-semibold">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchData} className="text-xs">
                Coba Lagi
              </Button>
            </div>
          ) : (
            <div className="w-full">
              <ReactECharts
                option={chartOption}
                style={{ height: "420px", width: "100%" }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard & Metric Verification Table */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Leaderboard Akurasi Model Cuaca (Verifikasi terhadap AWS)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Peringkat keandalan model cuaca global diurutkan berdasarkan Root Mean Square Error (RMSE) terendah.
              </CardDescription>
            </div>
            <div className="text-xs text-slate-500">
              Periode: <strong>{pastDays} Hari Terakhir</strong> ({nwpTimes.length} Jam Observasi)
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4 font-bold w-12 text-center">Rank</th>
                  <th className="py-3 px-4 font-bold">Model Cuaca</th>
                  <th className="py-3 px-4 font-bold">Asal / Tipe</th>
                  <th className="py-3 px-4 font-bold text-right">
                    RMSE ({activeVariableConfig.unit})
                  </th>
                  <th className="py-3 px-4 font-bold text-right">
                    MAE ({activeVariableConfig.unit})
                  </th>
                  <th className="py-3 px-4 font-bold text-right">
                    Mean Bias (MBE)
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Korelasi (r)</th>
                  <th className="py-3 px-4 font-bold text-center">Status / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {verificationLeaderboard.map((item, idx) => {
                  const isTop1 = idx === 0 && item.validPairs > 0;
                  const isEnsemble = item.modelId === "ensemble_mean";

                  return (
                    <tr
                      key={item.modelId}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isTop1 ? "bg-amber-50/30 dark:bg-amber-950/20 font-semibold" : ""
                      } ${isEnsemble ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}`}
                    >
                      <td className="py-3 px-4 text-center">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-[11px] shadow-xs">
                            1
                          </span>
                        ) : idx === 1 && item.validPairs > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                            2
                          </span>
                        ) : idx === 2 && item.validPairs > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/60 text-white font-bold text-[11px]">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          ></span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium">
                            {item.modelName}
                          </span>
                          {isTop1 && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] py-0 px-1.5 font-bold">
                              Best Fit
                            </Badge>
                          )}
                          {isEnsemble && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-500">
                              Konsensus
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.country} · {item.category}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.validPairs > 0 ? item.rmse : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {item.validPairs > 0 ? item.mae : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {item.validPairs > 0 ? (
                          <span
                            className={
                              item.mbe > 0
                                ? "text-rose-600 dark:text-rose-400"
                                : item.mbe < 0
                                ? "text-sky-600 dark:text-sky-400"
                                : "text-emerald-600"
                            }
                          >
                            {item.mbe > 0 ? `+${item.mbe}` : item.mbe}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {item.validPairs > 0 ? item.correlation : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.validPairs === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Data AWS kosong</span>
                        ) : item.mbe > 0.5 ? (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                            Cenderung Overestimate
                          </span>
                        ) : item.mbe < -0.5 ? (
                          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                            Cenderung Underestimate
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Bias Sangat Rendah
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Educational Note */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong>Interpretasi Verifikasi Model:</strong> Nilai <strong>RMSE</strong> yang lebih kecil menunjukkan akurasi prediksi yang lebih tinggi. Nilai <strong>MBE positif (+)</strong> mengindikasikan model memprediksi nilai lebih tinggi daripada kondisi riil lapangan (overestimate), sedangkan <strong>MBE negatif (-)</strong> mengindikasikan underestimasi.
              </p>
              <p className="text-[11px] text-slate-500">
                Data AWS stasiun otomatis diagregasi per jam menggunakan standar meteorologi WMO/BMKG agar selaras sempurna 1-ke-1 dengan stempel waktu model cuaca global.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
