import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { SensorDate, BatchSensorFieldUpdate, SensorCorrectionAuditLog, batchUpdateSensorFields, logSensorCorrection } from "@/lib/FetchingSensorData";
import {
  WeatherVarMeta,
  CorrectionMethod,
  InterpolationSubMethod,
  CorrectedRecord,
  AnomalyFlag,
  LoadedDataContext,
  formatWibShortDateTime,
  readFiniteField,
} from "@/components/koreksi-data/types";
import {
  interpolateTimeLinear,
  interpolateCubicHermite,
  interpolateHermiteWithSlopes,
  computePchipSlopes,
  computeAkimaSlopes,
  interpolateModelGuided,
  recalculateRHMagnus,
  interpolateSolarCosineHermite,
} from "@/lib/meteorologicalInterpolation";
import { getWibTimeComponents } from "@/lib/meteorologicalImputationEngine";
import { useToast } from "@/hooks/use-toast";

export interface UseCorrectionEngineParams {
  rawRecords: SensorDate[];
  selectedVar: WeatherVarMeta;
  effectiveAnomalyIndexSet: Set<number>;
  anomalies: AnomalyFlag[];
  getUnifiedRefValAtTimestamp: (ts: number, varKey: string) => number | null;
  baselineNightOffset: number;
  solarRefSource: "self_history" | "station_aws" | "model_ecmwf";
  historyLookbackDays: 1 | 3 | 7;
  activeRefLabel: string;
  refSeries: (number | null)[];
  showReferenceGuide: boolean;
  sensorId: string;
  loadedContext: LoadedDataContext | null;
  isFilterDirty: boolean;
  isDarkMode: boolean;
  user?: { displayName?: string | null; email?: string | null };
  onCorrectionSuccess?: () => Promise<void>;
}

