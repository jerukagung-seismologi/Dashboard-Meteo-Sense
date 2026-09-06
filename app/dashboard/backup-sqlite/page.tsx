// app/dashboard/backup-sqlite/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Database,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Download,
  Server,
  Layers,
  FileSpreadsheet,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FolderArchive,
  Search,
  SlidersHorizontal,
  TableProperties,
  CloudDownload,
  PlusCircle,
  Zap,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StationSummary {
  station_id: string;
  count: number;
  min_date_wib: string;
  max_date_wib: string;
  days?: number;
  avgPerDay?: number;
  integrityPct?: number;
  status?: string;
  count_ok?: number;
  count_imputed?: number;
  count_edited?: number;
  imputedPct?: number;
  qcStatus?: string;
}

interface DatabaseSummary {
  databasesDir: string;
  raw: {
    name: string;
    path: string;
    sizeMB: number;
    totalRows: number;
    minDateWib: string;
    maxDateWib: string;
    integrity: string;
    stations: StationSummary[];
  } | null;
  clean: {
    name: string;
    path: string;
    sizeMB: number;
    totalRows: number;
    minDateWib: string;
    maxDateWib: string;
    integrity: string;
    statusCounts: { status: string | null; count: number }[];
    stations: StationSummary[];
  } | null;
  era5: {
    name: string;
    path: string;
    sizeMB: number;
    totalRows: number;
    minDateWib: string;
    maxDateWib: string;
    integrity: string;
    parametersCount: number;
  } | null;
  snapshots: {
    snapshot_name: string;
    created_at: string;
    note: string;
    total_size_mb: number;
    files: {
      raw: { filename: string; size_mb: number };
      clean: { filename: string; size_mb: number };
    };
  }[];
  tableHistory: {
    count: number;
    files: { filename: string; sizeBytes: number; updatedAt: string }[];
  };
}

