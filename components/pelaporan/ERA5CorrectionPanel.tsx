"use client"

import React, { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { 
  Zap, 
  CheckCircle2, 
  SlidersHorizontal, 
  RotateCcw, 
  Save, 
  TrendingUp, 
  AlertTriangle, 
  Loader2, 
  Info,
  Sparkles,
  Layers
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { WeatherRecord } from "@/lib/weatherUtils"
import { 
  calculateVariableBias, 
  CorrectionOffsets, 
  Era5DailyComparisonPoint, 
  BiasMetric 
} from "@/lib/reanalysis/era5Correction"
import { saveCalibrationDocument, getCalibrationDocument } from "@/lib/calibration/calibrationCrud"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false })

interface ERA5CorrectionPanelProps {
  sensorId: string
  sensorName: string
  lat?: number
  lon?: number
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  rawAwsData: WeatherRecord[]
  offsets: CorrectionOffsets
  onOffsetsChange: (offsets: CorrectionOffsets) => void
}

export function ERA5CorrectionPanel({
  sensorId,
  sensorName,
  lat = -7.67, // Default Kebumen
  lon = 109.65,
  startDate,
  endDate,
  rawAwsData,
  offsets,
  onOffsetsChange,
}: ERA5CorrectionPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [era5Data, setEra5Data] = useState<any | null>(null)
  const [selectedModel, setSelectedModel] = useState<"auto" | "ecmwf_ifs" | "era5_land">("auto")
  const [activeParam, setActiveParam] = useState<"temp" | "hum" | "press">("temp")
  const [savingCalibration, setSavingCalibration] = useState(false)

  // Fetch ERA5 / ECMWF IFS from /api/reanalysis/data
  const fetchEra5 = async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const url = `/api/reanalysis/data?latitude=${lat}&longitude=${lon}&startDate=${startDate}&endDate=${endDate}&model=${selectedModel}`
      console.log("Fetching ECMWF Data from:", url)
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`ECMWF API error: ${res.statusText}`)
      }
      const json = await res.json()
      setEra5Data(json)
      toast({
        title: "Data Pembanding Berhasil Dimuat",
        description: `${json.sourceModel || "ECMWF (9 km)"} (${startDate} s/d ${endDate}) siap digunakan untuk evaluasi bias.`,
      })
    } catch (err: any) {
      console.error("Failed to fetch ECMWF data", err)
      toast({
        title: "Gagal Mengambil Data ECMWF",
        description: err.message || "Pastikan koneksi internet aktif.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load existing calibration from Firestore on mount
  useEffect(() => {
    if (sensorId) {
      getCalibrationDocument(sensorId).then((config) => {
        if (config && config.enabled) {
          const tOffset = config.temperature?.method === "offset" ? config.temperature.offset || 0 : 0
          const hOffset = config.humidity?.method === "offset" ? config.humidity.offset || 0 : 0
          const pOffset = config.pressure?.method === "offset" ? config.pressure.offset || 0 : 0

          if (tOffset !== 0 || hOffset !== 0 || pOffset !== 0) {
            onOffsetsChange({
              tempOffset: tOffset,
              humOffset: hOffset,
              pressOffset: pOffset,
              enabled: true,
            })
          }
        }
      })
    }
  }, [sensorId, onOffsetsChange])

  // Build daily comparison pairs
  const comparisonSeries = useMemo<Era5DailyComparisonPoint[]>(() => {
    if (!rawAwsData || rawAwsData.length === 0) return []

    // If no ERA5 yet, map AWS only
    if (!era5Data || !era5Data.annual || !era5Data.annual.days) {
      return rawAwsData.map((d) => ({
        date: d.date,
        awsTempAvg: d.temperatureAvg,
        awsTempMin: d.temperatureMin,
        awsTempMax: d.temperatureMax,
        awsHumAvg: d.humidityAvg,
        awsPressAvg: d.pressureAvg,
        awsRainTot: d.rainfallTot,
        correctedTempAvg: offsets.enabled && d.temperatureAvg != null ? Number((d.temperatureAvg + offsets.tempOffset).toFixed(2)) : d.temperatureAvg,
        correctedHumAvg: offsets.enabled && d.humidityAvg != null ? Number((d.humidityAvg + offsets.humOffset).toFixed(1)) : d.humidityAvg,
        correctedPressAvg: offsets.enabled && d.pressureAvg != null ? Number((d.pressureAvg + offsets.pressOffset).toFixed(2)) : d.pressureAvg,
      }))
    }

    const era5Days: string[] = era5Data.annual.days || []
    const era5TempMeans: number[] = era5Data.annual.temperatureMean || []
    const era5HumMeans: number[] = era5Data.annual.humidityMean || []
    const era5PressMeans: number[] = era5Data.annual.pressureMean || []

    return rawAwsData.map((d) => {
      const era5Idx = era5Days.findIndex((ed) => ed === d.date)
      const eTemp = era5Idx !== -1 ? era5TempMeans[era5Idx] : null
      const eHum = era5Idx !== -1 ? era5HumMeans[era5Idx] : null
      const ePress = era5Idx !== -1 ? era5PressMeans[era5Idx] : null

      return {
        date: d.date,
        awsTempAvg: d.temperatureAvg,
        awsTempMin: d.temperatureMin,
        awsTempMax: d.temperatureMax,
        awsHumAvg: d.humidityAvg,
        awsPressAvg: d.pressureAvg,
        awsRainTot: d.rainfallTot,
        era5TempAvg: eTemp,
        era5HumAvg: eHum,
        era5PressAvg: ePress,
        correctedTempAvg: offsets.enabled && d.temperatureAvg != null ? Number((d.temperatureAvg + offsets.tempOffset).toFixed(2)) : d.temperatureAvg,
        correctedHumAvg: offsets.enabled && d.humidityAvg != null ? Number((d.humidityAvg + offsets.humOffset).toFixed(1)) : d.humidityAvg,
        correctedPressAvg: offsets.enabled && d.pressureAvg != null ? Number((d.pressureAvg + offsets.pressOffset).toFixed(2)) : d.pressureAvg,
      }
    })
  }, [rawAwsData, era5Data, offsets])

  // Calculate bias metrics
  const biasMetrics = useMemo(() => {
    if (!era5Data) return null

    const tempPairs = comparisonSeries
      .filter((p) => p.awsTempAvg != null && p.era5TempAvg != null)
      .map((p) => ({ date: p.date, aws: p.awsTempAvg!, era5: p.era5TempAvg! }))

    const humPairs = comparisonSeries
      .filter((p) => p.awsHumAvg != null && p.era5HumAvg != null)
      .map((p) => ({ date: p.date, aws: p.awsHumAvg!, era5: p.era5HumAvg! }))

    const pressPairs = comparisonSeries
      .filter((p) => p.awsPressAvg != null && p.era5PressAvg != null)
      .map((p) => ({ date: p.date, aws: p.awsPressAvg!, era5: p.era5PressAvg! }))

    return {
      temperature: calculateVariableBias(tempPairs, 3.5),
      humidity: calculateVariableBias(humPairs, 15),
      pressure: calculateVariableBias(pressPairs, 5),
    }
  }, [comparisonSeries, era5Data])

  // Apply automatic suggested offsets
  const handleAutoApplyOffsets = () => {
    if (!biasMetrics) return

    const newOffsets: CorrectionOffsets = {
      tempOffset: biasMetrics.temperature.suggestedOffset,
      humOffset: biasMetrics.humidity.suggestedOffset,
      pressOffset: biasMetrics.pressure.suggestedOffset,
      enabled: true,
    }

    onOffsetsChange(newOffsets)

    toast({
      title: "Koreksi Otomatis Diterapkan",
      description: `Offset Suhu (${newOffsets.tempOffset > 0 ? "+" : ""}${newOffsets.tempOffset}°C), Kelembapan (${newOffsets.humOffset > 0 ? "+" : ""}${newOffsets.humOffset}%), Tekanan (${newOffsets.pressOffset > 0 ? "+" : ""}${newOffsets.pressOffset} hPa).`,
    })
  }

  // Reset offsets
  const handleResetOffsets = () => {
    onOffsetsChange({
      tempOffset: 0,
      humOffset: 0,
      pressOffset: 0,
      enabled: false,
    })
    toast({
      title: "Koreksi Direset",
      description: "Data kembali menggunakan nilai asli sensor tanpa offset.",
    })
  }

  // Save to Firestore Sensor Calibration
  const handleSaveToSensorCalibration = async () => {
    if (!sensorId) return
    setSavingCalibration(true)
    try {
      await saveCalibrationDocument(sensorId, {
        stationId: sensorId,
        enabled: offsets.enabled,
        temperature: {
          enabled: offsets.tempOffset !== 0,
          method: "offset",
          offset: offsets.tempOffset,
        },
        humidity: {
          enabled: offsets.humOffset !== 0,
          method: "offset",
          offset: offsets.humOffset,
        },
        pressure: {
          enabled: offsets.pressOffset !== 0,
          method: "offset",
          offset: offsets.pressOffset,
        },
      } as any)
      toast({
        title: "Kalibrasi Sensor Tersimpan",
        description: `Konfigurasi offset untuk sensor ${sensorName} berhasil disimpan ke database.`,
      })
    } catch (err: any) {
      console.error("Failed to save calibration document", err)
      toast({
        title: "Gagal Menyimpan Kalibrasi",
        description: err.message || "Terjadi kesalahan saat menyimpan ke database.",
        variant: "destructive",
      })
    } finally {
      setSavingCalibration(false)
    }
  }

  // ECharts Option for Comparison Overlay
  const chartOption = useMemo(() => {
    const dates = comparisonSeries.map((d) => {
      try {
        const parts = d.date.split("-")
        if (parts.length === 3) {
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
          return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
        }
      } catch {}
      return d.date
    })

    let awsData: (number | null)[] = []
    let era5LineData: (number | null)[] = []
    let correctedData: (number | null)[] = []
    let unit = "°C"
    let titleName = "Suhu Udara"

    if (activeParam === "temp") {
      titleName = "Suhu Udara (°C)"
      unit = "°C"
      awsData = comparisonSeries.map((d) => d.awsTempAvg ?? null)
      era5LineData = comparisonSeries.map((d) => d.era5TempAvg ?? null)
      correctedData = comparisonSeries.map((d) => d.correctedTempAvg ?? null)
    } else if (activeParam === "hum") {
      titleName = "Kelembapan Relatif (%)"
      unit = "%"
      awsData = comparisonSeries.map((d) => d.awsHumAvg ?? null)
      era5LineData = comparisonSeries.map((d) => d.era5HumAvg ?? null)
      correctedData = comparisonSeries.map((d) => d.correctedHumAvg ?? null)
    } else {
      titleName = "Tekanan Udara (hPa)"
      unit = "hPa"
      awsData = comparisonSeries.map((d) => d.awsPressAvg ?? null)
      era5LineData = comparisonSeries.map((d) => d.era5PressAvg ?? null)
      correctedData = comparisonSeries.map((d) => d.correctedPressAvg ?? null)
    }

    const series: any[] = [
      {
        name: "Sensor AWS (Observasi)",
        type: "line",
        data: awsData,
        itemStyle: { color: "#3B82F6" },
        lineStyle: { width: 2.5 },
        smooth: true,
      },
    ]

    if (era5Data) {
      series.push({
        name: "ECMWF ERA5-Land (9 km)",
        type: "line",
        data: era5LineData,
        itemStyle: { color: "#F97316" },
        lineStyle: { width: 2.5, type: "dashed" },
        smooth: true,
      })
    }

    if (offsets.enabled) {
      series.push({
        name: "Data Terkoreksi (Offset)",
        type: "line",
        data: correctedData,
        itemStyle: { color: "#10B981" },
        lineStyle: { width: 2.5 },
        smooth: true,
      })
    }

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ""
          let html = `<div style="font-weight:bold;margin-bottom:4px;">${params[0].name}</div>`
          params.forEach((p) => {
            if (p.value !== null && p.value !== undefined) {
              html += `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;">
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}</span>
                <strong>${Number(p.value).toFixed(2)} ${unit}</strong>
              </div>`
            }
          })
          return html
        },
      },
      legend: {
        top: 0,
        textStyle: { color: "#64748B" },
      },
      grid: { left: "3%", right: "3%", bottom: "8%", top: "40px", containLabel: true },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: "#CBD5E1" } },
      },
      yAxis: {
        type: "value",
        name: unit,
        scale: true,
        splitLine: { lineStyle: { color: "#F1F5F9" } },
      },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", start: 0, end: 100, height: 16, bottom: 0 },
      ],
      series,
    }
  }, [comparisonSeries, activeParam, era5Data, offsets])

  return (
    <Card className="border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/30 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="p-4 border-b border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/50 dark:bg-indigo-950/30">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Validasi & Koreksi Bias ECMWF (Smart Hybrid 9 km)
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gunakan acuan data ECMWF Smart Hybrid (IFS Real-Time tanpa jeda & ERA5-Land 9 km) untuk kendali mutu (*QA/QC*) dan kalibrasi sensor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            {/* Model Selector Pills */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-md border text-xs">
              <button
                type="button"
                onClick={() => setSelectedModel("auto")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  selectedModel === "auto"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="Otomatis: ECMWF IFS untuk hari ini/kemarin (<5 hari), ERA5-Land untuk data lampau"
              >
                Otomatis (Hybrid)
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel("ecmwf_ifs")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  selectedModel === "ecmwf_ifs"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="ECMWF IFS: Analisis Operasional Real-Time (Tanpa Jeda 5 Hari, 9 km)"
              >
                ECMWF IFS (Real-Time)
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel("era5_land")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  selectedModel === "era5_land"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="ERA5-Land: Reanalisis Daratan ECMWF (Jeda 5 Hari, 9 km)"
              >
                ERA5-Land (9 km)
              </button>
            </div>

            {!era5Data ? (
              <Button
                variant="default"
                size="sm"
                onClick={fetchEra5}
                disabled={loading || rawAwsData.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Mengambil Data...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                    Evaluasi Data
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {era5Data.sourceModel || "ECMWF (9 km)"} ({startDate} – {endDate})
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchEra5}
                  disabled={loading}
                  className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800"
                  title="Muat Ulang Data"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* --- ADVANCED METEOROLOGICAL METRIC CARDS (MBE, MAE, RMSE, Pearson r, R², StdDev, Percentiles) --- */}
        {biasMetrics ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Suhu */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Suhu Udara
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      r = {biasMetrics.temperature.pearsonR}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                      R² = {biasMetrics.temperature.rSquared}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bias Rata-rata (MBE)</span>
                    <strong className={biasMetrics.temperature.mbe > 0 ? "text-red-500 font-mono" : "text-blue-500 font-mono"}>
                      {biasMetrics.temperature.mbe > 0 ? "+" : ""}{biasMetrics.temperature.mbe}°C
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Akurasi (RMSE)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.temperature.rmse}°C</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Rerata Absolut (MAE)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.temperature.mae}°C</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Deviasi Residual (σ)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.temperature.stdDevResidual}°C</strong>
                  </div>
                </div>

                <div className="pt-1.5 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Rentang Observasi:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{biasMetrics.temperature.awsMin}°C – {biasMetrics.temperature.awsMax}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Persentil (P10 / P50 / P90):</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{biasMetrics.temperature.p10} / {biasMetrics.temperature.p50} / {biasMetrics.temperature.p90}°C</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">Rekomendasi Offset:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {biasMetrics.temperature.suggestedOffset > 0 ? "+" : ""}{biasMetrics.temperature.suggestedOffset}°C
                    </span>
                  </div>
                </div>
              </div>

              {/* Kelembapan */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Kelembapan Relatif
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      r = {biasMetrics.humidity.pearsonR}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                      R² = {biasMetrics.humidity.rSquared}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bias Rata-rata (MBE)</span>
                    <strong className={biasMetrics.humidity.mbe > 0 ? "text-blue-500 font-mono" : "text-amber-500 font-mono"}>
                      {biasMetrics.humidity.mbe > 0 ? "+" : ""}{biasMetrics.humidity.mbe}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Akurasi (RMSE)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.humidity.rmse}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Rerata Absolut (MAE)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.humidity.mae}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Deviasi Residual (σ)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.humidity.stdDevResidual}%</strong>
                  </div>
                </div>

                <div className="pt-1.5 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Rentang Observasi:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{biasMetrics.humidity.awsMin}% – {biasMetrics.humidity.awsMax}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Persentil (P10 / P50 / P90):</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{biasMetrics.humidity.p10} / {biasMetrics.humidity.p50} / {biasMetrics.humidity.p90}%</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">Rekomendasi Offset:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {biasMetrics.humidity.suggestedOffset > 0 ? "+" : ""}{biasMetrics.humidity.suggestedOffset}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Tekanan */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Tekanan Udara
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      r = {biasMetrics.pressure.pearsonR}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                      R² = {biasMetrics.pressure.rSquared}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bias Rata-rata (MBE)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      {biasMetrics.pressure.mbe > 0 ? "+" : ""}{biasMetrics.pressure.mbe} hPa
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Akurasi (RMSE)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.pressure.rmse} hPa</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Rerata Absolut (MAE)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.pressure.mae} hPa</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Deviasi Residual (σ)</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">{biasMetrics.pressure.stdDevResidual} hPa</strong>
                  </div>
                </div>

                <div className="pt-1.5 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Rentang Observasi:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{biasMetrics.pressure.awsMin} – {biasMetrics.pressure.awsMax} hPa</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Persentil (P10 / P50 / P90):</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{biasMetrics.pressure.p10} / {biasMetrics.pressure.p50} / {biasMetrics.pressure.p90} hPa</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">Rekomendasi Offset:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {biasMetrics.pressure.suggestedOffset > 0 ? "+" : ""}{biasMetrics.pressure.suggestedOffset} hPa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            <Info className="w-4 h-4 mx-auto mb-1 text-slate-400" />
            Pilih sumber model dan klik tombol <strong>"Evaluasi Data"</strong> di atas untuk memuat data pembanding global dan menganalisis deviasi bias sensor.
          </div>
        )}

        {/* --- OVERLAY COMPARISON CHART --- */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Grafik Komparasi Tumpang-Tindih (*Overlay Comparison*)
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={activeParam === "temp" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveParam("temp")}
                className={`h-7 text-xs ${activeParam === "temp" ? "bg-orange-600 text-white" : ""}`}
              >
                Suhu
              </Button>
              <Button
                variant={activeParam === "hum" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveParam("hum")}
                className={`h-7 text-xs ${activeParam === "hum" ? "bg-blue-600 text-white" : ""}`}
              >
                Kelembapan
              </Button>
              <Button
                variant={activeParam === "press" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveParam("press")}
                className={`h-7 text-xs ${activeParam === "press" ? "bg-violet-600 text-white" : ""}`}
              >
                Tekanan
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border">
            <ReactECharts option={chartOption} style={{ width: "100%", height: "260px" }} />
          </div>
        </div>

        {/* --- KONTROL KALIBRASI & OFFSET (Otomatis & Manual) --- */}
        <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <Switch
                id="enable-correction"
                checked={offsets.enabled}
                onCheckedChange={(checked) => onOffsetsChange({ ...offsets, enabled: checked })}
              />
              <label htmlFor="enable-correction" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                Terapkan Koreksi pada Laporan & Dokumen Cetak
              </label>
            </div>

            <div className="flex items-center gap-2">
              {biasMetrics && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoApplyOffsets}
                  className="h-8 text-xs bg-white dark:bg-slate-900 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  Koreksi Otomatis (ERA5)
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetOffsets}
                disabled={!offsets.enabled && offsets.tempOffset === 0 && offsets.humOffset === 0 && offsets.pressOffset === 0}
                className="h-8 text-xs text-slate-500"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {/* Manual Offset Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100/70 dark:border-indigo-900/30">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Offset Suhu (°C)</label>
              <Input
                type="number"
                step="0.1"
                value={offsets.tempOffset}
                onChange={(e) =>
                  onOffsetsChange({
                    ...offsets,
                    tempOffset: parseFloat(e.target.value) || 0,
                    enabled: true,
                  })
                }
                className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                placeholder="Contoh: -0.8"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Offset Kelembapan (%)</label>
              <Input
                type="number"
                step="0.5"
                value={offsets.humOffset}
                onChange={(e) =>
                  onOffsetsChange({
                    ...offsets,
                    humOffset: parseFloat(e.target.value) || 0,
                    enabled: true,
                  })
                }
                className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                placeholder="Contoh: +2.0"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Offset Tekanan (hPa)</label>
              <Input
                type="number"
                step="0.1"
                value={offsets.pressOffset}
                onChange={(e) =>
                  onOffsetsChange({
                    ...offsets,
                    pressOffset: parseFloat(e.target.value) || 0,
                    enabled: true,
                  })
                }
                className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                placeholder="Contoh: -1.2"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveToSensorCalibration}
              disabled={savingCalibration || !sensorId}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs h-8"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingCalibration ? "Menyimpan Kalibrasi..." : "Simpan Permanen ke Kalibrasi Sensor"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
