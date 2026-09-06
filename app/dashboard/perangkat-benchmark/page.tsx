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
  Thermometer,
  Droplets,
  CloudRain,
  Gauge,
  Wind,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Sparkles,
  Database,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Globe,
  SlidersHorizontal,
} from "lucide-react"

export default function PerangkatBenchmarkPage() {
  const { toast } = useToast()
  const [devices, setDevices] = useState<BenchmarkDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all")
  const [isSeeding, setIsSeeding] = useState(false)

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<BenchmarkDevice | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    customId: "",
    name: "",
    location: "",
    lat: -7.685,
    lng: 109.655,
    temp: 29.0,
    hum: 75,
    pressure: 1012,
    rainfall: 0.0,
    windSpeed: 6.0,
    batteryVolt: 4.1,
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

  // Filtered devices based on search and status
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === "all" ? true : d.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [devices, searchQuery, statusFilter])

  // Statistics Summary
  const stats = useMemo(() => {
    if (devices.length === 0) return { total: 0, online: 0, avgTemp: 0, avgHum: 0 }
    const online = devices.filter((d) => d.status === "online").length
    const avgTemp = devices.reduce((sum, d) => sum + (d.temp || 0), 0) / devices.length
    const avgHum = devices.reduce((sum, d) => sum + (d.hum || 0), 0) / devices.length
    return {
      total: devices.length,
      online,
      avgTemp: Number(avgTemp.toFixed(1)),
      avgHum: Math.round(avgHum),
    }
  }, [devices])

  // Handle Open Add Dialog
  const handleOpenAdd = () => {
    setFormData({
      customId: "",
      name: "",
      location: "",
      lat: -7.685,
      lng: 109.655,
      temp: 29.0,
      hum: 75,
      pressure: 1012,
      rainfall: 0.0,
      windSpeed: 6.0,
      batteryVolt: 4.1,
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
      temp: device.temp,
      hum: device.hum,
      pressure: device.pressure,
      rainfall: device.rainfall,
      windSpeed: device.windSpeed || 6.0,
      batteryVolt: device.batteryVolt || 4.1,
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
      const created = await addBenchmarkDevice(formData)
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
        name: formData.name,
        location: formData.location,
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        temp: Number(formData.temp),
        hum: Number(formData.hum),
        pressure: Number(formData.pressure),
        rainfall: Number(formData.rainfall),
        windSpeed: Number(formData.windSpeed),
        batteryVolt: Number(formData.batteryVolt),
        status: formData.status,
      })

      setDevices((prev) =>
        prev.map((d) =>
          d.id === selectedDevice.id
            ? {
                ...d,
                name: formData.name,
                location: formData.location,
                lat: Number(formData.lat),
                lng: Number(formData.lng),
                temp: Number(formData.temp),
                hum: Number(formData.hum),
                pressure: Number(formData.pressure),
                rainfall: Number(formData.rainfall),
                windSpeed: Number(formData.windSpeed),
                batteryVolt: Number(formData.batteryVolt),
                status: formData.status,
                lastUpdate: "Baru saja diperbarui",
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
    if (!confirm("Sinkronkan ulang 20 titik stasiun referensi default Kabupaten Kebumen ke Firestore?")) return

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
        description: "Terjadi kesalahan saat seeding data ke Firestore.",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Radio className="h-5 w-5" />
            </span>
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 text-[10px] uppercase font-bold tracking-wider">
              Cloud Firestore • benchmarkdevices
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Pengelolaan Stasiun Benchmark
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Kelola stasiun acuan geospasial di wilayah Kabupaten Kebumen. Data ini otomatis digunakan oleh Peta Persebaran Geografis dan modul validasi bias ERA5.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkSeed}
            disabled={isSeeding || loading}
            className="rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-700"
            title="Seed 20 Titik Default Kebumen"
          >
            <Sparkles className={`h-3.5 w-3.5 text-amber-500 ${isSeeding ? "animate-spin" : ""}`} />
            <span>{isSeeding ? "Menyinkronkan..." : "Sinkronkan 20 Titik"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDevices}
            disabled={loading}
            className="rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="rounded-xl text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Stasiun</span>
          </Button>

          <Link href="/dashboard/peta">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-500" />
              <span>Buka Peta</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Stasiun */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Total Stasiun
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats.total}{" "}
              <span className="text-xs font-normal text-slate-500">Titik</span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Tersimpan di Firestore
            </span>
          </div>
        </div>

        {/* Stasiun Online */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Status Online
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.online}{" "}
              <span className="text-xs font-normal text-slate-500">Aktif</span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Telemetri Berjalan
            </span>
          </div>
        </div>

        {/* Rerata Suhu */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Rerata Suhu
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {stats.avgTemp}{" "}
              <span className="text-xs font-normal text-slate-500">°C</span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Wilayah Kebumen
            </span>
          </div>
        </div>

        {/* Rerata Kelembapan */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Rerata Kelembapan
            </span>
            <div className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono">
              {stats.avgHum}{" "}
              <span className="text-xs font-normal text-slate-500">%</span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Kelembapan Udara
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari stasiun, kecamatan, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter:
          </span>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(["all", "online", "offline"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {s === "all" ? "Semua" : s === "online" ? "Online" : "Offline"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Station Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-xs font-semibold text-slate-500">Memuat stasiun dari Firestore...</p>
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
      ) : (
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
                  {/* Parameter Grid 4 metrik */}
                  <div className="grid grid-cols-4 gap-1.5 text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Suhu</span>
                      <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                        {device.temp.toFixed(1)}°
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">RH</span>
                      <span className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400">
                        {Math.round(device.hum)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Hujan</span>
                      <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {device.rainfall.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Tekanan</span>
                      <span className="text-xs font-bold font-mono text-violet-600 dark:text-violet-400">
                        {Math.round(device.pressure)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata coordinates & battery */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>
                      GPS: {device.lat.toFixed(4)}°, {device.lng.toFixed(4)}°
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" />
                      {device.batteryVolt ? `${device.batteryVolt.toFixed(2)}V` : "4.10V"}
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
              Tambahkan titik stasiun cuaca baru ke koleksi Firestore <code>benchmarkdevices</code>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Stasiun</Label>
              <Input
                placeholder="Contoh: Stasiun Riset Pantai Ayah"
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

            {/* Parameter Cuaca Awal */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300 block">
                Parameter Cuaca Awal
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-slate-400">Suhu (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.temp}
                    onChange={(e) => setFormData({ ...formData, temp: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-slate-400">RH (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.hum}
                    onChange={(e) => setFormData({ ...formData, hum: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-slate-400">Tekanan (hPa)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.pressure}
                    onChange={(e) => setFormData({ ...formData, pressure: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8 rounded-lg font-mono"
                  />
                </div>
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
                {submitting ? "Menyimpan..." : "Simpan ke Firestore"}
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

            {/* Parameter Cuaca */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300 block">
                Parameter Cuaca Terkini
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-slate-400">Suhu (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.temp}
                    onChange={(e) => setFormData({ ...formData, temp: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-slate-400">RH (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.hum}
                    onChange={(e) => setFormData({ ...formData, hum: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8 rounded-lg font-mono"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-slate-400">Tekanan (hPa)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.pressure}
                    onChange={(e) => setFormData({ ...formData, pressure: parseFloat(e.target.value) || 0 })}
                    className="text-xs h-8 rounded-lg font-mono"
                  />
                </div>
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
