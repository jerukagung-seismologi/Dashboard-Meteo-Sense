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

export const SensorVariableCalibrationSchema = z.object({
  enabled: z.boolean(),
  method: CalibrationMethodSchema.default("none"),
  percentage: z.number().optional(), // For 'percentage' method
  offset: z.number().optional(), // For 'offset', 'scale_offset', 'robust_linear' methods
  scale: z.number().optional(), // For 'scale', 'scale_offset', 'robust_linear' methods
  multiplier: z.number().optional(), // For 'multiplier' method
  // Polynomial method: y = polyA * x^2 + polyB * x + polyC
  polyA: z.number().optional(),
  polyB: z.number().optional(),
  polyC: z.number().optional(),
  // Power law method: y = powerA * (x ^ powerB)
  powerA: z.number().optional(),
  powerB: z.number().optional(),
  // Two-point method: (point1Raw -> point1Ref) & (point2Raw -> point2Ref)
  point1Raw: z.number().optional(),
  point1Ref: z.number().optional(),
  point2Raw: z.number().optional(),
  point2Ref: z.number().optional(),
});

export type SensorVariableCalibration = z.infer<typeof SensorVariableCalibrationSchema>;

// Record of all variables to their calibration settings
export const StationCalibrationDocumentSchema = z.object({
  stationId: z.string(),
  enabled: z.boolean().default(true),
  // Known variables based on project SensorValue interface
  temperature: SensorVariableCalibrationSchema.optional(),
  humidity: SensorVariableCalibrationSchema.optional(),
  pressure: SensorVariableCalibrationSchema.optional(),
  dew: SensorVariableCalibrationSchema.optional(),
  rainfall: SensorVariableCalibrationSchema.optional(),
  rainrate: SensorVariableCalibrationSchema.optional(),
  volt: SensorVariableCalibrationSchema.optional(),
  lux: SensorVariableCalibrationSchema.optional(),
  soil_temp: SensorVariableCalibrationSchema.optional(),
  windSpeed: SensorVariableCalibrationSchema.optional(),
  windGust: SensorVariableCalibrationSchema.optional(),
  windDirection: SensorVariableCalibrationSchema.optional(),
  solarRadiation: SensorVariableCalibrationSchema.optional(),
  uvIndex: SensorVariableCalibrationSchema.optional(),
  soilMoisture: SensorVariableCalibrationSchema.optional(),
}).passthrough(); // Allow future variables without breaking named properties

export type StationCalibrationDocument = z.infer<typeof StationCalibrationDocumentSchema>;

// Default calibration configuration for a variable
export const DEFAULT_VARIABLE_CALIBRATION: SensorVariableCalibration = {
  enabled: false,
  method: "none",
};
