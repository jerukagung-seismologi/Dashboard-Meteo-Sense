import { z } from "zod";
export type { MeteorologicalVariableKey, HourlyMeteorologicalRecord } from "@/lib/types/meteorology";

export interface NWPModelMeta {
  id: string;
  name: string;
  country: string;
  category: "Physics NWP" | "AI Model";
  color: string;
}

export const SUPPORTED_NWP_MODELS: NWPModelMeta[] = [
  { id: "ecmwf_ifs", name: "ECMWF IFS (9 km)", country: "Eropa", category: "Physics NWP", color: "#2563EB" },
  { id: "ecmwf_aifs025_single", name: "ECMWF AIFS (AI)", country: "Eropa (AI)", category: "AI Model", color: "#8B5CF6" },
  { id: "ncep_aigfs025", name: "NOAA AIGFS (AI)", country: "Amerika Serikat (AI)", category: "AI Model", color: "#A855F7" },
  { id: "gfs_seamless", name: "NOAA GFS (11 km)", country: "Amerika Serikat", category: "Physics NWP", color: "#EF4444" },
  { id: "icon_seamless", name: "DWD ICON (13 km)", country: "Jerman", category: "Physics NWP", color: "#14B8A6" },
  { id: "jma_seamless", name: "JMA GSM (0.25°)", country: "Jepang", category: "Physics NWP", color: "#F59E0B" },
  { id: "gem_seamless", name: "CMC GEM (0.15°)", country: "Kanada", category: "Physics NWP", color: "#EC4899" },
  { id: "meteofrance_seamless", name: "Météo-France ARPEGE", country: "Prancis", category: "Physics NWP", color: "#06B6D4" },
  { id: "ukmo_global_deterministic_10km", name: "UKMO Global (10 km)", country: "Inggris", category: "Physics NWP", color: "#6366F1" },
  { id: "metno_seamless", name: "MET Norway", country: "Norwegia", category: "Physics NWP", color: "#0284C7" },
  { id: "dmi_seamless", name: "DMI Seamless", country: "Denmark", category: "Physics NWP", color: "#D946EF" },
  { id: "cma_grapes_global", name: "CMA GRAPES (0.125°)", country: "China", category: "Physics NWP", color: "#F97316" },
];

// Zod schemas for validation
export const CalibrationMethodSchema = z.enum([
  "none",
  "percentage",
  "offset",
  "scale",
  "scale_offset",
  "multiplier",
  "polynomial",
  "robust_linear",
  "power_law",
  "two_point",
]);

export type CalibrationMethod = z.infer<typeof CalibrationMethodSchema>;

const safeNumber = z.preprocess(
  (val) => (typeof val === "number" && isNaN(val) ? undefined : val ?? undefined),
  z.number().optional()
);

export const DEFAULT_VARIABLE_CALIBRATION: SensorVariableCalibration = {
  enabled: false,
  method: "none",
};

const safeBoolean = z.preprocess(
  (val) => (val === undefined || val === null ? false : Boolean(val)),
  z.boolean().default(false)
);

export const SensorVariableCalibrationSchema = z.object({
  enabled: safeBoolean,
  method: CalibrationMethodSchema.default("none"),
  percentage: safeNumber, // For 'percentage' method
  offset: safeNumber, // For 'offset', 'scale_offset', 'robust_linear' methods
  scale: safeNumber, // For 'scale', 'scale_offset', 'robust_linear' methods
  multiplier: safeNumber, // For 'multiplier' method
  // Polynomial method: y = polyA * x^2 + polyB * x + polyC
  polyA: safeNumber,
  polyB: safeNumber,
  polyC: safeNumber,
  // Power law method: y = powerA * (x ^ powerB)
  powerA: safeNumber,
  powerB: safeNumber,
  // Two-point method: (point1Raw -> point1Ref) & (point2Raw -> point2Ref)
  point1Raw: safeNumber,
  point1Ref: safeNumber,
  point2Raw: safeNumber,
  point2Ref: safeNumber,
});

export type SensorVariableCalibration = z.infer<typeof SensorVariableCalibrationSchema>;

// Record of all variables to their calibration settings
export const StationCalibrationDocumentSchema = z.object({
  stationId: z.string(),
  enabled: safeBoolean,
  // Known variables based on project SensorValue interface
  temperature: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  humidity: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  pressure: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  dew: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  rainfall: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  rainrate: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  volt: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  lux: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  soil_temp: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  windSpeed: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  windGust: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  windDirection: SensorVariableCalibrationSchema.optional().default(() => ({ ...DEFAULT_VARIABLE_CALIBRATION })),
  solarRadiation: SensorVariableCalibrationSchema.optional(),
  uvIndex: SensorVariableCalibrationSchema.optional(),
  soilMoisture: SensorVariableCalibrationSchema.optional(),
}).passthrough(); // Allow future variables without breaking named properties

export type StationCalibrationDocument = z.infer<typeof StationCalibrationDocumentSchema>;
