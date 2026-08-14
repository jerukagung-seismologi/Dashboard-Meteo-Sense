// lib/bias-correction/types.ts

/**
 * Quality Control Flag based on WMO and international meteorological standards.
 */
export type QCFlag = "GOOD" | "SUSPECT" | "INVALID" | "MISSING" | "NOT_SIGNIFICANT" | "IMPUTED";

/**
 * Standard meteorological variables supported by the AWS–ERA5 validation system.
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
 * Layer 1: Raw AWS Station Observation (Immutable, Ground Reference)
 */
export interface AWSRawObservation {
  timestamp: number; // Unix timestamp in ms
  temperature_raw?: number | null; // °C
  humidity_raw?: number | null; // %
  dew_point_raw?: number | null; // °C
  pressure_raw?: number | null; // hPa
  wind_speed_raw?: number | null; // m/s
  wind_direction_raw?: number | null; // 0-360 degrees
  precipitation_raw?: number | null; // mm
  [key: string]: any;
}

/**
 * Layer 2: Variable Quality Control evaluation result
 */
export interface VariableQCResult {
  value: number | null;
  flag: QCFlag;
  reason?: string;
}

/**
 * Layer 2: Quality Controlled AWS Observation
 */
export interface AWSQCObservation {
  timestamp: number;
  temperature_qc?: number | null;
  temperature_flag: QCFlag;
  humidity_qc?: number | null;
  humidity_flag: QCFlag;
  dew_point_qc?: number | null;
  dew_point_flag: QCFlag;
  pressure_qc?: number | null;
  pressure_flag: QCFlag;
  wind_speed_qc?: number | null;
  wind_speed_flag: QCFlag;
  wind_direction_qc?: number | null;
  wind_direction_flag: QCFlag;
  precipitation_qc?: number | null;
  precipitation_flag: QCFlag;
}

/**
 * Layer 1 (Model): Raw ERA5 Reanalysis / ECMWF Model Point
 */
export interface ERA5RawObservation {
  timestamp: number; // Unix timestamp in ms
  temperature_era5?: number | null; // °C
  humidity_era5?: number | null; // %
  dew_point_era5?: number | null; // °C
  pressure_era5?: number | null; // hPa
  wind_speed_era5?: number | null; // m/s
  wind_direction_era5?: number | null; // 0-360 degrees
  precipitation_era5?: number | null; // mm
  [key: string]: any;
}

/**
 * Matched Observation Pair (AWS QC vs ERA5 Raw)
 */
export interface MatchedObservationPair {
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  // AWS Reference (QC)
  aws_value: number | null;
  aws_raw: number | null;
  aws_flag: QCFlag;
  // ERA5 Model
  era5_value: number | null;
  // Layer 3: Corrected Model
  corrected_value?: number | null;
  // Period label
  split: "calibration" | "validation" | "unassigned";
}

/**
 * Quality Control Configuration
 */
export interface QCConfig {
  temperature: {
    min: number; // -40°C
    max: number; // 60°C
    maxSpikePerMin: number; // e.g. 5°C/10min
    maxPersistenceIntervals: number; // e.g. 12 steps
  };
  humidity: {
    min: number; // 0%
    max: number; // 100%
    maxSpikePerMin: number;
    maxPersistenceIntervals: number;
  };
  dewPoint: {
    min: number; // -50°C
    max: number; // 40°C
    allowExceedAirTempThreshold: number; // e.g. 0.2°C tolerance
  };
  pressure: {
    min: number; // station elevation dependent, e.g. 850 hPa
    max: number; // e.g. 1080 hPa
    maxSpikePerMin: number;
    maxPersistenceIntervals: number;
  };
  windSpeed: {
    min: number; // 0 m/s
    max: number; // e.g. 75 m/s
    maxSpikePerMin: number;
    maxPersistenceIntervals: number;
  };
  windDirection: {
    calmWindThreshold: number; // m/s, below which direction is NOT_SIGNIFICANT
  };
  precipitation: {
    min: number; // 0 mm
    maxDaily: number; // e.g. 500 mm
    max10MinRate: number; // e.g. 50 mm
  };
}