export function useCorrectionEngine({
  rawRecords,
  selectedVar,
  effectiveAnomalyIndexSet,
  anomalies,
  getUnifiedRefValAtTimestamp,
  baselineNightOffset,
  solarRefSource,
  historyLookbackDays,
  activeRefLabel,
  refSeries,
  showReferenceGuide,
  sensorId,
  loadedContext,
  isFilterDirty,
  isDarkMode,
  user,
  onCorrectionSuccess,
}: UseCorrectionEngineParams) {
  const { toast } = useToast();

  // Correction Method Configuration
  const [correctionMethod, setCorrectionMethod] = useState<CorrectionMethod>("interpolate");
  const [offsetValue, setOffsetValue] = useState<number>(0);
  const [driftStart, setDriftStart] = useState<number>(0);
  const [driftEnd, setDriftEnd] = useState<number>(0);
  const [clampMin, setClampMin] = useState<number>(selectedVar.wmoMin);
  const [clampMax, setClampMax] = useState<number>(selectedVar.wmoMax);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(true);
  const [enableSolarAnomalyCheck, setEnableSolarAnomalyCheck] = useState<boolean>(false);
  const [interpolationSubMethod, setInterpolationSubMethod] = useState<InterpolationSubMethod>("solar_cosine_hermite");
  const [solarThreshold, setSolarThreshold] = useState<number>(0.7);
  const [syncRhRecovery, setSyncRhRecovery] = useState<boolean>(false);

  // Modal & Applying State
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [auditNotes, setAuditNotes] = useState<string>("");

  // Invalidate cache
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

  // Scientific Batch Correction Calculation (Real-Time Preview)
  const correctedResults = useMemo<CorrectedRecord[]>(() => {
    if (rawRecords.length === 0) return [];
    const varKey = selectedVar.key;
    const n = rawRecords.length;
    const t0 = rawRecords[0].timestamp;
    const t1 = rawRecords[n - 1].timestamp;
    const span = Math.max(1, t1 - t0);

    const validAnchors: Array<{ idx: number; timestamp: number; value: number }> = [];
    for (let i = 0; i < n; i++) {
      const val = readFiniteField(rawRecords[i], varKey);
      if (val !== null && !effectiveAnomalyIndexSet.has(i)) {
        validAnchors.push({ idx: i, timestamp: rawRecords[i].timestamp, value: val });
      }
    }

    const firstValidVal = validAnchors.length > 0 ? validAnchors[0].value : 0;
    const pchipSlopes = computePchipSlopes(validAnchors);
    const akimaSlopes = computeAkimaSlopes(validAnchors);

    const findSurroundingAnchors = (targetIdx: number): { leftPos: number; rightPos: number } => {
      if (validAnchors.length === 0) return { leftPos: -1, rightPos: -1 };
      let lo = 0;
      let hi = validAnchors.length - 1;
      let leftPos = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (validAnchors[mid].idx < targetIdx) {
          leftPos = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      lo = 0;
      hi = validAnchors.length - 1;
      let rightPos = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (validAnchors[mid].idx > targetIdx) {
          rightPos = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      return { leftPos, rightPos };
    };

    return rawRecords.map((rec, idx) => {
      const rawValOpt = readFiniteField(rec, varKey);
      const rawVal = rawValOpt ?? NaN;
      const isAnomaly = effectiveAnomalyIndexSet.has(idx);
      const wibTime = getWibTimeComponents(rec.timestamp);

      if (onlyAnomalies && !isAnomaly) {
        const rawRh = readFiniteField(rec, "humidity") ?? undefined;
        return {
          record: rec,
          timestamp: rec.timestamp,
          rawVal: Number.isFinite(rawVal) ? rawVal : 0,
          correctedVal: Number.isFinite(rawVal) ? rawVal : 0,
          diff: 0,
          isModified: false,
          recoveredRhVal: rawRh,
          rawRhVal: rawRh,
          diffRh: 0,
          isRhModified: false,
        };
      }

      let targetVal = Number.isFinite(rawVal) ? rawVal : firstValidVal;

      switch (correctionMethod) {
        case "offset": {
          targetVal = targetVal + offsetValue;
          break;
        }
        case "drift": {
          const alpha = Math.min(1, Math.max(0, (rec.timestamp - t0) / span));
          const currentDrift = driftStart + alpha * (driftEnd - driftStart);
          targetVal = targetVal + currentDrift;
          break;
        }
        case "clamp": {
          targetVal = Math.min(clampMax, Math.max(clampMin, targetVal));
          break;
        }
        case "scale": {
          targetVal = targetVal * scaleFactor;
          break;
        }
        case "interpolate": {
          if (validAnchors.length === 0) {
            break;
          }

          let leftPos = 0;
          let rightPos = validAnchors.length - 1;

          if (onlyAnomalies) {
            const pair = findSurroundingAnchors(idx);
            leftPos = pair.leftPos;
            rightPos = pair.rightPos;
          }

          if (leftPos === -1 || rightPos === -1) {
            const edgePos = leftPos !== -1 ? leftPos : rightPos;
            const edgeAnchor = validAnchors[edgePos];
            if (interpolationSubMethod === "solar_cosine_hermite" || interpolationSubMethod === "model_guided") {
              const refT = getUnifiedRefValAtTimestamp(rec.timestamp, varKey);
              const refEdge = getUnifiedRefValAtTimestamp(edgeAnchor.timestamp, varKey);
              targetVal =
                refT !== null && refEdge !== null && Number.isFinite(refT) && Number.isFinite(refEdge)
                  ? refT + (edgeAnchor.value - refEdge)
                  : edgeAnchor.value;
            } else {
              targetVal = edgeAnchor.value;
            }
            break;
          }

          const anchorA = validAnchors[leftPos];
          const anchorB = validAnchors[rightPos];
          const slopeA = pchipSlopes[leftPos];
          const slopeB = pchipSlopes[rightPos];

          if (interpolationSubMethod === "solar_cosine_hermite") {
            const refT = getUnifiedRefValAtTimestamp(rec.timestamp, varKey);
            const refA = getUnifiedRefValAtTimestamp(anchorA.timestamp, varKey);
            const refB = getUnifiedRefValAtTimestamp(anchorB.timestamp, varKey);

            if (refT !== null && refA !== null && refB !== null) {
              targetVal = interpolateSolarCosineHermite(
                rec.timestamp,
                anchorA.timestamp,
                anchorB.timestamp,
                anchorA.value,
                anchorB.value,
                refT,
                refA,
                refB,
                varKey === "temperature" ? baselineNightOffset : 0
              );
            } else {
              targetVal = interpolateCubicHermite(
                rec.timestamp,
                anchorA.timestamp,
                anchorA.value,
                anchorB.timestamp,
                anchorB.value,
                slopeA,
                slopeB
              );
            }
          } else if (interpolationSubMethod === "model_guided") {
            targetVal = interpolateModelGuided(
              rec.timestamp,
              anchorA.timestamp,
              anchorA.value,
              anchorB.timestamp,
              anchorB.value,
              (ts) => getUnifiedRefValAtTimestamp(ts, varKey),
              slopeA,
              slopeB
            );
          } else if (interpolationSubMethod === "cubic_pchip") {
            targetVal = interpolateCubicHermite(
              rec.timestamp,
              anchorA.timestamp,
              anchorA.value,
              anchorB.timestamp,
              anchorB.value,
              slopeA,
              slopeB
            );
          } else if (interpolationSubMethod === "akima") {
            targetVal = interpolateHermiteWithSlopes(
              rec.timestamp,
              anchorA.timestamp,
              anchorA.value,
              anchorB.timestamp,
              anchorB.value,
              akimaSlopes[leftPos],
              akimaSlopes[rightPos]
            );
          } else {
            targetVal = interpolateTimeLinear(
              rec.timestamp,
              anchorA.timestamp,
              anchorA.value,
              anchorB.timestamp,
              anchorB.value
            );
          }
          break;
        }
      }

      // Meteorological Invariant Clamping (AGENTS.md Rule 3: strictly 0% to 100% for RH)
      if (selectedVar.key === "humidity") {
        targetVal = Math.min(100, Math.max(0, targetVal));
      }
      if (
        selectedVar.key === "rainfall" ||
        selectedVar.key === "rainrate" ||
        selectedVar.key === "lux" ||
        selectedVar.key === "windSpeed" ||
        selectedVar.key === "volt"
      ) {
        targetVal = Math.max(0, targetVal);
      }

      const roundedVal = Number(targetVal.toFixed(selectedVar.decimals));
      const diff = Number.isFinite(rawVal) ? roundedVal - rawVal : roundedVal;
      const isModified = Math.abs(diff) > 0.0001;

      // Thermodynamic Relative Humidity (RH) Recovery via Magnus-Tetens
      let recoveredRhVal: number | undefined = undefined;
      let rawRhVal: number | undefined = undefined;
      let diffRh: number = 0;
      let isRhModified: boolean = false;

      if (selectedVar.key === "temperature" && syncRhRecovery) {
        const rawRh = readFiniteField(rec, "humidity");
        const rawDew = readFiniteField(rec, "dew");
        if (rawRh !== null) rawRhVal = rawRh;

        if (rawDew !== null) {
          const calcRh = recalculateRHMagnus(roundedVal, Math.min(rawDew, roundedVal));
          if (Number.isFinite(calcRh)) {
            recoveredRhVal = Number(Math.min(100, Math.max(0, calcRh)).toFixed(1));
            if (rawRh !== null) {
              diffRh = Number((recoveredRhVal - rawRh).toFixed(1));
              isRhModified = Math.abs(diffRh) > 0.1;
            }
          }
        }
      }

      return {
        record: rec,
        timestamp: rec.timestamp,
        rawVal: Number.isFinite(rawVal) ? rawVal : 0,
        correctedVal: roundedVal,
        diff: Number(diff.toFixed(selectedVar.decimals)),
        isModified,
        recoveredRhVal,
        rawRhVal,
        diffRh,
        isRhModified,
      };
    });
  }, [
    rawRecords,
    selectedVar,
    correctionMethod,
    offsetValue,
    driftStart,
    driftEnd,
    clampMin,
    clampMax,
    scaleFactor,
    onlyAnomalies,
    effectiveAnomalyIndexSet,
    interpolationSubMethod,
    getUnifiedRefValAtTimestamp,
    baselineNightOffset,
    syncRhRecovery,
  ]);

  const modifiedItems = useMemo(() => {
    return correctedResults.filter((r) => r.isModified);
  }, [correctedResults]);

  // ECharts Configuration with Anti-Clutter Pin Clustering (AGENTS.md Rule 9)
  const chartOptions = useMemo(() => {
    if (correctedResults.length === 0) return {};

    const timeLabels = correctedResults.map((r) => formatWibShortDateTime(r.timestamp));
    const rawSeries = correctedResults.map((r) => r.rawVal);
    const corrSeries = correctedResults.map((r) => r.correctedVal);

    const validRefVals = (showReferenceGuide && refSeries.length > 0)
      ? refSeries.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
      : [];

    const allVals = [
      ...rawSeries,
      ...corrSeries,
      ...validRefVals,
    ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    let yMin: number | undefined = undefined;
    let yMax: number | undefined = undefined;

    if (allVals.length > 0) {
      const minVal = Math.min(...allVals);
      const maxVal = Math.max(...allVals);

      if (selectedVar.key === "rainfall" || selectedVar.key === "rainrate") {
        yMin = 0;
        yMax = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 10;
      } else if (selectedVar.key === "humidity") {
        yMin = Math.max(0, Math.floor(minVal));
        yMax = Math.min(100, Math.ceil(maxVal));
      } else if (selectedVar.key === "windSpeed") {
        yMin = Math.max(0, Math.floor(minVal));
        yMax = Math.ceil(maxVal);
      } else {
        yMin = Math.floor(minVal);
        yMax = Math.ceil(maxVal);
      }

      if (yMin === yMax) {
        yMin = yMin - 1;
        yMax = yMax + 1;
      }
    }

    // 1. Group consecutive anomalies into clusters to prevent visual pin overlap (AGENTS.md Rule 9)
    const clusters: Array<{
      type: string;
      items: AnomalyFlag[];
      peakItem: AnomalyFlag;
      startIndex: number;
      endIndex: number;
    }> = [];

    const sortedAnomalies = [...anomalies]
      .filter((a) => Number.isFinite(a.value))
      .sort((a, b) => a.index - b.index);

    for (const anom of sortedAnomalies) {
      const lastCluster = clusters[clusters.length - 1];
      if (
        lastCluster &&
        lastCluster.type === anom.type &&
        anom.index - lastCluster.endIndex <= 3
      ) {
        lastCluster.items.push(anom);
        lastCluster.endIndex = anom.index;
        const isHigher =
          anom.type === "solar_overheating" || anom.type === "spike_jump"
            ? anom.value > lastCluster.peakItem.value
            : Math.abs(anom.value) > Math.abs(lastCluster.peakItem.value);
        if (isHigher) {
          lastCluster.peakItem = anom;
        }
      } else {
        clusters.push({
          type: anom.type,
          items: [anom],
          peakItem: anom,
          startIndex: anom.index,
          endIndex: anom.index,
        });
      }
    }

    // 2. Exactly one crisp markPoint per cluster positioned at peak (symbolSize: 32)
    const markPointData = clusters.map((c) => {
      const count = c.items.length;
      const countSuffix = count > 1 ? ` (${count}p)` : "";
      const labelText =
        c.type === "wmo_boundary"
          ? `WMO${countSuffix}`
          : c.type === "solar_overheating"
          ? `Surya${countSuffix}`
          : c.type === "flatline"
          ? `Flat${countSuffix}`
          : `Spike${countSuffix}`;

      return {
        name: c.peakItem.reason,
        coord: [c.peakItem.index, c.peakItem.value],
        value: labelText,
        symbolSize: 32,
        itemStyle: {
          color: c.type === "solar_overheating" ? "#F59E0B" : "#EF4444",
        },
        label: {
          fontSize: 10,
          fontWeight: 600,
        },
      };
    });

    // 3. MarkArea softly highlights duration of multi-point anomaly clusters
    const markAreaData = clusters
      .filter((c) => c.items.length >= 2)
      .map((c) => [
        {
          xAxis: c.startIndex,
          itemStyle: {
            color:
              c.type === "solar_overheating"
                ? "rgba(245, 158, 11, 0.12)"
                : "rgba(239, 68, 68, 0.10)",
          },
        },
        {
          xAxis: c.endIndex,
        },
      ]);

    const seriesList: any[] = [
      {
        name: "Observasi Mentah (Sebelum)",
        type: "line",
        data: rawSeries,
        showSymbol: correctedResults.length < 50,
        lineStyle: {
          color: "#EF4444",
          width: 2,
        },
        itemStyle: {
          color: "#EF4444",
        },
        markPoint: {
          data: markPointData,
        },
        markArea: {
          silent: true,
          data: markAreaData,
        },
      },
      {
        name: "Hasil Koreksi (Sesudah)",
        type: "line",
        data: corrSeries,
        showSymbol: correctedResults.length < 50,
        lineStyle: {
          color: "#10B981",
          width: 2.5,
        },
        itemStyle: {
          color: "#10B981",
        },
        areaStyle: {
          color: "rgba(16, 185, 129, 0.08)",
        },
      },
    ];

    if (showReferenceGuide && refSeries.length > 0) {
      seriesList.push({
        name: `Acuan Baseline (${activeRefLabel})`,
        type: "line",
        data: refSeries,
        showSymbol: false,
        lineStyle: {
          color: "#06B6D4",
          type: "dashed",
          width: 1.8,
        },
        itemStyle: {
          color: "#06B6D4",
        },
      });
    }

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          crossStyle: { color: isDarkMode ? "#64748B" : "#94A3B8" },
        },
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderColor: isDarkMode ? "#334155" : "#E2E8F0",
        textStyle: { color: isDarkMode ? "#F8FAFC" : "#0F172A", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const p0 = params[0];
          const idx = p0.dataIndex;
          const r = correctedResults[idx];
          if (!r) return "";

          let html = `<div class="p-1 font-sans"><div class="font-bold text-xs mb-1.5">${formatWibShortDateTime(r.timestamp)}</div>`;
          const rawDisplay = r.rawVal !== null ? `${r.rawVal} ${selectedVar.unit}` : "null";
          const corrDisplay = r.correctedVal !== null ? `${r.correctedVal} ${selectedVar.unit}` : "-";
          const diffDisplay =
            r.diff !== null
              ? `${r.diff >= 0 ? "+" : ""}${r.diff} ${selectedVar.unit}`
              : "-";

          html += `<div class="text-[11px] flex justify-between gap-4"><span style="color:#EF4444">Mentah:</span> <strong>${rawDisplay}</strong></div>`;
          html += `<div class="text-[11px] flex justify-between gap-4"><span style="color:#10B981">Terkoreksi:</span> <strong>${corrDisplay}</strong></div>`;
          if (r.isModified) {
            html += `<div class="text-[11px] flex justify-between gap-4 text-emerald-600 font-bold"><span>Selisih (Δ):</span> <span>${diffDisplay}</span></div>`;
          }

          if (r.recoveredRhVal != null && r.isRhModified) {
            html += `<div class="mt-1 pt-1 border-t text-[11px] flex justify-between gap-4 text-blue-500 font-semibold"><span>Pemulihan RH:</span> <span>${r.rawRhVal ?? "-"}% → <strong>${r.recoveredRhVal}%</strong> (${r.diffRh && r.diffRh >= 0 ? "+" : ""}${r.diffRh}%)</span></div>`;
          }

          if (showReferenceGuide && refSeries[idx] !== null) {
            html += `<div class="text-[11px] flex justify-between gap-4 text-cyan-600"><span>${activeRefLabel}:</span> <span>${refSeries[idx]} ${selectedVar.unit}</span></div>`;
          }

          html += `</div>`;
          return html;
        },
      },
      legend: {
        data: seriesList.map((s) => s.name),
        textStyle: { color: isDarkMode ? "#94A3B8" : "#475569", fontSize: 11 },
        top: 0,
        right: 10,
      },
      grid: {
        left: 45,
        right: 20,
        top: 35,
        bottom: 30,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: timeLabels,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#CBD5E1" } },
        axisLabel: {
          color: isDarkMode ? "#94A3B8" : "#64748B",
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        name: `${selectedVar.label} (${selectedVar.unit})`,
        nameTextStyle: {
          color: isDarkMode ? "#94A3B8" : "#64748B",
          fontSize: 11,
          align: "left",
        },
        min: yMin,
        max: yMax,
        axisLine: { lineStyle: { color: isDarkMode ? "#334155" : "#CBD5E1" } },
        splitLine: { lineStyle: { color: isDarkMode ? "#1E293B" : "#F1F5F9" } },
        axisLabel: { color: isDarkMode ? "#94A3B8" : "#64748B", fontSize: 10 },
      },
      series: seriesList,
    };
  }, [
    correctedResults,
    showReferenceGuide,
    refSeries,
    selectedVar,
    anomalies,
    activeRefLabel,
    isDarkMode,
  ]);

  // Apply Batch Corrections
  const handleApplyBatchCorrection = async () => {
    if (!loadedContext || isFilterDirty) {
      toast({
        title: "Periode Belum Dimuat",
        description: "Filter stasiun atau tanggal berubah. Klik \"Ambil Data Target\" terlebih dahulu.",
        variant: "destructive",
      });
      setShowConfirmModal(false);
      return;
    }

    if (modifiedItems.length === 0) {
      toast({
        title: "Tidak Ada Perubahan",
        description: "Nilai koreksi identik dengan data asli. Tidak ada titik yang perlu diperbarui.",
      });
      setShowConfirmModal(false);
      return;
    }

    try {
      setIsApplying(true);
      const updates: BatchSensorFieldUpdate[] = [];
      let rhUpdateCount = 0;

      for (const item of modifiedItems) {
        if (item.correctedVal === null) continue;
        updates.push({
          timestampInSeconds: Math.floor(item.timestamp / 1000),
          field: selectedVar.key,
          newValue: item.correctedVal,
        });

        if (
          syncRhRecovery &&
          selectedVar.key === "temperature" &&
          item.recoveredRhVal != null &&
          Number.isFinite(item.recoveredRhVal) &&
          item.isRhModified
        ) {
          updates.push({
            timestampInSeconds: Math.floor(item.timestamp / 1000),
            field: "humidity",
            newValue: item.recoveredRhVal,
          });
          rhUpdateCount++;
        }
      }

      const updatedCount = await batchUpdateSensorFields(sensorId, updates);

      const auditLog: SensorCorrectionAuditLog = {
        timestamp: Date.now(),
        sensorId,
        field: selectedVar.key,
        method: correctionMethod,
        parameters: {
          offsetValue: correctionMethod === "offset" ? offsetValue : undefined,
          driftStart: correctionMethod === "drift" ? driftStart : undefined,
          driftEnd: correctionMethod === "drift" ? driftEnd : undefined,
          clampMin: correctionMethod === "clamp" ? clampMin : undefined,
          clampMax: correctionMethod === "clamp" ? clampMax : undefined,
          scaleFactor: correctionMethod === "scale" ? scaleFactor : undefined,
          interpolationSubMethod:
            correctionMethod === "interpolate" ? interpolationSubMethod : undefined,
          referenceModel:
            correctionMethod === "interpolate" ? activeRefLabel : undefined,
          solarRefSource:
            correctionMethod === "interpolate" &&
            (interpolationSubMethod === "solar_cosine_hermite" || interpolationSubMethod === "model_guided")
              ? solarRefSource
              : undefined,
          historyLookbackDays:
            correctionMethod === "interpolate" &&
            (interpolationSubMethod === "solar_cosine_hermite" || interpolationSubMethod === "model_guided")
              ? historyLookbackDays
              : undefined,
          solarThreshold:
            correctionMethod === "interpolate" &&
            (interpolationSubMethod === "solar_cosine_hermite" || enableSolarAnomalyCheck)
              ? solarThreshold
              : undefined,
          syncRhRecovery:
            syncRhRecovery && selectedVar.key === "temperature" ? true : undefined,
          rhRecoveredCount: rhUpdateCount > 0 ? rhUpdateCount : undefined,
        },
        pointCount: updatedCount,
        range: {
          start: Math.floor(loadedContext.startMs / 1000),
          end: Math.floor(loadedContext.endMs / 1000),
          startDateFormatted: `${loadedContext.startDateStr} ${loadedContext.startTimeStr} WIB`,
          endDateFormatted: `${loadedContext.endDateStr} ${loadedContext.endTimeStr} WIB`,
        },
        appliedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss") + " WIB",
        appliedBy: user?.displayName || user?.email || "Admin Operator",
        notes: auditNotes.trim() || undefined,
      };

      await logSensorCorrection(auditLog);
      await invalidateServerSensorCache(sensorId);

      toast({
        title: "Koreksi Berhasil Diterapkan!",
        description:
          rhUpdateCount > 0
            ? `${modifiedItems.length} titik ${selectedVar.label} diperbarui dan ${rhUpdateCount} titik Kelembapan (RH via Magnus) dipulihkan secara simultan di database.`
            : `${updatedCount} titik data untuk ${selectedVar.label} berhasil diperbarui di database.`,
      });

      setShowConfirmModal(false);
      setAuditNotes("");

      if (onCorrectionSuccess) {
        await onCorrectionSuccess();
      }
    } catch (err: any) {
      console.error("Gagal menerapkan batch koreksi:", err);
      toast({
        title: "Gagal Menerapkan Koreksi",
        description: err.message || "Terjadi kesalahan saat menulis ke database.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const stats = useMemo(() => {
    if (correctedResults.length === 0) return null;
    const rawVals = correctedResults
      .map((r) => r.rawVal)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const corrVals = correctedResults
      .map((r) => r.correctedVal)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const count = rawVals.length || 1;
    const modifiedCount = modifiedItems.length;

    const rawMean = rawVals.reduce((a, b) => a + b, 0) / count;
    const corrMean = corrVals.reduce((a, b) => a + b, 0) / (corrVals.length || 1);

    const rawStd = Math.sqrt(
      rawVals.map((x) => Math.pow(x - rawMean, 2)).reduce((a, b) => a + b, 0) / count
    );
    const corrStd = Math.sqrt(
      corrVals.map((x) => Math.pow(x - corrMean, 2)).reduce((a, b) => a + b, 0) / (corrVals.length || 1)
    );

    const rhModifiedItems = modifiedItems.filter(
      (m) => m.isRhModified && m.recoveredRhVal != null && m.rawRhVal != null
    );
    const meanRhRecovery =
      rhModifiedItems.length > 0
        ? rhModifiedItems.reduce((acc, m) => acc + (m.diffRh || 0), 0) / rhModifiedItems.length
        : 0;

    return {
      count,
      modifiedCount,
      modifiedPercent: ((modifiedCount / count) * 100).toFixed(1),
      rawMean: rawMean.toFixed(selectedVar.decimals),
      corrMean: corrMean.toFixed(selectedVar.decimals),
      rawStd: rawStd.toFixed(selectedVar.decimals),
      corrStd: corrStd.toFixed(selectedVar.decimals),
      corrMin: corrVals.length > 0 ? Math.min(...corrVals).toFixed(selectedVar.decimals) : "0",
      corrMax: corrVals.length > 0 ? Math.max(...corrVals).toFixed(selectedVar.decimals) : "0",
      rhModifiedCount: rhModifiedItems.length,
      meanRhRecovery: meanRhRecovery.toFixed(1),
    };
  }, [correctedResults, modifiedItems, selectedVar]);

  return {
    correctionMethod,
    setCorrectionMethod,
    offsetValue,
    setOffsetValue,
    driftStart,
    setDriftStart,
    driftEnd,
    setDriftEnd,
    clampMin,
    setClampMin,
    clampMax,
    setClampMax,
    scaleFactor,
    setScaleFactor,
    onlyAnomalies,
    setOnlyAnomalies,
    enableSolarAnomalyCheck,
    setEnableSolarAnomalyCheck,
    interpolationSubMethod,
    setInterpolationSubMethod,
    solarThreshold,
    setSolarThreshold,
    syncRhRecovery,
    setSyncRhRecovery,
    correctedResults,
    modifiedItems,
    chartOptions,
    stats,
    isApplying,
    showConfirmModal,
    setShowConfirmModal,
    auditNotes,
    setAuditNotes,
    handleApplyBatchCorrection,
  };
}
