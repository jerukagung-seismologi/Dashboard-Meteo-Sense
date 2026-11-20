"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  Wrench,
  History,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Info,
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeaderBanner } from "@/components/ui/PageHeaderBanner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Domain Types
import {
  WEATHER_VARIABLES,
  WeatherVarMeta,
} from "@/components/koreksi-data/types";

// Custom Hooks
import { useCorrectionData } from "@/hooks/koreksi-data/useCorrectionData";
import { useAnomalyQC } from "@/hooks/koreksi-data/useAnomalyQC";
import { useCorrectionEngine } from "@/hooks/koreksi-data/useCorrectionEngine";
import { useGapImputation } from "@/hooks/koreksi-data/useGapImputation";

// Modular Sub-Components
import { CorrectionToolbar } from "@/components/koreksi-data/CorrectionToolbar";
import { AnomalyAlertBanner } from "@/components/koreksi-data/AnomalyAlertBanner";
import { MethodConfigPanel } from "@/components/koreksi-data/MethodConfigPanel";
import { CorrectionChartPanel } from "@/components/koreksi-data/CorrectionChartPanel";
import { CorrectionPreviewTable } from "@/components/koreksi-data/CorrectionPreviewTable";
import { GapImputationPanel } from "@/components/koreksi-data/GapImputationPanel";
import { CorrectionAuditTab } from "@/components/koreksi-data/CorrectionAuditTab";
import { CorrectionConfirmModal } from "@/components/koreksi-data/CorrectionConfirmModal";
import { ImputationConfirmModal } from "@/components/koreksi-data/ImputationConfirmModal";

