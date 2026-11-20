import { useMemo } from "react";
import { SensorDate } from "@/lib/FetchingSensorData";
import {
  WeatherVarMeta,
  AnomalyFlag,
  CorrectionMethod,
  InterpolationSubMethod,
  readFiniteField,
} from "@/components/koreksi-data/types";
import { getWibTimeComponents } from "@/lib/meteorologicalImputationEngine";

export interface UseAnomalyQCParams {
  rawRecords: SensorDate[];
  selectedVar: WeatherVarMeta;
  enableSolarAnomalyCheck: boolean;
  correctionMethod: CorrectionMethod;
  interpolationSubMethod: InterpolationSubMethod;
  solarThreshold: number;
  getUnifiedRefValAtTimestamp: (ts: number, varKey: string) => number | null;
  baselineNightOffset: number;
  solarRefSource: "self_history" | "station_aws" | "model_ecmwf";
  activeNodeAdapter: any;
}

export function useAnomalyQC({
  rawRecords,
  selectedVar,
  enableSolarAnomalyCheck,
  correctionMethod,
  interpolationSubMethod,
  solarThreshold,
  getUnifiedRefValAtTimestamp,
  baselineNightOffset,
  solarRefSource,
  activeNodeAdapter,
}: UseAnomalyQCParams) {
  // 1. Automatic Anomaly Detection (Spikes, Boundary Violations, Frozen, and Solar Overheating)
  const anomalies = useMemo<AnomalyFlag[]>(() => {
    if (rawRecords.length === 0) return [];
    const flags: AnomalyFlag[] = [];
    const varKey = selectedVar.key;
    const isSolarActive =
      selectedVar.key === "temperature" &&
      (enableSolarAnomalyCheck ||
        (correctionMethod === "interpolate" && interpolationSubMethod === "solar_cosine_hermite"));

    let lastCleanVal: number | null = null;
    let lastCleanTs: number | null = null;
    let lastWasSpike = false;
    let prevSpikeVal = NaN;

    for (let i = 0; i < rawRecords.length; i++) {
      const rec = rawRecords[i];
      const numVal = readFiniteField(rec, varKey);

      if (numVal === null) {
        flags.push({
          index: i,
          timestamp: rec.timestamp,
          value: NaN,
          type: "wmo_boundary",
          reason: "Data hilang / null",
        });
        continue;
      }

      // 1. Cek Batas Fisik WMO
      if (numVal < selectedVar.wmoMin || numVal > selectedVar.wmoMax) {
        flags.push({
          index: i,
          timestamp: rec.timestamp,
          value: numVal,
          type: "wmo_boundary",
          reason: `Melebihi batas WMO [${selectedVar.wmoMin} s/d ${selectedVar.wmoMax} ${selectedVar.unit}]`,
        });
        continue;
      }

      // 2. Deteksi Anomali Radiasi Surya (hanya saat mode solar / toggle eksplisit aktif)
      if (isSolarActive) {
        const refTemp = getUnifiedRefValAtTimestamp(rec.timestamp, "temperature");
        if (refTemp !== null && Number.isFinite(refTemp)) {
          const { hourFrac } = getWibTimeComponents(rec.timestamp);
          if (hourFrac >= 9.0 && hourFrac <= 17.5) {
            const rawExcess = numVal - refTemp;
            const excessT = rawExcess - baselineNightOffset;
            const hasNodeScaleRef =
              solarRefSource === "self_history" || activeNodeAdapter !== null;
            if (excessT >= solarThreshold && (!hasNodeScaleRef || rawExcess > 0)) {
              flags.push({
                index: i,
                timestamp: rec.timestamp,
                value: numVal,
                type: "solar_overheating",
                reason: `Paparan radiasi surya siang: +${excessT.toFixed(2)}°C di atas acuan (${refTemp.toFixed(2)}°C, offset malam: ${baselineNightOffset >= 0 ? "+" : ""}${baselineNightOffset.toFixed(2)}°C)`,
              });
              lastWasSpike = false;
              continue;
            }
          }
        }
      }

      // 3. Deteksi Spike / Lonjakan Mendadak (ternormalisasi Δt & kebal terhadap poin pemulihan i+1)
      if (lastCleanVal !== null && lastCleanTs !== null) {
        const dtMinutes = Math.max(1, (rec.timestamp - lastCleanTs) / 60000);
        const scaledThreshold =
          selectedVar.spikeThreshold * Math.min(6, Math.max(1, Math.sqrt(dtMinutes / 5)));

        // Pengecualian reset counter kumulatif harian Curah Hujan pada 00:00 UTC (07:00 WIB)
        const utcResetBoundary =
          varKey === "rainfall" &&
          numVal < lastCleanVal &&
          numVal >= 0 &&
          (Math.floor(rec.timestamp / 86400000) > Math.floor(lastCleanTs / 86400000) ||
            (new Date(rec.timestamp).getUTCHours() === 0 && numVal <= 5.0));

        if (utcResetBoundary) {
          lastCleanVal = numVal;
          lastCleanTs = rec.timestamp;
          lastWasSpike = false;
        } else {
          const deltaFromClean = Math.abs(numVal - lastCleanVal);
          if (deltaFromClean > scaledThreshold) {
            if (lastWasSpike && Math.abs(numVal - prevSpikeVal) <= scaledThreshold * 0.5) {
              lastCleanVal = numVal;
              lastCleanTs = rec.timestamp;
              lastWasSpike = false;
            } else {
              flags.push({
                index: i,
                timestamp: rec.timestamp,
                value: numVal,
                type: "spike_jump",
                reason: `Lonjakan Δ=${deltaFromClean.toFixed(2)} ${selectedVar.unit} dalam ${dtMinutes.toFixed(0)} mnt (ambang: ${scaledThreshold.toFixed(1)})`,
              });
              lastWasSpike = true;
              prevSpikeVal = numVal;
              continue;
            }
          } else {
            lastWasSpike = false;
          }
        }
      }

      lastCleanVal = numVal;
      lastCleanTs = rec.timestamp;

      // 4. Deteksi Flatline (kecualikan lux=0 malam, windSpeed=0 tenang, dan curah hujan)
      const isNaturalZero =
        (varKey === "lux" && numVal === 0) || (varKey === "windSpeed" && numVal === 0);
      if (i >= 12 && varKey !== "rainfall" && varKey !== "rainrate" && !isNaturalZero) {
        let isFlat = true;
        for (let k = 1; k <= 12; k++) {
          if (readFiniteField(rawRecords[i - k], varKey) !== numVal) {
            isFlat = false;
            break;
          }
        }
        if (isFlat) {
          flags.push({
            index: i,
            timestamp: rec.timestamp,
            value: numVal,
            type: "flatline",
            reason: "Sensor konstan/macet (flatline 12+ langkah)",
          });
        }
      }
    }

    return flags;
  }, [
    rawRecords,
    selectedVar,
    getUnifiedRefValAtTimestamp,
    baselineNightOffset,
    solarRefSource,
    activeNodeAdapter,
    correctionMethod,
    interpolationSubMethod,
    solarThreshold,
    enableSolarAnomalyCheck,
  ]);

  const anomalyIndexSet = useMemo(() => new Set(anomalies.map((a) => a.index)), [anomalies]);

  // 2. Expanded anomaly set for solar overheating (shoulder buffer relaxation - AGENTS.md Rule 9)
  const effectiveAnomalyIndexSet = useMemo(() => {
    const set = new Set(anomalies.map((a) => a.index));
    if (selectedVar.key !== "temperature" || rawRecords.length === 0) return set;

    const solarIndices = anomalies
      .filter((a) => a.type === "solar_overheating")
      .map((a) => a.index);
    if (solarIndices.length === 0) return set;

    const shoulderRelaxationThreshold = 0.25;
    for (const sIdx of solarIndices) {
      // Walk backward along rising heating flank
      let left = sIdx - 1;
      while (left >= 0 && !set.has(left)) {
        const rec = rawRecords[left];
        const { hourFrac } = getWibTimeComponents(rec.timestamp);
        if (hourFrac < 8.5 || hourFrac > 17.5) break;
        const val = readFiniteField(rec, "temperature");
        const ref = getUnifiedRefValAtTimestamp(rec.timestamp, "temperature");
        if (val === null || ref === null) break;
        const excess = val - ref - baselineNightOffset;
        if (excess > shoulderRelaxationThreshold) {
          set.add(left);
          left--;
        } else {
          break;
        }
      }

      // Walk forward along falling cooling flank
      let right = sIdx + 1;
      while (right < rawRecords.length && !set.has(right)) {
        const rec = rawRecords[right];
        const { hourFrac } = getWibTimeComponents(rec.timestamp);
        if (hourFrac < 8.5 || hourFrac > 17.5) break;
        const val = readFiniteField(rec, "temperature");
        const ref = getUnifiedRefValAtTimestamp(rec.timestamp, "temperature");
        if (val === null || ref === null) break;
        const excess = val - ref - baselineNightOffset;
        if (excess > shoulderRelaxationThreshold) {
          set.add(right);
          right++;
        } else {
          break;
        }
      }
    }

    return set;
  }, [anomalies, selectedVar.key, rawRecords, getUnifiedRefValAtTimestamp, baselineNightOffset]);

  // Summary counts
  const anomalyCounts = useMemo(() => {
    let wmo_boundary = 0;
    let spike_jump = 0;
    let flatline = 0;
    let solar_overheating = 0;

    for (const a of anomalies) {
      if (a.type === "wmo_boundary") wmo_boundary++;
      else if (a.type === "spike_jump") spike_jump++;
      else if (a.type === "flatline") flatline++;
      else if (a.type === "solar_overheating") solar_overheating++;
    }

    return {
      wmo_boundary,
      spike_jump,
      flatline,
      solar_overheating,
      total: anomalies.length,
    };
  }, [anomalies]);

  return {
    anomalies,
    anomalyIndexSet,
    effectiveAnomalyIndexSet,
    anomalyCounts,
  };
}
