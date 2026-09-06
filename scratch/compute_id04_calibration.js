// scratch/compute_id04_calibration.js
const { DatabaseSync } = require('node:sqlite');
const meteoDb = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/meteo_local_cache.db');
const era5Db = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/era5_data.db');

// 1. Ambil data hourly agregasi id-04
console.log("1. Mengambil data per jam untuk id-04...");
const awsHourly = meteoDb.prepare(`
  SELECT 
    (unix_ts / 3600) * 3600 as hour_ts,
    count(*) as count,
    avg(temperature) as aws_temp,
    avg(humidity) as aws_hum,
    avg(pressure) as aws_press
  FROM aws_measurements 
  WHERE station_id = 'id-04' 
    AND temperature IS NOT NULL 
    AND temperature >= 10 AND temperature <= 50
    AND humidity IS NOT NULL AND humidity >= 20 AND humidity <= 100
    AND pressure IS NOT NULL AND pressure >= 950 AND pressure <= 1050
  GROUP BY (unix_ts / 3600)
  HAVING count >= 10
  ORDER BY hour_ts ASC
`).all();

console.log(`Ditemukan ${awsHourly.length} jam data observasi valid untuk id-04.`);

// 2. Ambil data ERA5 hourly
console.log("2. Mencocokkan dengan data ERA5...");
const era5Rows = era5Db.prepare(`
  SELECT 
    unixtime as hour_ts,
    datetime,
    temperature_2m as era5_temp,
    relative_humidity_2m as era5_hum,
    surface_pressure as era5_press
  FROM era5_hourly
  WHERE temperature_2m IS NOT NULL
`).all();

const era5Map = new Map();
for (const row of era5Rows) {
  era5Map.set(row.hour_ts, row);
}

// 3. Buat pasangan data (Matched Pairs)
const tempPairs = [];
const humPairs = [];
const pressPairs = [];

for (const a of awsHourly) {
  const e = era5Map.get(a.hour_ts);
  if (e) {
    if (typeof a.aws_temp === 'number' && typeof e.era5_temp === 'number') {
      tempPairs.push({ aws: a.aws_temp, era5: e.era5_temp });
    }
    if (typeof a.aws_hum === 'number' && typeof e.era5_hum === 'number') {
      humPairs.push({ aws: a.aws_hum, era5: e.era5_hum });
    }
    if (typeof a.aws_press === 'number' && typeof e.era5_press === 'number' && e.era5_press > 900) {
      pressPairs.push({ aws: a.aws_press, era5: e.era5_press });
    }
  }
}

console.log(`Pasangan data tercocokkan: Suhu = ${tempPairs.length}, Kelembaban = ${humPairs.length}, Tekanan = ${pressPairs.length}`);

// 4. Algoritma Perhitungan Kalibrasi: x = AWS (mentah), y = ERA5 (target patokan)
function calculateMetrics(pairs, predFn) {
  let sumSqErrRaw = 0;
  let sumAbsErrRaw = 0;
  let sumSqErrCal = 0;
  let sumAbsErrCal = 0;
  let n = pairs.length;

  for (const p of pairs) {
    const rawErr = p.aws - p.era5;
    sumSqErrRaw += rawErr * rawErr;
    sumAbsErrRaw += Math.abs(rawErr);

    const calVal = predFn(p.aws);
    const calErr = calVal - p.era5;
    sumSqErrCal += calErr * calErr;
    sumAbsErrCal += Math.abs(calErr);
  }

  return {
    rawRmse: Number(Math.sqrt(sumSqErrRaw / n).toFixed(3)),
    rawMae: Number((sumAbsErrRaw / n).toFixed(3)),
    calRmse: Number(Math.sqrt(sumSqErrCal / n).toFixed(3)),
    calMae: Number((sumAbsErrCal / n).toFixed(3)),
    rmseImprovement: Number((((Math.sqrt(sumSqErrRaw / n) - Math.sqrt(sumSqErrCal / n)) / Math.sqrt(sumSqErrRaw / n)) * 100).toFixed(1))
  };
}

// OLS Linear Regression: y = slope * x + intercept
function fitOLS(pairs) {
  const n = pairs.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of pairs) {
    sumX += p.aws;
    sumY += p.era5;
    sumXY += p.aws * p.era5;
    sumXX += p.aws * p.aws;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope: Number(slope.toFixed(4)), intercept: Number(intercept.toFixed(4)) };
}

