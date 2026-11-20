// lib/forecasting/meteorologicalFeatures.ts
/**
 * Pipeline Rekayasa Fitur Meteorologi & Deret Waktu (Meteorological Feature Engineering)
 * untuk Model Prediksi Machine Learning (XGBoost, Random Forest, LSTM).
 *
 * Menghasilkan:
 * 1. Encoding Waktu Siklik Sinusoidal (sin/cos jam, bulan, DOY)
 * 2. Variabel Fisis Turunan (Dew Point, VPD, Apparent Temperature)
 * 3. Statistik Jendela Bergerak (Perubahan 3 jam, StdDev 24 jam, Akumulasi Hujan 3h & 24h)
 * 4. Z-Score Anomali terhadap Normal Klimatologis Bulanan-Jam
 * 5. Imputasi Missing Value Tanpa Data Leakage (Forward-Fill Terbatas / LOCF)
 */

export interface RawMeteorologicalRecord {
  timestamp: number | string | Date;
  temperature?: number | null; // °C
  humidity?: number | null;    // % (0-100)
  pressure?: number | null;    // hPa
  windSpeed?: number | null;   // m/s
  windDirection?: number | null; // derajat (0-360)
  rainfall?: number | null;    // mm
  solarRadiation?: number | null; // W/m²
}

export interface EngineeredMeteorologicalFeatureRow {
  timestampMs: number;
  dateTimeStr: string;

  // Fitur Primer (Telah dibersihkan/diimputasi)
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  rainfall: number;
  solarRadiation: number;

  // 1. Encoding Waktu Siklik
  sinHour: number; // [-1, 1]
  cosHour: number; // [-1, 1]
  sinMonth: number; // [-1, 1]
  cosMonth: number; // [-1, 1]
  sinDayOfYear: number; // [-1, 1]
  cosDayOfYear: number; // [-1, 1]

  // 2. Variabel Fisis Turunan
  dewPoint: number; // °C (Magnus-Tetens)
  vpd: number;      // Vapor Pressure Deficit (kPa)
  apparentTemperature: number; // °C (Steadman)

  // 3. Statistik Rolling Window
  tempChange3h: number;     // T_t - T_{t-3} (°C)
  pressureChange3h: number; // P_t - P_{t-3} (hPa)
  humidityChange3h: number; // RH_t - RH_{t-3} (%)
  tempStdDev24h: number;    // stddev(T, 24 jam)
  humidityStdDev24h: number;// stddev(RH, 24 jam)
  rainfallAccum3h: number;  // sum(R, 3 jam) (mm)
  rainfallAccum24h: number; // sum(R, 24 jam) (mm)

  // 4. Z-Score Anomali terhadap Klimatologi Bulanan-Jam
  tempAnomalyZScore: number;
  pressureAnomalyZScore: number;
}

// Rata-rata & Simpangan Baku Normal Klimatologi Sintetis Jawa Tengah / Kebumen
// Format: Key = `${month}_${hour}`
export interface MonthlyHourClimatologyLookup {
  [key: string]: {
    meanTemp: number;
    stdTemp: number;
    meanPres: number;
    stdPres: number;
  };
}

/**
 * Menghasilkan tabel referensi normal klimatologi default Kebumen
 */