export default function KoreksiDataPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const { toast } = useToast();
  const { user } = useAuth();

  // Top-Level Tab State
  const [activeTab, setActiveTab] = useState<"workspace" | "audit">("workspace");
  const [operationMode, setOperationMode] = useState<"point_correction" | "gap_imputation">(
    "point_correction"
  );

  // 1. Data Retrieval & Station Selection Hook
  const data = useCorrectionData();

  // Selected Variable Metadata
  const selectedVar = useMemo<WeatherVarMeta>(() => {
    return (
      WEATHER_VARIABLES.find((v) => v.key === data.selectedVarKey) ||
      WEATHER_VARIABLES[0]
    );
  }, [data.selectedVarKey]);

  // 2. Anomaly QC Hook
  // Temporary state holders for QC configuration needed before correction engine hook is initialized
  const [tempMethod, setTempMethod] = useState<any>("interpolate");
  const [tempSubMethod, setTempSubMethod] = useState<any>("solar_cosine_hermite");
  const [tempSolarThreshold, setTempSolarThreshold] = useState<number>(0.7);
  const [tempEnableSolarAnomalyCheck, setTempEnableSolarAnomalyCheck] = useState<boolean>(false);

  const anomalyQC = useAnomalyQC({
    rawRecords: data.rawRecords,
    selectedVar,
    enableSolarAnomalyCheck: tempEnableSolarAnomalyCheck,
    correctionMethod: tempMethod,
    interpolationSubMethod: tempSubMethod,
    solarThreshold: tempSolarThreshold,
    getUnifiedRefValAtTimestamp: data.getUnifiedRefValAtTimestamp,
    baselineNightOffset: data.baselineNightOffset,
    solarRefSource: data.solarRefSource,
    activeNodeAdapter: data.activeNodeAdapter,
  });

  // 3. Correction Engine Hook (Method parameterization, live preview, batch update mutations)
  const engine = useCorrectionEngine({
    rawRecords: data.rawRecords,
    selectedVar,
    effectiveAnomalyIndexSet: anomalyQC.effectiveAnomalyIndexSet,
    anomalies: anomalyQC.anomalies,
    getUnifiedRefValAtTimestamp: data.getUnifiedRefValAtTimestamp,
    baselineNightOffset: data.baselineNightOffset,
    solarRefSource: data.solarRefSource,
    historyLookbackDays: data.historyLookbackDays,
    activeRefLabel: data.activeRefLabel,
    refSeries: data.refSeries,
    showReferenceGuide: data.showReferenceGuide,
    sensorId: data.sensorId,
    loadedContext: data.loadedContext,
    isFilterDirty: data.isFilterDirty,
    isDarkMode,
    user: user || undefined,
    onCorrectionSuccess: async () => {
      await data.handleFetchData();
      await data.loadAuditTrail(data.sensorId);
    },
  });

  // Sync temp states with engine states
  if (tempMethod !== engine.correctionMethod) setTempMethod(engine.correctionMethod);
  if (tempSubMethod !== engine.interpolationSubMethod)
    setTempSubMethod(engine.interpolationSubMethod);
  if (tempSolarThreshold !== engine.solarThreshold) setTempSolarThreshold(engine.solarThreshold);
  if (tempEnableSolarAnomalyCheck !== engine.enableSolarAnomalyCheck)
    setTempEnableSolarAnomalyCheck(engine.enableSolarAnomalyCheck);

  // 4. Universal Gap Imputation Hook (1440/day continuous grid & synthetic node payloads)
  const imputation = useGapImputation({
    rawRecords: data.rawRecords,
    selectedVar,
    sensorId: data.sensorId,
    loadedContext: data.loadedContext,
    refStationRecords: data.refStationRecords,
    referenceGuidePoints: data.referenceGuidePoints,
    selfHistoryRecords: data.selfHistoryRecords,
    solarRefStationId: data.solarRefStationId,
    isDarkMode,
    user: user || undefined,
    onImputationSuccess: async () => {
      await data.handleFetchData();
      await data.loadAuditTrail(data.sensorId);
    },
  });

  // Handler for Solar Overheating Quick Action Preset
  const handleApplySolarOverheatingPreset = useCallback(() => {
    data.setSelectedVarKey("temperature");
    engine.setCorrectionMethod("interpolate");
    engine.setInterpolationSubMethod("solar_cosine_hermite");
    engine.setOnlyAnomalies(true);
    engine.setEnableSolarAnomalyCheck(true);
    data.setShowReferenceGuide(true);
    engine.setSyncRhRecovery(true);
    engine.setSolarThreshold(0.7);

    // Auto-select companion reference station if available
    let refId = data.solarRefStationId;
    if (!refId || refId === data.sensorId) {
      if (data.sensorId === "id-05") {
        const has03 = data.devices.some((d) => (d.authToken || d.id) === "id-03");
        if (has03) refId = "id-03";
      } else if (data.sensorId === "id-03") {
        const has05 = data.devices.some((d) => (d.authToken || d.id) === "id-05");
        if (has05) refId = "id-05";
      }
    }

    if (refId && refId !== data.solarRefStationId) {
      data.setSolarRefStationId(refId);
      data.fetchRefStationData(refId);
    }

    toast({
      title: "Preset Radiasi Surya Dipasang",
      description:
        "Metode Solar-Cosine Hermite, acuan AWS tetangga, dan pemulihan RH simultan diaktifkan.",
    });
  }, [data, engine, toast]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <PageHeaderBanner
        title="Koreksi & Rekonstruksi Data Sensor"
        subtitle="Pembersihan anomali, eliminasi radiasi surya berlebih, interpolasi cerdas, dan imputasi celah data kontinu 1440 menit/hari berstandar WMO."
        icon={Wrench}
        gradient="indigo"
      />

      {/* 2. Compact Operational Toolbar */}
      <CorrectionToolbar
        devices={data.devices}
        sensorId={data.sensorId}
        setSensorId={data.setSensorId}
        setSelectedStationName={data.setSelectedStationName}
        solarRefStationId={data.solarRefStationId}
        setSolarRefStationId={data.setSolarRefStationId}
        setRefStationRecords={data.setRefStationRecords}
        selectedVarKey={data.selectedVarKey}
        setSelectedVarKey={data.setSelectedVarKey}
        startDateStr={data.startDateStr}
        setStartDateStr={data.setStartDateStr}
        startTimeStr={data.startTimeStr}
        setStartTimeStr={data.setStartTimeStr}
        endDateStr={data.endDateStr}
        setEndDateStr={data.setEndDateStr}
        endTimeStr={data.endTimeStr}
        setEndTimeStr={data.setEndTimeStr}
        loading={data.loading}
        handleFetchData={data.handleFetchData}
        handlePrevDay={data.handlePrevDay}
        handleNextDay={data.handleNextDay}
        handleToday={data.handleToday}
        isNextDayDisabled={data.isNextDayDisabled}
        handleApplyPreset={data.handleApplyPreset}
      />

      {/* Stale Filter Warning Banner */}
      {data.isFilterDirty && data.loadedContext && (
        <Alert className="border-amber-500/60 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-xs font-bold flex flex-wrap items-center justify-between gap-2">
            <span>Filter Stasiun / Rentang Waktu Belum Dimuat Ulang</span>
            <Button
              type="button"
              size="sm"
              onClick={data.handleFetchData}
              disabled={data.loading}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${data.loading ? "animate-spin" : ""}`} />
              Muat Data Target Terbaru
            </Button>
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Menampilkan data <strong className="font-mono">{data.loadedContext.sensorId}</strong> (
            <strong className="font-mono">
              {data.loadedContext.startDateStr} {data.loadedContext.startTimeStr} –{" "}
              {data.loadedContext.endDateStr} {data.loadedContext.endTimeStr} WIB
            </strong>
            ). Muat ulang sebelum menulis ke database.
          </AlertDescription>
        </Alert>
      )}

      {/* Display Calibration Notice */}
      {data.activeCalibrationVars.length > 0 && (
        <Alert className="border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200">
          <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <AlertTitle className="text-xs font-bold">
            Kalibrasi Tampilan Aktif ({data.activeCalibrationVars.join(", ")})
          </AlertTitle>
          <AlertDescription className="text-xs mt-0.5">
            Menampilkan &amp; menyunting nilai <strong>RAW database</strong> langsung.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs Navigation (Workspace vs Audit Trail) */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "workspace" | "audit")}
      >
        <TabsList className="grid grid-cols-2 max-w-xs bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="workspace" className="text-xs flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Area Koreksi
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Riwayat Audit ({data.auditLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: WORKSPACE KOREKSI ================= */}
        <TabsContent value="workspace" className="space-y-6 mt-4">
          {/* Operation Mode Toggle Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Mode Operasi:
              </span>
              <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setOperationMode("point_correction")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    operationMode === "point_correction"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" /> Koreksi Nilai &amp; Anomali
                </button>
                <button
                  type="button"
                  onClick={() => setOperationMode("gap_imputation")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    operationMode === "gap_imputation"
                      ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" /> Imputasi Celah Data (1440/Hari)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {operationMode === "gap_imputation" ? (
                <Badge
                  variant="outline"
                  className="text-xs border-purple-400 text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40"
                >
                  {imputation.imputationResult.summary.originalMissingCount} Menit Celah Terdeteksi (
                  {imputation.imputationResult.summary.segments.length} Segmen)
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs border-indigo-400 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40"
                >
                  {data.rawRecords.length} Titik Observasi Terpilih
                </Badge>
              )}
            </div>
          </div>

          {operationMode === "point_correction" ? (
            <div className="space-y-6">
              {/* Anomaly Detection Banner */}
              <AnomalyAlertBanner
                anomalies={anomalyQC.anomalies}
                selectedVar={selectedVar}
                setCorrectionMethod={engine.setCorrectionMethod}
                setOnlyAnomalies={engine.setOnlyAnomalies}
                setInterpolationSubMethod={engine.setInterpolationSubMethod}
                handleApplySolarOverheatingPreset={handleApplySolarOverheatingPreset}
              />

              {/* Method Configuration Panel */}
              <MethodConfigPanel
                selectedVar={selectedVar}
                correctionMethod={engine.correctionMethod}
                setCorrectionMethod={engine.setCorrectionMethod}
                offsetValue={engine.offsetValue}
                setOffsetValue={engine.setOffsetValue}
                driftStart={engine.driftStart}
                setDriftStart={engine.setDriftStart}
                driftEnd={engine.driftEnd}
                setDriftEnd={engine.setDriftEnd}
                clampMin={engine.clampMin}
                setClampMin={engine.setClampMin}
                clampMax={engine.clampMax}
                setClampMax={engine.setClampMax}
                scaleFactor={engine.scaleFactor}
                setScaleFactor={engine.setScaleFactor}
                onlyAnomalies={engine.onlyAnomalies}
                setOnlyAnomalies={engine.setOnlyAnomalies}
                enableSolarAnomalyCheck={engine.enableSolarAnomalyCheck}
                setEnableSolarAnomalyCheck={engine.setEnableSolarAnomalyCheck}
                anomaliesCount={anomalyQC.anomalies.length}
                interpolationSubMethod={engine.interpolationSubMethod}
                setInterpolationSubMethod={engine.setInterpolationSubMethod}
                solarRefSource={data.solarRefSource}
                setSolarRefSource={data.setSolarRefSource}
                historyLookbackDays={data.historyLookbackDays}
                handleChangeHistoryLookback={data.handleChangeHistoryLookback}
                selfHistoryRecords={data.selfHistoryRecords}
                loadingSelfHistory={data.loadingSelfHistory}
                fetchSelfHistoryData={data.fetchSelfHistoryData}
                selfHistorySelectedProfile={data.selfHistorySelectedProfile}
                solarRefStationId={data.solarRefStationId}
                setSolarRefStationId={data.setSolarRefStationId}
                refStationRecords={data.refStationRecords}
                loadingRefStation={data.loadingRefStation}
                fetchRefStationData={data.fetchRefStationData}
                devices={data.devices}
                sensorId={data.sensorId}
                referenceModelType={data.referenceModelType}
                setReferenceModelType={data.setReferenceModelType}
                referenceModelName={data.referenceModelName}
                referenceGuidePoints={data.referenceGuidePoints}
                loadingReference={data.loadingReference}
                fetchReferenceGuide={data.fetchReferenceGuide}
                solarThreshold={engine.solarThreshold}
                setSolarThreshold={engine.setSolarThreshold}
                syncRhRecovery={engine.syncRhRecovery}
                setSyncRhRecovery={engine.setSyncRhRecovery}
                handleApplySolarOverheatingPreset={handleApplySolarOverheatingPreset}
                activeNodeAdapter={data.activeNodeAdapter}
                baselineNightOffset={data.baselineNightOffset}
              />

              {/* Before vs After Interactive ECharts Visualizer */}
              <CorrectionChartPanel
                chartOptions={engine.chartOptions}
                rawRecords={data.rawRecords}
                selectedVar={selectedVar}
                showReferenceGuide={data.showReferenceGuide}
                setShowReferenceGuide={data.setShowReferenceGuide}
                activeRefLabel={data.activeRefLabel}
                solarRefSource={data.solarRefSource}
                referenceModelType={data.referenceModelType}
                setReferenceModelType={data.setReferenceModelType}
                fetchReferenceGuide={data.fetchReferenceGuide}
                loadedContext={data.loadedContext}
                startDateStr={data.startDateStr}
                endDateStr={data.endDateStr}
                stats={engine.stats}
                syncRhRecovery={engine.syncRhRecovery}
                setShowConfirmModal={engine.setShowConfirmModal}
                modifiedItemsCount={engine.modifiedItems.length}
                isApplying={engine.isApplying}
                isFilterDirty={data.isFilterDirty}
              />

              {/* Paginated Comparison Preview Table */}
              <CorrectionPreviewTable
                correctedResults={engine.correctedResults}
                selectedVar={selectedVar}
                syncRhRecovery={engine.syncRhRecovery}
              />
            </div>
          ) : (
            /* Universal Gap Imputation Workspace */
            <GapImputationPanel
              imputationResult={imputation.imputationResult}
              gapImputeMethod={imputation.gapImputeMethod}
              setGapImputeMethod={imputation.setGapImputeMethod}
              historyLookbackDays={data.historyLookbackDays}
              handleChangeHistoryLookback={data.handleChangeHistoryLookback}
              loadingSelfHistory={data.loadingSelfHistory}
              selfHistoryRecords={data.selfHistoryRecords}
              solarRefStationId={data.solarRefStationId}
              setSolarRefStationId={data.setSolarRefStationId}
              devices={data.devices}
              sensorId={data.sensorId}
              fetchRefStationData={data.fetchRefStationData}
              loadingRefStation={data.loadingRefStation}
              refStationRecords={data.refStationRecords}
              gapMicroLimitMinutes={imputation.gapMicroLimitMinutes}
              setGapMicroLimitMinutes={imputation.setGapMicroLimitMinutes}
              enableGapBridging={imputation.enableGapBridging}
              setEnableGapBridging={imputation.setEnableGapBridging}
              enableGapPhysics={imputation.enableGapPhysics}
              setEnableGapPhysics={imputation.setEnableGapPhysics}
              gapChartOptions={imputation.gapChartOptions}
              isApplyingImputation={imputation.isApplyingImputation}
              isFilterDirty={data.isFilterDirty}
              setShowImputationConfirmModal={imputation.setShowImputationConfirmModal}
              selectedVar={selectedVar}
            />
          )}
        </TabsContent>

        {/* ================= TAB 2: AUDIT TRAIL HISTORI ================= */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <CorrectionAuditTab
            selectedStationName={data.selectedStationName}
            sensorId={data.sensorId}
            loadAuditTrail={data.loadAuditTrail}
            loadingAudit={data.loadingAudit}
            auditLogs={data.auditLogs}
          />
        </TabsContent>
      </Tabs>

      {/* Point Correction Confirmation Modal */}
      <CorrectionConfirmModal
        showConfirmModal={engine.showConfirmModal}
        setShowConfirmModal={engine.setShowConfirmModal}
        selectedStationName={data.selectedStationName}
        selectedVar={selectedVar}
        correctionMethod={engine.correctionMethod}
        interpolationSubMethod={engine.interpolationSubMethod}
        modifiedCount={engine.modifiedItems.length}
        loadedContext={data.loadedContext}
        startDateStr={data.startDateStr}
        startTimeStr={data.startTimeStr}
        endDateStr={data.endDateStr}
        endTimeStr={data.endTimeStr}
        syncRhRecovery={engine.syncRhRecovery}
        rhModifiedCount={engine.stats?.rhModifiedCount || 0}
        auditNotes={engine.auditNotes}
        setAuditNotes={engine.setAuditNotes}
        handleApplyBatchCorrection={engine.handleApplyBatchCorrection}
        isApplying={engine.isApplying}
      />

      {/* Gap Imputation Confirmation Modal */}
      <ImputationConfirmModal
        showImputationConfirmModal={imputation.showImputationConfirmModal}
        setShowImputationConfirmModal={imputation.setShowImputationConfirmModal}
        selectedStationName={data.selectedStationName}
        selectedVar={selectedVar}
        gapImputeMethod={imputation.gapImputeMethod}
        missingCount={imputation.imputationResult.summary.originalMissingCount}
        segmentsCount={imputation.imputationResult.summary.segments.length}
        loadedContext={data.loadedContext}
        startDateStr={data.startDateStr}
        startTimeStr={data.startTimeStr}
        endDateStr={data.endDateStr}
        endTimeStr={data.endTimeStr}
        auditNotes={imputation.imputationAuditNotes}
        setAuditNotes={imputation.setImputationAuditNotes}
        handleApplyGapImputation={imputation.handleApplyImputation}
        isApplyingImputation={imputation.isApplyingImputation}
      />
    </div>
  );
}
