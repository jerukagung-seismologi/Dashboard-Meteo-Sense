"use client"

import { useEffect, useState, useMemo } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { fetchBMKGData, BMKGOutputData } from "@/lib/FetchingBMKGPrediction"
import { KEBUMEN_VILLAGES } from "@/lib/kebumen-villages"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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

// Helper: normalize varied BMKG response shapes
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

// Helper: robust date parsing
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

// Wind direction indicator
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

export default function BMKGNowcasting({ className, limit = 6 }: Props) {
  const [data, setData] = useState<BMKGOutputData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVillage, setSelectedVillage] = useState("33.05.05.2014") // Default to Kebumen
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchBMKGData(selectedVillage)
      .then((res: any) => {
        if (!cancelled) {
          if (!res || typeof res !== "object") {
            setData([])
            setError("Lokasi tidak ditemukan atau data tidak valid.")
            return
          }
          const normalized = normalizeBMKGResponse(res)
          setData(normalized || [])
          setError(null)
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(
            typeof e?.message === "string"
              ? e.message
              : "Gagal memuat data BMKG"
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedVillage])

  const items = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const ta = parseDateValue(a.local_datetime || a.datetime)
      const tb = parseDateValue(b.local_datetime || b.datetime)
      if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
      return ta - tb
    })
    return sorted.slice(0, limit)
  }, [data, limit])

  const currentVillageName = useMemo(() => {
    return (
      KEBUMEN_VILLAGES.find(d => d.code === selectedVillage)?.name || "Unknown"
    )
  }, [selectedVillage])

  return (
    <section className={className}>
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Prakiraan BMKG: {currentVillageName}
          </h2>
          {data[0]?.analysis_date ? (
            <span className="text-xs text-muted-foreground">
              Analisis: {data[0].analysis_date}
            </span>
          ) : null}
        </div>
        <div className="w-full sm:w-72">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedVillage
                  ? KEBUMEN_VILLAGES.find(
                      village => village.code === selectedVillage
                    )?.name
                  : "Pilih Desa..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Cari desa..." />
                <CommandEmpty>Desa tidak ditemukan.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-y-auto">
                  {KEBUMEN_VILLAGES.map(village => (
                    <CommandItem
                      key={village.code}
                      value={village.name}
                      onSelect={() => {
                        setSelectedVillage(village.code)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedVillage === village.code
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {village.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {loading ? (
        <div className="rounded-lg border p-4 text-sm">
          Memuat Prakiraan BMKG untuk {currentVillageName}...
        </div>
      ) : error ? (
        <div className="rounded-lg border p-4 text-sm text-red-600 dark:text-red-500">
          Error: {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm">
          Tidak ada data prakiraan tersedia untuk {currentVillageName}.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-3 text-center text-sm shadow-sm"
            >
              <div className="font-semibold">
                {new Date(
                  parseDateValue(item.local_datetime || item.datetime)
                ).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(
                  parseDateValue(item.local_datetime || item.datetime)
                ).toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <div className="text-base font-bold">{item.weather_desc}</div>
              <img
                src={item.image}
                alt={item.weather_desc}
                className="h-12 w-12 object-contain"
                title={item.weather_desc}
              />
              <div className="text-base font-bold">{formatNumber(item.t)}°C / {formatNumber(item.hu)}%</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <WindDirectionIndicator deg={item.wd_deg} />
                <span>{degreesToCompass(item.wd_deg)}</span>
                <span>{formatNumber(item.ws, { decimals: 1 })} km/j</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Curah hujan: {formatNumber(item.tp)} mm
                Visibilitas: {formatNumber(item.vs)} km
                Tutupan awan: {formatNumber(item.tcc)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}