export function getDefaultKebumenClimatologyLookup(): MonthlyHourClimatologyLookup {
  const lookup: MonthlyHourClimatologyLookup = {};

  for (let m = 0; m < 12; m++) {
    // Variasi musiman suhu: lebih hangat di musim pancaroba (Okt-Nov, Mar-Apr)
    const seasonalTempShift = Math.sin((m / 12) * 2 * Math.PI - 1) * 1.2;
    // Tekanan permukaan Kebumen rata-rata ~1011 hPa
    const seasonalPresShift = Math.cos((m / 12) * 2 * Math.PI) * 1.5;

    for (let h = 0; h < 24; h++) {
      // Siklus diurnal suhu: minimum pukul 05:00, maksimum pukul 13:00
      const diurnalTempShift = Math.sin(((h - 8) / 24) * 2 * Math.PI) * 4.5;
      const diurnalPresShift = -Math.sin(((h - 9) / 12) * 2 * Math.PI) * 1.8; // Gelombang pasang surut atmosfer semidiurnal

      const meanTemp = Number((27.5 + seasonalTempShift + diurnalTempShift).toFixed(2));
      const meanPres = Number((1011.0 + seasonalPresShift + diurnalPresShift).toFixed(2));

      lookup[`${m}_${h}`] = {
        meanTemp,
        stdTemp: 1.5,
        meanPres,
        stdPres: 2.0,
      };
    }
  }

  return lookup;
}

/**
 * Perhitungan Dew Point (°C) dengan Formula Magnus-Tetens
 */
export function calculateDewPointCelsius(tempC: number, rh: number): number {
  const clampedRh = Math.max(1, Math.min(100, rh));
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(clampedRh / 100);
  const dp = (b * alpha) / (a - alpha);
  return Number(dp.toFixed(2));
}

/**
 * Perhitungan Vapor Pressure Deficit (VPD dalam kPa)
 * es = 0.61078 * exp( (17.27 * T) / (T + 237.3) )
 * ea = es * (RH / 100)
 * VPD = es - ea
 */
export function calculateVaporPressureDeficitKPa(tempC: number, rh: number): number {
  const clampedRh = Math.max(1, Math.min(100, rh));
  const es = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const ea = es * (clampedRh / 100);
  const vpd = Math.max(0, es - ea);
  return Number(vpd.toFixed(3));
}

/**
 * Perhitungan Apparent Temperature (°C) — Formula Steadman / Australian Bureau of Meteorology
 * T_app = T + 0.33 * e_a - 0.70 * ws - 4.00
 * di mana e_a dalam hPa (1 kPa = 10 hPa)
 */
export function calculateApparentTemperatureCelsius(
  tempC: number,
  rh: number,
  windSpeedMs: number
): number {
  const clampedRh = Math.max(1, Math.min(100, rh));
  const esHPa = 6.1078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const eaHPa = esHPa * (clampedRh / 100);
  const apparent = tempC + 0.33 * eaHPa - 0.7 * Math.max(0, windSpeedMs) - 4.0;
  return Number(apparent.toFixed(2));
}

/**
 * Menghitung Day of Year (1 - 366)
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Menghitung deviasi standar dari array angka
 */
function calculateStdDev(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sumSq = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
  return Number(Math.sqrt(sumSq / (arr.length - 1)).toFixed(2));
}

/**
 * Pipeline Utama: Mengubah deret observasi mentah menjadi feature matrix
 * siap latih dan inferensi untuk model machine learning.
 */
