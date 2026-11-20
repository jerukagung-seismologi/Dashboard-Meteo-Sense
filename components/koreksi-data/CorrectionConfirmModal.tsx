"use client";

import React from "react";
import { ShieldAlert, Check, RefreshCw } from "lucide-react";
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

export interface CorrectionConfirmModalProps {
  showConfirmModal: boolean;
  setShowConfirmModal: (val: boolean) => void;
  selectedStationName: string;
  selectedVar: WeatherVarMeta;
  correctionMethod: string;
  interpolationSubMethod: string;
  modifiedCount: number;
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
  syncRhRecovery: boolean;
  rhModifiedCount: number;
  auditNotes: string;
  setAuditNotes: (notes: string) => void;
  handleApplyBatchCorrection: () => Promise<void>;
  isApplying: boolean;
}

export function CorrectionConfirmModal({
  showConfirmModal,
  setShowConfirmModal,
  selectedStationName,
  selectedVar,
  correctionMethod,
  interpolationSubMethod,
  modifiedCount,
  loadedContext,
  startDateStr,
  startTimeStr,
  endDateStr,
  endTimeStr,
  syncRhRecovery,
  rhModifiedCount,
  auditNotes,
  setAuditNotes,
  handleApplyBatchCorrection,
  isApplying,
}: CorrectionConfirmModalProps) {
  return (
    <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <ShieldAlert className="h-5 w-5 text-amber-500" /> Konfirmasi Penulisan Koreksi ke Database
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Menulis pembaruan nilai RAW ke Firebase RTDB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Stasiun:</span>
              <span className="font-semibold">{selectedStationName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Parameter:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {selectedVar.label} ({selectedVar.key})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Metode:</span>
              <span className="font-semibold">
                {correctionMethod === "interpolate"
                  ? `INTERPOLASI (${interpolationSubMethod.toUpperCase()})`
                  : correctionMethod.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jumlah Titik Terkoreksi:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {modifiedCount} Titik
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

          {syncRhRecovery && selectedVar.key === "temperature" && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Simultan: suhu ({modifiedCount} titik) + RH ({rhModifiedCount} titik).
              </span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="auditNotes" className="text-xs font-medium">
              Catatan Alasan Koreksi (Opsional):
            </Label>
            <Input
              id="auditNotes"
              placeholder="Contoh: Koreksi lonjakan radiasi matahari menggunakan penuntun ECMWF IFS"
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
            onClick={() => setShowConfirmModal(false)}
            disabled={isApplying}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleApplyBatchCorrection}
            disabled={isApplying}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs"
          >
            {isApplying ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Menerapkan...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" /> Ya, Terapkan Sekarang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
