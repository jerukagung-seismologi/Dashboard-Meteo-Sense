"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  History,
  Download,
  Search,
  ChevronDown,
  Loader2,
  Calendar,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/climate-drivers/StatusBadge";
import { EnsoHistoryPoint, IodHistoryPoint, MjoHistoryPoint } from "@/lib/climate-drivers/officialClimateParser";

type DriverType = "enso" | "iod" | "mjo";

interface HistoryTableProps {
  type: DriverType;
  title: string;
  description: string;
  data: (EnsoHistoryPoint | IodHistoryPoint | MjoHistoryPoint)[];
  yearsLoaded: number;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  type,
  title,
  description,
  data,
  yearsLoaded,
  hasMore,
  onLoadMore,
  isLoadingMore,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [displayCount, setDisplayCount] = useState(25);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      let matchesSearch = true;
      let matchesStatus = true;

      const dateStr = "dateStr" in item ? item.dateStr : item.date;
      const status = item.status;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        matchesSearch = dateStr.toLowerCase().includes(query) || String(item.year).includes(query);
      }

      if (statusFilter !== "all") {
        matchesStatus = status.toLowerCase().includes(statusFilter.toLowerCase());
      }

      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const visibleData = useMemo(() => {
    return filteredData.slice(0, displayCount);
  }, [filteredData, displayCount]);

  // Export CSV
  const handleExportCsv = () => {
    if (data.length === 0) return;

    let headers: string[] = [];
    let rows: string[] = [];

    if (type === "enso") {
      headers = ["Tanggal", "Tahun", "Bulan", "Niño 1+2 Anomali (°C)", "Niño 3 Anomali (°C)", "Niño 3.4 Anomali (°C)", "Niño 4 Anomali (°C)", "Status ENSO"];
      rows = (data as EnsoHistoryPoint[]).map((d) =>
        `"${d.dateStr}",${d.year},${d.month},${d.nino12 ?? ""},${d.nino3 ?? ""},${d.nino34 ?? d.anomaly ?? ""},${d.nino4 ?? ""},"${d.status}"`
      );
    } else if (type === "iod") {
      headers = ["Tanggal", "Tahun", "Bulan", "DMI Index (°C)", "Status IOD"];
      rows = (data as IodHistoryPoint[]).map((d) =>
        `"${d.dateStr}",${d.year},${d.month},${d.dmi ?? ""},"${d.status}"`
      );
    } else {
      headers = ["Tanggal", "Tahun", "Bulan", "Hari", "RMM1", "RMM2", "Fase MJO", "Amplitudo", "Status MJO"];
      rows = (data as MjoHistoryPoint[]).map((d) =>
        `"${d.date}",${d.year},${d.month},${d.day},${d.rmm1 ?? ""},${d.rmm2 ?? ""},${d.phase ?? ""},${d.amplitude ?? ""},"${d.status}"`
      );
    }

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `riwayat_${type}_${yearsLoaded}tahun.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-none shadow-sm dark:bg-slate-900 bg-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <History className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {description} (Memuat {yearsLoaded} Tahun Terakhir &bull; Total {data.length} data observasi)
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs gap-1.5 font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> Unduh History CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative w-full sm:w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari tahun atau tanggal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {type === "enso" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="El Niño">El Niño</SelectItem>
                  <SelectItem value="La Niña">La Niña</SelectItem>
                  <SelectItem value="Netral">Netral</SelectItem>
                </SelectContent>
              </Select>
            )}

            {type === "iod" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Positif">IOD Positif</SelectItem>
                  <SelectItem value="Negatif">IOD Negatif</SelectItem>
                  <SelectItem value="Netral">IOD Netral</SelectItem>
                </SelectContent>
              </Select>
            )}

            {type === "mjo" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[170px] text-xs">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Indonesia">Aktif di Indonesia</SelectItem>
                  <SelectItem value="Transisi">Transisi</SelectItem>
                  <SelectItem value="Luar">Di Luar Indonesia</SelectItem>
                  <SelectItem value="Netral">Netral / Lemah</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Menampilkan <span className="font-bold text-slate-900 dark:text-slate-100">{visibleData.length}</span> dari {filteredData.length} baris
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="p-3">Tanggal / Periode</th>
                {type === "enso" && (
                  <>
                    <th className="p-3 text-center">Niño 1+2 (°C)</th>
                    <th className="p-3 text-center">Niño 3 (°C)</th>
                    <th className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">Niño 3.4 (°C)</th>
                    <th className="p-3 text-center">Niño 4 (°C)</th>
                    <th className="p-3 text-right">Kategori Status</th>
                  </>
                )}
                {type === "iod" && (
                  <>
                    <th className="p-3 text-center">Indeks DMI (°C)</th>
                    <th className="p-3 text-right">Kategori Status IOD</th>
                  </>
                )}
                {type === "mjo" && (
                  <>
                    <th className="p-3 text-center">RMM1</th>
                    <th className="p-3 text-center">RMM2</th>
                    <th className="p-3 text-center">Fase MJO</th>
                    <th className="p-3 text-center">Amplitudo</th>
                    <th className="p-3 text-right">Status Konveksi</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
              {visibleData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada data riwayat yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                visibleData.map((row, idx) => {
                  if (type === "enso") {
                    const r = row as EnsoHistoryPoint;
                    const nino34Val = r.nino34 ?? r.anomaly;

                    const renderBadge = (val: number | null | undefined, isHighlight = false) => {
                      if (val === null || val === undefined) return "-";
                      const str = val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
                      const color = val >= 0.5
                        ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        : val <= -0.5
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
                      return (
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${color} ${isHighlight ? "ring-1 ring-indigo-400 dark:ring-indigo-600 shadow-sm" : ""}`}>
                          {str}
                        </span>
                      );
                    };

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {r.dateStr}
                        </td>
                        <td className="p-3 text-center">{renderBadge(r.nino12)}</td>
                        <td className="p-3 text-center">{renderBadge(r.nino3)}</td>
                        <td className="p-3 text-center">{renderBadge(nino34Val, true)}</td>
                        <td className="p-3 text-center">{renderBadge(r.nino4)}</td>
                        <td className="p-3 text-right">
                          <StatusBadge type="enso" value={r.status} size="sm" />
                        </td>
                      </tr>
                    );
                  }

                  if (type === "iod") {
                    const r = row as IodHistoryPoint;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {r.dateStr}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              r.dmi !== null && r.dmi >= 0.4
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : r.dmi !== null && r.dmi <= -0.4
                                ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {r.dmi !== null ? (r.dmi >= 0 ? `+${r.dmi.toFixed(2)}` : r.dmi.toFixed(2)) : "-"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <StatusBadge type="iod" value={r.status} size="sm" />
                        </td>
                      </tr>
                    );
                  }

                  if (type === "mjo") {
                    const r = row as MjoHistoryPoint;
                    const isIndonesia = r.phase === 4 || r.phase === 5;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {r.date}
                        </td>
                        <td className="p-3 text-center font-mono">{r.rmm1 !== null ? r.rmm1.toFixed(3) : "-"}</td>
                        <td className="p-3 text-center font-mono">{r.rmm2 !== null ? r.rmm2.toFixed(3) : "-"}</td>
                        <td className="p-3 text-center font-bold">
                          <Badge variant="outline" className="text-xs">
                            Fase {r.phase ?? "-"}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {r.amplitude !== null ? r.amplitude.toFixed(2) : "-"}
                        </td>
                        <td className="p-3 text-right">
                          <StatusBadge type="mjo" value={r.status} size="sm" />
                        </td>
                      </tr>
                    );
                  }

                  return null;
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load More pagination controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {displayCount < filteredData.length ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayCount((prev) => prev + 25)}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Tampilkan 25 Baris Lagi
            </Button>
          ) : (
            <span className="text-xs text-slate-400">Semua baris lokal ditampilkan</span>
          )}

          {/* Server Load More Button (+5 Tahun) */}
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-sm"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat Data 5 Tahun Lagi dari Server...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Muat Lebih Banyak (+5 Tahun Riwayat Dari Server)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
