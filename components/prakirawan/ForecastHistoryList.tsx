"use client"

import React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Eye, 
  FileEdit, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Archive, 
  MapPin, 
  Calendar, 
  User, 
  Layers, 
  MoreVertical 
} from "lucide-react"
import { 
  getForecastHistory, 
  deleteForecast, 
  updateForecastStatus, 
  Forecast, 
  ForecastStatus 
} from "@/lib/forecastService"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

interface ForecastHistoryListProps {
  onViewDetail: (forecast: Forecast) => void
  onEditForecast?: (forecast: Forecast) => void
  onCreateNew?: () => void
}

export function ForecastHistoryList({
  onViewDetail,
  onEditForecast,
  onCreateNew,
}: ForecastHistoryListProps) {
  const { toast } = useToast()
  const [history, setHistory] = React.useState<Forecast[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
  
  // State untuk modal konfirmasi hapus
  const [forecastToDelete, setForecastToDelete] = React.useState<Forecast | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const fetchHistory = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await getForecastHistory()
      setHistory(data)
    } catch (err) {
      console.error("Failed to fetch forecast history", err)
      toast({
        title: "Gagal memuat riwayat",
        description: "Tidak dapat mengambil data riwayat dari database.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Handler Hapus Prakiraan (CRUD: Delete)
  const handleDeleteConfirm = async () => {
    if (!forecastToDelete?.id) return
    setIsDeleting(true)
    try {
      await deleteForecast(forecastToDelete.id)
      setHistory((prev) => prev.filter((item) => item.id !== forecastToDelete.id))
      toast({
        title: "Prakiraan dihapus",
        description: `Prakiraan untuk ${forecastToDelete.deviceName} (${forecastToDelete.forecastDate}) berhasil dihapus.`,
      })
    } catch (err) {
      console.error("Failed to delete forecast", err)
      toast({
        title: "Gagal menghapus",
        description: "Terjadi kesalahan saat menghapus data prakiraan.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setForecastToDelete(null)
    }
  }

  // Handler Ubah Status (CRUD: Update Status)
  const handleStatusChange = async (item: Forecast, newStatus: ForecastStatus) => {
    if (!item.id || item.status === newStatus) return
    try {
      await updateForecastStatus(item.id, newStatus)
      setHistory((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: newStatus } : f))
      )
      toast({
        title: "Status diperbarui",
        description: `Status prakiraan ${item.deviceName} diubah menjadi "${newStatus}".`,
      })
    } catch (err) {
      console.error("Failed to update status", err)
      toast({
        title: "Gagal mengubah status",
        description: "Terjadi kesalahan saat memperbarui status prakiraan.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: any) => {
    if (!date) return "-"
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Filtering data
  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      q === "" ||
      item.deviceName.toLowerCase().includes(q) ||
      item.forecasterName.toLowerCase().includes(q) ||
      item.forecastDate.includes(q) ||
      item.forecastSource.toLowerCase().includes(q)

    const matchesStatus =
      statusFilter === "ALL" || item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* --- HEADER CONTROL TOOLBAR (CRUD: Create, Read, Filter, Refresh) --- */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-1 max-w-xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari lokasi, prakirawan, atau tanggal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-slate-400 ml-1 hidden sm:inline" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">Semua Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            disabled={loading}
            className="h-9 text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {onCreateNew && (
            <Button
              variant="default"
              size="sm"
              onClick={onCreateNew}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Buat Baru
            </Button>
          )}
        </div>
      </div>

      {/* --- LIST DAFTAR RIWAYAT PRAKIRAAN (CRUD: Read, Update, Delete) --- */}
      <div className="border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden shadow-sm">
        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <span>Memuat riwayat prakiraan dari database...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {searchQuery || statusFilter !== "ALL"
                  ? "Tidak ada prakiraan yang cocok dengan filter."
                  : "Belum ada riwayat prakiraan yang tersimpan."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery || statusFilter !== "ALL"
                  ? "Coba ubah kata kunci pencarian atau status filter."
                  : "Buat prakiraan baru melalui form input dan simpan ke database."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  {/* Info Ringkas */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-base">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        {item.deviceName}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono">
                        v{item.version}
                      </Badge>
                      <Badge
                        variant={
                          item.status === "published"
                            ? "default"
                            : item.status === "draft"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[11px] capitalize"
                      >
                        {item.status === "published" && (
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-300 inline" />
                        )}
                        {item.status === "draft" && (
                          <Clock className="w-3 h-3 mr-1 text-amber-500 inline" />
                        )}
                        {item.status === "archived" && (
                          <Archive className="w-3 h-3 mr-1 text-slate-400 inline" />
                        )}
                        {item.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Target: <strong className="text-slate-700 dark:text-slate-300">{item.forecastDate}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {item.forecasterName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {item.forecastSource}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Disimpan: {formatDate(item.createdAt)}
                    </div>
                  </div>

                  {/* Tombol Aksi CRUD Lengkap */}
                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                    {/* Read (View Detail) */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetail(item)}
                      className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:border-blue-300"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-blue-500" />
                      Detail
                    </Button>

                    {/* Update (Edit / Load to Form) */}
                    {onEditForecast && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditForecast(item)}
                        className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:border-indigo-300"
                      >
                        <FileEdit className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                        Edit Form
                      </Button>
                    )}

                    {/* Dropdown Status & Aksi Lanjutan */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel className="text-xs">Ubah Status</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(item, "published")}
                          className="text-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                          Set Published
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(item, "draft")}
                          className="text-xs cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 mr-2 text-amber-500" />
                          Set Draft
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(item, "archived")}
                          className="text-xs cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          Set Archived
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Delete Action */}
                        <DropdownMenuItem
                          onClick={() => setForecastToDelete(item)}
                          className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
                          Hapus Data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Quick Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForecastToDelete(item)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Hapus Prakiraan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* --- MODAL DIALOG KONFIRMASI HAPUS (CRUD: Delete Dialog) --- */}
      <AlertDialog open={!!forecastToDelete} onOpenChange={(open) => !open && setForecastToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Hapus Prakiraan Cuaca?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data prakiraan untuk{" "}
              <strong>{forecastToDelete?.deviceName}</strong> pada tanggal{" "}
              <strong>{forecastToDelete?.forecastDate}</strong> (Versi {forecastToDelete?.version})?
              Tindakan ini tidak dapat dibatalkan dan akan menghapus data dari database Firestore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
