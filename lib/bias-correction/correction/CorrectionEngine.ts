// lib/bias-correction/correction/CorrectionEngine.ts

import {
  CorrectionMethod,
  MeteorologicalVariable,
  ICorrectionEngine,
  ComparativeValidationResult,
  ProvenanceMetadata,
  MatchedObservationPair,
  EvaluationMetrics,
} from "../types";
import { calculateEvaluationMetrics } from "../statistics/metrics";
import { fitMeanBias, transformMeanBias } from "./meanBias";
import { fitDiurnalMBE, transformDiurnalMBE } from "./diurnalMBE";
import { fitLinearRegression, transformLinearRegression } from "./linearRegression";
import { fitQuantileMapping, transformQuantileMapping } from "./quantileMapping";
import { fitZeroAwarePrecipitation, transformZeroAwarePrecipitation } from "./precipitationCorrection";
import {
  fitWindSpeedCorrection,
  transformWindSpeedCorrection,
  fitWindDirectionEvaluation,
  transformWindDirectionOffset,
} from "./windCorrection";
import { fitPolynomialRegression, transformPolynomialRegression } from "./polynomialRegression";
import { fitRobustHuberRegression, transformRobustHuberRegression } from "./robustHuberRegression";
import { fitQuantileDeltaMapping, transformQuantileDeltaMapping } from "./quantileDeltaMapping";
import { fitPowerLawScaling, transformPowerLawScaling } from "./powerLawScaling";
import { fitTwoPointCalibration, transformTwoPointCalibration } from "./twoPointCalibration";

export interface MethodBenchmarkSummary {
  method: CorrectionMethod;
  name: string;
  category: "Linear" | "Non-Linear" | "Statistical / Distribution" | "Specialized";
  rawRmse: number;
  correctedRmse: number;
  rawMae: number;
  correctedMae: number;
  rawRSquared: number;
  correctedRSquared: number;
  rmseImprovementPercent: number;
  maeImprovementPercent: number;
  isBest: boolean;
  isDegraded: boolean;
  fitParams: any;
  formulaDescription: string;
}

export class BiasCorrectionEngine implements ICorrectionEngine {
  readonly method: CorrectionMethod;
  readonly variable: MeteorologicalVariable;
  private fittedParams: any = null;
  private stationInfo: { name: string; id: string };
  private spatialMethod: "nearest" | "bilinear";
  private temporalMethod: "exact" | "nearest_window";
  private toleranceWindowMinutes: number;

  constructor(
    variable: MeteorologicalVariable,
    method: CorrectionMethod,
    stationInfo: { name: string; id: string } = { name: "Stasiun Jerukagung", id: "default_station" },
    spatialMethod: "nearest" | "bilinear" = "nearest",
    temporalMethod: "exact" | "nearest_window" = "nearest_window",
    toleranceWindowMinutes: number = 30
  ) {
    this.variable = variable;
    this.method = method;
    this.stationInfo = stationInfo;
    this.spatialMethod = spatialMethod;
    this.temporalMethod = temporalMethod;
    this.toleranceWindowMinutes = toleranceWindowMinutes;
  }

