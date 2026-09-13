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
  Table as TableIcon
} from "lucide-react"
import { WeatherCondition } from "./ForecastFunction"
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

  // Validasi data
  const hasData = useMemo(() => {
    return (
      data &&
      Array.isArray(data) &&
      data.length > 0 &&
      data.some((d) => d.votingBreakdown && d.votingBreakdown.length > 0)
    )
  }, [data])

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

    // Hitung total model rata-rata (default 7)
    const totalModels = modelsUsed?.length || 7

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
          let html = `
            <div style="font-family: inherit; min-width: 220px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${isDarkMode ? "#334155" : "#E2E8F0"}; padding-bottom: 6px; margin-bottom: 8px;">
                <span style="font-weight: 700; font-size: 13px; color: ${isDarkMode ? "#38BDF8" : "#0284C7"};">
                  🕒 Jam ${timeLabel} WIB
                </span>
                <span style="font-size: 11px; color: #94A3B8;">${totalModels} Model Terlibat</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
          `

          // Urutkan segmen dari persentase terbesar
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
              <div style="padding: 4px 6px; border-radius: 6px; background: ${isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
                    <span>${conditionName}</span>
                  </span>
                  <span style="font-weight: 700; color: ${color};">${pct}% <span style="font-size: 10px; opacity: 0.8;">(${count}/${totalModels})</span></span>
                </div>
                ${
                  modelNames
                    ? `<div style="font-size: 10px; color: #94A3B8; margin-top: 2px; padding-left: 16px;">Model: ${modelNames}</div>`
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
  }, [hasData, data, modelsUsed, isDarkMode])

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
                  Distribusi voting 100% stacked bar dari 7 model global (Physics NWP & AI DeepMind) per slot jam
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
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <Cpu className="w-3 h-3 text-indigo-500" /> AI:
              </span>
              <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Google WeatherNext 2
              </span>
              <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                ECMWF AIFS
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 ml-1">
                <Globe2 className="w-3 h-3 text-sky-500" /> NWP:
              </span>
              <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                ECMWF IFS • GFS • ICON • GEM • JMA
              </span>
            </div>
          </div>
        )}
      </CardHeader>

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
                  Silakan klik tombol <strong>"Ambil Otomatis"</strong> di atas form tabel prakiraan untuk mengambil prediksi 7 model global dan menghitung bar chart probabilitas ensemble secara real-time.
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
            <div className="space-y-3">
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
                  Arahkan kursor (hover) pada batang jam untuk melihat nama-nama model yang memilih kondisi tersebut.
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Tinggi Batang = 100% Total Konsensus
                </span>
              </div>
            </div>
          ) : (
            /* MATRIKS MODEL VIEW */
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
        </CardContent>
      )}
    </Card>
  )
}

export default EnsembleProbabilityChart
