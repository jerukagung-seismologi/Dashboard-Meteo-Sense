// scratch/calibrate_nodes.js
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const meteoDb = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/meteo_local_cache.db');
const era5Db = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/era5_data.db');

// --- 1. Ambil seluruh data ERA5 ke memory map ---
console.log("1. Memuat seluruh data ERA5 dari era5_data.db ke memori...");
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
console.log(`Total data ERA5 termuat: ${era5Map.size} jam.`);

// --- 2. Fungsi Fitting Matematis (AWS Mentah -> ERA5 Standar) ---
function fitOLS(pairs) {
  const n = pairs.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of pairs) {
    sumX += p.aws;
    sumY += p.era5;
    sumXY += p.aws * p.era5;
    sumXX += p.aws * p.aws;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return { slope: 1, intercept: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope: Number(slope.toFixed(4)), intercept: Number(intercept.toFixed(4)) };
}

function fitHuber(pairs, maxIter = 10, delta = 1.345) {
  const n = pairs.length;
  if (n < 4) return { slope: 1, intercept: 0 };
  let { slope, intercept } = fitOLS(pairs);

  for (let iter = 0; iter < maxIter; iter++) {
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
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

function fitOffset(pairs) {
  if (pairs.length === 0) return 0;
  const sumDiff = pairs.reduce((acc, p) => acc + (p.era5 - p.aws), 0);
  return Number((sumDiff / pairs.length).toFixed(3));
}

function calculateMetrics(pairs, predFn) {
  if (pairs.length === 0) return { rawRmse: 0, calRmse: 0, rmseImprovement: 0 };
  let sumSqErrRaw = 0;
  let sumSqErrCal = 0;
  let n = pairs.length;

  for (const p of pairs) {
    const rawErr = p.aws - p.era5;
    sumSqErrRaw += rawErr * rawErr;

    const calVal = predFn(p.aws);
    const calErr = calVal - p.era5;
    sumSqErrCal += calErr * calErr;
  }

  const rawRmse = Math.sqrt(sumSqErrRaw / n);
  const calRmse = Math.sqrt(sumSqErrCal / n);
  const rmseImprovement = rawRmse > 0 ? Number((((rawRmse - calRmse) / rawRmse) * 100).toFixed(1)) : 0;

  return {
    rawRmse: Number(rawRmse.toFixed(3)),
    calRmse: Number(calRmse.toFixed(3)),
    rmseImprovement
  };
}

// --- 3. Analisis untuk satu stasiun ---
function processStation(stationId, stationName) {
  console.log(`\n============================================================`);
  console.log(`ANALISIS DAN FITTING UNTUK STASIUN: ${stationName} (${stationId})`);
  console.log(`============================================================`);

  const awsHourly = meteoDb.prepare(`
    SELECT 
      (unix_ts / 3600) * 3600 as hour_ts,
      count(*) as count,
      avg(temperature) as aws_temp,
      avg(humidity) as aws_hum,
      avg(pressure) as aws_press
    FROM aws_measurements 
    WHERE station_id = ? 
      AND temperature IS NOT NULL AND temperature >= 10 AND temperature <= 50
      AND humidity IS NOT NULL AND humidity >= 10 AND humidity <= 100
    GROUP BY (unix_ts / 3600)
    HAVING count >= 10
    ORDER BY hour_ts ASC
  `).all(stationId);

  console.log(`Data jam observasi valid: ${awsHourly.length}`);

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
      if (typeof a.aws_press === 'number' && typeof e.era5_press === 'number' && a.aws_press >= 950 && a.aws_press <= 1050 && e.era5_press > 900) {
        pressPairs.push({ aws: a.aws_press, era5: e.era5_press });
      }
    }
  }

  console.log(`Pasangan tercocokkan dengan ERA5: Suhu = ${tempPairs.length}, RH = ${humPairs.length}, Tekanan = ${pressPairs.length}`);

  // SUHU
  const tempHuber = fitHuber(tempPairs);
  const tempOffset = fitOffset(tempPairs);
  const tempHuberMetrics = calculateMetrics(tempPairs, x => x * tempHuber.slope + tempHuber.intercept);
  const tempOffsetMetrics = calculateMetrics(tempPairs, x => x + tempOffset);

  // Pilih antara Huber atau Offset murni tergantung improvement
  let selectedTempConfig;
  if (tempHuberMetrics.rmseImprovement >= tempOffsetMetrics.rmseImprovement && tempHuber.slope > 0.4 && tempHuber.slope < 1.6) {
    selectedTempConfig = {
      enabled: true,
      method: "robust_linear",
      scale: tempHuber.slope,
      offset: tempHuber.intercept,
      metrics: tempHuberMetrics
    };
  } else {
    selectedTempConfig = {
      enabled: true,
      method: "offset",
      offset: tempOffset,
      metrics: tempOffsetMetrics
    };
  }

  console.log(`[Suhu] Terpilih: ${selectedTempConfig.method} | RMSE: ${selectedTempConfig.metrics.rawRmse}°C -> ${selectedTempConfig.metrics.calRmse}°C (Peningkatan: +${selectedTempConfig.metrics.rmseImprovement}%)`);

  // KELEMBABAN
  const humOffset = fitOffset(humPairs);
  const humOffsetMetrics = calculateMetrics(humPairs, x => Math.max(0, Math.min(100, x + humOffset)));
  console.log(`[Kelembaban] Offset: ${humOffset >= 0 ? '+' : ''}${humOffset}% | RMSE: ${humOffsetMetrics.rawRmse}% -> ${humOffsetMetrics.calRmse}% (Peningkatan: +${humOffsetMetrics.rmseImprovement}%)`);

  // TEKANAN
  let pressOffset = 0;
  let pressMetrics = { rawRmse: 0, calRmse: 0, rmseImprovement: 0 };
  if (pressPairs.length > 20) {
    pressOffset = fitOffset(pressPairs);
    pressMetrics = calculateMetrics(pressPairs, x => x + pressOffset);
    console.log(`[Tekanan] Offset: ${pressOffset >= 0 ? '+' : ''}${pressOffset} hPa | RMSE: ${pressMetrics.rawRmse} hPa -> ${pressMetrics.calRmse} hPa (Peningkatan: +${pressMetrics.rmseImprovement}%)`);
  } else {
    pressOffset = -2.0; // estimasi elevasi default Kebumen
    console.log(`[Tekanan] Estimasi Barometer Offset: -2.00 hPa`);
  }

  // TITIK EMBUN
  const dewOffset = Number((tempOffset * 0.7).toFixed(2));

  const stationConfig = {
    stationId,
    enabled: true,
    temperature: {
      enabled: true,
      method: selectedTempConfig.method,
      ...(selectedTempConfig.method === "robust_linear" ? { scale: selectedTempConfig.scale, offset: selectedTempConfig.offset } : { offset: selectedTempConfig.offset })
    },
    humidity: {
      enabled: true,
      method: "offset",
      offset: humOffset
    },
    pressure: {
      enabled: true,
      method: "offset",
      offset: pressOffset
    },
    dew: {
      enabled: true,
      method: "offset",
      offset: dewOffset
    },
    rainfall: {
      enabled: true,
      method: "multiplier",
      multiplier: 1.0
    }
  };

  return {
    stationId,
    stationName,
    pairCount: tempPairs.length,
    config: stationConfig,
    tempMetrics: selectedTempConfig.metrics,
    humMetrics: humOffsetMetrics,
    pressMetrics: pressMetrics
  };
}

