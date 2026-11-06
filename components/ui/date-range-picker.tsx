"use client"

import * as React from "react"
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  isSameDay,
} from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon, RotateCcw, CalendarDays } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useIsMobile } from "@/hooks/use-mobile"

export interface DateRangePreset {
  label: string
  getValue: () => DateRange
}

export const DEFAULT_DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    label: "Hari Ini",
    getValue: () => {
      const now = new Date()
      return { from: startOfDay(now), to: endOfDay(now) }
    },
  },
  {
    label: "Kemarin",
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
    },
  },
  {
    label: "7 Hari Terakhir",
    getValue: () => {
      const now = new Date()
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }
    },
  },
  {
    label: "30 Hari Terakhir",
    getValue: () => {
      const now = new Date()
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) }
    },
  },
  {
    label: "Bulan Ini",
    getValue: () => {
      const now = new Date()
      return { from: startOfMonth(now), to: endOfDay(now) }
    },
  },
  {
    label: "Bulan Lalu",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    },
  },
]

export interface DateRangePickerProps {
  /** Nilai rentang tanggal saat ini */
  value?: DateRange
  /** Callback saat rentang tanggal berubah */
  onChange?: (range: DateRange | undefined) => void
  /** Teks placeholder saat belum ada tanggal terpilih */
  placeholder?: string
  /** Perataan popover terhadap tombol trigger */
  align?: "start" | "center" | "end"
  /** CSS class tambahan untuk wrapper */
  className?: string
  /** CSS class tambahan untuk tombol trigger */
  triggerClassName?: string
  /** Fungsi penentu apakah suatu tanggal dinonaktifkan (misal masa depan) */
  disabled?: (date: Date) => boolean
  /** Apakah menampilkan tombol reset */
  showReset?: boolean
  /** Callback saat tombol reset diklik */
  onReset?: () => void
  /** Apakah tombol trigger dinonaktifkan */
  disabledInput?: boolean
  /** Jumlah bulan yang ditampilkan (default: 2 di desktop, 1 di mobile) */
  numberOfMonths?: number
  /** Judul header popover */
  title?: string
  /** ID untuk tombol trigger */
  id?: string
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pilih rentang tanggal",
  align = "start",
  className,
  triggerClassName,
  disabled = (date) => date > new Date(),
  showReset = true,
  onReset,
  disabledInput = false,
  numberOfMonths,
  title = "Pilih Tanggal Observasi",
  id,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  // Tentukan jumlah bulan (prioritas: prop > responsif mobile)
  const effectiveNumberOfMonths = numberOfMonths ?? (isMobile ? 1 : 2)

  // Handler memilih tanggal
  const handleSelect = (range: DateRange | undefined) => {
    onChange?.(range)
  }

  // Handler reset
  const handleReset = () => {
    if (onReset) {
      onReset()
    } else {
      onChange?.(undefined)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabledInput}
            className={cn(
              "w-full sm:w-auto min-w-[220px] justify-between text-left font-semibold text-xs sm:text-sm h-9 px-3 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
              value?.from
                ? "text-slate-900 dark:text-slate-100 border-blue-500/60 ring-1 ring-blue-500/20"
                : "text-slate-500",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">
                {value?.from ? (
                  value.to && !isSameDay(value.from, value.to) ? (
                    <>
                      {format(value.from, "dd MMM yyyy", { locale: idLocale })} –{" "}
                      {format(value.to, "dd MMM yyyy", { locale: idLocale })}
                    </>
                  ) : (
                    format(value.from, "EEEE, dd MMM yyyy", { locale: idLocale })
                  )
                ) : (
                  <span>{placeholder}</span>
                )}
              </span>
            </div>
            {value?.from && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4.5 ml-1.5 shrink-0 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              >
                {value.to && !isSameDay(value.from, value.to) ? "Rentang" : "1 Hari"}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 max-w-[calc(100vw-1.5rem)] shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          align={align}
        >
          {/* Header Popover */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              {title}
            </span>
            {value?.from && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-6 text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset Pilihan
              </Button>
            )}
          </div>

          {/* 2-Bulan Side-by-Side Shadcn Calendar */}
          <div className="p-3 sm:p-4 flex justify-center">
            <Calendar
              autoFocus
              mode="range"
              defaultMonth={value?.from || new Date()}
              selected={value}
              onSelect={handleSelect}
              numberOfMonths={effectiveNumberOfMonths}
              disabled={disabled}
              locale={idLocale}
            />
          </div>

          {/* Footer Popover: Status Rentang & Tutup */}
          <div className="px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {value?.from ? (
                <>
                  Terpilih:{" "}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {format(value.from, "dd MMM yyyy", { locale: idLocale })}
                  </strong>
                  {value.to && !isSameDay(value.from, value.to) ? (
                    <>
                      {" "}s/d{" "}
                      <strong className="text-slate-900 dark:text-slate-100">
                        {format(value.to, "dd MMM yyyy", { locale: idLocale })}
                      </strong>
                    </>
                  ) : (
                    " (1 Hari / 24 Jam)"
                  )}
                </>
              ) : (
                <span>Klik dua tanggal untuk memilih rentang</span>
              )}
            </span>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs font-bold px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Selesai
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