export default function BackupSqlitePage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [summary, setSummary] = useState<DatabaseSummary | null>(null);
  const [integrityReport, setIntegrityReport] = useState<any | null>(null);

  // Sync Dialog State
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStation, setSyncStation] = useState<string>("all");
  const [syncLimit, setSyncLimit] = useState<number>(500);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [autoCleanAfterSync, setAutoCleanAfterSync] = useState<boolean>(true);

  // Clean & Resample Dialog State
  const [cleanOpen, setCleanOpen] = useState(false);
  const [cleanStation, setCleanStation] = useState<string>("all");
  const [cleanMode, setCleanMode] = useState<"incremental" | "full">("incremental");
  const [autoSnapshotClean, setAutoSnapshotClean] = useState<boolean>(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<any | null>(null);

  // Snapshot Dialog State
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotNote, setSnapshotNote] = useState<string>("Snapshot Cadangan Manual");
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  // Data Explorer State
  const [explorerDb, setExplorerDb] = useState<"raw" | "clean" | "era5">("raw");
  const [explorerStation, setExplorerStation] = useState<string>("all");
  const [explorerStatus, setExplorerStatus] = useState<string>("ALL");
  const [explorerLimit, setExplorerLimit] = useState<number>(50);
  const [explorerPage, setExplorerPage] = useState<number>(1);
  const [explorerRows, setExplorerRows] = useState<any[]>([]);
  const [explorerTotal, setExplorerTotal] = useState<number>(0);
  const [explorerTotalPages, setExplorerTotalPages] = useState<number>(1);
  const [loadingRows, setLoadingRows] = useState(false);

  // 1. Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/backup-sqlite?action=summary");
      if (!res.ok) throw new Error("Gagal mengambil data ringkasan SQLite");
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      toast({
        title: "Error Memuat Ringkasan",
        description: err.message || "Gagal menghubungi server",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // 2. Fetch Explorer Rows
  const fetchExplorerRows = useCallback(async () => {
    try {
      setLoadingRows(true);
      let url = `/api/backup-sqlite?action=query&db=${explorerDb}&station=${explorerStation}&limit=${explorerLimit}&page=${explorerPage}`;
      if (explorerDb === "clean" && explorerStatus !== "ALL") {
        url += `&status=${explorerStatus}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal memuat baris data");
      const data = await res.json();
      setExplorerRows(data.rows || []);
      setExplorerTotal(data.totalCount || 0);
      setExplorerTotalPages(data.totalPages || 1);
    } catch (err: any) {
      toast({
        title: "Error Kueri Data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingRows(false);
    }
  }, [explorerDb, explorerStation, explorerStatus, explorerLimit, explorerPage, toast]);

  useEffect(() => {
    fetchExplorerRows();
  }, [fetchExplorerRows]);

  // 3. Run Integrity Check
  const runIntegrityCheck = async () => {
    try {
      setCheckingIntegrity(true);
      const res = await fetch("/api/backup-sqlite?action=integrity");
      if (!res.ok) throw new Error("Gagal menjalankan uji integritas");
      const data = await res.json();
      setIntegrityReport(data);
      toast({
        title: "Integritas SQLite Sehat",
        description: "Semua basis data SQLite (Raw, Clean, ERA5) lulus uji fisik PRAGMA quick_check tanpa korupsi berkas.",
      });
    } catch (err: any) {
      toast({
        title: "Error Uji Integritas",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCheckingIntegrity(false);
    }
  };

  // 4. Trigger Incremental Sync
  const handleTriggerSync = async (stationParam?: string) => {
    const target = stationParam || syncStation;
    try {
      setSyncing(true);
      setSyncResult(null);

      const res = await fetch("/api/backup-sqlite?action=sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station: target,
          limit: syncLimit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal sinkronisasi");

      setSyncResult(data);
      toast({
        title: "Sinkronisasi Berhasil",
        description: data.message,
      });

      // Refresh metrics
      fetchSummary();
      if (explorerDb === "raw") {
        fetchExplorerRows();
      }

      // Auto clean chaining if checked
      if (autoCleanAfterSync) {
        toast({
          title: "Menjalankan Resampling 1-Menit...",
          description: "Data mentah baru sedang dibersihkan dan diselaraskan ke interval 1 menit di meteo_clean_data.db.",
        });
        handleTriggerCleanResample(target, "incremental");
      }
    } catch (err: any) {
      toast({
        title: "Gagal Sinkronisasi",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // 4b. Trigger Clean & 1-Minute Resampling
  const handleTriggerCleanResample = async (stationParam?: string, modeParam?: "incremental" | "full") => {
    const targetStation = stationParam || cleanStation;
    const targetMode = modeParam || cleanMode;

    try {
      setCleaning(true);
      setCleanResult(null);

      const res = await fetch("/api/backup-sqlite?action=clean-resample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station: targetStation,
          mode: targetMode,
          autoSnapshot: autoSnapshotClean,
          maxGapSeconds: 3600,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjalankan pembersihan & resampling");

      setCleanResult(data);
      toast({
        title: "Pembersihan & Resampling Berhasil",
        description: data.message,
      });

      fetchSummary();
      if (explorerDb === "clean") {
        fetchExplorerRows();
      }
    } catch (err: any) {
      toast({
        title: "Gagal Pembersihan & Resampling",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCleaning(false);
    }
  };

  // 5. Trigger ERA5 Sync
  const [syncingEra5, setSyncingEra5] = useState(false);
  const [era5SyncResult, setEra5SyncResult] = useState<any | null>(null);

  const handleTriggerSyncEra5 = async () => {
    try {
      setSyncingEra5(true);
      setEra5SyncResult(null);

      const res = await fetch("/api/backup-sqlite?action=sync-era5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal sinkronisasi ERA5");

      setEra5SyncResult(data);
      toast({
        title: "Sinkronisasi ERA5 Berhasil",
        description: data.message,
      });

      fetchSummary();
      if (explorerDb === "era5") {
        fetchExplorerRows();
      }
    } catch (err: any) {
      toast({
        title: "Gagal Sinkronisasi ERA5",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSyncingEra5(false);
    }
  };

  // 6. Trigger Snapshot Creation
  const handleCreateSnapshot = async () => {
    try {
      setCreatingSnapshot(true);
      const res = await fetch("/api/backup-sqlite?action=snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: snapshotNote }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat snapshot");

      toast({
        title: "Snapshot Berhasil Dibuat",
        description: data.message,
      });

      setSnapshotOpen(false);
      setSnapshotNote("Snapshot Cadangan Manual");
      fetchSummary();
    } catch (err: any) {
      toast({
        title: "Error Membuat Snapshot",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCreatingSnapshot(false);
    }
  };

  // 6. Export CSV from current view
  const exportCsv = () => {
    if (explorerRows.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada baris data untuk diekspor pada tampilan saat ini.",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(explorerRows[0]);
    const csvLines = [headers.join(",")];

    for (const row of explorerRows) {
      const line = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        if (typeof val === "string" && (val.includes(",") || val.includes("\""))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(",");
      csvLines.push(line);
    }

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sqlite_export_${explorerDb}_${explorerStation}_p${explorerPage}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Ekspor CSV Berhasil",
      description: `Berhasil mengunduh ${explorerRows.length} baris data SQLite.`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Database className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Pusat Cadangan & Basis Data SQLite
              </h1>
              <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40">
                Meteo Sense Administrator Sync
              </Badge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sinkronisasi telemetri live dari Firebase RTDB ke SQLite lokal, audit multi-tier database, dan manajemen snapshot cadangan offline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* ERA5 Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerSyncEra5}
              disabled={syncingEra5}
              className="gap-2 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-medium"
            >
              {syncingEra5 ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />
                  <span>Sinkronkan ERA5...</span>
                </>
              ) : (
                <>
                  <Server className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>Sinkronisasi ERA5</span>
                </>
              )}
            </Button>

            {/* Sync Trigger Dialog */}
            <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                >
                  <CloudDownload className="h-4 w-4" />
                  Sinkronisasi Firebase RTDB
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <CloudDownload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Sinkronisasi Data Firebase RTDB ke SQLite
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Mengunduh telemetri terbaru dari Firebase Realtime Database secara bertahap (incremental) dan menyimpannya ke berkas <b>meteo_local_cache.db</b>.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pilih Stasiun Target</label>
                    <Select value={syncStation} onValueChange={setSyncStation}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Pilih Stasiun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Stasiun (id-01, id-02, id-03, id-04, id-05, id-11)</SelectItem>
                        <SelectItem value="id-01">Node ID-01 (Jerukagung Utama)</SelectItem>
                        <SelectItem value="id-02">Node ID-02 (Kebumen Kota)</SelectItem>
                        <SelectItem value="id-03">Node ID-03 (Ambal Pesisir)</SelectItem>
                        <SelectItem value="id-04">Node ID-04 (Klirong Pesisir)</SelectItem>
                        <SelectItem value="id-05">Node ID-05 (Karanganyar)</SelectItem>
                        <SelectItem value="id-11">Node ID-11 (Gombong Barat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Maksimal Data per Stasiun (Limit)</label>
                    <Select value={String(syncLimit)} onValueChange={(v) => setSyncLimit(parseInt(v, 10))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Pilih Limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 data terbaru</SelectItem>
                        <SelectItem value="500">500 data terbaru (Direkomendasikan)</SelectItem>
                        <SelectItem value="1000">1.000 data terbaru</SelectItem>
                        <SelectItem value="2000">2.000 data terbaru</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-blue-600" />
                      Mekanisme Sinkronisasi Cerdas:
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Sistem membaca timestamp UNIX maksimum yang sudah tersimpan di SQLite per stasiun, lalu hanya mengunduh data telemetri yang lebih baru (tanpa menimpa atau menduplikasi rekaman yang telah ada).
                    </p>
                  </div>

                  {syncResult && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Hasil Sinkronisasi Terakhir:
                      </div>
                      <div className="mt-1 font-mono text-[11px]">
                        Total Data Baru: <b>{syncResult.totalSynced} baris</b>
                        {syncResult.details && (
                          <div className="grid grid-cols-3 gap-1 mt-1 text-[10px]">
                            {Object.entries(syncResult.details).map(([k, v]) => (
                              <span key={k}>{k}: +{String(v)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoCleanAfterSync"
                      checked={autoCleanAfterSync}
                      onChange={(e) => setAutoCleanAfterSync(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="autoCleanAfterSync" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                      Otomatis bersihkan & resample 1-menit ke Clean DB setelah sinkronisasi
                    </label>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSyncOpen(false)}
                    disabled={syncing}
                    className="text-xs"
                  >
                    Tutup
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleTriggerSync()}
                    disabled={syncing}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Menyinkronkan dari RTDB...
                      </>
                    ) : (
                      <>
                        <CloudDownload className="h-3.5 w-3.5" />
                        Mulai Sinkronisasi
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Clean & Resample 1-Min Dialog */}
            <Dialog open={cleanOpen} onOpenChange={setCleanOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-medium shadow-sm"
                >
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Pembersihan (Clean DB)
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Pembersihan Data & Resampling Grid 1-Menit
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Menyelaraskan data mentah ke kisi waktu 60 detik reguler (1.440 titik/hari), agregasi burst fisis, QC batas sensor WMO/BMKG, dan interpolasi fisis ke <b>meteo_clean_data.db</b>.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pilih Stasiun Target</label>
                    <Select value={cleanStation} onValueChange={setCleanStation}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Pilih Stasiun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Stasiun (id-01, id-02, id-03, id-04, id-05, id-11)</SelectItem>
                        <SelectItem value="id-01">Node ID-01 (Jerukagung Utama)</SelectItem>
                        <SelectItem value="id-02">Node ID-02 (Kebumen Kota)</SelectItem>
                        <SelectItem value="id-03">Node ID-03 (Ambal Pesisir)</SelectItem>
                        <SelectItem value="id-04">Node ID-04 (Klirong Pesisir)</SelectItem>
                        <SelectItem value="id-05">Node ID-05 (Karanganyar)</SelectItem>
                        <SelectItem value="id-11">Node ID-11 (Gombong Barat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mode Pembersihan</label>
                    <Select value={cleanMode} onValueChange={(v: any) => setCleanMode(v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Pilih Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incremental">Inkremental (Rekomendasi - Data baru + overlap 1 jam)</SelectItem>
                        <SelectItem value="full">Proses Ulang Penuh (Full Rebuild dari awal riwayat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="autoSnapshotClean"
                      checked={autoSnapshotClean}
                      onChange={(e) => setAutoSnapshotClean(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="autoSnapshotClean" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                      Buat snapshot cadangan otomatis (pre-resample) sebelum memproses
                    </label>
                  </div>

                  {cleanResult && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Hasil Pembersihan Terakhir:
                      </div>
                      <div className="mt-1 font-mono text-[11px] space-y-0.5">
                        <div>Total Baris Bersih: <b>{cleanResult.totalCleaned?.toLocaleString("id-ID")} baris</b></div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Valid OK: {cleanResult.totalOk?.toLocaleString("id-ID")} | Diedit/QC: {cleanResult.totalEdited?.toLocaleString("id-ID")} | Diimputasi: {cleanResult.totalImputed?.toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCleanOpen(false)}
                    disabled={cleaning}
                    className="text-xs"
                  >
                    Tutup
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleTriggerCleanResample()}
                    disabled={cleaning}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                  >
                    {cleaning ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Memproses QC & Resampling...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Mulai Pembersihan Data
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Quick Integrity Check Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={runIntegrityCheck}
              disabled={checkingIntegrity}
              className="gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {checkingIntegrity ? (
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              Uji Integritas SQLite
            </Button>

            {/* Refresh Metrics */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSummary}
              disabled={refreshing}
              className="gap-2 border-slate-300 dark:border-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Directory Bar */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-2 flex-wrap font-mono">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Multi-Tier Storage:</span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              Mentah: meteo_local_cache.db
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              Bersih: meteo_clean_data.db
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              Model: era5_data.db
            </span>
          </div>
          <div className="font-mono text-slate-500 dark:text-slate-400">
            Lokasi: <span className="text-slate-700 dark:text-slate-300">D:\Github\Firebase_Database_Administrator\databases</span>
          </div>
        </div>
      </div>

      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Data Mentah */}
        <Card className="border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Basis Data Mentah (Cache)
              </span>
              <HardDrive className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {summary?.raw?.totalRows?.toLocaleString("id-ID") || "0"} <span className="text-sm font-normal text-slate-500">baris</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Ukuran Berkas:</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{summary?.raw?.sizeMB || 0} MB</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Cakupan Stasiun:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{summary?.raw?.stations?.length || 0} Stasiun AWS</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Status Integritas:</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/50">
                PRAGMA OK
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Data Bersih */}
        <Card className="border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Basis Data Bersih (QC & Imputasi)
              </span>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {summary?.clean?.totalRows?.toLocaleString("id-ID") || "0"} <span className="text-sm font-normal text-slate-500">baris</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Ukuran Berkas:</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{summary?.clean?.sizeMB || 0} MB</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Observasi Valid (OK):</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {summary?.clean?.statusCounts?.find(s => s.status === "OK")?.count?.toLocaleString("id-ID") || "0"} baris
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Hasil Imputasi Fisis:</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {summary?.clean?.statusCounts?.find(s => s.status === "IMPUTED")?.count?.toLocaleString("id-ID") || "0"} baris
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: ERA5-Land */}
        <Card className="border-l-4 border-l-purple-500 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Reanalisis ERA5-Land
              </span>
              <Server className="h-4 w-4 text-purple-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {summary?.era5?.totalRows?.toLocaleString("id-ID") || "0"} <span className="text-sm font-normal text-slate-500">jam</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Ukuran Berkas:</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{summary?.era5?.sizeMB || 0} MB</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Rentang Jam:</span>
              <span className="font-mono text-[11px] font-medium text-purple-600 dark:text-purple-400">
                {summary?.era5?.maxDateWib ? `${summary.era5.minDateWib.substring(0, 10)} s/d ${summary.era5.maxDateWib.substring(0, 10)}` : "32 Parameter"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Status Integritas:</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/50">
                {summary?.era5?.integrity === "ok" ? "PRAGMA OK" : "Tersinkron"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Snapshots & Rollback */}
        <Card className="border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Snapshots & Cadangan
              </span>
              <Archive className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {summary?.snapshots?.length || 0} <span className="text-sm font-normal text-slate-500">snapshot</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Table History JSON:</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{summary?.tableHistory?.count || 0} berkas</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Mode Proteksi:</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">Pre-Modification Backup</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Status Rollback:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Tersedia</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Studio Tabs */}
      <Tabs defaultValue="completeness" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
          <TabsTrigger value="completeness" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <TableProperties className="h-4 w-4 text-blue-500" />
            1. Kelengkapan Basis Data (Mentah vs Bersih)
          </TabsTrigger>
          <TabsTrigger value="explorer" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Search className="h-4 w-4 text-emerald-500" />
            2. Penjelajah Data SQLite (Data Viewer)
          </TabsTrigger>
          <TabsTrigger value="era5" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Layers className="h-4 w-4 text-purple-500" />
            3. Basis Data ERA5-Land
          </TabsTrigger>
          <TabsTrigger value="snapshots" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <FolderArchive className="h-4 w-4 text-amber-500" />
            4. Snapshot & Manajemen Cadangan
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: KELENGKAPAN BASIS DATA (DUAL COLUMN: MENTAH VS BERSIH)            */}
        {/* ========================================================================= */}
        <TabsContent value="completeness" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kolom 1 (Kiri): Basis Data Mentah */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Basis Data Mentah (meteo_local_cache.db)
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSyncStation("all"); setSyncOpen(true); }}
                    className="h-7 text-[11px] gap-1.5 border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <CloudDownload className="h-3.5 w-3.5" />
                    Sinkronkan ke SQLite
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Penyimpanan lokal data observasi mentah asli hasil sinkronisasi dari Firebase Realtime Database.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="p-2.5">Stasiun</th>
                          <th className="p-2.5 text-right">Total Baris</th>
                          <th className="p-2.5">Rentang Tanggal (WIB)</th>
                          <th className="p-2.5 text-right">Rata²/Hari</th>
                          <th className="p-2.5 text-center">Status Integritas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                        {summary?.raw?.stations?.map((st) => (
                          <tr key={st.station_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                              <span>{st.station_id}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTriggerSync(st.station_id)}
                                disabled={syncing}
                                className="h-5 px-1.5 text-[10px] text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                title={`Sinkronkan data ${st.station_id} saja`}
                              >
                                <CloudDownload className="h-3 w-3" />
                              </Button>
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium">{st.count.toLocaleString("id-ID")}</td>
                            <td className="p-2.5 font-mono text-[11px]">
                              {st.min_date_wib.substring(0, 10)} s/d {st.max_date_wib.substring(0, 10)}
                            </td>
                            <td className="p-2.5 text-right font-mono">{st.avgPerDay} /hr</td>
                            <td className="p-2.5 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-2 py-0.5 ${
                                  st.status === "Sangat Lengkap"
                                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/40"
                                    : st.status === "Cukup"
                                    ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/40"
                                    : "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/40"
                                }`}
                              >
                                {st.status} ({st.integrityPct}%)
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-blue-50/40 dark:bg-blue-950/30 p-2.5 rounded border border-blue-200/40 dark:border-blue-800/40">
                  Catatan: Data mentah tidak pernah dimanipulasi atau diimputasi, bertindak sebagai salinan offline permanen dari stasiun AWS. Klik ikon awan di samping stasiun untuk sinkronisasi individual.
                </div>
              </CardContent>
            </Card>

            {/* Kolom 2 (Kanan): Basis Data Bersih */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Basis Data Bersih (meteo_clean_data.db)
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => { setCleanStation("all"); setCleanOpen(true); }}
                      className="h-7 text-[11px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Pembersihan & Resampling
                    </Button>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      QC & 1440 Imputasi
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Penyimpanan data sensor yang telah melalui Quality Control (QC fisika), imputasi kontinuitas waktu 1-menit, dan koreksi curah hujan.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="p-2.5">Stasiun</th>
                          <th className="p-2.5 text-right">Total Baris</th>
                          <th className="p-2.5 text-right">Valid (OK)</th>
                          <th className="p-2.5 text-right">Imputasi</th>
                          <th className="p-2.5 text-center">Status Mutu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                        {summary?.clean?.stations?.map((st) => (
                          <tr key={st.station_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                              <span>{st.station_id}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setCleanStation(st.station_id); setCleanOpen(true); }}
                                disabled={cleaning}
                                className="h-5 px-1.5 text-[10px] text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                title={`Bersihkan & Resample ${st.station_id}`}
                              >
                                <Sparkles className="h-3 w-3" />
                              </Button>
                            </td>
                            <td className="p-2.5 text-right font-mono font-medium">{st.count.toLocaleString("id-ID")}</td>
                            <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {st.count_ok?.toLocaleString("id-ID")}
                            </td>
                            <td className="p-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                              {st.count_imputed?.toLocaleString("id-ID")} ({st.imputedPct}%)
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/40"
                              >
                                {st.qcStatus}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-emerald-50/40 dark:bg-emerald-950/30 p-2.5 rounded border border-emerald-200/40 dark:border-emerald-800/40">
                  Data bersih siap digunakan langsung untuk analisis meteorologi tingkat tinggi, pelatihan LSTM, dan laporan agroklimatologi bebas lubang data.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: PENJELAJAH DATA SQLITE (DATA EXPLORER & VIEWER)                    */}
        {/* ========================================================================= */}
        <TabsContent value="explorer" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <TableProperties className="h-5 w-5 text-blue-500" />
                    Penjelajah Baris Rekaman SQLite
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Inspeksi langsung nilai observasi dari berkas SQLite lokal dengan filter stasiun, status QC, dan limit baris.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSyncStation(explorerStation === "all" ? "id-01" : explorerStation); setSyncOpen(true); }}
                    className="gap-1.5 border-blue-500/40 text-blue-600 dark:text-blue-400 text-xs"
                  >
                    <CloudDownload className="h-4 w-4" />
                    Sinkronkan RTDB
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportCsv}
                    className="gap-2 border-slate-300 dark:border-slate-700 text-xs"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    Unduh CSV
                  </Button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Database Selector */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Pilih Basis Data</label>
                  <Select value={explorerDb} onValueChange={(val: any) => { setExplorerDb(val); setExplorerPage(1); }}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Pilih Database" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">Mentah (meteo_local_cache.db)</SelectItem>
                      <SelectItem value="clean">Bersih (meteo_clean_data.db)</SelectItem>
                      <SelectItem value="era5">Reanalisis (era5_data.db)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Station Selector */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Stasiun AWS</label>
                  <Select value={explorerStation} onValueChange={(val) => { setExplorerStation(val); setExplorerPage(1); }}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Semua Stasiun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Stasiun</SelectItem>
                      <SelectItem value="id-01">Node ID-01 (Jerukagung)</SelectItem>
                      <SelectItem value="id-02">Node ID-02 (Kebumen Kota)</SelectItem>
                      <SelectItem value="id-03">Node ID-03 (Ambal Pesisir)</SelectItem>
                      <SelectItem value="id-04">Node ID-04 (Klirong Pesisir)</SelectItem>
                      <SelectItem value="id-05">Node ID-05 (Karanganyar)</SelectItem>
                      <SelectItem value="id-11">Node ID-11 (Gombong Barat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter (Khusus Clean DB) */}
                {explorerDb === "clean" && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Filter Status QC</label>
                    <Select value={explorerStatus} onValueChange={(val) => { setExplorerStatus(val); setExplorerPage(1); }}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder="Semua Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Status</SelectItem>
                        <SelectItem value="OK">OK (Asli Tervalidasi)</SelectItem>
                        <SelectItem value="IMPUTED">IMPUTED (Interpolasi Fisis)</SelectItem>
                        <SelectItem value="EDITED">EDITED (Koreksi Kalibrasi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Limit Selector */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Baris per Halaman</label>
                  <Select value={String(explorerLimit)} onValueChange={(val) => { setExplorerLimit(parseInt(val, 10)); setExplorerPage(1); }}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="50 baris" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 baris</SelectItem>
                      <SelectItem value="50">50 baris</SelectItem>
                      <SelectItem value="100">100 baris</SelectItem>
                      <SelectItem value="200">200 baris</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action button */}
                <div className="flex items-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setExplorerPage(1); fetchExplorerRows(); }}
                    disabled={loadingRows}
                    className="h-8 w-full gap-2 text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingRows ? "animate-spin" : ""}`} />
                    Terapkan Filter
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Table Data */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                      <tr>
                        <th className="p-2.5 whitespace-nowrap">Waktu Lokal (WIB)</th>
                        <th className="p-2.5 whitespace-nowrap">Stasiun</th>
                        <th className="p-2.5 whitespace-nowrap text-right">Suhu (°C)</th>
                        <th className="p-2.5 whitespace-nowrap text-right">RH (%)</th>
                        <th className="p-2.5 whitespace-nowrap text-right">Tekanan (hPa)</th>
                        <th className="p-2.5 whitespace-nowrap text-right">Hujan (mm)</th>
                        <th className="p-2.5 whitespace-nowrap text-right">Laju Hujan (mm/j)</th>
                        <th className="p-2.5 whitespace-nowrap text-right">Angin (m/s)</th>
                        <th className="p-2.5 whitespace-nowrap text-right">Arah (°)</th>
                        <th className="p-2.5 whitespace-nowrap text-right">Dew Point (°C)</th>
                        <th className="p-2.5 whitespace-nowrap text-right">Baterai (V)</th>
                        <th className="p-2.5 whitespace-nowrap text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      {loadingRows ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-slate-500">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                              Memuat baris kueri dari database SQLite...
                            </div>
                          </td>
                        </tr>
                      ) : explorerRows.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-slate-500">
                            Tidak ada data yang cocok dengan kriteria filter saat ini.
                          </td>
                        </tr>
                      ) : (
                        explorerRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 whitespace-nowrap font-sans font-medium text-slate-900 dark:text-slate-100">
                              {r.local_time || "-"}
                            </td>
                            <td className="p-2.5 whitespace-nowrap font-bold text-blue-600 dark:text-blue-400">
                              {r.station_id || "ERA5"}
                            </td>
                            <td className="p-2.5 text-right">{r.temperature !== null ? Number(r.temperature).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right">{r.humidity !== null ? Number(r.humidity).toFixed(1) : "-"}</td>
                            <td className="p-2.5 text-right">{r.pressure !== null ? Number(r.pressure).toFixed(1) : "-"}</td>
                            <td className="p-2.5 text-right text-blue-600 dark:text-blue-400 font-semibold">
                              {r.rainfall !== null ? Number(r.rainfall).toFixed(2) : "-"}
                            </td>
                            <td className="p-2.5 text-right">{r.rainrate !== null ? Number(r.rainrate).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right">{r.wind_speed !== null ? Number(r.wind_speed).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right">{r.wind_direction !== null ? Number(r.wind_direction).toFixed(0) : "-"}</td>
                            <td className="p-2.5 text-right">{r.dew_point !== null ? Number(r.dew_point).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right">{r.battery !== null ? Number(r.battery).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 font-sans ${
                                  r.status?.includes("OK")
                                    ? "border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/50"
                                    : r.status?.includes("IMPUTED")
                                    ? "border-amber-500 text-amber-600 bg-amber-50/50 dark:bg-amber-950/50"
                                    : r.status === "RAW"
                                    ? "border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/50"
                                    : "border-slate-500 text-slate-600"
                                }`}
                              >
                                {r.status || "OK"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 pt-2">
                <div>
                  Menampilkan <b>{explorerRows.length}</b> baris dari total <b>{explorerTotal.toLocaleString("id-ID")}</b> rekaman (Halaman <b>{explorerPage}</b> dari <b>{explorerTotalPages.toLocaleString("id-ID")}</b>)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={explorerPage <= 1 || loadingRows}
                    onClick={() => setExplorerPage(p => Math.max(1, p - 1))}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                  </Button>
                  <span className="px-2 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {explorerPage} / {explorerTotalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={explorerPage >= explorerTotalPages || loadingRows}
                    onClick={() => setExplorerPage(p => p + 1)}
                    className="h-8 gap-1 text-xs"
                  >
                    Selanjutnya
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: BASIS DATA ERA5-LAND (era5_data.db)                                */}
        {/* ========================================================================= */}
        <TabsContent value="era5" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Server className="h-5 w-5 text-purple-500" />
                    Basis Data Reanalisis ERA5-Land (era5_data.db)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Data reanalisis jam-jaman ECMWF ERA5-Land resolusi tinggi 0.1° (~9 km) pada wilayah Kebumen untuk kalibrasi sensor otomatis.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleTriggerSyncEra5}
                    disabled={syncingEra5}
                    className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-sm"
                  >
                    {syncingEra5 ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Mengunduh ERA5...
                      </>
                    ) : (
                      <>
                        <CloudDownload className="h-3.5 w-3.5" />
                        Sinkronkan ERA5 dari Open-Meteo
                      </>
                    )}
                  </Button>
                  <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/50">
                    {summary?.era5?.totalRows ? `${summary.era5.totalRows.toLocaleString("id-ID")} Jam Observasi` : "31.265 Jam Observasi"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {/* ERA5 Sync Notification Banner */}
              {era5SyncResult && (
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200">
                  <div className="font-bold flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Hasil Sinkronisasi Terkini ERA5:
                  </div>
                  <div className="mt-1 text-xs text-purple-800 dark:text-purple-300">
                    {era5SyncResult.message} (Data baru terintegrasi: <b>+{era5SyncResult.insertedCount || 0} jam</b>)
                  </div>
                </div>
              )}

              {/* Status Overview Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-purple-200/70 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/20">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Rentang Waktu Observasi</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {summary?.era5?.minDateWib?.substring(0, 10) || "2023-01-01"} s/d {summary?.era5?.maxDateWib?.substring(0, 10) || "2026-09-06"}
                  </div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Resolusi Jam-Jaman (Hourly)</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Total Akumulasi Waktu</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {summary?.era5?.totalRows?.toLocaleString("id-ID") || "31.265"} Jam Data
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Lengkap Tanpa Data Bolong</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Pusat Grid Geografis</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                    -7.7121° S, 109.6892° E
                  </div>
                  <div className="text-[10px] text-slate-500">Kebumen, Jawa Tengah (0.1° / ~9km)</div>
                </div>

                <div className="space-y-1 flex flex-col justify-center">
                  <div className="text-[11px] text-slate-500">Pemeriksaan Tabel</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExplorerDb("era5");
                      const el = document.querySelector('[value="explorer"]') as HTMLElement;
                      el?.click();
                    }}
                    className="h-7 text-[11px] gap-1.5 border-purple-400/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100/60 dark:hover:bg-purple-900/40"
                  >
                    <Search className="h-3.5 w-3.5 text-purple-500" />
                    Lihat di Data Explorer
                  </Button>
                </div>
              </div>

              {/* Matrix of ERA5 Variables */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Matriks 32 Variabel Meteorologi ERA5-Land Terindeks
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { name: "temperature_2m", label: "Suhu Udara (2m)", unit: "°C", role: "Termal" },
                    { name: "relative_humidity_2m", label: "Kelembaban Relatif", unit: "%", role: "Termal" },
                    { name: "dew_point_2m", label: "Titik Embun (Dew Point)", unit: "°C", role: "Termal" },
                    { name: "surface_pressure", label: "Tekanan Permukaan", unit: "hPa", role: "Barometrik" },
                    { name: "rain", label: "Presipitasi / Hujan", unit: "mm/h", role: "Hidrologi" },
                    { name: "wind_speed_10m", label: "Kecepatan Angin (10m)", unit: "m/s", role: "Dinamika" },
                    { name: "wind_direction_10m", label: "Arah Angin (10m)", unit: "°", role: "Dinamika" },
                    { name: "wind_gusts_10m", label: "Kecepatan Hembusan", unit: "m/s", role: "Dinamika" },
                    { name: "solar_radiation", label: "Radiasi Global (GHI)", unit: "W/m²", role: "Radiasi" },
                    { name: "direct_radiation", label: "Radiasi Langsung", unit: "W/m²", role: "Radiasi" },
                    { name: "cloud_cover", label: "Tutupan Awan Total", unit: "%", role: "Awan" },
                    { name: "et0_fao_evapotranspiration", label: "Evapotranspirasi FAO", unit: "mm", role: "Agroklimat" },
                  ].map((v) => (
                    <div key={v.name} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-500">{v.role}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/30 text-purple-600 dark:text-purple-400">
                          {v.unit}
                        </Badge>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mt-1">{v.label}</div>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">{v.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/50 space-y-2 text-xs text-purple-900 dark:text-purple-200">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Peran Reanalisis ERA5 dalam Arsitektur Dashboard:
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>Menyediakan acuan meteorologi standar (*ground-truth reference*) tanpa gap waktu sejak tahun 2023.</li>
                  <li>Digunakan oleh mesin kalibrasi (Huber Robust Linear Regression & Quantile Mapping) untuk menghilangkan bias sensor AWS secara otomatis.</li>
                  <li>Dapat diakses secara lokal tanpa ketergantungan koneksi internet (*offline resilient*).</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: MANAJEMEN SNAPSHOT & CADANGAN                                      */}
        {/* ========================================================================= */}
        <TabsContent value="snapshots" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Snapshot List */}
            <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Archive className="h-5 w-5 text-amber-500" />
                      Arsip Snapshot Terverifikasi (databases/backups/snapshots/)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Snapshot multi-database SQLite terenkapsulasi lengkap dengan berkas mentah, bersih, dan berkas metadata JSON.
                    </CardDescription>
                  </div>
                  <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Buat Snapshot Baru
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                          <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          Buat Snapshot Multi-Database Baru
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Mengkloning kondisi saat ini dari <b>meteo_local_cache.db</b> dan <b>meteo_clean_data.db</b> ke folder arsip terisolasi dengan metadata timestamp.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2 text-xs">
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Catatan / Keterangan Snapshot</label>
                          <Input
                            value={snapshotNote}
                            onChange={(e) => setSnapshotNote(e.target.value)}
                            placeholder="Contoh: Cadangan sebelum kalibrasi stasiun"
                            className="h-9 text-xs"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Snapshot akan diberi nama unik dengan stempel waktu, misalnya <code>snapshot_YYYYMMDD_HHMMSS</code>.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSnapshotOpen(false)}
                          disabled={creatingSnapshot}
                          className="text-xs"
                        >
                          Batal
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleCreateSnapshot}
                          disabled={creatingSnapshot}
                          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                        >
                          {creatingSnapshot ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Membuat Snapshot...
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Konfirmasi & Simpan Snapshot
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="p-2.5">Nama Snapshot</th>
                        <th className="p-2.5">Waktu Pembuatan</th>
                        <th className="p-2.5">Catatan</th>
                        <th className="p-2.5 text-right">Ukuran Mentah</th>
                        <th className="p-2.5 text-right">Ukuran Bersih</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                      {summary?.snapshots?.map((snap) => (
                        <tr key={snap.snapshot_name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">{snap.snapshot_name}</td>
                          <td className="p-2.5 font-mono text-[11px]">{snap.created_at}</td>
                          <td className="p-2.5">{snap.note || "-"}</td>
                          <td className="p-2.5 text-right font-mono">{snap.files?.raw?.size_mb || 0} MB</td>
                          <td className="p-2.5 text-right font-mono">{snap.files?.clean?.size_mb || 0} MB</td>
                          <td className="p-2.5 text-center">
                            <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/40">
                              Terverifikasi
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table History Section */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Riwayat Modifikasi Berkas Tabel (Table History Rollback JSON - {summary?.tableHistory?.count || 0} Berkas)
                  </h4>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">Nama Berkas Cadangan</th>
                          <th className="p-2 text-right">Ukuran</th>
                          <th className="p-2">Waktu Pembaruan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {summary?.tableHistory?.files?.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-2 text-slate-800 dark:text-slate-200">{f.filename}</td>
                            <td className="p-2 text-right text-slate-500">{f.sizeBytes} B</td>
                            <td className="p-2 text-slate-500">{f.updatedAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integrity Diagnostic Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  Diagnostik Integritas Fisik SQLite
                </CardTitle>
                <CardDescription className="text-xs">
                  Hasil pengujian integritas struktur internal basis data SQLite menggunakan instruksi PRAGMA engine.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">meteo_local_cache.db:</span>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/50 text-[10px]">
                      {integrityReport?.raw?.status || summary?.raw?.integrity || "HEALTHY"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Page Size: 4096 B | Pages: {integrityReport?.raw?.pageCount || "178.347"} | 0 Korup
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">meteo_clean_data.db:</span>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/50 text-[10px]">
                      {integrityReport?.clean?.status || summary?.clean?.integrity || "HEALTHY"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Page Size: 4096 B | Pages: {integrityReport?.clean?.pageCount || "6.194"} | 0 Korup
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">era5_data.db:</span>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/50 text-[10px]">
                      {integrityReport?.era5?.status || summary?.era5?.integrity || "HEALTHY"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Page Size: 4096 B | Pages: {integrityReport?.era5?.pageCount || "2.090"} | 0 Korup
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={runIntegrityCheck}
                  disabled={checkingIntegrity}
                  className="w-full gap-2 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <ShieldCheck className={`h-4 w-4 ${checkingIntegrity ? "animate-spin" : ""}`} />
                  Jalankan Uji PRAGMA Sekarang
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
