"use client";

import React from "react";
import { Sparkles, Check, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeatherVarMeta } from "./types";

export interface ImputationConfirmModalProps {
  showImputationConfirmModal: boolean;
  setShowImputationConfirmModal: (val: boolean) => void;
  selectedStationName: string;
  selectedVar: WeatherVarMeta;
  gapImputeMethod: string;
  missingCount: number;
  segmentsCount: number;
  loadedContext: {
    startDateStr: string;
    startTimeStr: string;
    endDateStr: string;
    endTimeStr: string;
  } | null;
  startDateStr: string;
  startTimeStr: string;
  endDateStr: string;
  endTimeStr: string;
  auditNotes: string;
  setAuditNotes: (notes: string) => void;
  handleApplyGapImputation: () => Promise<void>;
  isApplyingImputation: boolean;
}

export function ImputationConfirmModal({
  showImputationConfirmModal,
  setShowImputationConfirmModal,
  selectedStationName,
  selectedVar,
  gapImputeMethod,
  missingCount,
  segmentsCount,
  loadedContext,
  startDateStr,
  startTimeStr,
  endDateStr,
  endTimeStr,
  auditNotes,
  setAuditNotes,
  handleApplyGapImputation,
  isApplyingImputation,
}: ImputationConfirmModalProps) {
  return (
    <Dialog
      open={showImputationConfirmModal}
      onOpenChange={setShowImputationConfirmModal}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Sparkles className="h-5 w-5 text-purple-500" /> Konfirmasi Penulisan Imputasi Celah ke Database
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Menulis titik grid baru dengan status IMPUTED ke Firebase RTDB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Stasiun Target:</span>
              <span className="font-semibold">{selectedStationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Parameter:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {selectedVar.label} ({selectedVar.key})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Metode Imputasi:</span>
              <span className="font-semibold">{gapImputeMethod.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Menit Kosong Diisi:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {missingCount} Menit ({segmentsCount} Segmen)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rentang Waktu:</span>
              <span>
                {loadedContext
                  ? `${loadedContext.startDateStr} ${loadedContext.startTimeStr} s/d ${loadedContext.endDateStr} ${loadedContext.endTimeStr}`
                  : `${startDateStr} ${startTimeStr} s/d ${endDateStr} ${endTimeStr}`}{" "}
                WIB
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs flex items-center gap-2">
            <Check className="h-4 w-4 text-purple-600 shrink-0" />
            <span>Grid 1-menit kontinu tervalidasi batas fisik WMO.</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="imputeAuditNotes" className="text-xs font-medium">
              Catatan Alasan Imputasi (Opsional):
            </Label>
            <Input
              id="imputeAuditNotes"
              placeholder="Contoh: Imputasi celah data pasca pemadaman listrik menggunakan model spatial transfer"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImputationConfirmModal(false)}
            disabled={isApplyingImputation}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleApplyGapImputation}
            disabled={isApplyingImputation}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs"
          >
            {isApplyingImputation ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Menerapkan...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" /> Ya, Tuliskan Sekarang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
