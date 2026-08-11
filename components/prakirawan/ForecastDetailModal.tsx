"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Forecast } from "@/lib/forecastService"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getLucideIconForCondition } from "./WeatherIcons"
import { 
  FileEdit, 
  X, 
  MapPin, 
  Calendar, 
  User, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Archive 
} from "lucide-react"

interface ForecastDetailModalProps {
  forecast: Forecast | null
  onClose: () => void
  onEdit?: (forecast: Forecast) => void
}

export function ForecastDetailModal({ forecast, onClose, onEdit }: ForecastDetailModalProps) {
  if (!forecast) return null

  const formatDate = (date: any) => {
    if (!date) return "-"
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={!!forecast} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <MapPin className="w-5 h-5 text-rose-500" />
            Detail Prakiraan Cuaca: {forecast.deviceName}
          </DialogTitle>
          <DialogDescription>
            Prakiraan target untuk wilayah {forecast.deviceName} pada tanggal {forecast.forecastDate}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="space-y-0.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Prakirawan
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{forecast.forecasterName}</div>
            </div>

            <div className="space-y-0.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                Sumber Analisis
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{forecast.forecastSource}</div>
            </div>

            <div className="space-y-0.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Waktu Pembuatan
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{formatDate(forecast.createdAt)}</div>
            </div>

            <div className="space-y-0.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Versi & Status
              </div>
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <span>v{forecast.version}</span>
                <Badge
                  variant={
                    forecast.status === "published"
                      ? "default"
                      : forecast.status === "draft"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-[10px] capitalize font-normal"
                >
                  {forecast.status === "published" && (
                    <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-300 inline" />
                  )}
                  {forecast.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Hourly Forecast Table */}
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Data Prakiraan (Per Jam)</h3>
            <div className="border rounded-md overflow-x-auto dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/40">
                    <TableHead className="w-[80px]">Jam</TableHead>
                    <TableHead>Kondisi Cuaca</TableHead>
                    <TableHead>Suhu (°C)</TableHead>
                    <TableHead>Kelembapan (%)</TableHead>
                    <TableHead>Indeks Panas (°C)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.hourlyData?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">{row.time}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0">
                            {getLucideIconForCondition(row.conditionMain, 22)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                              {row.probMain ? `${row.probMain}% ` : ""}
                              {row.conditionMain}
                            </span>
                            {row.conditionSub && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {row.probSub ? `${row.probSub}% ` : ""}
                                {row.conditionSub}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.temperature !== "" ? `${row.temperature} ±${row.temperatureError}` : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.humidity !== "" ? `${row.humidity} ±${row.humidityError}` : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.heatIndex !== "" ? `${row.heatIndex} ±${row.heatIndexError}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          {forecast.notes && (
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Catatan Diskusi Prakirawan</h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800 rounded-md text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {forecast.notes}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-4 border-t dark:border-slate-800">
          <div>
            {onEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onEdit(forecast)
                  onClose()
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                <FileEdit className="w-4 h-4 mr-1.5" />
                Muat & Edit di Form Editor
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            <X className="w-4 h-4 mr-1.5" />
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
