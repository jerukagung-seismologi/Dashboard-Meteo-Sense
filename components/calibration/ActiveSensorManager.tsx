"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Settings2,
  Save,
  Undo2,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Sparkles,
  Activity,
  LineChart,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  StationCalibrationDocument,
  StationCalibrationDocumentSchema,
  DEFAULT_VARIABLE_CALIBRATION,
} from "@/lib/calibration/calibrationTypes";
import { getCalibrationDocument, saveCalibrationDocument } from "@/lib/calibration/calibrationCrud";
import { CalibrationPreviewChart } from "./CalibrationPreviewChart";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const SENSOR_VARIABLES = [
  { key: "temperature", label: "Air Temperature (Suhu)", unit: "°C" },
  { key: "humidity", label: "Relative Humidity (RH)", unit: "%" },
  { key: "pressure", label: "Atmospheric Pressure", unit: "hPa" },
  { key: "dew", label: "Dew Point (Titik Embun)", unit: "°C" },
  { key: "rainfall", label: "Rainfall (Curah Hujan)", unit: "mm" },
  { key: "rainrate", label: "Rain Rate (Intensitas)", unit: "mm/hr" },
  { key: "windSpeed", label: "Wind Speed (Kecepatan Angin)", unit: "m/s" },
  { key: "windDirection", label: "Wind Direction (Arah Angin)", unit: "°" },
  { key: "soil_temp", label: "Soil Temperature", unit: "°C" },
  { key: "lux", label: "Solar Lux (Radiasi Matahari)", unit: "lx" },
  { key: "volt", label: "Battery Voltage", unit: "V" },
];

export const CALIBRATION_METHODS = [
  { value: "none", label: "None (Tanpa Koreksi)" },
  { value: "offset", label: "Offset (+/- Tambah/Kurang)" },
  { value: "scale", label: "Scale (Pengali Linier)" },
  { value: "scale_offset", label: "Scale + Offset (Regresi Linier OLS)" },
  { value: "robust_linear", label: "Robust Linear (Huber Tahan Outlier)" },
  { value: "polynomial", label: "Polynomial (Derajat 2: a·x² + b·x + c)" },
  { value: "power_law", label: "Power Law (y = a · x^b)" },
  { value: "two_point", label: "Two-Point Interpolation (P1 & P2)" },
  { value: "percentage", label: "Percentage (% Relatif)" },
  { value: "multiplier", label: "Multiplier (Curah Hujan)" },
];

interface ActiveSensorManagerProps {
  selectedStationId: string;
  stationName?: string;
  stationOptions: { label: string; value: string }[];
  onStationChange: (stationId: string) => void;
  pendingApply?: {
    sensorKey: string;
    calibrationData: any;
    sourceMethodName: string;
  } | null;
  onClearPendingApply?: () => void;
}

