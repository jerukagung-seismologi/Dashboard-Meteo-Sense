import React, { useState, useMemo } from "react";
import { Database, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CorrectedRecord, WeatherVarMeta, formatWibShortDateTime } from "./types";
import { useToast } from "@/hooks/use-toast";

export interface CorrectionPreviewTableProps {
  correctedResults: CorrectedRecord[];
  selectedVar: WeatherVarMeta;
  syncRhRecovery: boolean;
}

export function CorrectionPreviewTable({
  correctedResults,
  selectedVar,
  syncRhRecovery,
}: CorrectionPreviewTableProps) {
  const { toast } = useToast();
  const [showOnlyModifiedRows, setShowOnlyModifiedRows] = useState<boolean>(true);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewPageSize, setPreviewPageSize] = useState<number>(100);

  const previewRows = useMemo(() => {
    if (!showOnlyModifiedRows) return correctedResults;
    return correctedResults.filter((r) => r.isModified || (r as any).isAnomaly);
  }, [correctedResults, showOnlyModifiedRows]);

  const previewTotalPages = useMemo(() => {
    if (previewPageSize <= 0) return 1;
    return Math.max(1, Math.ceil(previewRows.length / previewPageSize));
  }, [previewRows.length, previewPageSize]);

  const safePreviewPage = Math.min(previewPage, previewTotalPages);

  const paginatedPreviewRows = useMemo(() => {
    if (previewPageSize <= 0) return previewRows;
    const start = (safePreviewPage - 1) * previewPageSize;
    return previewRows.slice(start, start + previewPageSize);
  }, [previewRows, safePreviewPage, previewPageSize]);

  const handleExportPreviewCsv = () => {
    if (previewRows.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada baris data pratinjau untuk diekspor ke CSV.",
      });
      return;
    }

    const escapeCsv = (val: string | number) => {
      const s = String(val);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const includeRh = syncRhRecovery && selectedVar.key === "temperature";
    const headers = [
      "Waktu_WIB",
      "Timestamp_Epoch_Sec",
      `Mentah_${selectedVar.key}`,
      `Koreksi_${selectedVar.key}`,
      `Selisih_${selectedVar.key}`,
      "Status",
    ];
    if (includeRh) {
      headers.push("Mentah_RH", "Pemulihan_RH_Magnus", "Selisih_RH");
    }

    const rows = previewRows.map((r) => {
      const row = [
        formatWibShortDateTime(r.timestamp),
        (r.record as any).timestampInSeconds || Math.floor(r.timestamp / 1000),
        r.rawVal ?? "",
        r.correctedVal ?? "",
        r.diff ?? "",
        (r as any).isAnomaly ? "Anomali" : r.isModified ? "Terkoreksi" : "Tetap",
      ];
      if (includeRh) {
        row.push(r.rawRhVal ?? "", r.recoveredRhVal ?? "", r.diffRh ?? "");
      }
      return row.map(escapeCsv).join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `koreksi_${selectedVar.key}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="py-3 px-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-500" />
            Rincian Titik Data Observasi ({previewRows.length.toLocaleString("id-ID")} Baris)
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Switch
              id="showModifiedRowsSwitch"
              checked={showOnlyModifiedRows}
              onCheckedChange={(checked) => {
                setShowOnlyModifiedRows(checked);
                setPreviewPage(1);
              }}
            />
            <Label htmlFor="showModifiedRowsSwitch" className="cursor-pointer text-xs">
              Hanya Tampilkan Baris yang Berubah
            </Label>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportPreviewCsv}
            disabled={previewRows.length === 0}
            className="h-8 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10">
              <tr>
                <th className="p-2.5 pl-5 font-semibold">Waktu (WIB)</th>
                <th className="p-2.5 font-semibold">Nilai Mentah</th>
                <th className="p-2.5 font-semibold">Nilai Koreksi</th>
                <th className="p-2.5 font-semibold">Selisih (Δ)</th>
                <th className="p-2.5 pr-5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedPreviewRows.map((row) => {
                const isMod = row.isModified;
                const isAnomaly = (row as any).isAnomaly;
                return (
                  <tr
                    key={row.timestamp}
                    className={
                      isAnomaly
                        ? "bg-rose-50/50 dark:bg-rose-950/20"
                        : isMod
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                        : ""
                    }
                  >
                    <td className="p-2.5 pl-5 font-mono text-slate-600 dark:text-slate-400">
                      {row.record.dateFormatted || formatWibShortDateTime(row.timestamp)}
                    </td>
                    <td className="p-2.5 font-mono">{row.rawVal} {selectedVar.unit}</td>
                    <td className="p-2.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      <div>{row.correctedVal} {selectedVar.unit}</div>
                      {row.isRhModified && row.recoveredRhVal !== undefined && (
                        <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">
                          RH: {row.rawRhVal}% → {row.recoveredRhVal}% ({row.diffRh && row.diffRh > 0 ? `+${row.diffRh}` : row.diffRh}%)
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 font-mono">
                      {row.diff != null && row.diff > 0 ? `+${row.diff}` : row.diff} {selectedVar.unit}
                    </td>
                    <td className="p-2.5 pr-5">
                      {isAnomaly ? (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                          Anomali
                        </Badge>
                      ) : isMod ? (
                        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] py-0 px-1.5">
                          Terkoreksi
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Tetap</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paginatedPreviewRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-slate-400">
                    Tidak ada baris data yang ditampilkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
      {previewRows.length > 0 && (
        <CardFooter className="py-2.5 px-5 border-t bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            {previewPageSize <= 0
              ? `Menampilkan seluruh ${previewRows.length.toLocaleString("id-ID")} baris`
              : `Menampilkan ${((safePreviewPage - 1) * previewPageSize + 1).toLocaleString("id-ID")}–${Math.min(safePreviewPage * previewPageSize, previewRows.length).toLocaleString("id-ID")} dari ${previewRows.length.toLocaleString("id-ID")} baris`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(previewPageSize)}
              onValueChange={(val) => {
                setPreviewPageSize(Number(val));
                setPreviewPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[118px] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 / hal</SelectItem>
                <SelectItem value="250">250 / hal</SelectItem>
                <SelectItem value="0">Tampilkan Semua</SelectItem>
              </SelectContent>
            </Select>
            {previewPageSize > 0 && previewTotalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePreviewPage <= 1}
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2 text-[11px]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="font-mono text-[11px] px-1.5">
                  {safePreviewPage}/{previewTotalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePreviewPage >= previewTotalPages}
                  onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}
                  className="h-7 px-2 text-[11px]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