  fit(calibrationPairs: { aws: number; era5: number }[]): any {
    switch (this.method) {
      case "mean_bias":
        this.fittedParams = fitMeanBias(calibrationPairs);
        break;
      case "diurnal_mbe":
        this.fittedParams = fitDiurnalMBE(
          calibrationPairs.map((p: any, idx) => ({
            timestamp: p.timestamp || Date.now() + idx * 3600000,
            aws: p.aws,
            era5: p.era5,
          }))
        );
        break;
      case "linear_regression":
        this.fittedParams = fitLinearRegression(calibrationPairs);
        break;
      case "quantile_mapping":
        this.fittedParams = fitQuantileMapping(calibrationPairs, 100);
        break;
      case "zero_aware_rain":
        this.fittedParams = fitZeroAwarePrecipitation(calibrationPairs, 0.1);
        break;
      case "circular_wind":
        if (this.variable === "wind_direction") {
          this.fittedParams = fitWindDirectionEvaluation(calibrationPairs);
        } else {
          this.fittedParams = fitWindSpeedCorrection(calibrationPairs);
        }
        break;
      case "polynomial_regression":
        this.fittedParams = fitPolynomialRegression(calibrationPairs);
        break;
      case "robust_huber":
        this.fittedParams = fitRobustHuberRegression(calibrationPairs);
        break;
      case "quantile_delta_mapping":
        const isRatio = this.variable === "precipitation" || this.variable === "wind_speed";
        this.fittedParams = fitQuantileDeltaMapping(calibrationPairs, 100, isRatio);
        break;
      case "power_law":
        this.fittedParams = fitPowerLawScaling(calibrationPairs);
        break;
      case "two_point":
        this.fittedParams = fitTwoPointCalibration(calibrationPairs);
        break;
      default:
        this.fittedParams = fitMeanBias(calibrationPairs);
    }
    return this.fittedParams;
  }

  transform(era5Values: (number | null | undefined)[], params?: any, timestamps?: number[]): (number | null)[] {
    const activeParams = params || this.fittedParams;
    if (!activeParams) {
      return era5Values.map(v => (v !== undefined ? v : null));
    }

    switch (this.method) {
      case "mean_bias":
        return transformMeanBias(era5Values, activeParams);
      case "diurnal_mbe":
        return transformDiurnalMBE(
          era5Values.map((v, idx) => ({
            timestamp: (timestamps && timestamps[idx]) ? timestamps[idx] : Date.now() + idx * 3600000,
            value: v,
          })),
          activeParams
        );
      case "linear_regression":
        return transformLinearRegression(era5Values, activeParams);
      case "quantile_mapping":
        return transformQuantileMapping(era5Values, activeParams);
      case "zero_aware_rain":
        return transformZeroAwarePrecipitation(era5Values, activeParams);
      case "circular_wind":
        if (this.variable === "wind_direction") {
          return transformWindDirectionOffset(era5Values, activeParams);
        } else {
          return transformWindSpeedCorrection(era5Values, activeParams);
        }
      case "polynomial_regression":
        return transformPolynomialRegression(era5Values, activeParams);
      case "robust_huber":
        return transformRobustHuberRegression(era5Values, activeParams);
      case "quantile_delta_mapping":
        return transformQuantileDeltaMapping(era5Values, activeParams);
      case "power_law":
        return transformPowerLawScaling(era5Values, activeParams);
      case "two_point":
        return transformTwoPointCalibration(era5Values, activeParams);
      default:
        return transformMeanBias(era5Values, activeParams);
    }
  }

  fitTransform(
    calibrationPairs: { aws: number; era5: number }[],
    allEra5Values: (number | null | undefined)[]
  ): { params: any; correctedValues: (number | null)[] } {
    const params = this.fit(calibrationPairs);
    const correctedValues = this.transform(allEra5Values, params);
    return { params, correctedValues };
  }

