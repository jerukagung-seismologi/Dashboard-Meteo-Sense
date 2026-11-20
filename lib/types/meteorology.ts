/**
 * Shared Meteorological Domain Types
 * Consolidated domain definitions for AWS observations, ERA5 reanalysis,
 * statistical evaluation metrics, and quality control flags.
 */

/**
 * Standard Quality Control Flags based on WMO No. 8 and international meteorological standards.
 */
export type QCFlag = "GOOD" | "SUSPECT" | "INVALID" | "MISSING" | "NOT_SIGNIFICANT" | "IMPUTED";

/**
 * Standard meteorological variables supported across AWS stations, calibration, and validation engines.
 */
export type MeteorologicalVariableKey =
  | "temperature"
  | "humidity"
  | "pressure"
  | "dew"
  | "rainfall"
  | "rainrate"
  | "volt"
  | "lux"
  | "soil_temp"
  | "windSpeed"
  | "windGust"
  | "windDirection";

/**
 * Canonical names for atmospheric reanalysis & bias correction variables.
 */
export type MeteorologicalVariable =
  | "air_temperature"
  | "relative_humidity"
  | "dew_point_temperature"
  | "surface_pressure"
  | "wind_speed"
  | "wind_direction"
  | "precipitation";

/**
 * Unified Statistical Evaluation & Validation Metrics (WMO verification standards).
 * Bridges BiasMetric (reanalysis) and EvaluationMetrics (bias-correction).
 */
export interface EvaluationMetrics {
  sampleCount: number;
  meanBias: number;         // Mean Bias Error (MBE = Model - AWS or AWS - Model)
  mae: number;              // Mean Absolute Error
  rmse: number;             // Root Mean Square Error
  stdResidual: number;      // Standard Deviation of Residuals (σ)
  pearsonR: number;         // Pearson Correlation Coefficient (r)
  rSquared: number;         // Coefficient of Determination (R²)
  p10: number;              // 10th Percentile
  p50: number;              // 50th Percentile (Median)
  p90: number;              // 90th Percentile
}

/**
 * Generic Hourly Meteorological Observation Record (Ground Station or Reanalysis Model).
 */
export interface HourlyMeteorologicalRecord {
  timestamp: number;        // Unix epoch in milliseconds
  temperature?: number | null; // °C
  humidity?: number | null;    // % (0-100)
  pressure?: number | null;    // hPa
  dewPoint?: number | null;    // °C
  windSpeed?: number | null;   // m/s
  windDirection?: number | null; // 0-360°
  rainfall?: number | null;    // mm (hourly accumulation)
  solarRadiation?: number | null; // W/m² or lux
  [key: string]: any;
}
