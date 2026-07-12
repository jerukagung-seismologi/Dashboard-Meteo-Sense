import { z } from "zod";

// Zod schemas for validation
export const CalibrationMethodSchema = z.enum(["none", "percentage", "offset", "scale", "scale_offset", "multiplier"]);

export type CalibrationMethod = z.infer<typeof CalibrationMethodSchema>;

export const SensorVariableCalibrationSchema = z.object({
  enabled: z.boolean(),
  method: CalibrationMethodSchema.default("none"),
  percentage: z.number().optional(), // For 'percentage' method
  offset: z.number().optional(),     // For 'offset' and 'scale_offset' methods
  scale: z.number().positive().optional(),      // For 'scale' and 'scale_offset' methods
  multiplier: z.number().positive().optional(), // For 'multiplier' method
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
}).catchall(SensorVariableCalibrationSchema); // Allow future variables

export type StationCalibrationDocument = z.infer<typeof StationCalibrationDocumentSchema>;

// Default calibration configuration for a variable
export const DEFAULT_VARIABLE_CALIBRATION: SensorVariableCalibration = {
  enabled: false,
  method: "none",
};