export const ActiveSensorManager: React.FC<ActiveSensorManagerProps> = ({
  selectedStationId,
  stationName,
  stationOptions,
  onStationChange,
  pendingApply,
  onClearPendingApply,
}) => {
  const { toast } = useToast();
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewVar, setPreviewVar] = useState<string>("temperature");

  const form = useForm<StationCalibrationDocument>({
    resolver: zodResolver(StationCalibrationDocumentSchema),
    defaultValues: {
      stationId: selectedStationId || "",
      enabled: true,
      temperature: { ...DEFAULT_VARIABLE_CALIBRATION },
      humidity: { ...DEFAULT_VARIABLE_CALIBRATION },
      pressure: { ...DEFAULT_VARIABLE_CALIBRATION },
      dew: { ...DEFAULT_VARIABLE_CALIBRATION },
      rainfall: { ...DEFAULT_VARIABLE_CALIBRATION },
      rainrate: { ...DEFAULT_VARIABLE_CALIBRATION },
      windSpeed: { ...DEFAULT_VARIABLE_CALIBRATION },
      windDirection: { ...DEFAULT_VARIABLE_CALIBRATION },
      soil_temp: { ...DEFAULT_VARIABLE_CALIBRATION },
      lux: { ...DEFAULT_VARIABLE_CALIBRATION },
      volt: { ...DEFAULT_VARIABLE_CALIBRATION },
    } as StationCalibrationDocument,
  });

  // Load config when station changes
  useEffect(() => {
    if (!selectedStationId) return;

    const loadConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const data = await getCalibrationDocument(selectedStationId);
        if (data) {
          form.reset({ ...data, stationId: selectedStationId });
        } else {
          // Initialize empty config if not found
          const emptyConfig: any = { stationId: selectedStationId, enabled: true };
          SENSOR_VARIABLES.forEach(v => {
            emptyConfig[v.key] = { ...DEFAULT_VARIABLE_CALIBRATION };
          });
          form.reset(emptyConfig);
        }
      } catch (err) {
        console.error("Gagal membaca konfigurasi kalibrasi:", err);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfig();
  }, [selectedStationId, form]);

  // Handle external 1-Click apply from Tab 2
  useEffect(() => {
    if (pendingApply && pendingApply.sensorKey) {
      const { sensorKey, calibrationData, sourceMethodName } = pendingApply;
      form.setValue(`${sensorKey}.enabled` as any, true);
      form.setValue(`${sensorKey}.method` as any, calibrationData.method);

      if (calibrationData.offset !== undefined) form.setValue(`${sensorKey}.offset` as any, calibrationData.offset);
      if (calibrationData.scale !== undefined) form.setValue(`${sensorKey}.scale` as any, calibrationData.scale);
      if (calibrationData.percentage !== undefined) form.setValue(`${sensorKey}.percentage` as any, calibrationData.percentage);
      if (calibrationData.multiplier !== undefined) form.setValue(`${sensorKey}.multiplier` as any, calibrationData.multiplier);
      if (calibrationData.polyA !== undefined) form.setValue(`${sensorKey}.polyA` as any, calibrationData.polyA);
      if (calibrationData.polyB !== undefined) form.setValue(`${sensorKey}.polyB` as any, calibrationData.polyB);
      if (calibrationData.polyC !== undefined) form.setValue(`${sensorKey}.polyC` as any, calibrationData.polyC);
      if (calibrationData.powerA !== undefined) form.setValue(`${sensorKey}.powerA` as any, calibrationData.powerA);
      if (calibrationData.powerB !== undefined) form.setValue(`${sensorKey}.powerB` as any, calibrationData.powerB);
      if (calibrationData.point1Raw !== undefined) form.setValue(`${sensorKey}.point1Raw` as any, calibrationData.point1Raw);
      if (calibrationData.point1Ref !== undefined) form.setValue(`${sensorKey}.point1Ref` as any, calibrationData.point1Ref);
      if (calibrationData.point2Raw !== undefined) form.setValue(`${sensorKey}.point2Raw` as any, calibrationData.point2Raw);
      if (calibrationData.point2Ref !== undefined) form.setValue(`${sensorKey}.point2Ref` as any, calibrationData.point2Ref);

      setPreviewVar(sensorKey);

      toast({
        title: "Parameter Kalibrasi Disinkronkan",
        description: `Rumus ${sourceMethodName} untuk ${sensorKey} berhasil diterapkan ke form aktif. Silakan tinjau dan simpan.`,
      });

      if (onClearPendingApply) {
        onClearPendingApply();
      }
    }
  }, [pendingApply, form, toast, onClearPendingApply]);

  const onSubmit = async (data: StationCalibrationDocument) => {
    setIsSaving(true);
    try {
      await saveCalibrationDocument(selectedStationId, data);
      toast({
        title: "Konfigurasi Berhasil Disimpan",
        description: `Seluruh parameter kalibrasi sensor untuk stasiun ${stationName || selectedStationId} aktif di Firestore.`,
      });
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan",
        description: err.message || "Terjadi kesalahan saat menyimpan ke Firestore.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const watchGlobalEnabled = form.watch("enabled");
  const currentFormValues = form.watch();

  return (
    <div className="space-y-6">
      {/* Station Selector & Global Status Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <div className="w-full sm:w-[260px]">
              <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Stasiun AWS IoT</Label>
              <Select value={selectedStationId} onValueChange={onStationChange}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Stasiun..." />
                </SelectTrigger>
                <SelectContent>
                  {stationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 mt-4 sm:mt-0">
              <Controller
                name="enabled"
                control={form.control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} id="global-enabled" />
                )}
              />
              <Label htmlFor="global-enabled" className="text-xs font-semibold cursor-pointer">
                Engine Kalibrasi Stasiun:{" "}
                <span className={watchGlobalEnabled ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {watchGlobalEnabled ? "AKTIF" : "NONAKTIF"}
                </span>
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-9"
              onClick={() => {
                const emptyConfig: any = { stationId: selectedStationId, enabled: true };
                SENSOR_VARIABLES.forEach(v => {
                  emptyConfig[v.key] = { ...DEFAULT_VARIABLE_CALIBRATION };
                });
                form.reset(emptyConfig);
                toast({ title: "Form Direset", description: "Parameter dikembalikan ke default tanpa koreksi." });
              }}
            >
              <Undo2 className="w-3.5 h-3.5 mr-1.5" />
              Reset Nilai
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold"
              disabled={isSaving || isLoadingConfig}
              onClick={form.handleSubmit(data => onSubmit(data as StationCalibrationDocument))}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Simpan ke Firestore
            </Button>
          </div>
        </CardContent>
      </Card>

      {!watchGlobalEnabled && (
        <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Engine Kalibrasi Stasiun saat ini <strong>Nonaktif</strong>. Semua data sensor akan ditampilkan mentah tanpa koreksi terlepas dari konfigurasi per variabel di bawah.
          </AlertDescription>
        </Alert>
      )}

      {/* Interactive Response Curve Preview */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Pratinjau Respons Kalibrasi Sensor (Live)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Visualisasi real-time bagaimana nilai mentah ditransformasikan oleh rumus kalibrasi yang sedang Anda atur.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">Uji Variabel:</Label>
            <Select value={previewVar} onValueChange={setPreviewVar}>
              <SelectTrigger className="h-8 text-xs w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSOR_VARIABLES.map(v => (
                  <SelectItem key={v.key} value={v.key} className="text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <CalibrationPreviewChart
            stationId={selectedStationId}
            config={currentFormValues as StationCalibrationDocument}
            previewVariable={previewVar}
          />
        </CardContent>
      </Card>

      {/* Individual Sensor Variables Grid */}
      {isLoadingConfig ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SENSOR_VARIABLES.map(v => {
            const baseName = v.key as keyof StationCalibrationDocument;
            const watchEnabled = form.watch(`${baseName}.enabled` as any);
            const watchMethod = form.watch(`${baseName}.method` as any);

            return (
              <Card
                key={v.key}
                className={`transition-all border ${
                  watchEnabled
                    ? "border-blue-300 dark:border-blue-900/80 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 opacity-80"
                }`}
              >
                <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {v.label}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({v.unit})</span>
                    </div>
                    <Controller
                      name={`${baseName}.enabled` as any}
                      control={form.control}
                      render={({ field }) => (
                        <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500 font-medium">Metode Koreksi</Label>
                    <Controller
                      name={`${baseName}.method` as any}
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          disabled={!watchEnabled}
                          value={typeof field.value === "string" ? field.value : "none"}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CALIBRATION_METHODS.map(m => (
                              <SelectItem key={m.value} value={m.value} className="text-xs">
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Offset (+/-) */}
                  {watchMethod === "offset" && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">Nilai Offset ({v.unit})</Label>
                      <Controller
                        name={`${baseName}.offset` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            disabled={!watchEnabled}
                            type="number"
                            step="0.01"
                            className="h-8 text-xs font-mono"
                            placeholder="0.0"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={typeof field.value === "number" ? field.value : ""}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              field.onChange(isNaN(val) ? undefined : val);
                            }}
                          />
                        )}
                      />
                    </div>
                  )}

                  {/* Scale */}
                  {watchMethod === "scale" && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">Faktor Skala Pengali (Scale)</Label>
                      <Controller
                        name={`${baseName}.scale` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            disabled={!watchEnabled}
                            type="number"
                            step="0.001"
                            className="h-8 text-xs font-mono"
                            placeholder="1.0"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={typeof field.value === "number" ? field.value : ""}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              field.onChange(isNaN(val) ? undefined : val);
                            }}
                          />
                        )}
                      />
                    </div>
                  )}

                  {/* Scale + Offset or Robust Linear */}
                  {(watchMethod === "scale_offset" || watchMethod === "robust_linear") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Slope / Skala (m)</Label>
                        <Controller
                          name={`${baseName}.scale` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Input
                              disabled={!watchEnabled}
                              type="number"
                              step="0.001"
                              className="h-8 text-xs font-mono"
                              placeholder="1.0"
                              name={field.name}
                              onBlur={field.onBlur}
                              ref={field.ref}
                              value={typeof field.value === "number" ? field.value : ""}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                field.onChange(isNaN(val) ? undefined : val);
                              }}
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Intercept (c)</Label>
                        <Controller
                          name={`${baseName}.offset` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Input
                              disabled={!watchEnabled}
                              type="number"
                              step="0.01"
                              className="h-8 text-xs font-mono"
                              placeholder="0.0"
                              name={field.name}
                              onBlur={field.onBlur}
                              ref={field.ref}
                              value={typeof field.value === "number" ? field.value : ""}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                field.onChange(isNaN(val) ? undefined : val);
                              }}
                            />
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Polynomial: a*x^2 + b*x + c */}
                  {watchMethod === "polynomial" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500">Koef a (x²)</Label>
                          <Controller
                            name={`${baseName}.polyA` as any}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                disabled={!watchEnabled}
                                type="number"
                                step="0.0001"
                                className="h-8 text-xs font-mono"
                                placeholder="0.0"
                                name={field.name}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                value={typeof field.value === "number" ? field.value : ""}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500">Koef b (x)</Label>
                          <Controller
                            name={`${baseName}.polyB` as any}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                disabled={!watchEnabled}
                                type="number"
                                step="0.001"
                                className="h-8 text-xs font-mono"
                                placeholder="1.0"
                                name={field.name}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                value={typeof field.value === "number" ? field.value : ""}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500">Koef c (Konst)</Label>
                          <Controller
                            name={`${baseName}.polyC` as any}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                disabled={!watchEnabled}
                                type="number"
                                step="0.01"
                                className="h-8 text-xs font-mono"
                                placeholder="0.0"
                                name={field.name}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                value={typeof field.value === "number" ? field.value : ""}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Power law: y = a * x^b */}
                  {watchMethod === "power_law" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Faktor Skala (a)</Label>
                        <Controller
                          name={`${baseName}.powerA` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Input
                              disabled={!watchEnabled}
                              type="number"
                              step="0.01"
                              className="h-8 text-xs font-mono"
                              placeholder="1.0"
                              name={field.name}
                              onBlur={field.onBlur}
                              ref={field.ref}
                              value={typeof field.value === "number" ? field.value : ""}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                field.onChange(isNaN(val) ? undefined : val);
                              }}
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Eksponen (b)</Label>
                        <Controller
                          name={`${baseName}.powerB` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Input
                              disabled={!watchEnabled}
                              type="number"
                              step="0.01"
                              className="h-8 text-xs font-mono"
                              placeholder="1.0"
                              name={field.name}
                              onBlur={field.onBlur}
                              ref={field.ref}
                              value={typeof field.value === "number" ? field.value : ""}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                field.onChange(isNaN(val) ? undefined : val);
                              }}
                            />
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Two-point calibration */}
                  {watchMethod === "two_point" && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-slate-500">Titik 1 Mentah</Label>
                          <Controller
                            name={`${baseName}.point1Raw` as any}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                disabled={!watchEnabled}
                                type="number"
                                step="0.01"
                                className="h-7 text-xs font-mono"
                                placeholder="Raw 1"
                                name={field.name}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                value={typeof field.value === "number" ? field.value : ""}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            )}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500">Titik 1 Acuan</Label>
                          <Controller
                            name={`${baseName}.point1Ref` as any}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                disabled={!watchEnabled}
                                type="number"
                                step="0.01"
                                className="h-7 text-xs font-mono"
                                placeholder="Ref 1"
                                name={field.name}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                value={typeof field.value === "number" ? field.value : ""}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            )}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-slate-500">Titik 2 Mentah</Label>
                          <Controller
                            name={`${baseName}.point2Raw` as any}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                disabled={!watchEnabled}
                                type="number"
                                step="0.01"
                                className="h-7 text-xs font-mono"
                                placeholder="Raw 2"
                                name={field.name}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                value={typeof field.value === "number" ? field.value : ""}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            )}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500">Titik 2 Acuan</Label>
                          <Controller
                            name={`${baseName}.point2Ref` as any}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                disabled={!watchEnabled}
                                type="number"
                                step="0.01"
                                className="h-7 text-xs font-mono"
                                placeholder="Ref 2"
                                name={field.name}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                value={typeof field.value === "number" ? field.value : ""}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Percentage */}
                  {watchMethod === "percentage" && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">Persentase Perubahan (%)</Label>
                      <Controller
                        name={`${baseName}.percentage` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            disabled={!watchEnabled}
                            type="number"
                            step="0.1"
                            className="h-8 text-xs font-mono"
                            placeholder="0.0"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={typeof field.value === "number" ? field.value : ""}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              field.onChange(isNaN(val) ? undefined : val);
                            }}
                          />
                        )}
                      />
                    </div>
                  )}

                  {/* Multiplier */}
                  {watchMethod === "multiplier" && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">Pengali Curah Hujan (Multiplier)</Label>
                      <Controller
                        name={`${baseName}.multiplier` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            disabled={!watchEnabled}
                            type="number"
                            step="0.01"
                            className="h-8 text-xs font-mono"
                            placeholder="1.0"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={typeof field.value === "number" ? field.value : ""}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              field.onChange(isNaN(val) ? undefined : val);
                            }}
                          />
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
