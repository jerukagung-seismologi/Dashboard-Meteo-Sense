import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { SensorDate, batchWriteGapImputedNodes, logSensorCorrection } from "@/lib/FetchingSensorData";
import {
  WeatherVarMeta,
  LoadedDataContext,
  formatWibShortDateTime,
} from "@/components/koreksi-data/types";
import {
  runUniversalGapImputation,
  buildCompleteGapNodePayloads,
  ImputationSummary,
  ImputedGridPoint,
  getWibTimeComponents,
} from "@/lib/meteorologicalImputationEngine";
import type { ReferenceGuidePoint } from "@/app/api/weather/reference-guide/route";
import { useToast } from "@/hooks/use-toast";

export interface UseGapImputationParams {
  rawRecords: SensorDate[];
  selectedVar: WeatherVarMeta;
  sensorId: string;
  loadedContext: LoadedDataContext | null;
  refStationRecords: SensorDate[];
  referenceGuidePoints: ReferenceGuidePoint[];
  selfHistoryRecords: SensorDate[];
  solarRefStationId: string;
  isDarkMode: boolean;
  user?: { displayName?: string | null; email?: string | null };
  onImputationSuccess?: () => Promise<void>;
}

export function useGapImputation({
  rawRecords,
  selectedVar,
  sensorId,
  loadedContext,
  refStationRecords,
  referenceGuidePoints,
  selfHistoryRecords,
  solarRefStationId,
  isDarkMode,
  user,
  onImputationSuccess,
}: UseGapImputationParams) {
  const { toast } = useToast();

  const [operationMode, setOperationMode] = useState<"point_correction" | "gap_imputation">("point_correction");
  const [gapMicroLimitMinutes, setGapMicroLimitMinutes] = useState<number>(15);
  const [gapImputeMethod, setGapImputeMethod] = useState<
    "auto_hybrid" | "self_history" | "companion_ridge" | "model_guided" | "pchip_spline"
  >("auto_hybrid");
  const [enableGapBridging, setEnableGapBridging] = useState<boolean>(true);
  const [enableGapPhysics, setEnableGapPhysics] = useState<boolean>(true);
  const [isApplyingImputation, setIsApplyingImputation] = useState<boolean>(false);
  const [showImputationConfirmModal, setShowImputationConfirmModal] = useState<boolean>(false);
  const [imputationAuditNotes, setImputationAuditNotes] = useState<string>("");

  const invalidateServerSensorCache = useCallback(async (sid: string) => {
    try {
      await fetch("/api/sensors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invalidate", sensorId: sid }),
      });
    } catch {
      // Non-critical
    }
  }, []);

  // Compute Universal Gap Imputation Result
  const imputationResult = useMemo<{ grid: ImputedGridPoint[]; summary: ImputationSummary }>(() => {
    if (!loadedContext || !sensorId) {
      return {
        grid: [],
        summary: {
          totalExpectedMinutes: 0,
          originalAvailableCount: 0,
          originalMissingCount: 0,
          microGapsCount: 0,
          microGapsMinutes: 0,
          macroGapsCount: 0,
          macroGapsMinutes: 0,
          filledMicroCount: 0,
          filledMacroCount: 0,
          completenessPercent: 100,
          segments: [],
        },
      };
    }

    const startTs = loadedContext.startMs;
    const endTs = loadedContext.endMs;

    return runUniversalGapImputation(
      rawRecords,
      startTs,
      endTs,
      selectedVar.key,
      {
        microGapLimitMinutes: gapMicroLimitMinutes,
        enableSpatialTransfer: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "companion_ridge",
        enableModelGuided: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "model_guided",
        enableSelfHistory: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "self_history",
        preferSelfHistory: gapImputeMethod === "self_history",
        enableBoundaryBridging: enableGapBridging,
        enablePhysicsPostProcessing: enableGapPhysics,
      },
      refStationRecords,
      referenceGuidePoints,
      selfHistoryRecords
    );
  }, [
    rawRecords,
    loadedContext,
    sensorId,
    selectedVar.key,
    gapMicroLimitMinutes,
    gapImputeMethod,
    enableGapBridging,
    enableGapPhysics,
    refStationRecords,
    referenceGuidePoints,
    selfHistoryRecords,
  ]);

  // ECharts Option for Gap Imputation Preview
  const gapChartOptions = useMemo(() => {
    if (imputationResult.grid.length === 0) return {};

    const isMultiDay = imputationResult.grid.length > 1500;
    const timeLabels = imputationResult.grid.map((r: ImputedGridPoint) =>
      isMultiDay ? formatWibShortDateTime(r.timestamp) : r.timeFormatted.slice(0, 5)
    );
    const rawData = imputationResult.grid.map((r: ImputedGridPoint) => (r.isOriginal ? r.rawVal : null));
    const imputedData = imputationResult.grid.map((r: ImputedGridPoint) => r.imputedVal);

    const allVals = imputationResult.grid
      .map((r: ImputedGridPoint) => r.imputedVal)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const vMin = allVals.length > 0 ? Math.min(...allVals) : 20;
    const vMax = allVals.length > 0 ? Math.max(...allVals) : 35;
    const padding = Math.max(0.5, (vMax - vMin) * 0.1);
    let yMin = Number((vMin - padding).toFixed(1));
    let yMax = Number((vMax + padding).toFixed(1));
    if (selectedVar.key === "humidity") {
      yMin = Math.max(0, yMin);
      yMax = Math.min(100, yMax);
    } else if (["rainfall", "rainrate", "windSpeed", "lux", "volt"].includes(selectedVar.key)) {
      yMin = Math.max(0, yMin);
    }

    const gapMarkAreas: any[] = imputationResult.summary.segments.map((gap) => [
      {
        name: `Celah ${gap.durationMinutes} mnt (${gap.type === "micro" ? "Mikro" : "Makro"})`,
        xAxis: isMultiDay ? formatWibShortDateTime(gap.startTs) : getWibTimeComponents(gap.startTs).timeFormatted.slice(0, 5),
        itemStyle: {
          color:
            gap.type === "micro"
              ? "rgba(16, 185, 129, 0.12)"
              : "rgba(59, 130, 246, 0.14)",
        },
      },
      {
        xAxis: isMultiDay ? formatWibShortDateTime(gap.endTs) : getWibTimeComponents(gap.endTs).timeFormatted.slice(0, 5),
      },
    ]);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", crossStyle: { color: isDarkMode ? "#64748B" : "#94A3B8" } },
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderColor: isDarkMode ? "#334155" : "#E2E8F0",
        textStyle: { color: isDarkMode ? "#F8FAFC" : "#0F172A", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const p = params[0];
          const idx = p.dataIndex;
          const pt = imputationResult.grid[idx];
          if (!pt) return "";

          let html = `<div class="p-1 font-sans"><div class="font-bold text-xs mb-1.5">${formatWibShortDateTime(pt.timestamp)} WIB</div>`;
          if (pt.isOriginal) {
            html += `<div class="text-[11px] flex justify-between gap-4"><span style="color:#0EA5E9">Observasi Asli:</span> <strong>${pt.rawVal?.toFixed(selectedVar.decimals)} ${selectedVar.unit}</strong></div>`;
          } else {
            html += `<div class="text-[11px] flex justify-between gap-4"><span style="color:#10B981">Hasil Imputasi:</span> <strong>${pt.imputedVal.toFixed(selectedVar.decimals)} ${selectedVar.unit}</strong></div>`;
            html += `<div class="text-[10px] text-slate-400 mt-1 flex justify-between gap-4"><span>Metode Rekonstruksi:</span> <span class="font-mono">${pt.imputationPhase || "Hibrida"}</span></div>`;
          }
          html += `</div>`;
          return html;
        },
      },
      legend: {
        data: ["Observasi Asli (Ada)", "Kurva Hasil Imputasi"],
        textStyle: { color: isDarkMode ? "#94A3B8" : "#475569", fontSize: 11 },
        top: 0,
        right: 10,
      },
      grid: { left: 45, right: 20, top: 35, bottom: 30, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: timeLabels,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#CBD5E1" } },
        axisLabel: { color: isDarkMode ? "#94A3B8" : "#64748B", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        name: `${selectedVar.label} (${selectedVar.unit})`,
        nameTextStyle: { color: isDarkMode ? "#94A3B8" : "#64748B", fontSize: 11, align: "left" },
        min: yMin,
        max: yMax,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#CBD5E1" } },
        splitLine: { lineStyle: { color: isDarkMode ? "#1E293B" : "#F1F5F9" } },
        axisLabel: { color: isDarkMode ? "#94A3B8" : "#64748B", fontSize: 10 },
      },
      series: [
        {
          name: "Observasi Asli (Ada)",
          type: "scatter",
          data: rawData,
          symbolSize: 4,
          itemStyle: { color: "#0EA5E9" },
        },
        {
          name: "Kurva Hasil Imputasi",
          type: "line",
          data: imputedData,
          showSymbol: false,
          lineStyle: { color: "#10B981", width: 2 },
          areaStyle: { color: "rgba(16, 185, 129, 0.08)" },
          markArea: { silent: true, data: gapMarkAreas },
        },
      ],
    };
  }, [imputationResult, selectedVar, isDarkMode]);

  // Apply Imputation to RTDB
  const handleApplyImputation = async () => {
    if (!loadedContext) {
      toast({
        title: "Data Belum Dimuat",
        description: "Muat data sensor terlebih dahulu sebelum melakukan imputasi.",
        variant: "destructive",
      });
      setShowImputationConfirmModal(false);
      return;
    }

    const imputedPoints = imputationResult.grid.filter((pt) => pt.isImputed);
    if (imputedPoints.length === 0) {
      toast({
        title: "Tidak Ada Celah Data",
        description: "Seluruh menit observasi telah terisi secara penuh (100%).",
      });
      setShowImputationConfirmModal(false);
      return;
    }

    try {
      setIsApplyingImputation(true);

      const nodePayloads = buildCompleteGapNodePayloads(
        imputationResult.grid,
        rawRecords,
        loadedContext.startMs,
        loadedContext.endMs,
        selectedVar.key,
        {
          microGapLimitMinutes: gapMicroLimitMinutes,
          enableSpatialTransfer: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "companion_ridge",
          enableModelGuided: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "model_guided",
          enableSelfHistory: gapImputeMethod === "auto_hybrid" || gapImputeMethod === "self_history",
          preferSelfHistory: gapImputeMethod === "self_history",
          enableBoundaryBridging: enableGapBridging,
          enablePhysicsPostProcessing: enableGapPhysics,
        },
        refStationRecords,
        referenceGuidePoints,
        selfHistoryRecords
      );

      const writtenNodes = await batchWriteGapImputedNodes(sensorId, nodePayloads);

      const startEpoch = Math.floor(loadedContext.startMs / 1000);
      const endEpoch = Math.floor(loadedContext.endMs / 1000);

      await logSensorCorrection({
        sensorId,
        timestamp: Date.now(),
        field: selectedVar.key,
        method: `GAP_IMPUTATION_${gapImputeMethod.toUpperCase()}`,
        pointCount: writtenNodes,
        range: {
          start: startEpoch,
          end: endEpoch,
          startDateFormatted: `${loadedContext.startDateStr} ${loadedContext.startTimeStr} WIB`,
          endDateFormatted: `${loadedContext.endDateStr} ${loadedContext.endTimeStr} WIB`,
        },
        parameters: {
          microGapLimit: gapMicroLimitMinutes,
          gapMethod: gapImputeMethod,
          boundaryBridging: enableGapBridging,
          physicsPostProcess: enableGapPhysics,
          totalGapsFilled: writtenNodes,
          multiVarCompleted: true,
          companionStation:
            solarRefStationId && solarRefStationId !== sensorId ? solarRefStationId : undefined,
        },
        appliedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss") + " WIB",
        appliedBy: user?.displayName || user?.email || "Admin Operator",
        notes:
          imputationAuditNotes.trim() ||
          `Imputasi celah data ${writtenNodes} menit lengkap multi-variabel menggunakan algoritma 2-Fase Hibrida`,
      });

      await invalidateServerSensorCache(sensorId);

      toast({
        title: "Imputasi Celah Berhasil Disimpan",
        description: `Berhasil menuliskan ${writtenNodes} node waktu lengkap (multi-variabel + ${selectedVar.key}) ke Firebase RTDB.`,
      });

      setShowImputationConfirmModal(false);
      setImputationAuditNotes("");

      if (onImputationSuccess) {
        await onImputationSuccess();
      }
    } catch (err: any) {
      console.error("Gagal menyimpan imputasi celah:", err);
      toast({
        title: "Gagal Menerapkan Imputasi",
        description: err.message || "Terjadi kesalahan saat menulis ke database.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingImputation(false);
    }
  };

  return {
    operationMode,
    setOperationMode,
    gapMicroLimitMinutes,
    setGapMicroLimitMinutes,
    gapImputeMethod,
    setGapImputeMethod,
    enableGapBridging,
    setEnableGapBridging,
    enableGapPhysics,
    setEnableGapPhysics,
    isApplyingImputation,
    showImputationConfirmModal,
    setShowImputationConfirmModal,
    imputationAuditNotes,
    setImputationAuditNotes,
    imputationResult,
    gapChartOptions,
    handleApplyImputation,
  };
}