  evaluate(
    validationPairs: { aws: number; era5Raw: number; era5Corrected: number }[],
    calibrationMeta: { from: string; to: string; count: number } = { from: "—", to: "—", count: 0 },
    validationMeta: { from: string; to: string; count: number } = { from: "—", to: "—", count: 0 }
  ): ComparativeValidationResult {
    const rawMetrics = calculateEvaluationMetrics(
      validationPairs.map(p => ({ aws: p.aws, era5: p.era5Raw }))
    );

    const correctedMetrics = calculateEvaluationMetrics(
      validationPairs.map(p => ({ aws: p.aws, era5: p.era5Corrected }))
    );

    // Calculate percentage improvements
    const maeDiff = rawMetrics.mae - correctedMetrics.mae;
    const maeImprovementPercent =
      rawMetrics.mae > 0 ? Number(((maeDiff / rawMetrics.mae) * 100).toFixed(2)) : 0;

    const rmseDiff = rawMetrics.rmse - correctedMetrics.rmse;
    const rmseImprovementPercent =
      rawMetrics.rmse > 0 ? Number(((rmseDiff / rawMetrics.rmse) * 100).toFixed(2)) : 0;

    // A method is degraded on the validation set if its corrected RMSE or MAE is worse than the raw ERA5
    const isDegraded = correctedMetrics.rmse > rawMetrics.rmse || correctedMetrics.mae > rawMetrics.mae;

    let degradationWarning: string | undefined;
    if (isDegraded) {
      degradationWarning = `Peringatan: Metode ${this.method} mengalami degradasi performa pada periode validasi independen (RMSE meningkat +${(
        -rmseImprovementPercent
      ).toFixed(1)}%). Data kalibrasi mungkin mengalami overfitting atau memiliki pola distribusi yang berbeda.`;
    }

    const provenance: ProvenanceMetadata = {
      sourceAwsStation: this.stationInfo.name,
      sourceAwsStationId: this.stationInfo.id,
      sourceModel: "ECMWF ERA5 Reanalysis (0.1° / 0.25°)",
      variable: this.variable,
      correctionMethod: this.method,
      calibrationPeriod: {
        from: calibrationMeta.from,
        to: calibrationMeta.to,
        sampleCount: calibrationMeta.count,
      },
      validationPeriod: {
        from: validationMeta.from,
        to: validationMeta.to,
        sampleCount: validationMeta.count,
      },
      spatialMethod: this.spatialMethod,
      temporalMethod: this.temporalMethod,
      toleranceWindowMinutes: this.toleranceWindowMinutes,
      createdAt: new Date().toISOString(),
      softwareVersion: "MeteoSense 4.0.0 (Bias Engine v2.0-Scientific)",
      fitParameters: this.fittedParams || {},
    };

    return {
      variable: this.variable,
      method: this.method,
      rawEra5: rawMetrics,
      correctedEra5: correctedMetrics,
      maeImprovementPercent,
      rmseImprovementPercent,
      isDegraded,
      degradationWarning,
      provenance,
    };
  }