// --- 4. Firestore REST Save Functions ---
async function getAccessToken() {
  const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
  privateKey = privateKey.replace(/\\"/g, '').replace(/\\n/g, '\n').replace(/"/g, '').trim();

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore"
  };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const signature = signer.sign(privateKey, "base64url");
  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined && !(typeof v === 'number' && isNaN(v))) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function saveToFirestore(token, stationId, config) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "staklimjerukagung";
  const fields = {};
  for (const [k, v] of Object.entries(config)) {
    if (v !== undefined && !(typeof v === 'number' && isNaN(v))) {
      fields[k] = toFirestoreValue(v);
    }
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sensor_calibration/${stationId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gagal menyimpan ${stationId}: ${JSON.stringify(err)}`);
  }
  return await res.json();
}

// --- 5. Main Execution ---
async function main() {
  const stationsToCalibrate = [
    { id: "id-01", name: "Node ID-01 (Jerukagung Utama)" },
    { id: "id-03", name: "Node ID-03 (Ambal Pesisir)" },
    { id: "id-05", name: "Node ID-05 (Karanganyar)" }
  ];

  const results = [];
  for (const s of stationsToCalibrate) {
    results.push(processStation(s.id, s.name));
  }

  console.log("\n============================================================");
  console.log("MENYIMPAN KONFIGURASI KE FIRESTORE UNTUK KETIGA NODE...");
  console.log("============================================================");

  const token = await getAccessToken();
  console.log("Access token OAuth2 Google Cloud berhasil diperoleh.");

  for (const r of results) {
    console.log(`Menyimpan sensor_calibration/${r.stationId}...`);
    const saved = await saveToFirestore(token, r.stationId, r.config);
    console.log(`-> Sukses tersimpan pada ${saved.updateTime}`);
  }

  console.log("\n============================================================");
  console.log("RINGKASAN LENGKAP HASIL KALIBRASI ID-01, ID-03, ID-05");
  console.log("============================================================");
  for (const r of results) {
    console.log(`\nStasiun: ${r.stationName}`);
    console.log(`- Titik Sampel Matched: ${r.pairCount} jam`);
    console.log(`- Suhu (${r.config.temperature.method}):`, r.config.temperature);
    console.log(`  Peningkatan Akurasi Suhu: +${r.tempMetrics.rmseImprovement}% (RMSE ${r.tempMetrics.rawRmse}°C -> ${r.tempMetrics.calRmse}°C)`);
    console.log(`- Kelembaban (Offset): ${r.config.humidity.offset}%`);
    console.log(`  Peningkatan Akurasi RH: +${r.humMetrics.rmseImprovement}% (RMSE ${r.humMetrics.rawRmse}% -> ${r.humMetrics.calRmse}%)`);
    console.log(`- Tekanan (Offset): ${r.config.pressure.offset} hPa`);
    if (r.pressMetrics.rmseImprovement > 0) {
      console.log(`  Peningkatan Akurasi Tekanan: +${r.pressMetrics.rmseImprovement}% (RMSE ${r.pressMetrics.rawRmse} hPa -> ${r.pressMetrics.calRmse} hPa)`);
    }
  }
}

main().catch(err => console.error("Error eksekusi kalibrasi:", err));
