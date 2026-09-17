"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Settings2,
  Save,
  Undo2,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Sparkles,
  Thermometer,
  Droplets,
  Gauge,
  CloudFog,
  CloudRain,
  CloudRainWind,
  Wind,
  Compass,
  ThermometerSun,
  SunMedium,
  BatteryCharging,
  LineChart,
  Search,
  Check,
  Eye,
  Edit3,
  RotateCcw,
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

export interface SensorVariableDefinition {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  category: "core" | "wind_rain" | "agro_power";
  icon: React.ElementType;
}

export const SENSOR_VARIABLES: SensorVariableDefinition[] = [
  { key: "temperature", label: "Air Temperature (Suhu Udara 2m)", shortLabel: "Suhu Udara", unit: "°C", category: "core", icon: Thermometer },
  { key: "humidity", label: "Relative Humidity (Kelembapan RH)", shortLabel: "Kelembapan", unit: "%", category: "core", icon: Droplets },
  { key: "pressure", label: "Atmospheric Pressure (Tekanan Udara)", shortLabel: "Tekanan", unit: "hPa", category: "core", icon: Gauge },
  { key: "dew", label: "Dew Point (Titik Embun)", shortLabel: "Titik Embun", unit: "°C", category: "core", icon: CloudFog },
  { key: "rainfall", label: "Rainfall (Curah Hujan Akumulasi)", shortLabel: "Curah Hujan", unit: "mm", category: "wind_rain", icon: CloudRain },
  { key: "rainrate", label: "Rain Rate (Intensitas Hujan)", shortLabel: "Intensitas Hujan", unit: "mm/hr", category: "wind_rain", icon: CloudRainWind },
  { key: "windSpeed", label: "Wind Speed (Kecepatan Angin)", shortLabel: "Kecepatan Angin", unit: "m/s", category: "wind_rain", icon: Wind },
  { key: "windDirection", label: "Wind Direction (Arah Angin)", shortLabel: "Arah Angin", unit: "°", category: "wind_rain", icon: Compass },
  { key: "soil_temp", label: "Soil Temperature (Suhu Tanah)", shortLabel: "Suhu Tanah", unit: "°C", category: "agro_power", icon: ThermometerSun },
  { key: "lux", label: "Solar Lux (Radiasi Matahari)", shortLabel: "Solar Lux", unit: "lx", category: "agro_power", icon: SunMedium },
  { key: "volt", label: "Battery Voltage (Tegangan Baterai)", shortLabel: "Tegangan Baterai", unit: "V", category: "agro_power", icon: BatteryCharging },
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

export interface StagedItemInfo {
  sensorKey: string;
  variableLabel?: string;
  method: string;
  methodName: string;
  calibrationData: any;
  notes?: string;
  appliedAt?: number;
}

interface ActiveSensorManagerProps {
  selectedStationId: string;
  stationName?: string;
  stationOptions: { label: string; value: string }[];
  onStationChange: (stationId: string) => void;
  stagedCalibrations?: Record<string, StagedItemInfo>;
  onClearStationStaged?: (stationId: string) => void;
  onClearVariableStaged?: (stationId: string, sensorKey: string) => void;
  pendingApply?: {
    sensorKey: string;
    calibrationData: any;
    sourceMethodName: string;
    notes?: string;
  } | null;
  onClearPendingApply?: () => void;
}

export const ActiveSensorManager: React.FC<ActiveSensorManagerProps> = ({
  selectedStationId,
  stationName,
  stationOptions,
  onStationChange,
  stagedCalibrations,
  onClearStationStaged,
  onClearVariableStaged,
  pendingApply,
  onClearPendingApply,
}) => {
  const { toast } = useToast();
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewVar, setPreviewVar] = useState<string>("temperature");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Table Filters & Search
  const [onlyActiveFilter, setOnlyActiveFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Manual Edit Dialog State
  const [editingSensorKey, setEditingSensorKey] = useState<string | null>(null);

  // Dark mode detector
  useEffect(() => {
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
        const baseConfig: any = {
          stationId: selectedStationId,
          enabled: data?.enabled !== undefined ? Boolean(data.enabled) : true,
        };
        SENSOR_VARIABLES.forEach(v => {
          const varVal = data ? (data as any)[v.key] : null;
          baseConfig[v.key] = {
            ...DEFAULT_VARIABLE_CALIBRATION,
            ...(varVal || {}),
            enabled: varVal?.enabled !== undefined ? Boolean(varVal.enabled) : false,
            method: varVal?.method || "none",
          };
        });

        // Deep-merge in-memory staged calibrations so async fetch does not overwrite drafts!
        if (stagedCalibrations) {
          Object.entries(stagedCalibrations).forEach(([sensorKey, item]) => {
            const cal = item.calibrationData;
            if (cal && baseConfig[sensorKey]) {
              baseConfig[sensorKey] = {
                ...baseConfig[sensorKey],
                ...cal,
                enabled: true,
              };
            }
          });
        }

        form.reset(baseConfig);
      } catch (err) {
        console.error("Gagal membaca konfigurasi kalibrasi:", err);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfig();
  }, [selectedStationId, form, stagedCalibrations]);

  // Sync staged calibrations into the form
  useEffect(() => {
    if (!stagedCalibrations) return;
    const entries = Object.entries(stagedCalibrations);
    if (entries.length === 0) return;

    entries.forEach(([sensorKey, item]) => {
      const cal = item.calibrationData;
      if (!cal) return;

      form.setValue(`${sensorKey}.enabled` as any, true, { shouldDirty: true, shouldTouch: true });
      if (cal.method !== undefined) form.setValue(`${sensorKey}.method` as any, cal.method, { shouldDirty: true });
      if (cal.offset !== undefined) form.setValue(`${sensorKey}.offset` as any, cal.offset, { shouldDirty: true });
      if (cal.scale !== undefined) form.setValue(`${sensorKey}.scale` as any, cal.scale, { shouldDirty: true });
      if (cal.percentage !== undefined) form.setValue(`${sensorKey}.percentage` as any, cal.percentage, { shouldDirty: true });
      if (cal.multiplier !== undefined) form.setValue(`${sensorKey}.multiplier` as any, cal.multiplier, { shouldDirty: true });
      if (cal.polyA !== undefined) form.setValue(`${sensorKey}.polyA` as any, cal.polyA, { shouldDirty: true });
      if (cal.polyB !== undefined) form.setValue(`${sensorKey}.polyB` as any, cal.polyB, { shouldDirty: true });
      if (cal.polyC !== undefined) form.setValue(`${sensorKey}.polyC` as any, cal.polyC, { shouldDirty: true });
      if (cal.powerA !== undefined) form.setValue(`${sensorKey}.powerA` as any, cal.powerA, { shouldDirty: true });
      if (cal.powerB !== undefined) form.setValue(`${sensorKey}.powerB` as any, cal.powerB, { shouldDirty: true });
      if (cal.point1Raw !== undefined) form.setValue(`${sensorKey}.point1Raw` as any, cal.point1Raw, { shouldDirty: true });
      if (cal.point1Ref !== undefined) form.setValue(`${sensorKey}.point1Ref` as any, cal.point1Ref, { shouldDirty: true });
      if (cal.point2Raw !== undefined) form.setValue(`${sensorKey}.point2Raw` as any, cal.point2Raw, { shouldDirty: true });
      if (cal.point2Ref !== undefined) form.setValue(`${sensorKey}.point2Ref` as any, cal.point2Ref, { shouldDirty: true });
    });

    if (entries.length > 0 && entries[0][0]) {
      setPreviewVar(entries[0][0]);
    }
  }, [stagedCalibrations, form]);

  // Handle external 1-Click apply legacy from Tab 2
  useEffect(() => {
    if (pendingApply && pendingApply.sensorKey) {
      const { sensorKey, calibrationData, sourceMethodName, notes } = pendingApply;
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
        description: notes || `Rumus ${sourceMethodName} untuk ${sensorKey} berhasil diterapkan ke form aktif. Silakan tinjau dan simpan.`,
      });

      if (onClearPendingApply) {
        onClearPendingApply();
      }
    }
  }, [pendingApply, form, toast, onClearPendingApply]);

  const handleDiscardDraft = async () => {
    if (onClearStationStaged) {
      onClearStationStaged(selectedStationId);
    }
    setIsLoadingConfig(true);
    try {
      const data = await getCalibrationDocument(selectedStationId);
      const baseConfig: any = {
        stationId: selectedStationId,
        enabled: data?.enabled !== undefined ? Boolean(data.enabled) : true,
      };
      SENSOR_VARIABLES.forEach(v => {
        const varVal = data ? (data as any)[v.key] : null;
        baseConfig[v.key] = {
          ...DEFAULT_VARIABLE_CALIBRATION,
          ...(varVal || {}),
          enabled: varVal?.enabled !== undefined ? Boolean(varVal.enabled) : false,
          method: varVal?.method || "none",
        };
      });
      form.reset(baseConfig);
      toast({
        title: "Draft Dibatalkan",
        description: "Form dikembalikan ke konfigurasi resmi yang tersimpan di Firestore.",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const onSubmit = async (data: StationCalibrationDocument) => {
    setIsSaving(true);
    try {
      await saveCalibrationDocument(selectedStationId, data);
      if (onClearStationStaged) {
        onClearStationStaged(selectedStationId);
      }
      toast({
        title: "Konfigurasi Berhasil Disimpan ke Firestore 🎉",
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

  const stagedEntries = stagedCalibrations ? Object.entries(stagedCalibrations) : [];
  const watchGlobalEnabled = form.watch("enabled");
  const currentFormValues = form.watch();

  // Compute stats for counter badges
  const stats = useMemo(() => {
    let activeCount = 0;
    let bypassCount = 0;
    SENSOR_VARIABLES.forEach(v => {
      const isEnabled = (currentFormValues as any)?.[v.key]?.enabled;
      if (isEnabled) activeCount++;
      else bypassCount++;
    });
    return {
      activeCount,
      bypassCount,
      stagedCount: stagedEntries.length,
    };
  }, [currentFormValues, stagedEntries]);

  // Helper to generate formula description
  const getFormulaSummary = (config: any) => {
    if (!config || !config.enabled || config.method === "none") {
      return {
        formula: "y = x",
        desc: "Nilai mentah sensor tanpa penyesuaian (Bypass)",
      };
    }
    switch (config.method) {
      case "offset": {
        const off = typeof config.offset === "number" ? config.offset : 0;
        return {
          formula: `y = x ${off >= 0 ? "+" : "-"} ${Math.abs(off).toFixed(3)}`,
          desc: `Offset aditif ${off >= 0 ? "+" : ""}${off.toFixed(3)}`,
        };
      }
      case "scale": {
        const sc = typeof config.scale === "number" ? config.scale : 1;
        return {
          formula: `y = ${sc.toFixed(3)} · x`,
          desc: `Penskalaan linier ${sc.toFixed(3)}x`,
        };
      }
      case "scale_offset":
      case "robust_linear": {
        const sc = typeof config.scale === "number" ? config.scale : 1;
        const off = typeof config.offset === "number" ? config.offset : 0;
        return {
          formula: `y = ${sc.toFixed(3)} · x ${off >= 0 ? "+" : "-"} ${Math.abs(off).toFixed(3)}`,
          desc: `Slope: ${sc.toFixed(3)}, Intercept: ${off.toFixed(3)}`,
        };
      }
      case "polynomial": {
        const a = typeof config.polyA === "number" ? config.polyA : 0;
        const b = typeof config.polyB === "number" ? config.polyB : 1;
        const c = typeof config.polyC === "number" ? config.polyC : 0;
        return {
          formula: `y = ${a.toFixed(4)}·x² ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(3)}·x ${c >= 0 ? "+" : "-"} ${Math.abs(c).toFixed(3)}`,
          desc: `Polinomial derajat 2`,
        };
      }
      case "power_law": {
        const a = typeof config.powerA === "number" ? config.powerA : 1;
        const b = typeof config.powerB === "number" ? config.powerB : 1;
        return {
          formula: `y = ${a.toFixed(3)} · x^${b.toFixed(3)}`,
          desc: `Pangkat hukum daya`,
        };
      }
      case "multiplier": {
        const m = typeof config.multiplier === "number" ? config.multiplier : 1;
        return {
          formula: `y = ${m.toFixed(3)} · x`,
          desc: `Pengali hujan ${m.toFixed(3)}x`,
        };
      }
      case "percentage": {
        const p = typeof config.percentage === "number" ? config.percentage : 0;
        return {
          formula: `y = x · (1 + ${p >= 0 ? "+" : ""}${p.toFixed(1)}%)`,
          desc: `Penyesuaian ${p >= 0 ? "+" : ""}${p.toFixed(1)}%`,
        };
      }
      case "two_point": {
        return {
          formula: `P1 (${config.point1Raw ?? 0}→${config.point1Ref ?? 0}) & P2 (${config.point2Raw ?? 0}→${config.point2Ref ?? 0})`,
          desc: `Interpolasi 2 titik acuan`,
        };
      }
      default:
        return {
          formula: "y = x",
          desc: "Tanpa koreksi",
        };
    }
  };

  // Filtered variables based on search & active filter
  const filteredVariables = useMemo(() => {
    return SENSOR_VARIABLES.filter(v => {
      const isEnabled = (currentFormValues as any)?.[v.key]?.enabled;
      const isStaged = Boolean(stagedCalibrations?.[v.key]);

      if (onlyActiveFilter && !isEnabled && !isStaged) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = v.label.toLowerCase().includes(query) || v.shortLabel.toLowerCase().includes(query);
        const matchesKey = v.key.toLowerCase().includes(query);
        const matchesUnit = v.unit.toLowerCase().includes(query);
        if (!matchesName && !matchesKey && !matchesUnit) return false;
      }

      return true;
    });
  }, [onlyActiveFilter, searchQuery, currentFormValues, stagedCalibrations]);

  const activeEditingVar = SENSOR_VARIABLES.find(v => v.key === editingSensorKey);
  const activeEditingConfig = editingSensorKey ? (currentFormValues as any)?.[editingSensorKey] : null;

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
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold shadow-sm"
              disabled={isSaving || isLoadingConfig}
              onClick={form.handleSubmit(
                data => onSubmit(data as StationCalibrationDocument),
                errors => {
                  console.error("Gagal validasi form kalibrasi:", errors);
                  const errorKeys = Object.keys(errors);
                  toast({
                    title: "Gagal Validasi Formulir",
                    description: `Terdapat parameter yang tidak valid pada: ${errorKeys.join(", ")}. Pastikan angka terisi dengan benar.`,
                    variant: "destructive",
                  });
                }
              )}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Simpan Semua ke Firestore
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Staged Calibration Review Banner */}
      {stagedEntries.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700/80 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                      Draft Parameter Hasil Kalibrasi Siap Disimpan
                    </span>
                    <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-2 py-0">
                      {stagedEntries.length} Variabel
                    </Badge>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Variabel di bawah telah diterapkan dari Leaderboard dan otomatis terisi di form. Klik &ldquo;Simpan Semua ke Firestore&rdquo; untuk mengaktifkan seluruh parameter ke database.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  onClick={handleDiscardDraft}
                  disabled={isSaving}
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1" />
                  Batalkan Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm gap-1.5"
                  disabled={isSaving || isLoadingConfig}
                  onClick={form.handleSubmit(
                    data => onSubmit(data as StationCalibrationDocument),
                    errors => {
                      console.error("Gagal validasi form kalibrasi:", errors);
                      toast({
                        title: "Gagal Validasi Formulir",
                        description: "Mohon periksa kembali input yang terisi.",
                        variant: "destructive",
                      });
                    }
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Simpan Semua ke Firestore
                </Button>
              </div>
            </div>

            {/* List of staged variables */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200/80 dark:border-amber-800/60">
              {stagedEntries.map(([sKey, item]) => (
                <div
                  key={sKey}
                  className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 border border-amber-300/70 dark:border-amber-800 px-2.5 py-1.5 rounded-lg text-xs shadow-2xs cursor-pointer hover:border-amber-500 transition-colors"
                  onClick={() => setPreviewVar(sKey)}
                  title="Klik untuk pratinjau kurva respons variabel ini"
                >
                  <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200">
                    {item.variableLabel || sKey}
                  </Badge>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {item.methodName}
                  </span>
                  {onClearVariableStaged && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500 text-sm font-bold ml-1 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearVariableStaged(selectedStationId, sKey);
                      }}
                      title="Hapus variabel ini dari draft"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Pratinjau Respons Kalibrasi Sensor (Live)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Simulasi grafik perbandingan nilai mentah (Raw) vs hasil koreksi rumus kalibrasi aktif stasiun {stationName || selectedStationId}.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Parameter Pratinjau:</span>
            <Select value={previewVar} onValueChange={setPreviewVar}>
              <SelectTrigger className="h-8 text-xs w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSOR_VARIABLES.map(v => (
                  <SelectItem key={v.key} value={v.key} className="text-xs">
                    {v.shortLabel} ({v.unit})
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
            isDarkMode={isDarkMode}
          />
        </CardContent>
      </Card>

      {/* Unified Compact Calibration Parameter Matrix Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Matriks Konfigurasi Sensor Terkalibrasi
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {stats.activeCount} Aktif / {stats.bypassCount} Bypass
                  {stats.stagedCount > 0 && ` (${stats.stagedCount} Draft)`}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Daftar ringkas seluruh parameter kalibrasi yang diterapkan ke sensor IoT stasiun {stationName || selectedStationId}.
              </CardDescription>
            </div>

            {/* Quick Filter Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs">
                <Switch
                  checked={onlyActiveFilter}
                  onCheckedChange={setOnlyActiveFilter}
                  id="only-active"
                  className="scale-75"
                />
                <Label htmlFor="only-active" className="text-[11px] font-medium cursor-pointer text-slate-600 dark:text-slate-300">
                  Hanya Aktif &amp; Draf
                </Label>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari parameter..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-7 pl-7 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingConfig ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-xs text-slate-500">Memuat konfigurasi sensor stasiun...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <TableHead className="py-2.5 px-4 min-w-[200px]">Parameter Sensor</TableHead>
                    <TableHead className="py-2.5 px-3 min-w-[140px]">Status</TableHead>
                    <TableHead className="py-2.5 px-3 min-w-[160px]">Metode Koreksi</TableHead>
                    <TableHead className="py-2.5 px-3 min-w-[220px]">Formula / Transformasi</TableHead>
                    <TableHead className="py-2.5 px-4 text-center min-w-[160px]">Pratinjau &amp; Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredVariables.map(v => {
                    const baseName = v.key as keyof StationCalibrationDocument;
                    const watchEnabled = form.watch(`${baseName}.enabled` as any);
                    const isStaged = Boolean(stagedCalibrations?.[v.key]);
                    const stagedInfo = stagedCalibrations?.[v.key];
                    const currentVarVal = (currentFormValues as any)?.[v.key];
                    const summary = getFormulaSummary(currentVarVal);
                    const isCurrentPreview = previewVar === v.key;
                    const IconComponent = v.icon;

                    const methodNameObj = CALIBRATION_METHODS.find(m => m.value === currentVarVal?.method);
                    const displayMethodName = isStaged && stagedInfo?.methodName
                      ? stagedInfo.methodName
                      : (methodNameObj?.label || "None (Tanpa Koreksi)");

                    return (
                      <TableRow
                        key={v.key}
                        className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                          isStaged
                            ? "bg-amber-50/30 dark:bg-amber-950/20"
                            : isCurrentPreview
                            ? "bg-blue-50/40 dark:bg-blue-950/30"
                            : ""
                        }`}
                      >
                        {/* Parameter Sensor */}
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              watchEnabled
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {v.shortLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {v.key} &bull; {v.unit}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {isStaged ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5">
                                Draft Staging
                              </Badge>
                            ) : watchEnabled ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5">
                                Aktif di Firestore
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px] px-2 py-0.5">
                                Bypass Mentah
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Metode Koreksi */}
                        <TableCell className="py-3 px-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            {displayMethodName}
                          </span>
                          {isStaged && stagedInfo && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                              Diterapkan dari Leaderboard
                            </span>
                          )}
                        </TableCell>

                        {/* Formula / Transformasi */}
                        <TableCell className="py-3 px-3 font-mono">
                          <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 inline-block max-w-full">
                            <span className="font-bold text-[11px] text-blue-700 dark:text-blue-400 block truncate">
                              {summary.formula}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans block truncate">
                              {summary.desc}
                            </span>
                          </div>
                        </TableCell>

                        {/* Pratinjau & Aksi */}
                        <TableCell className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Toggle Switch */}
                            <Controller
                              name={`${baseName}.enabled` as any}
                              control={form.control}
                              render={({ field }) => (
                                <Switch
                                  checked={Boolean(field.value)}
                                  onCheckedChange={field.onChange}
                                  className="scale-75"
                                  title={field.value ? "Klik untuk menonaktifkan kalibrasi (Bypass)" : "Klik untuk mengaktifkan kalibrasi"}
                                />
                              )}
                            />

                            {/* View Curve Button */}
                            <Button
                              type="button"
                              variant={isCurrentPreview ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-[11px] px-2 gap-1"
                              onClick={() => setPreviewVar(v.key)}
                              title="Tampilkan kurva respons live variabel ini di grafik atas"
                            >
                              <Eye className="w-3 h-3" />
                              {isCurrentPreview ? "Kurva Aktif" : "Kurva"}
                            </Button>

                            {/* Manual Edit Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] px-2 gap-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              onClick={() => setEditingSensorKey(v.key)}
                              title="Edit parameter numerik secara manual"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </Button>

                            {/* Cancel Staged Variable */}
                            {isStaged && onClearVariableStaged && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                onClick={() => onClearVariableStaged(selectedStationId, v.key)}
                                title="Batalkan draft kalibrasi variabel ini"
                              >
                                Batal
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Parameter Adjustment Dialog */}
      <Dialog open={Boolean(editingSensorKey)} onOpenChange={(open) => !open && setEditingSensorKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Sesuaikan Parameter: {activeEditingVar?.shortLabel}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Konfigurasi manual formula dan nilai koreksi sensor ({activeEditingVar?.key} &bull; {activeEditingVar?.unit}).
            </DialogDescription>
          </DialogHeader>

          {editingSensorKey && (
            <div className="space-y-4 py-2 text-xs">
              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Status Koreksi Sensor:</span>
                <Controller
                  name={`${editingSensorKey as any}.enabled` as any}
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {field.value ? "Aktif" : "Bypass (Mentah)"}
                      </span>
                      <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              </div>

              {/* Method Selector */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Metode Kalibrasi</Label>
                <Controller
                  name={`${editingSensorKey as any}.method` as any}
                  control={form.control}
                  render={({ field }) => (
                    <Select value={typeof field.value === "string" ? field.value : "none"} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-xs">
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

              {/* Conditional Inputs based on Method */}
              {activeEditingConfig?.method === "offset" && (
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Nilai Offset ({activeEditingVar?.unit})</Label>
                  <Controller
                    name={`${editingSensorKey as any}.offset` as any}
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs font-mono"
                        placeholder="0.0"
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

              {activeEditingConfig?.method === "scale" && (
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Faktor Skala Pengali (Scale)</Label>
                  <Controller
                    name={`${editingSensorKey as any}.scale` as any}
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.001"
                        className="h-8 text-xs font-mono"
                        placeholder="1.0"
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

              {(activeEditingConfig?.method === "scale_offset" || activeEditingConfig?.method === "robust_linear") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Slope / Skala (m)</Label>
                    <Controller
                      name={`${editingSensorKey as any}.scale` as any}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.001"
                          className="h-8 text-xs font-mono"
                          placeholder="1.0"
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
                    <Label className="text-xs text-slate-600">Intercept (c)</Label>
                    <Controller
                      name={`${editingSensorKey as any}.offset` as any}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs font-mono"
                          placeholder="0.0"
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

              {activeEditingConfig?.method === "polynomial" && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-600">Koef a (x²)</Label>
                    <Controller
                      name={`${editingSensorKey as any}.polyA` as any}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.0001"
                          className="h-8 text-xs font-mono"
                          placeholder="0.0"
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
                    <Label className="text-[10px] text-slate-600">Koef b (x)</Label>
                    <Controller
                      name={`${editingSensorKey as any}.polyB` as any}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.001"
                          className="h-8 text-xs font-mono"
                          placeholder="1.0"
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
                    <Label className="text-[10px] text-slate-600">Koef c (Konst)</Label>
                    <Controller
                      name={`${editingSensorKey as any}.polyC` as any}
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs font-mono"
                          placeholder="0.0"
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

              {activeEditingConfig?.method === "multiplier" && (
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Pengali Curah Hujan (Multiplier)</Label>
                  <Controller
                    name={`${editingSensorKey as any}.multiplier` as any}
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs font-mono"
                        placeholder="1.0"
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
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setEditingSensorKey(null)}
            >
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
