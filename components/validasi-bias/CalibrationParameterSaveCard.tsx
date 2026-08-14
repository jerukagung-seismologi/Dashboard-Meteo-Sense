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
    method: "offset" | "scale_offset" | "multiplier" | "percentage" | "none";
    offset?: number;
    scale?: number;
    multiplier?: number;
    description: string;
  }>(() => {
    if (method === "mean_bias") {
      const bias = fitParameters.bias ?? 0;
      return {
        method: "offset",
        offset: Number(bias.toFixed(3)),
        description: `Offset penyesuaian bias: ${bias >= 0 ? "+" : ""}${bias.toFixed(2)} ${unit}`,
      };
    } else if (method === "diurnal_mbe") {
      const mbe = fitParameters.overallMBE ?? 0;
      return {
        method: "offset",
        offset: Number(mbe.toFixed(3)),
        description: `Offset rata-rata diurnal (MBE): ${mbe >= 0 ? "+" : ""}${mbe.toFixed(2)} ${unit}`,
      };
    } else if (method === "linear_regression") {
      const slope = fitParameters.slope ?? 1;
      const intercept = fitParameters.intercept ?? 0;
      return {
        method: "scale_offset",
        scale: Number(Math.max(0.1, slope).toFixed(3)),
        offset: Number(intercept.toFixed(3)),
        description: `Skala & Offset OLS: Skala ${slope.toFixed(3)}×, Offset ${intercept >= 0 ? "+" : ""}${intercept.toFixed(2)} ${unit} (R² = ${fitParameters.rSquared ?? 0})`,
      };
    } else if (method === "zero_aware_rain") {
      const p0 = fitParameters.dryThresholdP0 ?? 0;
      return {
        method: "multiplier",
        multiplier: 1.0,
        description: `Zero-Aware Rain: Threshold Presipitasi Wet-Day ${fitParameters.wetDayThresholdMm ?? 0.1} mm`,
      };
    } else if (method === "quantile_mapping") {
      const offset = fitParameters.lowerOffset ?? 0;
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
      // Build updated calibration document
      const baseDoc: StationCalibrationDocument = currentConfig || {
        stationId,
        enabled: true,
      };

      const updatedVarConfig: SensorVariableCalibration = {
        enabled: true,
        method: derivedCalibration.method as any,
        offset: derivedCalibration.offset,
        scale: derivedCalibration.scale,
        multiplier: derivedCalibration.multiplier,
      };

      const updatedDoc: StationCalibrationDocument = {
        ...baseDoc,
        enabled: true,
        [sensorKey]: updatedVarConfig,
      };

      await saveCalibrationDocument(stationId, updatedDoc);
      setCurrentConfig(updatedDoc);
      setIsSaved(true);

      toast({
        title: "Kalibrasi Berhasil Disimpan! 🎉",
        description: `Parameter kalibrasi (${derivedCalibration.description}) telah aktif untuk stasiun ${stationName}.`,
      });

      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: any) {
      console.error("Error saving calibration document:", err);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: err?.message || "Terjadi kesalahan saat menyimpan ke database.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const existingSetting = (currentConfig as any)?.[sensorKey] as SensorVariableCalibration | undefined;

  return (
    <Card className="border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/40 via-white to-white dark:from-slate-900 dark:to-slate-800 shadow-sm">
      <CardHeader className="pb-3 border-b border-blue-100/60 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-700 dark:text-blue-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Pratinjau & Simpan Nilai Offset / Parameter Kalibrasi
              </CardTitle>
              <p className="text-xs text-slate-500">
                Terapkan hasil fitting bias model ERA5 langsung ke konfigurasi sensor stasiun otomatis.
              </p>
            </div>
          </div>
          <div>
            <Badge variant="outline" className="bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Siap Disinkronkan
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Estimated Offset Parameter */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1">Nilai Offset / Parameter Terestimasi:</span>
            <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
              {derivedCalibration.offset !== undefined && (
                <span>Offset: {derivedCalibration.offset >= 0 ? `+${derivedCalibration.offset}` : derivedCalibration.offset} {unit}</span>
              )}
              {derivedCalibration.scale !== undefined && (
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Scale Factor: {derivedCalibration.scale}×
                </span>
              )}
              {derivedCalibration.offset === undefined && derivedCalibration.scale === undefined && (
                <span>{derivedCalibration.description}</span>
              )}
            </div>
          </div>

          {/* Current Setting in Database */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block mb-1">Setting Kalibrasi Aktif Saat Ini:</span>
            <div className="text-xs font-mono">
              {existingSetting && existingSetting.enabled ? (
                <div>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] mb-1">
                    Aktif: {existingSetting.method}
                  </Badge>
                  <span className="block text-slate-700 dark:text-slate-300">
                    {existingSetting.offset !== undefined ? `Offset: ${existingSetting.offset} ${unit}` : ""}
                    {existingSetting.scale !== undefined ? `Scale: ${existingSetting.scale}×` : ""}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 font-sans italic">Belum ada kalibrasi (Raw 1:1)</span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col justify-center items-start sm:items-end">
            <Button
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 shadow-sm"
              onClick={handleSaveToSensorConfig}
              disabled={isSaving || sampleCount === 0}
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : isSaved ? (
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isSaved ? "Tersimpan ke Stasiun!" : "Simpan ke Kalibrasi Sensor"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
