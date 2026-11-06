"use client"

import React, { useState, useMemo } from "react"
import ReactECharts from "echarts-for-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe2,
  Cpu,
  Info,
  Table as TableIcon,
  LayoutGrid,
  Thermometer,
  CloudRain,
  CheckCircle2,
} from "lucide-react"
import { WeatherCondition } from "@/components/prakirawan/ForecastFunction"
import { cn } from "@/lib/utils"

// Palet warna standar BMKG / Meteo Sense untuk kondisi cuaca
export const CONDITION_COLOR_MAP: Record<WeatherCondition, string> = {
  Cerah: "#F59E0B",            // Amber 500
  "Cerah Berawan": "#FB923C",  // Orange 400
  Berawan: "#64748B",          // Slate 500
  "Hujan Ringan": "#60A5FA",   // Blue 400
  "Hujan Sedang": "#3B82F6",   // Blue 500
  "Hujan Lebat": "#4F46E5",    // Indigo 600
  "Badai Petir": "#7C3AED",    // Violet 600
  Kabut: "#94A3B8",            // Slate 400
  "Angin Kencang": "#0D9488",  // Teal 600
}

export interface EnsembleHourlyItem {
  time: string
  conditionMain: WeatherCondition
  probMain: string
  conditionSub?: WeatherCondition | ""
  probSub?: string
  temperature?: number | ""
  temperatureError?: number | ""
  humidity?: number | ""
  humidityError?: number | ""
  heatIndex?: number | ""
  heatIndexError?: number | ""
  modelPredictions?: {
    modelId: string
    modelName: string
    condition: WeatherCondition
    temperature?: number | null
    humidity?: number | null
    precipitation?: number
    rainProb?: number | null
  }[]
  votingBreakdown?: {
    condition: WeatherCondition
    count: number
    percentage: number
    models: string[]
  }[]
}

export interface EnsembleProbabilityChartProps {
  data: EnsembleHourlyItem[] | null
  modelsUsed?: { id: string; name: string; country: string; category: string }[]
  locationName?: string
  forecastDateStr?: string
  isLoading?: boolean
  onRefresh?: () => void
  isDarkMode?: boolean
}

