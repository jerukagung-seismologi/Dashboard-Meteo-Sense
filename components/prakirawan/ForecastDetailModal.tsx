import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { getLucideIconForCondition } from "./WeatherIcons"

interface ForecastDetailModalProps {
  forecast: Forecast | null
  onClose: () => void
}

export function ForecastDetailModal({ forecast, onClose }: ForecastDetailModalProps) {
  if (!forecast) return null

  const formatDate = (date: any) => {
    if (!date) return "-"
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleString("id-ID", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    })
  }

  return (
    <Dialog open={!!forecast} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Prakiraan Cuaca</DialogTitle>
          <DialogDescription>
            Prakiraan untuk {forecast.deviceName} pada tanggal {forecast.forecastDate}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border">
            <div>
              <div className="text-xs text-slate-500">Prakirawan</div>
              <div className="font-semibold text-sm">{forecast.forecasterName}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Sumber</div>
              <div className="font-semibold text-sm">{forecast.forecastSource}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Dibuat Pada</div>
              <div className="font-semibold text-sm">{formatDate(forecast.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Versi</div>
              <div className="font-semibold text-sm">v{forecast.version} <Badge variant={forecast.status === "published" ? "default" : "secondary"} className="ml-1 text-[10px]">{forecast.status}</Badge></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Data Prakiraan (Per Jam)</h3>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jam</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead>Suhu (°C)</TableHead>
                    <TableHead>Kelembapan (%)</TableHead>
                    <TableHead>Heat Index (°C)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.hourlyData?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.time}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            {getLucideIconForCondition(row.conditionMain, 24)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{row.conditionMain} {row.probMain ? `(${row.probMain}%)` : ""}</span>
                            {row.conditionSub && <span className="text-xs text-slate-500">{row.conditionSub} {row.probSub ? `(${row.probSub}%)` : ""}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.temperature !== "" ? `${row.temperature} ±${row.temperatureError}` : "-"}
                      </TableCell>
                      <TableCell>
                        {row.humidity !== "" ? `${row.humidity} ±${row.humidityError}` : "-"}
                      </TableCell>
                      <TableCell>
                        {row.heatIndex !== "" ? `${row.heatIndex} ±${row.heatIndexError}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {forecast.notes && (
            <div>
              <h3 className="font-semibold mb-2">Catatan Diskusi Prakirawan</h3>
              <div className="p-4 bg-white border rounded-md text-sm whitespace-pre-wrap">
                {forecast.notes}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
