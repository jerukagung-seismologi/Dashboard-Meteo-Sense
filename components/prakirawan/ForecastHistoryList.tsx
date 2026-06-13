import React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye } from "lucide-react"
import { getForecastHistory, Forecast } from "@/lib/forecastService"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ForecastHistoryListProps {
  onViewDetail: (forecast: Forecast) => void
}

export function ForecastHistoryList({ onViewDetail }: ForecastHistoryListProps) {
  const [history, setHistory] = React.useState<Forecast[]>([])
  const [loading, setLoading] = React.useState(false)
  const [filterDevice, setFilterDevice] = React.useState<string>("ALL")

  const fetchHistory = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await getForecastHistory({ deviceId: filterDevice })
      setHistory(data)
    } catch (err) {
      console.error("Failed to fetch forecast history", err)
    } finally {
      setLoading(false)
    }
  }, [filterDevice])

  // Fetch immediately on mount
  React.useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const formatDate = (date: any) => {
    if (!date) return "-"
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleString("id-ID", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    })
  }

  return (
    <div className="py-4 space-y-4">
      <div className="space-y-2 max-w-md">
        <label className="text-sm font-medium">Cari Prakiraan</label>
        <input 
          type="text" 
          placeholder="Cari nama kota, prakirawan, atau tanggal..." 
          className="w-full px-3 py-2 border rounded-md text-sm"
          onChange={(e) => setFilterDevice(e.target.value)} 
        />
      </div>

      <div className="border rounded-md bg-white">
        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Memuat data...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Belum ada riwayat prakiraan.</div>
          ) : (
            <div className="divide-y">
              {history
                .filter(item => filterDevice === "ALL" || filterDevice === "" || 
                  item.deviceName.toLowerCase().includes(filterDevice.toLowerCase()) || 
                  item.forecasterName.toLowerCase().includes(filterDevice.toLowerCase()) || 
                  item.forecastDate.includes(filterDevice)
                )
                .map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">{item.deviceName}</div>
                    <div className="text-xs text-slate-500">
                      Target: <span className="font-medium text-slate-700">{item.forecastDate}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Dibuat: {formatDate(item.createdAt)} oleh {item.forecasterName}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">{item.forecastSource}</Badge>
                      <Badge variant="secondary" className="text-[10px]">v{item.version}</Badge>
                      <Badge variant={item.status === "published" ? "default" : "secondary"} className="text-[10px]">{item.status}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(item)}>
                    <Eye className="w-4 h-4 mr-1" /> Lihat
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