export const EnsembleProbabilityChart: React.FC<EnsembleProbabilityChartProps> = ({
  data,
  modelsUsed,
  locationName = "Kebumen",
  forecastDateStr = "",
  isLoading = false,
  onRefresh,
  isDarkMode = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true)
  const [activeView, setActiveView] = useState<"chart" | "matrix">("chart")
  const [matrixSubView, setMatrixSubView] = useState<"grid" | "summary">("grid")

  // Validasi data
  const hasData = useMemo(() => {
    return (
      data &&
      Array.isArray(data) &&
      data.length > 0 &&
      data.some((d) => d.votingBreakdown && d.votingBreakdown.length > 0)
    )
  }, [data])

  // Total model yang berpartisipasi
  const totalModelsCount = useMemo(() => {
    return modelsUsed?.length || data?.[0]?.modelPredictions?.length || 10
  }, [modelsUsed, data])

  // Daftar model unik yang berpartisipasi
  const participatingModels = useMemo(() => {
    if (modelsUsed && modelsUsed.length > 0) return modelsUsed
    if (data && data[0]?.modelPredictions && data[0].modelPredictions.length > 0) {
      return data[0].modelPredictions.map((p) => {
        const isAi = p.modelId.includes("aifs") || p.modelId.includes("aigfs")
        let cleanName = p.modelName
        let country = "Global"
        if (p.modelName.includes("(") && p.modelName.includes(")")) {
          const parts = p.modelName.split("(")
          cleanName = parts[0].trim()
          country = parts[1].replace(")", "").trim()
        }
        return {
          id: p.modelId,
          name: cleanName,
          country: country,
          category: isAi ? "AI Model" : "Physics NWP",
        }
      })
    }
    return []
  }, [modelsUsed, data])

  // Pengelompokan model AI vs Physics NWP
  const aiModels = useMemo(() => {
    return participatingModels.filter(
      (m) => m.category?.toLowerCase().includes("ai") || m.id.includes("aifs") || m.id.includes("aigfs")
    )
  }, [participatingModels])

  const nwpModels = useMemo(() => {
    return participatingModels.filter(
      (m) => !m.category?.toLowerCase().includes("ai") && !m.id.includes("aifs") && !m.id.includes("aigfs")
    )
  }, [participatingModels])

  // Menghitung Agreement Index (Tingkat Kesepakatan Model)
  const agreementMetrics = useMemo(() => {
    if (!hasData || !data) {
      return {
        overallScore: 0,
        label: "Menunggu Data",
        badgeBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        description: "Data konsensus belum tersedia.",
      }
    }

    const validScores: number[] = []
    data.forEach((row) => {
      if (row.votingBreakdown && row.votingBreakdown.length > 0) {
        const highestVote = row.votingBreakdown[0]
        if (highestVote?.percentage) {
          validScores.push(highestVote.percentage)
        }
      }
    })

    if (validScores.length === 0) {
      return {
        overallScore: 0,
        label: "Tidak Diketahui",
        badgeBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        description: "Tidak cukup data voting.",
      }
    }

    const avgScore = Math.round(
      validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length
    )

    if (avgScore >= 70) {
      return {
        overallScore: avgScore,
        label: "Kesepakatan Sangat Tinggi",
        badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: ShieldCheck,
        description:
          "Mayoritas model (NWP fisik & AI) sepakat kuat pada skenario kondisi cuaca yang sama.",
      }
    } else if (avgScore >= 50) {
      return {
        overallScore: avgScore,
        label: "Kesepakatan Moderat",
        badgeBg: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
        icon: Sparkles,
        description:
          "Terdapat konsensus dominan, namun sebagian model memperkirakan skenario alternatif.",
      }
    } else {
      return {
        overallScore: avgScore,
        label: "Model Terbelah / Ketidakpastian Tinggi",
        badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: AlertTriangle,
        description:
          "Prakiraan menyebar ke berbagai skenario; prakirawan disarankan mengamati citra radar & satelit.",
      }
    }
  }, [hasData, data])

  // Ringkasan spektrum ensemble (Suhu min-max dan jendela hujan)
  const ensembleSummary = useMemo(() => {
    if (!data || data.length === 0) return null

    const allTemps: number[] = []
    let maxPrecip = 0
    let maxPrecipTime = ""
    let maxPrecipModel = ""

    data.forEach((row) => {
      row.modelPredictions?.forEach((p) => {
        if (typeof p.temperature === "number" && !isNaN(p.temperature)) {
          allTemps.push(p.temperature)
        }
        if (p.precipitation && p.precipitation > maxPrecip) {
          maxPrecip = p.precipitation
          maxPrecipTime = row.time
          maxPrecipModel = p.modelName.replace(/\(.*?\)/g, "").trim()
        }
      })
    })

    const minTemp = allTemps.length > 0 ? Math.min(...allTemps).toFixed(0) : "-"
    const maxTemp = allTemps.length > 0 ? Math.max(...allTemps).toFixed(0) : "-"

    // Temukan jam dengan probabilitas hujan tertinggi
    const rainHours = data
      .map((row) => {
        const rainVote = row.votingBreakdown?.find(
          (vb) =>
            vb.condition.toLowerCase().includes("hujan") ||
            vb.condition.toLowerCase().includes("petir")
        )
        return {
          time: row.time,
          percentage: rainVote ? rainVote.percentage : 0,
          condition: rainVote ? rainVote.condition : null,
        }
      })
      .filter((rh) => rh.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)

    const peakRain = rainHours.length > 0 ? rainHours[0] : null

    return {
      minTemp,
      maxTemp,
      maxPrecip,
      maxPrecipTime,
      maxPrecipModel,
      peakRain,
    }
  }, [data])

  // Bangun opsi ECharts untuk 100% Stacked Bar Chart
  const chartOption = useMemo(() => {
    if (!hasData || !data) return {}

    const hours = data.map((d) => d.time)

    // Kumpulkan semua kondisi cuaca unik yang muncul di seluruh breakdown
    const uniqueConditionsSet = new Set<WeatherCondition>()
    data.forEach((d) => {
      d.votingBreakdown?.forEach((vb) => {
        if (vb.condition) uniqueConditionsSet.add(vb.condition)
      })
    })

    const uniqueConditions = Array.from(uniqueConditionsSet)
    const totalModels = totalModelsCount

    // Buat Series tumpukan (Stacked Bar 100%)
    const series = uniqueConditions.map((condition) => {
      const color = CONDITION_COLOR_MAP[condition] || "#94A3B8"

      const seriesData = data.map((hourItem) => {
        const match = hourItem.votingBreakdown?.find(
          (vb) => vb.condition === condition
        )

        if (!match || match.percentage <= 0) {
          return {
            value: 0,
            percentage: 0,
            count: 0,
            models: [],
            condition,
            time: hourItem.time,
          }
        }

        return {
          value: match.percentage,
          percentage: match.percentage,
          count: match.count,
          models: match.models || [],
          condition,
          time: hourItem.time,
        }
      })

      return {
        name: condition,
        type: "bar",
        stack: "consensusProb",
        barMaxWidth: 56,
        itemStyle: {
          color: color,
        },
        emphasis: {
          focus: "series" as const,
          itemStyle: {
            shadowBlur: 8,
            shadowColor: "rgba(0, 0, 0, 0.25)",
          },
        },
        label: {
          show: true,
          position: "inside" as const,
          formatter: (params: any) => {
            const pct = params.value
            return pct >= 14 ? `${pct}%` : ""
          },
          fontSize: 11,
          fontWeight: "bold" as const,
          color: "#ffffff",
          textBorderColor: "rgba(0, 0, 0, 0.5)",
          textBorderWidth: 2,
        },
        data: seriesData,
      }
    })

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
          },
        },
        backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
        borderColor: isDarkMode ? "#334155" : "#E2E8F0",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: isDarkMode ? "#F8FAFC" : "#0F172A",
          fontSize: 12,
        },
        extraCssText: "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2); border-radius: 8px; z-index: 50;",
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ""

          const timeLabel = params[0]?.axisValueLabel || ""
          const rawHour = timeLabel.replace(" WIB", "").trim()
          const hourItem = data.find((d) => d.time === rawHour || d.time === timeLabel)
          const temps =
            hourItem?.modelPredictions
              ?.map((p) => p.temperature)
              .filter((t): t is number => typeof t === "number" && !isNaN(t)) || []
          const minT = temps.length > 0 ? Math.min(...temps).toFixed(1) : null
          const maxT = temps.length > 0 ? Math.max(...temps).toFixed(1) : null
          const meanT = hourItem?.temperature

          let html = `
            <div style="font-family: inherit; min-width: 250px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${
                isDarkMode ? "#334155" : "#E2E8F0"
              }; padding-bottom: 6px; margin-bottom: 8px;">
                <span style="font-weight: 700; font-size: 13px; color: ${
                  isDarkMode ? "#38BDF8" : "#0284C7"
                };">
                  🕒 Jam ${rawHour} WIB
                </span>
                <span style="font-size: 11px; color: #94A3B8;">${totalModels} Model Terlibat</span>
              </div>
          `

          if (minT !== null && maxT !== null && meanT !== "") {
            html += `
              <div style="font-size: 11px; margin-bottom: 8px; padding: 4px 8px; border-radius: 5px; background: ${
                isDarkMode ? "rgba(56, 189, 248, 0.08)" : "rgba(2, 132, 199, 0.06)"
              }; color: ${isDarkMode ? "#93C5FD" : "#0369A1"};">
                🌡️ Suhu Lintas Model: <b>${minT}°C – ${maxT}°C</b> (Mean: ${meanT}°C)
              </div>
            `
          }

          html += `<div style="display: flex; flex-direction: column; gap: 6px;">`

          const sorted = [...params].sort(
            (a, b) => (b.data?.value || 0) - (a.data?.value || 0)
          )

          sorted.forEach((item) => {
            const d = item.data
            if (!d || d.value <= 0) return

            const conditionName = d.condition || item.seriesName
            const color = CONDITION_COLOR_MAP[conditionName as WeatherCondition] || item.color
            const count = d.count || 0
            const pct = d.value || 0
            const modelNames = Array.isArray(d.models) ? d.models.join(", ") : ""

            html += `
              <div style="padding: 5px 8px; border-radius: 6px; background: ${
                isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
              }; border-left: 3px solid ${color};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                    <span>${conditionName}</span>
                  </span>
                  <span style="font-weight: 700; color: ${color};">${pct}% <span style="font-size: 10px; opacity: 0.8;">(${count}/${totalModels})</span></span>
                </div>
                ${
                  modelNames
                    ? `<div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">Model: ${modelNames}</div>`
                    : ""
                }
              </div>
            `
          })

          html += `
              </div>
            </div>
          `
          return html
        },
      },
      legend: {
        type: "scroll",
        bottom: 0,
        textStyle: {
          color: isDarkMode ? "#94A3B8" : "#475569",
          fontSize: 11,
        },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 14,
      },
      grid: {
        top: 20,
        left: "3%",
        right: "3%",
        bottom: 42,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: hours,
        axisLine: {
          lineStyle: {
            color: isDarkMode ? "#334155" : "#CBD5E1",
          },
        },
        axisLabel: {
          color: isDarkMode ? "#E2E8F0" : "#1E293B",
          fontWeight: 600,
          fontSize: 12,
          formatter: "{value} WIB",
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: {
          color: isDarkMode ? "#94A3B8" : "#64748B",
          fontSize: 11,
          formatter: "{value}%",
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode ? "#1E293B" : "#F1F5F9",
            type: "dashed",
          },
        },
      },
      series: series,
    }
  }, [hasData, data, totalModelsCount, isDarkMode])

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90 overflow-hidden transition-all duration-300">
      <CardHeader className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-800/60 dark:to-blue-950/20 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                  Probabilitas Model Ensemble Cuaca
                  {locationName && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {locationName} {forecastDateStr ? `• ${forecastDateStr}` : ""}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Distribusi voting 100% stacked bar dari {totalModelsCount} model global (Physics NWP & AI Deep Learning) per slot jam
                </CardDescription>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {hasData && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant={activeView === "chart" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("chart")}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-md",
                    activeView === "chart"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  Grafik
                </Button>
                <Button
                  type="button"
                  variant={activeView === "matrix" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("matrix")}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-md",
                    activeView === "matrix"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5 mr-1" />
                  Matriks Model
                </Button>
              </div>
            )}

            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Muat ulang data ensemble"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                <span className="hidden md:inline ml-1.5">Sinkron</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              aria-label={isExpanded ? "Ciutkan" : "Bentangkan"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* BANNER INDIKATOR AGREEMENT INDEX & MODEL SPREAD */}
        {isExpanded && hasData && (
          <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Indeks Kesepakatan:
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                  agreementMetrics.badgeBg
                )}
              >
                {agreementMetrics.icon && <agreementMetrics.icon className="w-3.5 h-3.5" />}
                {agreementMetrics.label} ({agreementMetrics.overallScore}%)
              </span>
              <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400">
                • {agreementMetrics.description}
              </span>
            </div>

            {/* BADGES PARTICIPATING MODELS */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
              {aiModels.length > 0 && (
                <>
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <Cpu className="w-3 h-3 text-indigo-500" /> AI ({aiModels.length}):
                  </span>
                  {aiModels.map((m) => (
                    <span
                      key={m.id}
                      className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 text-[10px]"
                    >
                      {m.name}
                    </span>
                  ))}
                </>
              )}
              {nwpModels.length > 0 && (
                <>
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 ml-1">
                    <Globe2 className="w-3 h-3 text-sky-500" /> NWP ({nwpModels.length}):
                  </span>
                  <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800 text-[10px]">
                    {nwpModels.map((m) => m.name.replace(/Deterministic|Seamless|World025|0125°/gi, "").trim()).join(" • ")}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      {/* STRIP LOADING ANIMATION */}
      {isLoading && (
        <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60 flex items-center justify-center gap-2 text-xs text-blue-700 dark:text-blue-300 font-medium animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
          <span>Sedang mensinkronisasi konsensus dari {totalModelsCount} model prediksi cuaca global (ECMWF IFS, AIFS, GFS, AIGFS, ICON, UKMO, ARPEGE, JMA, GEM, CMA)...</span>
        </div>
      )}

      {isExpanded && (
        <CardContent className="p-3 sm:p-5">
          {!hasData ? (
            <div className="py-10 px-4 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Data Probabilitas Ensemble Belum Dimuat
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Silakan klik tombol <strong>"Ambil Otomatis"</strong> di atas form tabel prakiraan untuk mengambil prediksi {totalModelsCount} model global dan menghitung bar chart probabilitas ensemble secara real-time.
                </p>
              </div>
              {onRefresh && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isLoading && "animate-spin")} />
                  {isLoading ? "Mengambil Data..." : "Ambil Data Konsensus Sekarang"}
                </Button>
              )}
            </div>
          ) : activeView === "chart" ? (
            <div className="space-y-4">
              {/* KARTU STATISTIK SPEKTRUM ENSEMBLE */}
              {ensembleSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold">
                      <Thermometer className="w-3 h-3 text-amber-500" />
                      Rentang Suhu Model
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {ensembleSummary.minTemp}°C – {ensembleSummary.maxTemp}°C
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold">
                      <CloudRain className="w-3 h-3 text-blue-500" />
                      Puncak Peluang Hujan
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {ensembleSummary.peakRain
                        ? `${ensembleSummary.peakRain.time} WIB (${ensembleSummary.peakRain.percentage}%)`
                        : "Nihil (Kering)"}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      Model Berpartisipasi
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {totalModelsCount} Model Sukses
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-sky-500" />
                      Maks Curah Hujan
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {ensembleSummary.maxPrecip > 0
                        ? `${ensembleSummary.maxPrecip} mm (${ensembleSummary.maxPrecipTime} WIB)`
                        : "0 mm"}
                    </div>
                  </div>
                </div>
              )}

              {/* ECHARTS CONTAINER */}
              <div className="w-full h-[290px] sm:h-[320px]">
                <ReactECharts
                  option={chartOption}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                />
              </div>

              {/* FOOTER KETERANGAN SINGKAT */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  Arahkan kursor (hover) pada batang jam untuk melihat nama-nama model dan rentang suhu.
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Tinggi Batang = 100% Total Konsensus
                </span>
              </div>
            </div>
          ) : (
            /* MATRIKS MODEL VIEW */
            <div className="space-y-3">
              {/* SUB-VIEW TOGGLE */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Button
                    type="button"
                    variant={matrixSubView === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMatrixSubView("grid")}
                    className={cn(
                      "h-6 px-2 text-[11px] font-medium rounded",
                      matrixSubView === "grid"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                        : "text-slate-600 dark:text-slate-300"
                    )}
                  >
                    <LayoutGrid className="w-3 h-3 mr-1" />
                    Interkomparasi Per-Model
                  </Button>
                  <Button
                    type="button"
                    variant={matrixSubView === "summary" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMatrixSubView("summary")}
                    className={cn(
                      "h-6 px-2 text-[11px] font-medium rounded",
                      matrixSubView === "summary"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                        : "text-slate-600 dark:text-slate-300"
                    )}
                  >
                    <TableIcon className="w-3 h-3 mr-1" />
                    Distribusi Voting Kondisi
                  </Button>
                </div>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  {matrixSubView === "grid"
                    ? "Menampilkan prediksi cuaca & suhu tiap model bersanding"
                    : "Menampilkan akumulasi suara kondisi cuaca"}
                </span>
              </div>

              {matrixSubView === "grid" ? (
                /* 1. GRID INTERKOMPARASI DETAIL PER-MODEL */
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[850px] text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                        <th className="p-2.5 text-center sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[1px_0_3px_rgba(0,0,0,0.08)] w-24">
                          Jam
                        </th>
                        <th className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border-r border-blue-200 dark:border-blue-900 text-center w-36">
                          Konsensus Akhir
                        </th>
                        {participatingModels.map((m) => (
                          <th
                            key={m.id}
                            className="p-2 text-center min-w-[100px] border-l border-slate-200 dark:border-slate-800 font-semibold"
                          >
                            <div className="flex flex-col items-center">
                              <span className="truncate max-w-[105px] font-bold" title={m.name}>
                                {m.name.replace(/Deterministic|Seamless|World025|0125°/gi, "").trim()}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-normal">
                                {m.country}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {data?.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* STICKY JAM */}
                          <td className="p-2 text-center font-bold text-slate-900 dark:text-slate-100 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[1px_0_3px_rgba(0,0,0,0.08)]">
                            {row.time} WIB
                          </td>
                          {/* KONSENSUS AKHIR */}
                          <td className="p-2 bg-blue-50/40 dark:bg-blue-950/20 border-r border-blue-200 dark:border-blue-900/60 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                                style={{
                                  backgroundColor:
                                    CONDITION_COLOR_MAP[row.conditionMain] || "#64748B",
                                }}
                              >
                                {row.conditionMain} ({row.probMain}%)
                              </span>
                              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                {row.temperature !== "" ? `${row.temperature}°C` : "-"} /{" "}
                                {row.humidity !== "" ? `${row.humidity}%` : "-"}
                              </span>
                            </div>
                          </td>
                          {/* CELL PER MODEL */}
                          {participatingModels.map((m) => {
                            const pred = row.modelPredictions?.find((p) => p.modelId === m.id)
                            if (!pred) {
                              return (
                                <td
                                  key={m.id}
                                  className="p-2 text-center text-muted-foreground border-l border-slate-100 dark:border-slate-800/60"
                                >
                                  —
                                </td>
                              )
                            }
                            const condColor = CONDITION_COLOR_MAP[pred.condition] || "#64748B"
                            return (
                              <td
                                key={m.id}
                                className="p-1.5 text-center border-l border-slate-100 dark:border-slate-800/60"
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[9.5px] font-medium text-white truncate max-w-[95px]"
                                    style={{ backgroundColor: condColor }}
                                    title={pred.condition}
                                  >
                                    {pred.condition}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                                    <span>
                                      {typeof pred.temperature === "number" && !isNaN(pred.temperature)
                                        ? `${Math.round(pred.temperature)}°`
                                        : "-"}
                                    </span>
                                    {pred.precipitation && pred.precipitation > 0 ? (
                                      <span
                                        className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1 rounded"
                                        title={`Presipitasi: ${pred.precipitation} mm`}
                                      >
                                        💧{pred.precipitation}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* 2. RINGKASAN DISTRIBUSI VOTING */
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[550px] text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <th className="p-2.5 text-center w-24">Jam</th>
                        <th className="p-2.5">Kondisi Dominan</th>
                        <th className="p-2.5 text-center">Probabilitas</th>
                        <th className="p-2.5">Rincian Voting Model</th>
                        <th className="p-2.5 text-center">Suhu / RH Mean</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {data?.map((row, idx) => {
                        const dominant = row.votingBreakdown?.[0]
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/50">
                              {row.time} WIB
                            </td>
                            <td className="p-2.5">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-white"
                                style={{
                                  backgroundColor:
                                    CONDITION_COLOR_MAP[row.conditionMain] || "#64748B",
                                }}
                              >
                                {row.conditionMain}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                              {dominant?.percentage || row.probMain}%
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                {row.votingBreakdown?.map((vb, vIdx) => (
                                  <span
                                    key={vIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full inline-block"
                                      style={{
                                        backgroundColor:
                                          CONDITION_COLOR_MAP[vb.condition] || "#94a3b8",
                                      }}
                                    ></span>
                                    <strong>{vb.condition}</strong>: {vb.percentage}% ({vb.count} model)
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                              {row.temperature !== "" ? `${row.temperature}°C` : "-"} /{" "}
                              {row.humidity !== "" ? `${row.humidity}%` : "-"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default EnsembleProbabilityChart
