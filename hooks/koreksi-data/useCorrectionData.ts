import { useState, useEffect, useMemo, useCallback } from "react";
import { Device, fetchAllDevices } from "@/lib/FetchingDevice";
import { resolveActiveSensorId } from "@/lib/activeSensorStorage";
import {
  SensorDate,
  SensorCorrectionAuditLog,
  fetchSensorCorrectionLogs,
} from "@/lib/FetchingSensorData";
import { fetchSensorDataByDateRange } from "@/lib/apiClient";
import {
  WeatherVarMeta,
  WEATHER_VARIABLES,
  LoadedDataContext,
  parseWibEpochMs,
  shiftWibDateStr,
  getTodayWibDateStr,
  readFiniteField,
} from "@/components/koreksi-data/types";
import {
  buildSelfHistoryDiurnalProfile,
  lookupSelfHistoryProfileAt,
  fitNodeSignatureTransferModel,
  getWibTimeComponents,
} from "@/lib/meteorologicalImputationEngine";
import { getCalibrationDocument } from "@/lib/calibration/calibrationCrud";
import type { ReferenceGuidePoint } from "@/app/api/weather/reference-guide/route";
import { useToast } from "@/hooks/use-toast";

export interface UseCorrectionDataParams {
  userId?: string;
}

export function useCorrectionData({ userId }: UseCorrectionDataParams = {}) {
  const { toast } = useToast();

  // Station State
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorId, setSensorId] = useState<string>("");
  const [selectedStationName, setSelectedStationName] = useState<string>("Stasiun AWS");
  const [activeCalibrationVars, setActiveCalibrationVars] = useState<string[]>([]);

  // Parameter State
  const [selectedVarKey, setSelectedVarKey] = useState<string>("temperature");
  const selectedVar = useMemo(() => {
    return WEATHER_VARIABLES.find((v) => v.key === selectedVarKey) || WEATHER_VARIABLES[0];
  }, [selectedVarKey]);

  // Date Range State (Jakarta UTC+7 deterministik)
  const todayStr = useMemo(() => getTodayWibDateStr(), []);
  const [startDateStr, setStartDateStr] = useState<string>(todayStr);
  const [startTimeStr, setStartTimeStr] = useState<string>("00:00");
  const [endDateStr, setEndDateStr] = useState<string>(todayStr);
  const [endTimeStr, setEndTimeStr] = useState<string>("23:59");
  const [loadedContext, setLoadedContext] = useState<LoadedDataContext | null>(null);

  // Unified Reference State
  const [solarRefSource, setSolarRefSource] = useState<"self_history" | "station_aws" | "model_ecmwf">("self_history");
  const [historyLookbackDays, setHistoryLookbackDays] = useState<1 | 3 | 7>(3);
  const [selfHistoryRecords, setSelfHistoryRecords] = useState<SensorDate[]>([]);
  const [loadingSelfHistory, setLoadingSelfHistory] = useState<boolean>(false);
  const [solarRefStationId, setSolarRefStationId] = useState<string>("");
  const [refStationRecords, setRefStationRecords] = useState<SensorDate[]>([]);
  const [loadingRefStation, setLoadingRefStation] = useState<boolean>(false);

  // Open-Meteo Reference Guide State
  const [showReferenceGuide, setShowReferenceGuide] = useState<boolean>(true);
  const [referenceGuidePoints, setReferenceGuidePoints] = useState<ReferenceGuidePoint[]>([]);
  const [referenceModelName, setReferenceModelName] = useState<string>("ECMWF IFS (9 km Operasional)");
  const [referenceModelType, setReferenceModelType] = useState<"ecmwf_ifs" | "era5">("ecmwf_ifs");
  const [loadingReference, setLoadingReference] = useState<boolean>(false);

  // Data Loading & Operation State
  const [rawRecords, setRawRecords] = useState<SensorDate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<SensorCorrectionAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  const isFilterDirty = useMemo(() => {
    if (!loadedContext) return false;
    return (
      loadedContext.sensorId !== sensorId ||
      loadedContext.startDateStr !== startDateStr ||
      loadedContext.startTimeStr !== startTimeStr ||
      loadedContext.endDateStr !== endDateStr ||
      loadedContext.endTimeStr !== endTimeStr
    );
  }, [loadedContext, sensorId, startDateStr, startTimeStr, endDateStr, endTimeStr]);

  // Continuous lookup helper for reference model values at timestamp ts
  const getModelValAtTimestamp = useCallback(
    (ts: number, varKey: string): number | null => {
      if (referenceGuidePoints.length === 0) return null;

      if (ts <= referenceGuidePoints[0].timestamp) {
        const val = (referenceGuidePoints[0] as any)[varKey];
        return typeof val === "number" && Number.isFinite(val) ? val : null;
      }
      if (ts >= referenceGuidePoints[referenceGuidePoints.length - 1].timestamp) {
        const last = referenceGuidePoints[referenceGuidePoints.length - 1];
        const val = (last as any)[varKey];
        return typeof val === "number" && Number.isFinite(val) ? val : null;
      }

      let low = 0;
      let high = referenceGuidePoints.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (referenceGuidePoints[mid].timestamp < ts) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      const p0 = referenceGuidePoints[Math.max(0, low - 1)];
      const p1 = referenceGuidePoints[Math.min(referenceGuidePoints.length - 1, low)];
      if (!p0 || !p1) return null;

      const v0 = Number((p0 as any)[varKey]);
      const v1 = Number((p1 as any)[varKey]);
      if (!Number.isFinite(v0) || !Number.isFinite(v1)) {
        return Number.isFinite(v0) ? v0 : Number.isFinite(v1) ? v1 : null;
      }

      if (p1.timestamp === p0.timestamp) return v0;
      const ratio = (ts - p0.timestamp) / (p1.timestamp - p0.timestamp);
      return v0 + ratio * (v1 - v0);
    },
    [referenceGuidePoints]
  );

  // Fetch Open-Meteo Reference Guide
  const fetchReferenceGuide = useCallback(
    async (
      targetDevice?: Device,
      sDate = loadedContext?.startDateStr || startDateStr,
      eDate = loadedContext?.endDateStr || endDateStr,
      mType = referenceModelType,
      lookbackDays: number = historyLookbackDays
    ) => {
      const dev = targetDevice || devices.find((d) => (d.authToken || d.id) === sensorId);
      const hasValidCoords =
        dev?.coordinates &&
        Number.isFinite(dev.coordinates.lat) &&
        Number.isFinite(dev.coordinates.lng) &&
        (dev.coordinates.lat !== 0 || dev.coordinates.lng !== 0);
      const lat = hasValidCoords ? dev!.coordinates!.lat : -7.7121;
      const lng = hasValidCoords ? dev!.coordinates!.lng : 109.6892;
      const expandedStartDate = lookbackDays > 0 ? shiftWibDateStr(sDate, -lookbackDays) : sDate;

      setLoadingReference(true);
      try {
        const params = new URLSearchParams({
          latitude: lat.toString(),
          longitude: lng.toString(),
          start_date: expandedStartDate,
          end_date: eDate,
          model: mType,
        });

        const res = await fetch(`/api/weather/reference-guide?${params.toString()}`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          console.warn("Peringatan pengambilan model penuntun Open-Meteo:", errJson);
          return;
        }

        const data = await res.json();
        if (Array.isArray(data.points)) {
          setReferenceGuidePoints(data.points);
          if (data.modelName) setReferenceModelName(data.modelName);
        }
      } catch (err) {
        console.error("Gagal mengambil data penuntun model cuaca:", err);
      } finally {
        setLoadingReference(false);
      }
    },
    [devices, sensorId, loadedContext, startDateStr, endDateStr, referenceModelType, historyLookbackDays]
  );

  // Fetch Self Historical Pattern (H-1..H-N)
  const fetchSelfHistoryData = useCallback(
    async (
      targetId = sensorId,
      targetStartMs = loadedContext?.startMs ?? parseWibEpochMs(startDateStr, startTimeStr, "00"),
      lookbackDays: number = historyLookbackDays
    ) => {
      if (!targetId) {
        setSelfHistoryRecords([]);
        return;
      }
      setLoadingSelfHistory(true);
      try {
        const histStartMs = targetStartMs - lookbackDays * 86400000;
        const histEndMs = targetStartMs - 60000;
        const data = await fetchSensorDataByDateRange(
          targetId,
          histStartMs,
          histEndMs,
          false,
          true,
          "raw"
        );
        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        setSelfHistoryRecords(sorted);
      } catch (err) {
        console.warn("Gagal mengambil riwayat pola node:", err);
        setSelfHistoryRecords([]);
      } finally {
        setLoadingSelfHistory(false);
      }
    },
    [sensorId, loadedContext, startDateStr, startTimeStr, historyLookbackDays]
  );

  // Fetch Co-located AWS Reference Station Data from RTDB
  const fetchRefStationData = useCallback(
    async (
      targetRefId = solarRefStationId,
      sDate = loadedContext?.startDateStr || startDateStr,
      sTime = loadedContext?.startTimeStr || startTimeStr,
      eDate = loadedContext?.endDateStr || endDateStr,
      eTime = loadedContext?.endTimeStr || endTimeStr,
      lookbackDays: number = historyLookbackDays
    ) => {
      if (!targetRefId || targetRefId === sensorId) return;
      setLoadingRefStation(true);
      try {
        const startMs = parseWibEpochMs(sDate, sTime, "00") - lookbackDays * 86400000;
        const endMs = parseWibEpochMs(eDate, eTime, "59");
        const data = await fetchSensorDataByDateRange(
          targetRefId,
          startMs,
          endMs,
          false,
          true,
          "raw"
        );
        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        setRefStationRecords(sorted);
      } catch (err) {
        console.warn("Gagal mengambil data stasiun acuan RTDB:", err);
      } finally {
        setLoadingRefStation(false);
      }
    },
    [solarRefStationId, sensorId, loadedContext, startDateStr, startTimeStr, endDateStr, endTimeStr, historyLookbackDays]
  );

  // Continuous lookup helper for reference AWS station values at timestamp ts
  const getRefStationValAtTimestamp = useCallback(
    (ts: number, varKey: string): number | null => {
      if (refStationRecords.length === 0) return null;

      if (ts <= refStationRecords[0].timestamp) {
        const val = Number((refStationRecords[0] as any)[varKey]);
        return Number.isFinite(val) ? val : null;
      }
      if (ts >= refStationRecords[refStationRecords.length - 1].timestamp) {
        const last = refStationRecords[refStationRecords.length - 1];
        const val = Number((last as any)[varKey]);
        return Number.isFinite(val) ? val : null;
      }

      let low = 0;
      let high = refStationRecords.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (refStationRecords[mid].timestamp < ts) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      const p0 = refStationRecords[Math.max(0, low - 1)];
      const p1 = refStationRecords[Math.min(refStationRecords.length - 1, low)];
      if (!p0 || !p1) return null;

      const v0 = Number((p0 as any)[varKey]);
      const v1 = Number((p1 as any)[varKey]);
      if (!Number.isFinite(v0) || !Number.isFinite(v1)) {
        return Number.isFinite(v0) ? v0 : Number.isFinite(v1) ? v1 : null;
      }

      if (p1.timestamp === p0.timestamp) return v0;
      const ratio = (ts - p0.timestamp) / (p1.timestamp - p0.timestamp);
      return v0 + ratio * (v1 - v0);
    },
    [refStationRecords]
  );

  const selfHistorySelectedProfile = useMemo(
    () => buildSelfHistoryDiurnalProfile(selfHistoryRecords, selectedVar.key),
    [selfHistoryRecords, selectedVar.key]
  );

  const selfHistoryTempProfile = useMemo(
    () =>
      selectedVar.key === "temperature"
        ? selfHistorySelectedProfile
        : buildSelfHistoryDiurnalProfile(selfHistoryRecords, "temperature"),
    [selfHistoryRecords, selectedVar.key, selfHistorySelectedProfile]
  );

  const buildNodeAdapterFor = useCallback(
    (varKey: string, sourceKind: "station_aws" | "model_ecmwf") => {
      const lookupFn =
        sourceKind === "station_aws" ? getRefStationValAtTimestamp : getModelValAtTimestamp;
      if (
        (sourceKind === "station_aws" && refStationRecords.length === 0) ||
        (sourceKind === "model_ecmwf" && referenceGuidePoints.length === 0)
      ) {
        return null;
      }

      const pairs: Array<{ targetVal: number; companionVal: number; timestamp: number }> = [];
      for (const rec of selfHistoryRecords) {
        const tVal = readFiniteField(rec, varKey);
        const rVal = lookupFn(rec.timestamp, varKey);
        if (tVal !== null && rVal !== null && Number.isFinite(rVal)) {
          pairs.push({ targetVal: tVal, companionVal: rVal, timestamp: rec.timestamp });
        }
      }
      for (const rec of rawRecords) {
        const hour = Math.floor(getWibTimeComponents(rec.timestamp).hourFrac);
        if (hour <= 5 || hour >= 20) {
          const tVal = readFiniteField(rec, varKey);
          const rVal = lookupFn(rec.timestamp, varKey);
          if (tVal !== null && rVal !== null && Number.isFinite(rVal)) {
            pairs.push({ targetVal: tVal, companionVal: rVal, timestamp: rec.timestamp });
          }
        }
      }
      return fitNodeSignatureTransferModel(pairs, varKey);
    },
    [
      selfHistoryRecords,
      rawRecords,
      refStationRecords.length,
      referenceGuidePoints.length,
      getRefStationValAtTimestamp,
      getModelValAtTimestamp,
    ]
  );

  const activeNodeAdapter = useMemo(() => {
    if (solarRefSource === "station_aws") return buildNodeAdapterFor(selectedVar.key, "station_aws");
    if (solarRefSource === "model_ecmwf") return buildNodeAdapterFor(selectedVar.key, "model_ecmwf");
    return null;
  }, [solarRefSource, selectedVar.key, buildNodeAdapterFor]);

  const activeTempNodeAdapter = useMemo(() => {
    if (selectedVar.key === "temperature") return activeNodeAdapter;
    if (solarRefSource === "station_aws") return buildNodeAdapterFor("temperature", "station_aws");
    if (solarRefSource === "model_ecmwf") return buildNodeAdapterFor("temperature", "model_ecmwf");
    return null;
  }, [selectedVar.key, activeNodeAdapter, solarRefSource, buildNodeAdapterFor]);

  // Unified Reference Value Lookup
  const getUnifiedRefValAtTimestamp = useCallback(
    (ts: number, varKey: string): number | null => {
      if (solarRefSource === "self_history") {
        const profile =
          varKey === selectedVar.key
            ? selfHistorySelectedProfile
            : varKey === "temperature"
              ? selfHistoryTempProfile
              : null;
        const selfVal = lookupSelfHistoryProfileAt(profile, ts);
        if (selfVal !== null) return selfVal;
        if (refStationRecords.length > 0) {
          const awsVal = getRefStationValAtTimestamp(ts, varKey);
          if (awsVal !== null) return awsVal;
        }
        return getModelValAtTimestamp(ts, varKey);
      }

      if (solarRefSource === "station_aws" && refStationRecords.length > 0) {
        const awsVal = getRefStationValAtTimestamp(ts, varKey);
        if (awsVal !== null) {
          const adapter =
            varKey === selectedVar.key
              ? activeNodeAdapter
              : varKey === "temperature"
                ? activeTempNodeAdapter
                : null;
          return adapter ? adapter.predict(awsVal, ts) : awsVal;
        }
      }

      const modelVal = getModelValAtTimestamp(ts, varKey);
      if (modelVal !== null) {
        const adapter =
          varKey === selectedVar.key
            ? activeNodeAdapter
            : varKey === "temperature"
              ? activeTempNodeAdapter
              : null;
        return adapter ? adapter.predict(modelVal, ts) : modelVal;
      }
      return null;
    },
    [
      solarRefSource,
      selectedVar.key,
      selfHistorySelectedProfile,
      selfHistoryTempProfile,
      refStationRecords.length,
      getRefStationValAtTimestamp,
      getModelValAtTimestamp,
      activeNodeAdapter,
      activeTempNodeAdapter,
    ]
  );

  // Baseline Night Offset
  const baselineNightOffset = useMemo(() => {
    if (rawRecords.length === 0) return 0;
    const nightDiffs: number[] = [];

    for (const rec of rawRecords) {
      const hour = Math.floor(getWibTimeComponents(rec.timestamp).hourFrac);
      if (hour <= 5 || hour >= 20) {
        const tVal = readFiniteField(rec, "temperature");
        const rVal = getUnifiedRefValAtTimestamp(rec.timestamp, "temperature");
        if (
          tVal !== null &&
          tVal >= 15.0 &&
          tVal <= 45.0 &&
          rVal !== null &&
          Number.isFinite(rVal)
        ) {
          nightDiffs.push(tVal - rVal);
        }
      }
    }

    if (nightDiffs.length === 0) return 0;
    nightDiffs.sort((a, b) => a - b);
    const mid = Math.floor(nightDiffs.length / 2);
    return nightDiffs.length % 2 !== 0 ? nightDiffs[mid] : (nightDiffs[mid - 1] + nightDiffs[mid]) / 2;
  }, [rawRecords, getUnifiedRefValAtTimestamp]);

  // Load Devices on mount
  useEffect(() => {
    async function loadDevices() {
      try {
        const fetched = await fetchAllDevices(userId || "");
        setDevices(fetched);
        const options = fetched
          .filter((d) => d.authToken || d.id)
          .map((d) => ({
            label: `${d.name} (${d.location})`,
            value: (d.authToken || d.id) as string,
          }));

        if (options.length > 0) {
          const resolved = resolveActiveSensorId(options);
          setSensorId(resolved);
          const matched = fetched.find((d) => (d.authToken || d.id) === resolved);
          if (matched) setSelectedStationName(`${matched.name} (${matched.location})`);

          let autoRef = "";
          if (resolved === "id-05") {
            const has03 = fetched.some((d) => (d.authToken || d.id) === "id-03");
            if (has03) autoRef = "id-03";
          }
          if (!autoRef) {
            const other = fetched.find((d) => (d.authToken || d.id) !== resolved);
            if (other) autoRef = (other.authToken || other.id) as string;
          }
          if (autoRef) setSolarRefStationId(autoRef);
        }
      } catch (err) {
        console.error("Gagal memuat perangkat:", err);
      }
    }
    loadDevices();
  }, [userId]);

  // Load audit trail
  const loadAuditTrail = useCallback(
    async (sid?: string) => {
      const targetId = sid || sensorId;
      if (!targetId) return;
      try {
        setLoadingAudit(true);
        const logs = await fetchSensorCorrectionLogs(targetId, 20);
        setAuditLogs(logs);
      } catch (e) {
        console.warn("Gagal memuat histori audit:", e);
      } finally {
        setLoadingAudit(false);
      }
    },
    [sensorId]
  );

  // Check calibration status
  const loadCalibrationStatus = useCallback(async (sid: string) => {
    if (!sid) {
      setActiveCalibrationVars([]);
      return;
    }
    try {
      const calDoc = await getCalibrationDocument(sid);
      if (!calDoc || !calDoc.variables) {
        setActiveCalibrationVars([]);
        return;
      }
      const activeKeys = Object.entries(calDoc.variables)
        .filter(([, cfg]) => cfg && cfg.enabled && cfg.method !== "none")
        .map(([varKey]) => varKey);
      setActiveCalibrationVars(activeKeys);
    } catch {
      setActiveCalibrationVars([]);
    }
  }, []);

  // Fetch data for target range
  const fetchDataForRange = useCallback(
    async (
      sDate = startDateStr,
      sTime = startTimeStr,
      eDate = endDateStr,
      eTime = endTimeStr
    ) => {
      if (!sensorId) {
        toast({
          title: "Pilih Sensor",
          description: "Harap pilih stasiun sensor terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        const startMs = parseWibEpochMs(sDate, sTime, "00");
        const endMs = parseWibEpochMs(eDate, eTime, "59");

        if (startMs >= endMs) {
          toast({
            title: "Rentang Waktu Salah",
            description: "Waktu mulai harus lebih awal daripada waktu selesai.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const data = await fetchSensorDataByDateRange(
          sensorId,
          startMs,
          endMs,
          false,
          true,
          "raw"
        );

        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        setRawRecords(sorted);
        setLoadedContext({
          sensorId,
          startDateStr: sDate,
          startTimeStr: sTime,
          endDateStr: eDate,
          endTimeStr: eTime,
          startMs,
          endMs,
        });

        fetchSelfHistoryData(sensorId, startMs, historyLookbackDays);
        fetchReferenceGuide(undefined, sDate, eDate, referenceModelType, historyLookbackDays);
        const effectiveRefId =
          solarRefStationId && solarRefStationId !== sensorId ? solarRefStationId : "";
        if (effectiveRefId) {
          fetchRefStationData(effectiveRefId, sDate, sTime, eDate, eTime, historyLookbackDays);
        } else {
          setRefStationRecords([]);
        }

        if (sorted.length === 0) {
          toast({
            title: "Data Kosong",
            description: `Tidak ditemukan data sensor pada rentang ${sDate} s/d ${eDate}.`,
          });
        } else {
          toast({
            title: "Data Berhasil Dimuat",
            description: `Berhasil mengambil ${sorted.length} titik observasi raw (${sDate}).`,
          });
        }
      } catch (err: any) {
        console.error("Gagal mengambil data observasi:", err);
        toast({
          title: "Gagal Mengambil Data",
          description: err.message || "Terjadi kesalahan saat menghubungi server.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      sensorId,
      startDateStr,
      startTimeStr,
      endDateStr,
      endTimeStr,
      toast,
      historyLookbackDays,
      fetchSelfHistoryData,
      fetchReferenceGuide,
      referenceModelType,
      solarRefStationId,
      fetchRefStationData,
    ]
  );

  const handleFetchData = useCallback(() => {
    return fetchDataForRange(startDateStr, startTimeStr, endDateStr, endTimeStr);
  }, [fetchDataForRange, startDateStr, startTimeStr, endDateStr, endTimeStr]);

  // Steppers
  const handlePrevDay = useCallback(() => {
    try {
      const newDateStr = shiftWibDateStr(startDateStr, -1);
      setStartDateStr(newDateStr);
      setEndDateStr(newDateStr);
      setStartTimeStr("00:00");
      setEndTimeStr("23:59");
      fetchDataForRange(newDateStr, "00:00", newDateStr, "23:59");
    } catch (e) {
      console.error("Gagal geser hari sebelumnya:", e);
    }
  }, [startDateStr, fetchDataForRange]);

  const handleNextDay = useCallback(() => {
    try {
      const nextDateStr = shiftWibDateStr(endDateStr, 1);
      const todayWib = getTodayWibDateStr();
      if (nextDateStr > todayWib) {
        toast({
          title: "Batas Waktu Maksimal",
          description: "Tidak dapat bergeser ke hari yang akan datang (masa depan).",
        });
        return;
      }
      setStartDateStr(nextDateStr);
      setEndDateStr(nextDateStr);
      setStartTimeStr("00:00");
      setEndTimeStr("23:59");
      fetchDataForRange(nextDateStr, "00:00", nextDateStr, "23:59");
    } catch (e) {
      console.error("Gagal geser hari sesudahnya:", e);
    }
  }, [endDateStr, fetchDataForRange, toast]);

  const handleToday = useCallback(() => {
    const newDateStr = getTodayWibDateStr();
    setStartDateStr(newDateStr);
    setEndDateStr(newDateStr);
    setStartTimeStr("00:00");
    setEndTimeStr("23:59");
    fetchDataForRange(newDateStr, "00:00", newDateStr, "23:59");
  }, [fetchDataForRange]);

  const isNextDayDisabled = useMemo(() => {
    try {
      return endDateStr >= getTodayWibDateStr();
    } catch {
      return false;
    }
  }, [endDateStr]);

  const handleApplyPreset = (preset: "today" | "yesterday" | "last3days" | "last7days") => {
    const todayWib = getTodayWibDateStr();
    let sDate = todayWib;
    let eDate = todayWib;

    if (preset === "today") {
      sDate = todayWib;
      eDate = todayWib;
    } else if (preset === "yesterday") {
      const yest = shiftWibDateStr(todayWib, -1);
      sDate = yest;
      eDate = yest;
    } else if (preset === "last3days") {
      sDate = shiftWibDateStr(todayWib, -2);
      eDate = todayWib;
    } else if (preset === "last7days") {
      sDate = shiftWibDateStr(todayWib, -6);
      eDate = todayWib;
    }

    setStartDateStr(sDate);
    setStartTimeStr("00:00");
    setEndDateStr(eDate);
    setEndTimeStr("23:59");

    fetchDataForRange(sDate, "00:00", eDate, "23:59");
  };

  const handleChangeHistoryLookback = useCallback(
    (nextDays: 1 | 3 | 7) => {
      setHistoryLookbackDays(nextDays);
      const targetId = loadedContext?.sensorId || sensorId;
      const sDate = loadedContext?.startDateStr || startDateStr;
      const sTime = loadedContext?.startTimeStr || startTimeStr;
      const eDate = loadedContext?.endDateStr || endDateStr;
      const eTime = loadedContext?.endTimeStr || endTimeStr;
      const baseStartMs = loadedContext?.startMs ?? parseWibEpochMs(sDate, sTime, "00");

      if (targetId) {
        fetchSelfHistoryData(targetId, baseStartMs, nextDays);
      }
      fetchReferenceGuide(undefined, sDate, eDate, referenceModelType, nextDays);
      const effectiveRefId =
        solarRefStationId && solarRefStationId !== targetId ? solarRefStationId : "";
      if (effectiveRefId) {
        fetchRefStationData(effectiveRefId, sDate, sTime, eDate, eTime, nextDays);
      }
    },
    [
      loadedContext,
      sensorId,
      startDateStr,
      startTimeStr,
      endDateStr,
      endTimeStr,
      fetchSelfHistoryData,
      fetchReferenceGuide,
      referenceModelType,
      solarRefStationId,
      fetchRefStationData,
    ]
  );

  // Auto load when sensorId changes
  useEffect(() => {
    if (sensorId) {
      handleFetchData();
      loadAuditTrail(sensorId);
      loadCalibrationStatus(sensorId);
    }
  }, [sensorId, handleFetchData, loadAuditTrail, loadCalibrationStatus]);

  // Active Reference Label
  const activeRefLabel = useMemo(() => {
    if (solarRefSource === "self_history") {
      return `Pola Node (H-${historyLookbackDays}..H-1)`;
    }
    if (solarRefSource === "station_aws" && solarRefStationId) {
      const match = devices.find((d) => (d.authToken || d.id) === solarRefStationId);
      return match ? `${match.name} (AWS)` : `AWS ${solarRefStationId}`;
    }
    return referenceModelName;
  }, [solarRefSource, historyLookbackDays, solarRefStationId, devices, referenceModelName]);

  // Reference Series for Charts
  const refSeries = useMemo(() => {
    if (!showReferenceGuide) return [];
    return rawRecords.map((r) => {
      const v = getUnifiedRefValAtTimestamp(r.timestamp, selectedVar.key);
      return v != null ? Number(v.toFixed(selectedVar.decimals)) : null;
    });
  }, [showReferenceGuide, rawRecords, selectedVar, getUnifiedRefValAtTimestamp]);

  return {
    devices,
    sensorId,
    setSensorId,
    selectedStationName,
    setSelectedStationName,
    activeCalibrationVars,
    selectedVarKey,
    setSelectedVarKey,
    selectedVar,
    startDateStr,
    setStartDateStr,
    startTimeStr,
    setStartTimeStr,
    endDateStr,
    setEndDateStr,
    endTimeStr,
    setEndTimeStr,
    loadedContext,
    setLoadedContext,
    isFilterDirty,
    solarRefSource,
    setSolarRefSource,
    historyLookbackDays,
    setHistoryLookbackDays,
    handleChangeHistoryLookback,
    selfHistoryRecords,
    loadingSelfHistory,
    solarRefStationId,
    setSolarRefStationId,
    refStationRecords,
    setRefStationRecords,
    loadingRefStation,
    showReferenceGuide,
    setShowReferenceGuide,
    referenceGuidePoints,
    referenceModelName,
    referenceModelType,
    setReferenceModelType,
    loadingReference,
    rawRecords,
    setRawRecords,
    loading,
    auditLogs,
    loadingAudit,
    loadAuditTrail,
    fetchDataForRange,
    handleFetchData,
    handlePrevDay,
    handleNextDay,
    handleToday,
    isNextDayDisabled,
    handleApplyPreset,
    getUnifiedRefValAtTimestamp,
    getModelValAtTimestamp,
    getRefStationValAtTimestamp,
    baselineNightOffset,
    activeNodeAdapter,
    activeRefLabel,
    refSeries,
    fetchRefStationData,
    fetchReferenceGuide,
    fetchSelfHistoryData,
    selfHistorySelectedProfile,
  };
}