/**
 * Default Quality Control Thresholds
 */
export const DEFAULT_QC_CONFIG: QCConfig = {
  temperature: {
    min: -40,
    max: 60,
    maxSpikePerMin: 5,
    maxPersistenceIntervals: 12,
  },
  humidity: {
    min: 0,
    max: 100,
    maxSpikePerMin: 20,
    maxPersistenceIntervals: 12,
  },
  dewPoint: {
    min: -50,
    max: 40,
    allowExceedAirTempThreshold: 0.2,
  },
  pressure: {
    min: 800,
    max: 1085,
    maxSpikePerMin: 4,
    maxPersistenceIntervals: 12,
  },
  windSpeed: {
    min: 0,
    max: 75,
    maxSpikePerMin: 15,
    maxPersistenceIntervals: 18,
  },
  windDirection: {
    calmWindThreshold: 0.5, // Wind speed < 0.5 m/s -> direction NOT_SIGNIFICANT
  },
  precipitation: {
    min: 0,
    maxDaily: 500,
    max10MinRate: 50,
  },
};

/**
 * Bias Correction Methods
 */
export type CorrectionMethod =
  | "mean_bias"
  | "diurnal_mbe"
  | "linear_regression"
  | "quantile_mapping"
  | "zero_aware_rain"
  | "circular_wind";

/**
 * Provenance & Audit Metadata for Layer 3 Dataset
 */
export interface ProvenanceMetadata {
  sourceAwsStation: string;
  sourceAwsStationId: string;
  sourceModel: string;
  variable: MeteorologicalVariable;
  correctionMethod: CorrectionMethod;
  calibrationPeriod: {
    from: string; // YYYY-MM-DD
    to: string;
    sampleCount: number;
  };
  validationPeriod: {
    from: string;
    to: string;
    sampleCount: number;
  };
  spatialMethod: "nearest" | "bilinear";
  temporalMethod: "exact" | "nearest_window";
  toleranceWindowMinutes: number;
  createdAt: string; // ISO 8601
  softwareVersion: string;
  fitParameters: Record<string, any>;
}

/**
 * Verification & Statistical Evaluation Metrics
 */
export interface EvaluationMetrics {
  sampleCount: number;
  meanBias: number;
  mae: number;
  rmse: number;
  stdResidual: number;
  pearsonR: number;
  rSquared: number;
  p10: number;
  p50: number;
  p90: number;
}

/**
 * Before vs After Comparative Metrics with Validation Performance Checks
 */
export interface ComparativeValidationResult {
  variable: MeteorologicalVariable;
  method: CorrectionMethod;
  rawEra5: EvaluationMetrics;
  correctedEra5: EvaluationMetrics;
  maeImprovementPercent: number; // ((Raw - Corrected) / Raw) * 100
  rmseImprovementPercent: number;
  isDegraded: boolean; // True if corrected validation error is worse than raw error
  degradationWarning?: string;
  provenance: ProvenanceMetadata;
}

/**
 * Generic Interface for Bias Correction Engines
 * Designed for full forward-compatibility with future Python/FastAPI backends.
 */
export interface ICorrectionEngine<TParams = any> {
  readonly method: CorrectionMethod;
  readonly variable: MeteorologicalVariable;
  fit(calibrationPairs: { aws: number; era5: number }[]): TParams;
  transform(era5Values: number[], params?: TParams): number[];
  fitTransform(
    calibrationPairs: { aws: number; era5: number }[],
    allEra5Values: number[]
  ): { params: TParams; correctedValues: number[] };
  evaluate(
    validationPairs: { aws: number; era5Raw: number; era5Corrected: number }[]
  ): ComparativeValidationResult;
}
