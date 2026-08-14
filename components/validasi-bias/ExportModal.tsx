// components/validasi-bias/ExportModal.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileJson, FileSpreadsheet, Check } from "lucide-react";
import { MatchedObservationPair, ProvenanceMetadata, MeteorologicalVariable } from "@/lib/bias-correction/types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairs: MatchedObservationPair[];
  provenance: ProvenanceMetadata;
  variable: MeteorologicalVariable;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  pairs,
  provenance,
  variable,
}) => {
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const handleExportCSV = () => {
    const headers = [
      "timestamp_utc",
      "datetime_iso",
      "split_period",
      "aws_raw",
      "aws_qc_value",
      "aws_qc_flag",
      "era5_raw",
      "era5_corrected",
      "correction_method",
    ];

    const rows = pairs.map(p => [
      p.timestamp,
      new Date(p.timestamp).toISOString(),
      p.split,
      p.aws_raw ?? "",
      p.aws_value ?? "",
      p.aws_flag,
      p.era5_value ?? "",
      p.corrected_value ?? "",
      provenance.correctionMethod,
    ]);

    const csvContent =
      "# METEOSENSE AWS-ERA5 VALIDATION & BIAS CORRECTION DATASET\n" +
      `# Station: ${provenance.sourceAwsStation} (${provenance.sourceAwsStationId})\n` +
      `# Variable: ${provenance.variable}\n` +
      `# Method: ${provenance.correctionMethod}\n` +
      `# Calibration Period: ${provenance.calibrationPeriod.from} to ${provenance.calibrationPeriod.to} (N=${provenance.calibrationPeriod.sampleCount})\n` +
      `# Validation Period: ${provenance.validationPeriod.from} to ${provenance.validationPeriod.to} (N=${provenance.validationPeriod.sampleCount})\n` +
      `# Export Timestamp: ${provenance.createdAt}\n` +
      headers.join(",") +
      "\n" +
      rows.map(r => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AWS_ERA5_BiasCorrection_${variable}_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloaded("csv");
    setTimeout(() => setDownloaded(null), 2500);
  };

  const handleExportJSON = () => {
    const payload = {
      provenance,
      totalObservations: pairs.length,
      data: pairs.map(p => ({
        timestamp: p.timestamp,
        datetime: new Date(p.timestamp).toISOString(),
        split: p.split,
        layer1_aws_raw: p.aws_raw,
        layer2_aws_qc: {
          value: p.aws_value,
          flag: p.aws_flag,
        },
        layer1_era5_raw: p.era5_value,
        layer3_era5_corrected: p.corrected_value,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AWS_ERA5_BiasCorrection_${variable}_${new Date().toISOString().substring(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloaded("json");
    setTimeout(() => setDownloaded(null), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Ekspor Dataset Validasi & Koreksi Bias
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Unduh dataset multi-layer lengkap (RAW, QC Flag, dan CORRECTED) beserta metadata audit ilmiah.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Stasiun:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{provenance.sourceAwsStation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Variabel:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{variable}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Metode Koreksi:</span>
              <Badge variant="outline" className="font-mono text-[10px]">{provenance.correctionMethod}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jumlah Sampel Pasangan:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{pairs.length.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto text-xs" onClick={handleExportCSV}>
            {downloaded === "csv" ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
            Unduh Format CSV
          </Button>
          <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={handleExportJSON}>
            {downloaded === "json" ? <Check className="w-3.5 h-3.5 mr-1" /> : <FileJson className="w-3.5 h-3.5 mr-1" />}
            Unduh Format JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
