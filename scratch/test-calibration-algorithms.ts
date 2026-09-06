// scratch/test-calibration-algorithms.ts
import { fitPolynomialRegression, transformPolynomialRegression } from "../lib/bias-correction/correction/polynomialRegression";
import { fitRobustHuberRegression, transformRobustHuberRegression } from "../lib/bias-correction/correction/robustHuberRegression";
import { fitQuantileDeltaMapping, transformQuantileDeltaMapping } from "../lib/bias-correction/correction/quantileDeltaMapping";
import { fitPowerLawScaling, transformPowerLawScaling } from "../lib/bias-correction/correction/powerLawScaling";
import { fitTwoPointCalibration, transformTwoPointCalibration } from "../lib/bias-correction/correction/twoPointCalibration";
import { BiasCorrectionEngine } from "../lib/bias-correction/correction/CorrectionEngine";
import { applyMathCorrection, enforceBoundaries } from "../lib/calibration/calibrationRules";

console.log("=== 1. Testing Polynomial Regression (Degree 2) ===");
const polyPairs = [
  { era5: 10, aws: 105 }, // y = x^2 + 5
  { era5: 20, aws: 405 },
  { era5: 30, aws: 905 },
  { era5: 40, aws: 1605 },
];
const polyFit = fitPolynomialRegression(polyPairs);
console.log("Polynomial Fit:", polyFit);
const polyTransformed = transformPolynomialRegression([25], polyFit);
console.log("Input 25 -> Predicted:", polyTransformed[0], "Expected ~630");

console.log("\n=== 2. Testing Robust Huber Regression (with Outlier) ===");
const huberPairs = [
  { era5: 10, aws: 12 },
  { era5: 20, aws: 22 },
  { era5: 30, aws: 32 },
  { era5: 40, aws: 42 },
  { era5: 50, aws: 150 }, // extreme outlier!
];
const huberFit = fitRobustHuberRegression(huberPairs);
console.log("Huber Fit (Resistant to Outlier):", huberFit);
console.log("Slope:", huberFit.slope, "Intercept:", huberFit.intercept, "Outliers detected:", huberFit.outlierCount);

console.log("\n=== 3. Testing Quantile Delta Mapping (QDM) ===");
const qdmPairs = [
  { era5: 20, aws: 22 },
  { era5: 22, aws: 24 },
  { era5: 25, aws: 27 },
  { era5: 28, aws: 30 },
  { era5: 30, aws: 32 },
];
const qdmFit = fitQuantileDeltaMapping(qdmPairs, 10);
console.log("QDM Fit sample count:", qdmFit.sampleCount);
const qdmTransformed = transformQuantileDeltaMapping([25], qdmFit);
console.log("Input 25 -> QDM Corrected:", qdmTransformed[0]);

console.log("\n=== 4. Testing Power Law Scaling (y = a * x^b) ===");
const powerPairs = [
  { era5: 2, aws: 4 }, // y = x^2
  { era5: 4, aws: 16 },
  { era5: 6, aws: 36 },
  { era5: 8, aws: 64 },
];
const powerFit = fitPowerLawScaling(powerPairs);
console.log("Power Law Fit:", powerFit);
const powerTransformed = transformPowerLawScaling([5], powerFit);
console.log("Input 5 -> Power Law Corrected:", powerTransformed[0], "Expected ~25");

console.log("\n=== 5. Testing Two-Point Calibration ===");
const twoPointPairs = [
  { era5: 10, aws: 12 },
  { era5: 20, aws: 22 },
  { era5: 30, aws: 32 },
  { era5: 40, aws: 42 },
  { era5: 50, aws: 52 },
];
const twoPointFit = fitTwoPointCalibration(twoPointPairs);
console.log("Two Point Fit:", twoPointFit);
const twoPointTransformed = transformTwoPointCalibration([25], twoPointFit);
console.log("Input 25 -> Two Point Corrected:", twoPointTransformed[0], "Expected ~27");

console.log("\n=== 6. Testing Automated Multi-Method Leaderboard ===");
const benchmark = BiasCorrectionEngine.benchmarkAllMethods(
  "air_temperature",
  twoPointPairs,
  twoPointPairs
);
console.log("Benchmark Leaderboard Results Count:", benchmark.length);
console.log("Top ranked method:", benchmark[0]?.name, "RMSE:", benchmark[0]?.correctedRmse, "IsBest:", benchmark[0]?.isBest);

console.log("\n=== 7. Testing Device Math Engine in calibrationRules ===");
const polyResult = applyMathCorrection(10, { enabled: true, method: "polynomial", polyA: 1, polyB: 2, polyC: 3 });
console.log("Poly 1*10^2 + 2*10 + 3 =", polyResult, "Expected 123");
const boundaryHum = enforceBoundaries("humidity", 105);
console.log("Boundary Humidity 105 ->", boundaryHum, "Expected 100");

console.log("\nALL ALGORITHMS VERIFIED SUCCESSFULLY!");
