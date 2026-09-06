// lib/calibration/sensorCalibrationFit.ts

import { CorrectionMethod } from "@/lib/bias-correction/types";
import { SensorVariableCalibration } from "@/lib/calibration/calibrationTypes";
import { fitMeanBias } from "@/lib/bias-correction/correction/meanBias";
import { fitLinearRegression } from "@/lib/bias-correction/correction/linearRegression";
import { fitRobustHuberRegression } from "@/lib/bias-correction/correction/robustHuberRegression";
import { fitPolynomialRegression } from "@/lib/bias-correction/correction/polynomialRegression";
import { fitPowerLawScaling } from "@/lib/bias-correction/correction/powerLawScaling";
import { fitTwoPointCalibration } from "@/lib/bias-correction/correction/twoPointCalibration";

export interface SensorCalibrationFitResult {
  sensorData: Partial<SensorVariableCalibration>;
  methodName: string;
  notes: string;
}

/**
 * Menghitung parameter kalibrasi sensor IoT (AWS Mentah -> Referensi ERA5).
 * 
 * PENTING:
 * Di modul validasi reanalisis iklim, fitting biasanya x = ERA5 dan y = AWS (mengoreksi model ke stasiun).
 * Namun untuk kalibrasi sensor IoT di lapangan:
 *   - Input sensor: x = AWS Mentah
 *   - Target patokan: y = Referensi ERA5 / Standar Fisik
 * 
 * Fungsi ini memastikan transformasi matematis mengoreksi AWS Mentah menuju standar patokan ERA5.
 */
