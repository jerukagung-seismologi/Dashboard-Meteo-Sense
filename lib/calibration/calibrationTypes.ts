import { z } from "zod";

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