  /**
   * Benchmarks all applicable correction methods side-by-side on calibration & validation datasets.
   * Produces ranked leaderboard entries from best performing (lowest RMSE) to worst.
   */
  static benchmarkAllMethods(
    variable: MeteorologicalVariable,
    calibrationPairs: { aws: number; era5: number }[],
    validationPairs: { aws: number; era5: number }[],
    stationInfo: { name: string; id: string } = { name: "Stasiun Jerukagung", id: "default_station" }
  ): MethodBenchmarkSummary[] {
    // List candidate methods appropriate for this variable
    const candidates: {
      method: CorrectionMethod;
      name: string;
      category: "Linear" | "Non-Linear" | "Statistical / Distribution" | "Specialized";
    }[] = [
      { method: "mean_bias", name: "Mean Bias Error (Offset)", category: "Linear" },
      { method: "linear_regression", name: "Linear Regression (OLS)", category: "Linear" },
      { method: "robust_huber", name: "Robust Huber Regression", category: "Linear" },
      { method: "two_point", name: "Two-Point Interpolation", category: "Linear" },
      { method: "polynomial_regression", name: "Polynomial Regression (Derajat 2)", category: "Non-Linear" },
      { method: "quantile_mapping", name: "Empirical Quantile Mapping (EQM)", category: "Statistical / Distribution" },
      { method: "quantile_delta_mapping", name: "Quantile Delta Mapping (QDM)", category: "Statistical / Distribution" },
    ];

    if (variable === "air_temperature" || variable === "relative_humidity" || variable === "surface_pressure") {
      candidates.push({ method: "diurnal_mbe", name: "Diurnal Hourly MBE (24-Jam)", category: "Specialized" });
    }

    if (variable === "wind_speed" || variable === "precipitation") {
      candidates.push({ method: "power_law", name: "Power Law Scaling (y = a·x^b)", category: "Non-Linear" });
    }

    if (variable === "precipitation") {
      candidates.push({ method: "zero_aware_rain", name: "Zero-Aware Rain Scaling", category: "Specialized" });
    }

    if (variable === "wind_direction" || variable === "wind_speed") {
      candidates.push({ method: "circular_wind", name: "Circular Wind Statistics", category: "Specialized" });
    }

    const rawMetrics = calculateEvaluationMetrics(validationPairs);
    const results: MethodBenchmarkSummary[] = [];

    for (const cand of candidates) {
      try {
        const engine = new BiasCorrectionEngine(variable, cand.method, stationInfo);
        const params = engine.fit(calibrationPairs);

        const era5RawList = validationPairs.map(p => p.era5);
        const correctedList = engine.transform(era5RawList, params);

        const validValPairs: { aws: number; era5: number }[] = [];
        for (let i = 0; i < validationPairs.length; i++) {
          const c = correctedList[i];
          if (c !== null && c !== undefined && !isNaN(c)) {
            validValPairs.push({ aws: validationPairs[i].aws, era5: c });
          }
        }

        const correctedMetrics = calculateEvaluationMetrics(validValPairs);
        const rmseDiff = rawMetrics.rmse - correctedMetrics.rmse;
        const rmseImprovementPercent =
          rawMetrics.rmse > 0 ? Number(((rmseDiff / rawMetrics.rmse) * 100).toFixed(2)) : 0;
        const maeDiff = rawMetrics.mae - correctedMetrics.mae;
        const maeImprovementPercent =
          rawMetrics.mae > 0 ? Number(((maeDiff / rawMetrics.mae) * 100).toFixed(2)) : 0;

        let formulaDescription = "Model empiris standar";
        if (cand.method === "mean_bias") {
          const b = params.bias ?? 0;
          formulaDescription = `y = x ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(2)}`;
        } else if (cand.method === "linear_regression" || cand.method === "robust_huber") {
          formulaDescription = `y = ${params.slope?.toFixed(3)}·x ${params.intercept >= 0 ? "+" : "-"} ${Math.abs(params.intercept).toFixed(2)}`;
        } else if (cand.method === "polynomial_regression") {
          formulaDescription = `y = ${params.a?.toFixed(4)}·x² + ${params.b?.toFixed(3)}·x ${params.c >= 0 ? "+" : "-"} ${Math.abs(params.c).toFixed(2)}`;
        } else if (cand.method === "power_law") {
          formulaDescription = `y = ${params.a?.toFixed(3)} · (x ^ ${params.b?.toFixed(3)})`;
        } else if (cand.method === "two_point") {
          formulaDescription = `P1(${params.x1}→${params.y1}), P2(${params.x2}→${params.y2}) | Slope: ${params.slope?.toFixed(3)}`;
        } else if (cand.method === "quantile_mapping" || cand.method === "quantile_delta_mapping") {
          formulaDescription = `Distribusi 100 Kuantil ECDF (F_obs⁻¹ ∘ F_mod)`;
        }

        results.push({
          method: cand.method,
          name: cand.name,
          category: cand.category,
          rawRmse: rawMetrics.rmse,
          correctedRmse: correctedMetrics.rmse,
          rawMae: rawMetrics.mae,
          correctedMae: correctedMetrics.mae,
          rawRSquared: rawMetrics.rSquared,
          correctedRSquared: correctedMetrics.rSquared,
          rmseImprovementPercent,
          maeImprovementPercent,
          isBest: false,
          isDegraded: correctedMetrics.rmse > rawMetrics.rmse,
          fitParams: params,
          formulaDescription,
        });
      } catch (err) {
        console.warn(`Benchmark failed for method ${cand.method}:`, err);
      }
    }

    // Sort by lowest corrected RMSE (or highest improvement)
    results.sort((a, b) => a.correctedRmse - b.correctedRmse);

    if (results.length > 0) {
      // Best non-degraded method
      const bestNonDegraded = results.find(r => !r.isDegraded) || results[0];
      bestNonDegraded.isBest = true;
    }

    return results;
  }
}