export function fitSensorCalibrationFromERA5(
  method: CorrectionMethod,
  calibrationPairs: { aws: number; era5: number }[],
  fallbackBias: number = 0
): SensorCalibrationFitResult {
  // Pasangan yang dibalik: target adalah ERA5 (aws), input adalah AWS (era5)
  const swappedPairs = calibrationPairs
    .filter(p => typeof p.aws === "number" && !isNaN(p.aws) && typeof p.era5 === "number" && !isNaN(p.era5))
    .map(p => ({ aws: p.era5, era5: p.aws }));

  if (swappedPairs.length === 0) {
    const safeBias = Number.isFinite(fallbackBias) ? Number(fallbackBias.toFixed(3)) : 0;
    return {
      sensorData: {
        enabled: true,
        method: "offset",
        offset: safeBias,
      },
      methodName: "Offset (Default)",
      notes: "Data observasi tidak mencukupi untuk fitting; menggunakan offset default.",
    };
  }

  switch (method) {
    case "mean_bias": {
      // bias = mean(ERA5 - AWS). Jika AWS > ERA5, offset bernilai negatif.
      const fit = fitMeanBias(swappedPairs);
      const offset = Number.isFinite(fit.bias) ? fit.bias : 0;
      return {
        sensorData: {
          enabled: true,
          method: "offset",
          offset,
        },
        methodName: "Offset (+/-)",
        notes: `Offset aditif: ${offset >= 0 ? "+" : ""}${offset} untuk menyamakan baseline dengan ERA5.`,
      };
    }

    case "linear_regression": {
      // y (ERA5) = slope * x (AWS) + intercept
      const fit = fitLinearRegression(swappedPairs);
      const scale = Number.isFinite(fit.slope) ? fit.slope : 1;
      const offset = Number.isFinite(fit.intercept) ? fit.intercept : 0;
      return {
        sensorData: {
          enabled: true,
          method: "scale_offset",
          scale,
          offset,
        },
        methodName: "Scale + Offset (OLS)",
        notes: `Regresi linier: y = ${scale} · x ${offset >= 0 ? "+" : "-"} ${Math.abs(offset)}.`,
      };
    }

    case "robust_huber": {
      // y (ERA5) = slope * x (AWS) + intercept (tahan outlier)
      const fit = fitRobustHuberRegression(swappedPairs);
      const scale = Number.isFinite(fit.slope) ? fit.slope : 1;
      const offset = Number.isFinite(fit.intercept) ? fit.intercept : 0;
      return {
        sensorData: {
          enabled: true,
          method: "robust_linear",
          scale,
          offset,
        },
        methodName: "Robust Linear (Huber)",
        notes: `Regresi linier Huber tahan anomali: y = ${scale} · x ${offset >= 0 ? "+" : "-"} ${Math.abs(offset)}.`,
      };
    }

    case "polynomial_regression": {
      // y (ERA5) = a * x^2 + b * x + c
      const fit = fitPolynomialRegression(swappedPairs);
      const polyA = Number.isFinite(fit.a) ? fit.a : 0;
      const polyB = Number.isFinite(fit.b) ? fit.b : 1;
      const polyC = Number.isFinite(fit.c) ? fit.c : 0;
      return {
        sensorData: {
          enabled: true,
          method: "polynomial",
          polyA,
          polyB,
          polyC,
        },
        methodName: "Polynomial (Derajat 2)",
        notes: `Kurva kuadratik: y = ${polyA}·x² + ${polyB}·x ${polyC >= 0 ? "+" : "-"} ${Math.abs(polyC)}.`,
      };
    }

    case "power_law": {
      // y (ERA5) = a * (x ^ b)
      const fit = fitPowerLawScaling(swappedPairs);
      const powerA = Number.isFinite(fit.a) ? fit.a : 1;
      const powerB = Number.isFinite(fit.b) ? fit.b : 1;
      return {
        sensorData: {
          enabled: true,
          method: "power_law",
          powerA,
          powerB,
        },
        methodName: "Power Law (y = a · x^b)",
        notes: `Fungsi eksponensial daya: y = ${powerA} · (x ^ ${powerB}).`,
      };
    }

    case "two_point": {
      // point1Raw: AWS p10, point1Ref: ERA5 p10
      // point2Raw: AWS p90, point2Ref: ERA5 p90
      const fit = fitTwoPointCalibration(swappedPairs);
      const point1Raw = Number.isFinite(fit.x1) ? fit.x1 : 0;
      const point1Ref = Number.isFinite(fit.y1) ? fit.y1 : 0;
      const point2Raw = Number.isFinite(fit.x2) ? fit.x2 : 100;
      const point2Ref = Number.isFinite(fit.y2) ? fit.y2 : 100;
      return {
        sensorData: {
          enabled: true,
          method: "two_point",
          point1Raw,
          point1Ref,
          point2Raw,
          point2Ref,
        },
        methodName: "Two-Point Interpolation",
        notes: `Titik acuan: P1(${point1Raw} -> ${point1Ref}), P2(${point2Raw} -> ${point2Ref}).`,
      };
    }

    case "zero_aware_rain": {
      // Kalibrasi pengali presipitasi: total(ERA5) / total(AWS)
      const validRain = calibrationPairs.filter(p => (p.aws || 0) > 0.1 || (p.era5 || 0) > 0.1);
      const sumAws = validRain.reduce((acc, p) => acc + (p.aws || 0), 0);
      const sumEra5 = validRain.reduce((acc, p) => acc + (p.era5 || 0), 0);
      const multiplier = sumAws > 0 && sumEra5 > 0 ? Number((sumEra5 / sumAws).toFixed(3)) : 1;
      return {
        sensorData: {
          enabled: true,
          method: "multiplier",
          multiplier,
        },
        methodName: "Multiplier (Curah Hujan)",
        notes: `Faktor pengali volume hujan: ×${multiplier} berdasarkan total akumulasi presipitasi ERA5.`,
      };
    }

    case "diurnal_mbe": {
      // Konversi Diurnal MBE (24 jam) ke offset rata-rata harian
      const fit = fitMeanBias(swappedPairs);
      const offset = Number.isFinite(fit.bias) ? fit.bias : 0;
      return {
        sensorData: {
          enabled: true,
          method: "offset",
          offset,
        },
        methodName: "Offset (Diurnal Mean)",
        notes: `Diurnal 24 jam dirangkum ke offset rata-rata harian (${offset >= 0 ? "+" : ""}${offset}) agar kompatibel dengan runtime sensor IoT.`,
      };
    }

    case "quantile_mapping":
    case "quantile_delta_mapping": {
      // Quantile Mapping adalah kurva non-parametrik (100 kuantil).
      // Untuk runtime IoT di Firestore, kita aproksimasi secara robust menggunakan Robust Linear (Huber)
      // agar tidak mendistorsi pembacaan sensor dengan tabel lookup yang besar.
      const fit = fitRobustHuberRegression(swappedPairs);
      const scale = Number.isFinite(fit.slope) ? fit.slope : 1;
      const offset = Number.isFinite(fit.intercept) ? fit.intercept : 0;
      return {
        sensorData: {
          enabled: true,
          method: "robust_linear",
          scale,
          offset,
        },
        methodName: "Robust Linear (Aproksimasi ECDF)",
        notes: `Distribusi kuantil non-parametrik dikonversi ke regresi robust linear (Huber) agar dapat dievaluasi real-time di Firestore tanpa latensi.`,
      };
    }

    case "circular_wind": {
      // Offset arah angin (mod 360)
      const diffs = calibrationPairs
        .filter(p => typeof p.aws === "number" && typeof p.era5 === "number")
        .map(p => {
          let d = p.era5 - p.aws;
          while (d > 180) d -= 360;
          while (d < -180) d += 360;
          return d;
        });
      const avgDiff = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
      const offset = Number(avgDiff.toFixed(1));
      return {
        sensorData: {
          enabled: true,
          method: "offset",
          offset,
        },
        methodName: "Offset Sudut Arah Angin",
        notes: `Koreksi sudut azimut: ${offset >= 0 ? "+" : ""}${offset}° (dibungkus modulo 360°).`,
      };
    }

    default: {
      const fit = fitMeanBias(swappedPairs);
      const offset = Number.isFinite(fit.bias) ? fit.bias : 0;
      return {
        sensorData: {
          enabled: true,
          method: "offset",
          offset,
        },
        methodName: "Offset",
        notes: `Offset aditif dasar: ${offset >= 0 ? "+" : ""}${offset}.`,
      };
    }
  }
}
