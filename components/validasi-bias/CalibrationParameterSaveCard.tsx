// components/validasi-bias/CalibrationParameterSaveCard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Check, Sliders, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MeteorologicalVariable,
  CorrectionMethod,
} from "@/lib/bias-correction/types";
import {
  getCalibrationDocument,
  saveCalibrationDocument,
} from "@/lib/calibration/calibrationCrud";
import {
  StationCalibrationDocument,
  SensorVariableCalibration,
  DEFAULT_VARIABLE_CALIBRATION,
} from "@/lib/calibration/calibrationTypes";

interface CalibrationParameterSaveCardProps {
  stationId: string;
  stationName: string;
  variable: MeteorologicalVariable;
  method: CorrectionMethod;
  unit: string;
  fitParameters: Record<string, any>;
  sampleCount: number;
}

const VARIABLE_TO_SENSOR_KEY: Record<MeteorologicalVariable, string> = {
  air_temperature: "temperature",
  relative_humidity: "humidity",
  dew_point_temperature: "dew",
  surface_pressure: "pressure",
  wind_speed: "windSpeed",
  wind_direction: "windDirection",
  precipitation: "rainfall",
};

export const CalibrationParameterSaveCard: React.FC<CalibrationParameterSaveCardProps> = ({
  stationId,
  stationName,
  variable,
  method,
  unit,
  fitParameters,
  sampleCount,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<StationCalibrationDocument | null>(null);

  const sensorKey = VARIABLE_TO_SENSOR_KEY[variable] || "temperature";

  // Load existing calibration document on stationId change
  useEffect(() => {
    if (stationId) {
      getCalibrationDocument(stationId)
        .then(doc => setCurrentConfig(doc))
        .catch(err => console.error("Error loading calibration:", err));
    }
  }, [stationId]);

  // Translate bias correction fit parameters to sensor calibration format
  const derivedCalibration = React.useMemo<{
    method: "offset" | "scale_offset" | "multiplier" | "percentage" | "polynomial" | "robust_linear" | "power_law" | "two_point" | "none";
    offset?: number;
    scale?: number;
    multiplier?: number;
    polyA?: number;
    polyB?: number;
    polyC?: number;
    powerA?: number;
    powerB?: number;
    point1Raw?: number;
    point1Ref?: number;
    point2Raw?: number;
    point2Ref?: number;
    description: string;
  }>(() => {
    const params = fitParameters || {};

    if (method === "mean_bias") {
      const bias = params.bias ?? 0;
      return {
        method: "offset",
        offset: Number(bias.toFixed(3)),
        description: `Offset penyesuaian bias: ${bias >= 0 ? "+" : ""}${bias.toFixed(2)} ${unit}`,
      };
    } else if (method === "diurnal_mbe") {
      const mbe = params.overallMBE ?? 0;
      return {
        method: "offset",
        offset: Number(mbe.toFixed(3)),
        description: `Offset rata-rata diurnal (MBE): ${mbe >= 0 ? "+" : ""}${mbe.toFixed(2)} ${unit}`,
      };
    } else if (method === "linear_regression") {
      const slope = params.slope ?? 1;
      const intercept = params.intercept ?? 0;
      return {
        method: "scale_offset",
        scale: Number(Math.max(0.1, slope).toFixed(3)),
        offset: Number(intercept.toFixed(3)),
        description: `Skala & Offset OLS: Skala ${slope.toFixed(3)}×, Offset ${intercept >= 0 ? "+" : ""}${intercept.toFixed(2)} ${unit} (R² = ${params.rSquared ?? 0})`,
      };
    } else if (method === "robust_huber") {
      const slope = params.slope ?? 1;
      const intercept = params.intercept ?? 0;
      return {
        method: "robust_linear",
        scale: Number(slope.toFixed(3)),
        offset: Number(intercept.toFixed(3)),
        description: `Robust Huber: Skala ${slope.toFixed(3)}×, Offset ${intercept >= 0 ? "+" : ""}${intercept.toFixed(2)} ${unit}`,
      };
    } else if (method === "polynomial_regression") {
      const a = params.a ?? 0;
      const b = params.b ?? 1;
      const c = params.c ?? 0;
      return {
        method: "polynomial",
        polyA: Number(a.toFixed(5)),
        polyB: Number(b.toFixed(4)),
        polyC: Number(c.toFixed(3)),
        description: `Polynomial Derajat 2: y = ${a.toFixed(4)}·x² + ${b.toFixed(3)}·x ${c >= 0 ? "+" : "-"} ${Math.abs(c).toFixed(2)}`,
      };
    } else if (method === "power_law") {
      const a = params.a ?? 1;
      const b = params.b ?? 1;
      return {
        method: "power_law",
        powerA: Number(a.toFixed(4)),
        powerB: Number(b.toFixed(4)),
        description: `Power Law: y = ${a.toFixed(3)} · (x ^ ${b.toFixed(3)})`,
      };
    } else if (method === "two_point") {
      return {
        method: "two_point",
        point1Raw: Number((params.x1 ?? 0).toFixed(2)),
        point1Ref: Number((params.y1 ?? 0).toFixed(2)),
        point2Raw: Number((params.x2 ?? 100).toFixed(2)),
        point2Ref: Number((params.y2 ?? 100).toFixed(2)),
        description: `Two-Point: P1(${params.x1}→${params.y1}), P2(${params.x2}→${params.y2})`,
      };
    } else if (method === "zero_aware_rain") {
      return {
        method: "multiplier",
        multiplier: 1.0,
        description: `Zero-Aware Rain: Threshold Presipitasi Wet-Day ${params.wetDayThresholdMm ?? 0.1} mm`,
      };
    } else if (method === "quantile_mapping" || method === "quantile_delta_mapping") {
      const offset = params.lowerOffset ?? params.medianOffset ?? 0;
      return {
        method: "offset",
        offset: Number(offset.toFixed(3)),
        description: `Quantile Mapping Transfer: Median Offset ${offset >= 0 ? "+" : ""}${offset.toFixed(2)} ${unit}`,
      };
    }

    return {
      method: "none",
      description: "Tidak ada parameter kalibrasi yang dipilih.",
    };
  }, [method, fitParameters, unit]);

  const handleSaveToSensorConfig = async () => {
    if (!stationId) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: "ID stasiun tidak ditemukan.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Build complete standard document identical to calibration settings page (11 exact variables)
      const defaultFullDoc: StationCalibrationDocument = {
        stationId,
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
      };

      const baseDoc: StationCalibrationDocument = {
        ...defaultFullDoc,
        ...(currentConfig || {}),
        stationId,
        enabled: true,
      };

      const updatedVarConfig: SensorVariableCalibration = {
        enabled: true,
        method: derivedCalibration.method as any,
      };

      if (derivedCalibration.offset !== undefined) updatedVarConfig.offset = derivedCalibration.offset;
      if (derivedCalibration.scale !== undefined) updatedVarConfig.scale = derivedCalibration.scale;
      if (derivedCalibration.multiplier !== undefined) updatedVarConfig.multiplier = derivedCalibration.multiplier;
      if (derivedCalibration.polyA !== undefined) updatedVarConfig.polyA = derivedCalibration.polyA;
      if (derivedCalibration.polyB !== undefined) updatedVarConfig.polyB = derivedCalibration.polyB;
      if (derivedCalibration.polyC !== undefined) updatedVarConfig.polyC = derivedCalibration.polyC;
      if (derivedCalibration.powerA !== undefined) updatedVarConfig.powerA = derivedCalibration.powerA;
      if (derivedCalibration.powerB !== undefined) updatedVarConfig.powerB = derivedCalibration.powerB;
      if (derivedCalibration.point1Raw !== undefined) updatedVarConfig.point1Raw = derivedCalibration.point1Raw;
      if (derivedCalibration.point1Ref !== undefined) updatedVarConfig.point1Ref = derivedCalibration.point1Ref;
      if (derivedCalibration.point2Raw !== undefined) updatedVarConfig.point2Raw = derivedCalibration.point2Raw;
      if (derivedCalibration.point2Ref !== undefined) updatedVarConfig.point2Ref = derivedCalibration.point2Ref;

      const updatedDoc: StationCalibrationDocument = {
        ...baseDoc,
        [sensorKey]: updatedVarConfig,
      };

      await saveCalibrationDocument(stationId, updatedDoc);
      setCurrentConfig(updatedDoc);
      setIsSaved(true);

      toast({
        title: "Kalibrasi Berhasil Disimpan & Tersinkronisasi! 🎉",
        description: `Konfigurasi lengkap seluruh parameter sensor telah diperbarui untuk stasiun ${stationName}.`,
      });

      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: any) {
      console.error("Error saving calibration document:", err);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: err?.message || "Terjadi kesalahan saat menyimpan ke Firestore.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentVarConfig = currentConfig ? (currentConfig as any)[sensorKey] : null;
  const isCurrentlyCalibrated = currentVarConfig && currentVarConfig.enabled && currentVarConfig.method !== "none";

  return (
    <Card className="border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/20 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/10 shadow-sm">
      <CardHeader className="pb-3 border-b border-indigo-100/60 dark:border-indigo-900/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Penerapan Parameter Kalibrasi ke Sensor IoT
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Simpan rumus bias hasil fitting ini secara otomatis ke konfigurasi sensor stasiun di Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCurrentlyCalibrated ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-xs">
                <Check className="w-3 h-3 mr-1" /> Sensor Terkalibrasi ({currentVarConfig.method})
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 text-xs">
                Sensor Menggunakan Data Mentah
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Target Sensor:</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
              {variable.replace(/_/g, " ")} ({sensorKey})
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Metode Konversi:</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 capitalize">
              {derivedCalibration.method}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Deskripsi Nilai:</span>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
              {derivedCalibration.description}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>
              Parameter disimpan secara persisten di dokumen Firestore:{" "}
              <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">
                stations/{stationId}/calibration/config
              </code>
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleSaveToSensorConfig}
            disabled={isSaving || derivedCalibration.method === "none"}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-8 shadow-sm transition-all"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isSaved ? "Tersimpan di Firestore!" : "Simpan Parameter ke Sensor"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
