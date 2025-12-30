"use client"

import { useEffect, useState, useMemo } from "react"
import { fetchBMKGData, BMKGOutputData } from "@/lib/FetchingBMKGPrediction"

type Props = {
  className?: string
  limit?: number // number of forecast items to show
}

// Helper: deep flatten arrays
function deepFlatten(arr: any[]): any[] {
  return arr.reduce((acc: any[], v: any) => {
    if (Array.isArray(v)) return acc.concat(deepFlatten(v))
    acc.push(v)
    return acc
  }, [])
}

// Helper: normalize varied BMKG response shapes into BMKGOutputData[]
function normalizeBMKGResponse(input: any): BMKGOutputData[] {
  // If it's already an array of forecast objects (has "t", "weather_desc", etc.)
  if (Array.isArray(input) && input.length && typeof input[0] === "object" && ("t" in input[0] || "weather_desc" in input[0])) {
    return input as BMKGOutputData[]
  }

  // If it has a "data" property with nested arrays and cuaca
  if (input && Array.isArray(input.data)) {
    const groups = deepFlatten(input.data)
    const forecasts = groups.flatMap((grp: any) => {
      if (grp && Array.isArray(grp.cuaca)) {
        return deepFlatten(grp.cuaca)
      }
      return []
    })
    return forecasts as BMKGOutputData[]
  }

  // If it's nested arrays directly (e.g., [ [{ lokasi, cuaca: [...] }] ])
  if (Array.isArray(input)) {
    const flattened = deepFlatten(input)
    const withCuaca = flattened.find((x: any) => x && Array.isArray(x.cuaca))
    if (withCuaca) {
      return deepFlatten(withCuaca.cuaca) as BMKGOutputData[]
    }
  }

  return []
}

// Helper: robust date parsing for "YYYY-MM-DD HH:mm:ss" or ISO
function parseDateValue(s?: string): number {
  if (!s || typeof s !== "string") return NaN
  const candidate = s.includes("T") ? s : s.replace(" ", "T")
  const t = Date.parse(candidate)
  return Number.isNaN(t) ? Date.parse(s) : t
}

// Helper: safe number formatting
function formatNumber(value: unknown, opts?: { decimals?: number; fallback?: string }): string {
  const { decimals = 0, fallback = "—" } = opts || {}
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  if (decimals <= 0) return String(Math.round(n))
  return n.toFixed(decimals)
}

// Compass helpers
function normalizeDeg(deg?: number): number | null {
  if (typeof deg !== "number" || !Number.isFinite(deg)) return null
  let d = deg % 360
  if (d < 0) d += 360
  return d
}
function degreesToCompass(deg?: number): string {
  const d = normalizeDeg(deg)
  if (d == null) return "—"
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
  const idx = Math.round(d / 22.5) % 16
  return dirs[idx]
}
function degFromWdString(wd?: string): number | null {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5
  }
  if (!wd) return null
  const key = wd.trim().toUpperCase()
  return key in map ? map[key] : null
}

// Wind direction indicator (arrow points to where wind comes FROM, like meteorological convention)
function WindDirectionIndicator({ deg }: { deg: number | null }) {
  const d = normalizeDeg(deg ?? undefined)
  const rotation = d ?? 0
  return (
    <div className="relative h-6 w-6 shrink-0">
      <svg viewBox="0 0 24 24" className="absolute inset-0" aria-label="Arah angin">
        {/* compass circle */}
        <circle cx="12" cy="12" r="11" className="stroke-muted-foreground/40" strokeWidth="1" fill="none" />
        {/* north mark */}
        <line x1="12" y1="2" x2="12" y2="4" className="stroke-muted-foreground/60" strokeWidth="1" />
        {/* arrow (up by default), rotated by deg */}
        <g transform={`rotate(${rotation} 12 12)`}>
          <line x1="12" y1="12" x2="12" y2="5" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 4 L10.5 6.5 L13.5 6.5 Z" className="fill-primary" />
        </g>
      </svg>
    </div>
  )
}

export default function BMKGNowcasting({ className, limit = 6}: Props) {
  const [data, setData] = useState<BMKGOutputData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchBMKGData()
      .then((res: any) => {
        if (!cancelled) {
          const normalized = normalizeBMKGResponse(res)
          setData(normalized || [])
          setError(null)
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(typeof e?.message === "string" ? e.message : "Gagal memuat data BMKG")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const items = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const ta = parseDateValue(a.local_datetime || a.datetime)
      const tb = parseDateValue(b.local_datetime || b.datetime)
      // If parse fails, keep original order
      if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
      return ta - tb
    })
    return sorted.slice(0, limit)
  }, [data, limit])

  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">BMKG Nowcasting</h2>
        {data[0]?.analysis_date ? (
          <span className="text-xs text-muted-foreground">
            Analisis: {data[0].analysis_date}
          </span>
        ) : null}
      </div>
      {loading ? (
        <div className="rounded-lg border p-4 text-sm">Memuat Nowcasting BMKG...</div>
      ) : error ? (
        <div className="rounded-lg border p-4 text-sm text-red-600 dark:text-red-500">
          Terjadi kesalahan: {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm">Data tidak tersedia.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map((it, idx) => {
            // Prefer local time, fallback to UTC datetime, else try to format parsed Date
            const timeText =
              (it.local_datetime?.split(" ")?.[1]?.slice(0, 5)) ||
              (it.datetime?.split("T")?.[1]?.slice(0, 5)) ||
              (() => {
                const ts = parseDateValue(it.datetime || it.local_datetime)
                if (!Number.isNaN(ts)) {
                  return new Date(ts).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Jakarta",
                    hour12: false,
                  })
                }
                return it.time_index || "—"
              })()

            const tempText = formatNumber(it.t, { decimals: 0 })
            const rhText = formatNumber(it.hu, { decimals: 0 })
            const cloudText = formatNumber(it.tcc, { decimals: 0 })
            const rainText = formatNumber(it.tp, { decimals: 1 })
            const windSpdText = formatNumber(it.ws, { decimals: 1 })

            // Visibility: API appears to provide meters; convert to km with 1 decimal
            const visKm =
              typeof it.vs === "number" && Number.isFinite(it.vs)
                ? (it.vs / 1000).toFixed(1)
                : null

            // Wind direction
            const dirDeg = normalizeDeg(typeof it.wd_deg === "number" ? it.wd_deg : degFromWdString(it.wd) || undefined)
            const dirLabel = it.wd || degreesToCompass(dirDeg ?? undefined)

            // Encode image URL to handle spaces safely
            const imageSrc = it.image ? encodeURI(it.image) : null

            return (
              <div key={idx} className="rounded-lg border p-4 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">{timeText} WIB</div>
                  {imageSrc ? (
                    // image URL provided by API
                    <img
                      src={imageSrc}
                      alt={it.weather_desc_en || it.weather_desc || "Cuaca"}
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted" />
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-semibold">{tempText}°C</div>
                  <div className="text-xs text-muted-foreground">{it.weather_desc || "—"}</div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>RH: {rhText}%</div>
                  <div>Cloud: {cloudText}%</div>
                  <div>Hujan: {rainText} mm</div>
                  <div className="flex items-center gap-2">
                    <WindDirectionIndicator deg={dirDeg} />
                    <span>Angin: {windSpdText} m/s {dirLabel}</span>
                  </div>
                  <div className="col-span-2">
                    Vis: {visKm ? `${visKm} km` : "—"} {it.vs_text ? `(${it.vs_text})` : ""}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}