export function engineerMeteorologicalFeatures(
  rawRecords: RawMeteorologicalRecord[],
  climatologyLookup?: MonthlyHourClimatologyLookup,
  maxLocfLagHours: number = 6
): EngineeredMeteorologicalFeatureRow[] {
  if (!rawRecords || rawRecords.length === 0) return [];

  const lookup = climatologyLookup || getDefaultKebumenClimatologyLookup();

  // 1. Urutkan data secara kronologis menaik
  const sorted = [...rawRecords].map((r) => {
    const tMs =
      typeof r.timestamp === "number"
        ? r.timestamp
        : new Date(r.timestamp).getTime();
    return { ...r, timestampMs: tMs };
  }).sort((a, b) => a.timestampMs - b.timestampMs);

  // 2. Sequential Imputation (Forward-Fill / LOCF terikat lag bebas data leakage)
  let lastKnownTemp = 28.0;
  let lastKnownHum = 80.0;
  let lastKnownPres = 1011.5;
  let lastKnownWindSpeed = 2.5;
  let lastKnownWindDir = 180;
  let lastKnownRad = 0;

  let lastTempTime = 0;
  let lastHumTime = 0;
  let lastPresTime = 0;

  const maxLagMs = maxLocfLagHours * 60 * 60 * 1000;

  const cleanRows: {
    timestampMs: number;
    date: Date;
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    rainfall: number;
    solarRadiation: number;
  }[] = [];

  for (const r of sorted) {
    const date = new Date(r.timestampMs);

    // Suhu
    if (typeof r.temperature === "number" && !isNaN(r.temperature)) {
      lastKnownTemp = r.temperature;
      lastTempTime = r.timestampMs;
    } else if (r.timestampMs - lastTempTime > maxLagMs) {
      // Jika gap terlalu panjang, gunakan rata-rata diurnal klimatologi
      const m = date.getMonth();
      const h = date.getHours();
      lastKnownTemp = lookup[`${m}_${h}`]?.meanTemp ?? 28.0;
    }

    // Kelembapan
    if (typeof r.humidity === "number" && !isNaN(r.humidity)) {
      lastKnownHum = Math.max(10, Math.min(100, r.humidity));
      lastHumTime = r.timestampMs;
    } else if (r.timestampMs - lastHumTime > maxLagMs) {
      lastKnownHum = 80.0;
    }

    // Tekanan
    if (typeof r.pressure === "number" && !isNaN(r.pressure)) {
      lastKnownPres = r.pressure;
      lastPresTime = r.timestampMs;
    } else if (r.timestampMs - lastPresTime > maxLagMs) {
      const m = date.getMonth();
      const h = date.getHours();
      lastKnownPres = lookup[`${m}_${h}`]?.meanPres ?? 1011.5;
    }

    // Angin
    if (typeof r.windSpeed === "number" && !isNaN(r.windSpeed)) {
      lastKnownWindSpeed = Math.max(0, r.windSpeed);
    }
    if (typeof r.windDirection === "number" && !isNaN(r.windDirection)) {
      lastKnownWindDir = ((r.windDirection % 360) + 360) % 360;
    }

    // Hujan (missing diisi 0 mm, bukan forward-fill agar tidak overestimasi durasi hujan)
    const rainfall = typeof r.rainfall === "number" && !isNaN(r.rainfall) ? Math.max(0, r.rainfall) : 0;

    // Radiasi
    if (typeof r.solarRadiation === "number" && !isNaN(r.solarRadiation)) {
      lastKnownRad = Math.max(0, r.solarRadiation);
    } else {
      // Malam hari (18:00 - 05:00) radiasi pasti 0
      const h = date.getHours();
      lastKnownRad = h >= 6 && h <= 17 ? 350 : 0;
    }

    cleanRows.push({
      timestampMs: r.timestampMs,
      date,
      temperature: Number(lastKnownTemp.toFixed(2)),
      humidity: Number(lastKnownHum.toFixed(1)),
      pressure: Number(lastKnownPres.toFixed(2)),
      windSpeed: Number(lastKnownWindSpeed.toFixed(2)),
      windDirection: Number(lastKnownWindDir.toFixed(1)),
      rainfall: Number(rainfall.toFixed(2)),
      solarRadiation: Number(lastKnownRad.toFixed(1)),
    });
  }

  // 3. Ekstraksi Fitur Rolling Window & Derivasi Meteorologi
  const result: EngineeredMeteorologicalFeatureRow[] = [];

  for (let i = 0; i < cleanRows.length; i++) {
    const row = cleanRows[i];
    const date = row.date;
    const hour = date.getHours();
    const month = date.getMonth(); // 0 - 11
    const doy = getDayOfYear(date);

    // 1. Encoding Siklik Waktu
    const sinHour = Number(Math.sin((2 * Math.PI * hour) / 24).toFixed(4));
    const cosHour = Number(Math.cos((2 * Math.PI * hour) / 24).toFixed(4));
    const sinMonth = Number(Math.sin((2 * Math.PI * month) / 12).toFixed(4));
    const cosMonth = Number(Math.cos((2 * Math.PI * month) / 12).toFixed(4));
    const sinDayOfYear = Number(Math.sin((2 * Math.PI * doy) / 365.25).toFixed(4));
    const cosDayOfYear = Number(Math.cos((2 * Math.PI * doy) / 365.25).toFixed(4));

    // 2. Variabel Fisis Turunan
    const dewPoint = calculateDewPointCelsius(row.temperature, row.humidity);
    const vpd = calculateVaporPressureDeficitKPa(row.temperature, row.humidity);
    const apparentTemperature = calculateApparentTemperatureCelsius(
      row.temperature,
      row.humidity,
      row.windSpeed
    );

    // 3. Statistik Rolling Window
    // Cari index 3 jam ke belakang dan 24 jam ke belakang
    const threeHoursAgoMs = row.timestampMs - 3 * 60 * 60 * 1000;
    const dayAgoMs = row.timestampMs - 24 * 60 * 60 * 1000;

    let idx3h = i;
    while (idx3h > 0 && cleanRows[idx3h].timestampMs > threeHoursAgoMs) {
      idx3h--;
    }

    let idx24h = i;
    while (idx24h > 0 && cleanRows[idx24h].timestampMs > dayAgoMs) {
      idx24h--;
    }

    const tempChange3h = Number((row.temperature - cleanRows[idx3h].temperature).toFixed(2));
    const pressureChange3h = Number((row.pressure - cleanRows[idx3h].pressure).toFixed(2));
    const humidityChange3h = Number((row.humidity - cleanRows[idx3h].humidity).toFixed(1));

    // Rolling sum hujan 3h dan 24h
    let rain3hSum = 0;
    for (let k = idx3h; k <= i; k++) {
      rain3hSum += cleanRows[k].rainfall;
    }

    let rain24hSum = 0;
    const temp24hWindow: number[] = [];
    const hum24hWindow: number[] = [];

    for (let k = idx24h; k <= i; k++) {
      rain24hSum += cleanRows[k].rainfall;
      temp24hWindow.push(cleanRows[k].temperature);
      hum24hWindow.push(cleanRows[k].humidity);
    }

    const tempStdDev24h = calculateStdDev(temp24hWindow);
    const humidityStdDev24h = calculateStdDev(hum24hWindow);

    // 4. Z-Score Anomali Klimatologi
    const clim = lookup[`${month}_${hour}`] || {
      meanTemp: 28.0,
      stdTemp: 1.5,
      meanPres: 1011.5,
      stdPres: 2.0,
    };

    const tempAnomalyZScore = Number(
      ((row.temperature - clim.meanTemp) / (clim.stdTemp || 1.0)).toFixed(3)
    );
    const pressureAnomalyZScore = Number(
      ((row.pressure - clim.meanPres) / (clim.stdPres || 1.0)).toFixed(3)
    );

    result.push({
      timestampMs: row.timestampMs,
      dateTimeStr: date.toISOString(),
      temperature: row.temperature,
      humidity: row.humidity,
      pressure: row.pressure,
      windSpeed: row.windSpeed,
      windDirection: row.windDirection,
      rainfall: row.rainfall,
      solarRadiation: row.solarRadiation,
      sinHour,
      cosHour,
      sinMonth,
      cosMonth,
      sinDayOfYear,
      cosDayOfYear,
      dewPoint,
      vpd,
      apparentTemperature,
      tempChange3h,
      pressureChange3h,
      humidityChange3h,
      tempStdDev24h,
      humidityStdDev24h,
      rainfallAccum3h: Number(rain3hSum.toFixed(2)),
      rainfallAccum24h: Number(rain24hSum.toFixed(2)),
      tempAnomalyZScore,
      pressureAnomalyZScore,
    });
  }

  return result;
}
