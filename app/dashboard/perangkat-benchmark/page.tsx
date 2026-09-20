// app/dashboard/perangkat-benchmark/page.tsx
"use client"

import React, { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"

const LocationPickerMap = dynamic(
  () => import("@/components/peta/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex flex-col items-center justify-center gap-2 text-xs text-slate-400 border border-slate-200 dark:border-slate-700">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
        <span>Memuat Peta Pemilih Titik Koordinat...</span>
      </div>
    ),
  }
)
import {
  fetchBenchmarkDevices,
  addBenchmarkDevice,
  updateBenchmarkDevice,
  deleteBenchmarkDevice,
  seedBenchmarkDevicesIfEmpty,
  bulkSeedBenchmarkDevices,
  BenchmarkDevice,
} from "@/lib/FetchingBenchmarkDevice"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeaderBanner } from "@/components/ui/PageHeaderBanner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Radio,
  MapPin,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Globe,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
} from "lucide-react"

type SortKey = "name" | "location" | "id" | "status"
type SortDir = "asc" | "desc"
type ViewMode = "grid" | "list"

export default function PerangkatBenchmarkPage() {
  const { toast } = useToast()
  const [devices, setDevices] = useState<BenchmarkDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [isSeeding, setIsSeeding] = useState(false)

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<BenchmarkDevice | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State for Add / Edit (Hanya Metadata & Lokasi)
  const [formData, setFormData] = useState({
    customId: "",
    name: "",
    location: "",
    lat: -7.685,
    lng: 109.655,
    status: "online" as "online" | "offline",
  })

  // Load Devices from Firestore
  const loadDevices = async () => {
    setLoading(true)
    try {
      // If collection is empty, auto-seed with default 20 Kebumen stations
      const data = await seedBenchmarkDevicesIfEmpty()
      setDevices(data)
    } catch (error) {
      console.error("Error loading benchmark devices:", error)
      toast({
        title: "Gagal Memuat Data",
        description: "Tidak dapat mengambil data stasiun benchmark dari Firestore.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  // Filtered + Sorted devices
  const filteredDevices = useMemo(() => {
    let result = devices.filter((d) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || d.status === statusFilter
      return matchesSearch && matchesStatus
    })
    // Sort
    result = [...result].sort((a, b) => {
      let valA = "", valB = ""
      if (sortKey === "name") { valA = a.name; valB = b.name }
      else if (sortKey === "location") { valA = a.location; valB = b.location }
      else if (sortKey === "id") { valA = a.id; valB = b.id }
      else if (sortKey === "status") { valA = a.status; valB = b.status }
      const cmp = valA.localeCompare(valB, "id", { sensitivity: "base" })
      return sortDir === "asc" ? cmp : -cmp
    })
    return result
  }, [devices, searchQuery, statusFilter, sortKey, sortDir])

  // Quick inline stats
  const totalOnline = useMemo(() => devices.filter((d) => d.status === "online").length, [devices])
  const totalOffline = useMemo(() => devices.length - totalOnline, [devices, totalOnline])

  // Toggle sort: same key flips direction, new key resets to asc
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-indigo-500" /> : <ArrowDown className="h-3 w-3 text-indigo-500" />
  }

  // Handle Open Add Dialog
  // Handle Open Add Dialog
  const handleOpenAdd = () => {
    setFormData({
      customId: "",
      name: "",
      location: "",
      lat: -7.685,
      lng: 109.655,
      status: "online",
    })
    setIsAddOpen(true)
  }

  // Handle Open Edit Dialog
  const handleOpenEdit = (device: BenchmarkDevice) => {
    setSelectedDevice(device)
    setFormData({
      customId: device.id,
      name: device.name,
      location: device.location,
      lat: device.lat,
      lng: device.lng,
      status: device.status,
    })
    setIsEditOpen(true)
  }

  // Handle Open Delete Dialog
  const handleOpenDelete = (device: BenchmarkDevice) => {
    setSelectedDevice(device)
    setIsDeleteOpen(true)
  }

  // Submit Add
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast({ title: "Nama Stasiun Wajib Diisi", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const created = await addBenchmarkDevice({
        customId: formData.customId.trim() || undefined,
        name: formData.name.trim(),
        location: formData.location.trim(),
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        status: formData.status,
      })
      setDevices((prev) => [created, ...prev])
      setIsAddOpen(false)
      toast({
        title: "Stasiun Berhasil Ditambahkan",
        description: `Stasiun "${created.name}" tersimpan di koleksi benchmarkdevices.`,
      })
    } catch (error) {
      console.error("Error adding benchmark device:", error)
      toast({
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat menyimpan stasiun ke Firestore.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Edit
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDevice || !formData.name.trim()) return

    setSubmitting(true)
    try {
      await updateBenchmarkDevice(selectedDevice.id, {
        name: formData.name.trim(),
        location: formData.location.trim(),
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        status: formData.status,
      })

      setDevices((prev) =>
        prev.map((d) =>
          d.id === selectedDevice.id
            ? {
                ...d,
                name: formData.name.trim(),
                location: formData.location.trim(),
                lat: Number(formData.lat),
                lng: Number(formData.lng),
                status: formData.status,
              }
            : d
        )
      )

      setIsEditOpen(false)
      toast({
        title: "Stasiun Berhasil Diperbarui",
        description: `Data stasiun "${formData.name}" telah disimpan.`,
      })
    } catch (error) {
      console.error("Error updating benchmark device:", error)
      toast({
        title: "Gagal Memperbarui",
        description: "Terjadi kesalahan saat memperbarui data di Firestore.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Delete
  const handleSubmitDelete = async () => {
    if (!selectedDevice) return

    setSubmitting(true)
    try {
      await deleteBenchmarkDevice(selectedDevice.id)
      setDevices((prev) => prev.filter((d) => d.id !== selectedDevice.id))
      setIsDeleteOpen(false)
      toast({
        title: "Stasiun Dihapus",
        description: `Stasiun "${selectedDevice.name}" telah dihapus dari Firestore.`,
      })
    } catch (error) {
      console.error("Error deleting benchmark device:", error)
      toast({
        title: "Gagal Menghapus",
        description: "Terjadi kesalahan saat menghapus stasiun dari Firestore.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Force Bulk Seed / Reset 20 Stations
  const handleBulkSeed = async () => {
    if (!confirm("Sinkronkan ulang data ke Database?")) return

    setIsSeeding(true)
    try {
      const count = await bulkSeedBenchmarkDevices()
      await loadDevices()
      toast({
        title: "Sinkronisasi Berhasil",
        description: `${count} stasiun wilayah Kebumen berhasil disinkronkan ke koleksi benchmarkdevices.`,
      })
    } catch (error) {
      console.error("Error bulk seeding:", error)
      toast({
        title: "Gagal Sinkronisasi",
        description: "Terjadi kesalahan saat seeding data ke Database",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Unified Single Header Banner */}
      <PageHeaderBanner
        gradient="indigo"
        icon={Radio}
        title="Pengelolaan Stasiun Benchmark"
        subtitle="Kelola stasiun acuan geospasial untuk modul Peta Persebaran Geografis dan validasi bias ERA5."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkSeed}
              disabled={isSeeding || loading}
              className="gap-1.5 text-xs font-semibold text-white bg-slate-800/90 hover:bg-slate-700 border-slate-700 shadow-sm h-8"
              title="Seed 20 Titik Default Kebumen"
            >
              <Sparkles className={`h-3.5 w-3.5 text-amber-400 ${isSeeding ? "animate-spin" : ""}`} />
              <span>{isSeeding ? "Menyinkronkan..." : "Sinkronisasi"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadDevices}
              disabled={loading}
              className="gap-1.5 text-xs font-semibold text-white bg-slate-800/90 hover:bg-slate-700 border-slate-700 shadow-sm h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Stasiun</span>
            </Button>

            <Link href="/dashboard/peta">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold text-white bg-slate-800/90 hover:bg-slate-700 border-slate-700 shadow-sm h-8"
              >
                <Globe className="h-3.5 w-3.5 text-indigo-400" />
                <span>Buka Peta</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        }
      />


      {/* ── Rich Filter + Sort Toolbar ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Row 1: Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama stasiun, lokasi/kecamatan, atau ID dokumen…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-end sm:self-auto shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Tampilan Grid"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Tampilan Daftar"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Filter chips + Sort + Count */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" />
              Filter:
            </span>
            <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(["all", "online", "offline"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    statusFilter === s
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {s === "online" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {s === "offline" && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                  {s === "all" ? `Semua (${devices.length})` : s === "online" ? `Online (${totalOnline})` : `Offline (${totalOffline})`}
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Sort */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              Urutkan:
            </span>
            <div className="flex gap-1 flex-wrap">
              {(["name", "location", "status", "id"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                    sortKey === key
                      ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  {key === "name" ? "Nama" : key === "location" ? "Lokasi" : key === "status" ? "Status" : "ID"}
                  <SortIcon k={key} />
                </button>
              ))}
            </div>
          </div>

          {/* Inline result count */}
          <div className="ml-auto shrink-0 text-[11px] text-slate-400">
            {loading ? (
              <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Memuat…</span>
            ) : (
              <span>
                Menampilkan{" "}
                <strong className="text-slate-700 dark:text-slate-300">{filteredDevices.length}</strong>
                {filteredDevices.length !== devices.length && (
                  <> dari <strong className="text-slate-700 dark:text-slate-300">{devices.length}</strong></>
                )}{" "}
                stasiun
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Station Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-xs font-semibold text-slate-500">Memuat data stasiun dari Database...</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 space-y-3">
          <Radio className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Tidak Ada Stasiun Ditemukan
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? "Coba kata kunci pencarian yang lain." : "Belum ada stasiun benchmark terdaftar."}
          </p>
          <Button size="sm" onClick={handleOpenAdd} className="rounded-xl text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Tambah Stasiun Pertama
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDevices.map((device) => {
            const isOnline = device.status === "online"
            return (
              <Card
                key={device.id}
                className="hover:shadow-md transition-all rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {device.name}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{device.location}</span>
                      </CardDescription>
                    </div>

                    <Badge
                      variant={isOnline ? "default" : "secondary"}
                      className={`text-[9px] font-bold px-1.5 py-0.5 shrink-0 ${
                        isOnline
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  {/* Telemetri Live ERA5 Banner */}
                  <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Radio className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-950 dark:text-indigo-200 block leading-tight">
                          Live ECMWF AIFS
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                      Reanalisis
                    </Badge>
                  </div>

                  {/* Metadata coordinates */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-indigo-500" />
                      {device.lat.toFixed(4)}°, {device.lng.toFixed(4)}°
                    </span>
                  </div>

                  {/* Document ID Tag */}
                  <div className="text-[9px] font-mono text-slate-400 truncate">
                    ID: <span className="text-slate-600 dark:text-slate-300 font-semibold">{device.id}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(device)}
                      className="flex-1 text-xs h-8 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1"
                    >
                      <Edit className="h-3 w-3 text-indigo-500" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDelete(device)}
                      className="text-xs h-8 px-2.5 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600"
                      title="Hapus Stasiun"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                    <Link href="/dashboard/peta">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 px-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600"
                        title="Lihat di Peta"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* ── List View ── */
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {/* List Header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-left">
              Nama Stasiun <SortIcon k="name" />
            </button>
            <button onClick={() => handleSort("location")} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-left">
              Lokasi <SortIcon k="location" />
            </button>
            <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              Status <SortIcon k="status" />
            </button>
            <span className="font-mono">Koordinat</span>
            <span>Aksi</span>
          </div>

          {/* List Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDevices.map((device) => {
              const isOnline = device.status === "online"
              return (
                <div
                  key={device.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Name + ID */}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{device.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">ID: {device.id}</p>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{device.location}</span>
                  </div>

                  {/* Status */}
                  <Badge
                    className={`text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1 w-fit ${
                      isOnline
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    {isOnline ? "Online" : "Offline"}
                  </Badge>

                  {/* Coordinates */}
                  <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                    {device.lat.toFixed(3)}°, {device.lng.toFixed(3)}°
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(device)}
                      className="h-7 w-7 p-0 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-500"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDelete(device)}
                      className="h-7 w-7 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Link href="/dashboard/peta">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-400"
                        title="Lihat di Peta"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: TAMBAH STASIUN BENCHMARK */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Radio className="h-5 w-5 text-indigo-600" />
              <span>Tambah Stasiun Benchmark</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tambahkan titik stasiun cuaca baru ke Database
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Stasiun</Label>
              <Input
                placeholder="Contoh: Stasiun Riset"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Lokasi / Kecamatan</Label>
              <Input
                placeholder="Contoh: Pantai Logending, Ayah, Kebumen"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">ID Dokumen Kustom (Opsional)</Label>
              <Input
                placeholder="stasiun-ayah-selatan (otomatis jika kosong)"
                value={formData.customId}
                onChange={(e) => setFormData({ ...formData, customId: e.target.value })}
                className="text-xs rounded-xl font-mono"
              />
            </div>

            {/* Peta Interaktif Pemilih Koordinat */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                  Titik Koordinat (Pilih Langsung dari Peta)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Klik peta atau geser pin
                </span>
              </Label>
              <LocationPickerMap
                lat={formData.lat}
                lng={formData.lng}
                onChange={(newLat, newLng) => {
                  setFormData((prev) => ({ ...prev, lat: newLat, lng: newLng }))
                }}
                height="h-52"
              />
            </div>

            {/* Koordinat Lat & Lng Input Manual */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                  required
                  className="text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                  required
                  className="text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Status Online */}
            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs font-semibold">Status Telemetri</Label>
              <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "online" })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                    formData.status === "online" ? "bg-emerald-600 text-white" : "text-slate-500"
                  }`}
                >
                  Online
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "offline" })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                    formData.status === "offline" ? "bg-rose-600 text-white" : "text-slate-500"
                  }`}
                >
                  Offline
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EDIT STASIUN BENCHMARK */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-indigo-600" />
              <span>Edit Stasiun Benchmark</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              ID: {selectedDevice?.id}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Stasiun</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Lokasi / Kecamatan</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="text-xs rounded-xl"
              />
            </div>

            {/* Peta Interaktif Pemilih Koordinat */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                  Titik Koordinat (Pilih Langsung dari Peta)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Klik peta atau geser pin
                </span>
              </Label>
              <LocationPickerMap
                lat={formData.lat}
                lng={formData.lng}
                onChange={(newLat, newLng) => {
                  setFormData((prev) => ({ ...prev, lat: newLat, lng: newLng }))
                }}
                height="h-52"
              />
            </div>

            {/* Koordinat Lat & Lng Input Manual */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                  required
                  className="text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                  required
                  className="text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Status Online */}
            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs font-semibold">Status Telemetri</Label>
              <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "online" })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                    formData.status === "online" ? "bg-emerald-600 text-white" : "text-slate-500"
                  }`}
                >
                  Online
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "offline" })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                    formData.status === "offline" ? "bg-rose-600 text-white" : "text-slate-500"
                  }`}
                >
                  Offline
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: KONFIRMASI HAPUS */}
      {/* ========================================================================= */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Hapus Stasiun Benchmark</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus stasiun{" "}
              <strong className="text-slate-800 dark:text-slate-200">"{selectedDevice?.name}"</strong>{" "}
              (ID: <code>{selectedDevice?.id}</code>)? Tindakan ini akan menghapusnya dari Firestore secara permanen.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitDelete}
              disabled={submitting}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? "Menghapus..." : "Hapus Stasiun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
