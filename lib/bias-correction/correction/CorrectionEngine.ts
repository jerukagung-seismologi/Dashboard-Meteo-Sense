// lib/bias-correction/correction/CorrectionEngine.ts

import {
  CorrectionMethod,
  MeteorologicalVariable,
  ICorrectionEngine,
  ComparativeValidationResult,
  ProvenanceMetadata,
  MatchedObservationPair,
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
      softwareVersion: "MeteoSense 4.0.0 (Bias Engine v1.0-TS)",
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
}