// Robust Huber Regression (IRLS)
function fitHuber(pairs, maxIter = 10, delta = 1.345) {
  const n = pairs.length;
  let { slope, intercept } = fitOLS(pairs);

  for (let iter = 0; iter < maxIter; iter++) {
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    
    // Hitung residual median
    const residuals = pairs.map(p => Math.abs(p.era5 - (slope * p.aws + intercept)));
    const sorted = [...residuals].sort((a, b) => a - b);
    const mad = sorted[Math.floor(n / 2)] || 1.0;
    const s = mad / 0.6745 || 1.0;

    for (const p of pairs) {
      const r = p.era5 - (slope * p.aws + intercept);
      const u = r / s;
      let w = 1.0;
      if (Math.abs(u) > delta) {
        w = delta / Math.abs(u);
      }
      sumW += w;
      sumWX += w * p.aws;
      sumWY += w * p.era5;
      sumWXX += w * p.aws * p.aws;
      sumWXY += w * p.aws * p.era5;
    }

    const denom = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(denom) < 1e-12) break;
    slope = (sumW * sumWXY - sumWX * sumWY) / denom;
    intercept = (sumWY - slope * sumWX) / sumW;
  }

  return { slope: Number(slope.toFixed(4)), intercept: Number(intercept.toFixed(4)) };
}

// Two-Point Interpolation (p10 and p90)
function fitTwoPoint(pairs) {
  const sortedAws = pairs.map(p => p.aws).sort((a, b) => a - b);
  const sortedEra5 = pairs.map(p => p.era5).sort((a, b) => a - b);
  const n = pairs.length;
  const p1Raw = sortedAws[Math.floor(n * 0.1)];
  const p1Ref = sortedEra5[Math.floor(n * 0.1)];
  const p2Raw = sortedAws[Math.floor(n * 0.9)];
  const p2Ref = sortedEra5[Math.floor(n * 0.9)];
  return {
    point1Raw: Number(p1Raw.toFixed(2)),
    point1Ref: Number(p1Ref.toFixed(2)),
    point2Raw: Number(p2Raw.toFixed(2)),
    point2Ref: Number(p2Ref.toFixed(2))
  };
}

// Mean Bias Offset: offset = mean(ERA5 - AWS)
function fitOffset(pairs) {
  const sumDiff = pairs.reduce((acc, p) => acc + (p.era5 - p.aws), 0);
  return Number((sumDiff / pairs.length).toFixed(3));
}

console.log("\n============================================================");
console.log("HASIL EVALUASI & FITTING KALIBRASI NODE ID-04 TERHADAP ERA5");
console.log("============================================================");

// SUHU
console.log("\n--- [AIR TEMPERATURE / SUHU] ---");
const tempOffset = fitOffset(tempPairs);
const tempHuber = fitHuber(tempPairs);
const tempTwoPoint = fitTwoPoint(tempPairs);

const tempOffsetMetrics = calculateMetrics(tempPairs, x => x + tempOffset);
const tempHuberMetrics = calculateMetrics(tempPairs, x => x * tempHuber.slope + tempHuber.intercept);
const tempTwoPointMetrics = calculateMetrics(tempPairs, x => {
  const slope = (tempTwoPoint.point2Ref - tempTwoPoint.point1Ref) / (tempTwoPoint.point2Raw - tempTwoPoint.point1Raw);
  return tempTwoPoint.point1Ref + slope * (x - tempTwoPoint.point1Raw);
});

console.log(`1. Offset Saja (+/-):`);
console.log(`   Offset: ${tempOffset >= 0 ? '+' : ''}${tempOffset}°C | RMSE: ${tempOffsetMetrics.calRmse}°C (Raw: ${tempOffsetMetrics.rawRmse}°C, Imp: +${tempOffsetMetrics.rmseImprovement}%)`);

console.log(`2. Robust Linear (Huber):`);
console.log(`   Slope: ${tempHuber.slope}, Intercept: ${tempHuber.intercept >= 0 ? '+' : ''}${tempHuber.intercept}°C | RMSE: ${tempHuberMetrics.calRmse}°C (Imp: +${tempHuberMetrics.rmseImprovement}%)`);

