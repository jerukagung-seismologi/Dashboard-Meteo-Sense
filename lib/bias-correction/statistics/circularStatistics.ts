// lib/bias-correction/statistics/circularStatistics.ts

export interface CircularMetrics {
  sampleCount: number;
  meanDirectionDeg: number;
  circularMeanBiasDeg: number;
  meanAbsoluteAngularErrorDeg: number;
  rootMeanSquareAngularErrorDeg: number;
  circularStdDevDeg: number;
}

/**
 * Normalizes an angle into the [0, 360) range.
 */
export function normalizeAngle360(deg: number): number {
  let angle = deg % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Calculates the shortest signed angular difference between angle1 and angle2 in degrees.
 * Returns values in [-180, 180].
 * e.g. angle1 = 1, angle2 = 359 -> diff = +2 deg
 */
export function circularAngularDifference(angle1: number, angle2: number): number {
  const rad1 = (angle1 * Math.PI) / 180;
  const rad2 = (angle2 * Math.PI) / 180;
  const diffRad = Math.atan2(Math.sin(rad1 - rad2), Math.cos(rad1 - rad2));
  return (diffRad * 180) / Math.PI;
}

/**
 * Computes circular statistics between AWS and ERA5 wind direction series.
 */
export function calculateCircularMetrics(
  pairs: { awsDir: number; era5Dir: number; isCalm?: boolean }[]
): CircularMetrics {
  const valid = pairs.filter(
    p =>
      !p.isCalm &&
      p.awsDir !== null &&
      p.awsDir !== undefined &&
      !isNaN(p.awsDir) &&
      p.era5Dir !== null &&
      p.era5Dir !== undefined &&
      !isNaN(p.era5Dir)
  );

  const n = valid.length;
  if (n === 0) {
    return {
      sampleCount: 0,
      meanDirectionDeg: 0,
      circularMeanBiasDeg: 0,
      meanAbsoluteAngularErrorDeg: 0,
      rootMeanSquareAngularErrorDeg: 0,
      circularStdDevDeg: 0,
    };
  }

  let sumSinDiff = 0;
  let sumCosDiff = 0;
  let sumAbsDiff = 0;
  let sumSqDiff = 0;

  let sumSinAWS = 0;
  let sumCosAWS = 0;

  for (const p of valid) {
    const diff = circularAngularDifference(p.awsDir, p.era5Dir);
    const diffRad = (diff * Math.PI) / 180;
    sumSinDiff += Math.sin(diffRad);
    sumCosDiff += Math.cos(diffRad);
    sumAbsDiff += Math.abs(diff);
    sumSqDiff += diff * diff;

    const awsRad = (p.awsDir * Math.PI) / 180;
    sumSinAWS += Math.sin(awsRad);
    sumCosAWS += Math.cos(awsRad);
  }

  // Circular mean direction for AWS
  const meanAwsRad = Math.atan2(sumSinAWS / n, sumCosAWS / n);
  const meanDirectionDeg = normalizeAngle360((meanAwsRad * 180) / Math.PI);

  // Circular mean bias: atan2(E[sin(diff)], E[cos(diff)])
  const meanBiasRad = Math.atan2(sumSinDiff / n, sumCosDiff / n);
  const circularMeanBiasDeg = (meanBiasRad * 180) / Math.PI;

  const meanAbsoluteAngularErrorDeg = sumAbsDiff / n;
  const rootMeanSquareAngularErrorDeg = Math.sqrt(sumSqDiff / n);

  // Circular standard deviation: sqrt(-2 * ln(R))
  const R = Math.sqrt(Math.pow(sumSinDiff / n, 2) + Math.pow(sumCosDiff / n, 2));
  const circularStdDevRad = R > 0 && R < 1 ? Math.sqrt(-2 * Math.log(R)) : 0;
  const circularStdDevDeg = (circularStdDevRad * 180) / Math.PI;

  return {
    sampleCount: n,
    meanDirectionDeg: Number(meanDirectionDeg.toFixed(1)),
    circularMeanBiasDeg: Number(circularMeanBiasDeg.toFixed(1)),
    meanAbsoluteAngularErrorDeg: Number(meanAbsoluteAngularErrorDeg.toFixed(1)),
    rootMeanSquareAngularErrorDeg: Number(rootMeanSquareAngularErrorDeg.toFixed(1)),
    circularStdDevDeg: Number(circularStdDevDeg.toFixed(1)),
  };
}