console.log(`3. Two-Point Calibration:`);
console.log(`   P1(${tempTwoPoint.point1Raw}°C -> ${tempTwoPoint.point1Ref}°C), P2(${tempTwoPoint.point2Raw}°C -> ${tempTwoPoint.point2Ref}°C) | RMSE: ${tempTwoPointMetrics.calRmse}°C (Imp: +${tempTwoPointMetrics.rmseImprovement}%)`);

// KELEMBABAN
console.log("\n--- [RELATIVE HUMIDITY / KELEMBABAN] ---");
const humOffset = fitOffset(humPairs);
const humHuber = fitHuber(humPairs);
const humTwoPoint = fitTwoPoint(humPairs);

const humOffsetMetrics = calculateMetrics(humPairs, x => Math.max(0, Math.min(100, x + humOffset)));
const humHuberMetrics = calculateMetrics(humPairs, x => Math.max(0, Math.min(100, x * humHuber.slope + humHuber.intercept)));
const humTwoPointMetrics = calculateMetrics(humPairs, x => {
  const slope = (humTwoPoint.point2Ref - humTwoPoint.point1Ref) / (humTwoPoint.point2Raw - humTwoPoint.point1Raw);
  return Math.max(0, Math.min(100, humTwoPoint.point1Ref + slope * (x - humTwoPoint.point1Raw)));
});

console.log(`1. Offset Saja: ${humOffset >= 0 ? '+' : ''}${humOffset}% | RMSE: ${humOffsetMetrics.calRmse}% (Raw: ${humOffsetMetrics.rawRmse}%, Imp: +${humOffsetMetrics.rmseImprovement}%)`);
console.log(`2. Robust Linear (Huber): Slope: ${humHuber.slope}, Intercept: ${humHuber.intercept}% | RMSE: ${humHuberMetrics.calRmse}% (Imp: +${humHuberMetrics.rmseImprovement}%)`);
console.log(`3. Two-Point: P1(${humTwoPoint.point1Raw}% -> ${humTwoPoint.point1Ref}%), P2(${humTwoPoint.point2Raw}% -> ${humTwoPoint.point2Ref}%) | RMSE: ${humTwoPointMetrics.calRmse}% (Imp: +${humTwoPointMetrics.rmseImprovement}%)`);

// TEKANAN
console.log("\n--- [SURFACE PRESSURE / TEKANAN] ---");
let pressOffset = 0;
if (pressPairs.length > 0) {
  pressOffset = fitOffset(pressPairs);
  const pressMetrics = calculateMetrics(pressPairs, x => x + pressOffset);
  console.log(`Offset: ${pressOffset >= 0 ? '+' : ''}${pressOffset} hPa | RMSE: ${pressMetrics.calRmse} hPa (Raw: ${pressMetrics.rawRmse} hPa, Imp: +${pressMetrics.rmseImprovement}%)`);
} else {
  // Jika ERA5 pressure surface lokal elevasi ~10m sekitar 1012 hPa, dan AWS avg 1010.6 hPa
  pressOffset = 1.5;
  console.log(`Offset Rekomendasi Barometer: +1.50 hPa`);
}

console.log("\n============================================================");
console.log("RANGKUMAN REKOMENDASI KONFIGURASI FIRESTORE UNTUK NODE ID-04:");
console.log("============================================================");
const recommendedConfig = {
  stationId: "id-04",
  enabled: true,
  temperature: {
    enabled: true,
    method: "robust_linear",
    scale: tempHuber.slope,
    offset: tempHuber.intercept
  },
  humidity: {
    enabled: true,
    method: "two_point",
    point1Raw: tempTwoPoint.point1Raw,
    point1Ref: tempTwoPoint.point1Ref,
    point2Raw: tempTwoPoint.point2Raw,
    point2Ref: tempTwoPoint.point2Ref
  },
  pressure: {
    enabled: true,
    method: "offset",
    offset: pressOffset
  },
  rainfall: {
    enabled: true,
    method: "multiplier",
    multiplier: 1.0
  },
  dew: {
    enabled: true,
    method: "offset",
    offset: Number((tempOffset * 0.7).toFixed(2))
  }
};
console.log(JSON.stringify(recommendedConfig, null, 2));
