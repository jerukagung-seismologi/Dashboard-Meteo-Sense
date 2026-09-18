// lib/climatology/etccdiIndices.ts
/**
 * Standar Indeks Iklim Ekstrem ETCCDI (Expert Team on Climate Change Detection and Indices)
 * Rujukan: WMO CCl/CLIVAR/JCOMM Expert Team on Climate Change Detection and Indices
 */

export interface EtccdiDailyRecord {
  dateStr: string; // "YYYY-MM-DD"
  tMax?: number; // °C
  tMin?: number; // °C
  tMean?: number; // °C
  precipitation: number; // mm
}

export interface EtccdiIndicesResult {
  // Presipitasi Ekstrem
  rx1day: { value: number; dateStr: string }; // Nilai tertinggi curah hujan 1 hari (mm)
  rx5day: { value: number; dateStr: string }; // Nilai tertinggi akumulasi 5 hari berturut-turut (mm)
  sdii: number; // Simple Daily Intensity Index (mm/hari hujan)
  r10mm: number; // Hari hujan >= 10 mm
  r20mm: number; // Hari hujan lebat >= 20 mm
  r50mm: number; // Hari hujan sangat lebat >= 50 mm
  r95p: { threshold: number; sumRain: number; count: number }; // Hujan sangat basah (> P95 hari basah)
  r99p: { threshold: number; sumRain: number; count: number }; // Hujan ekstrem (> P99 hari basah)
  cdd: number; // Hari Kering Berurutan maksimum (P < 1mm)
  cwd: number; // Hari Basah Berurutan maksimum (P >= 1mm)

  // Suhu Ekstrem
  su35: number; // Jumlah hari panas tropis (Tmax >= 35°C)
  su33: number; // Jumlah hari panas (Tmax >= 33°C)
  tr20: number; // Jumlah malam tropis (Tmin >= 20°C)
  txx: { value: number; dateStr: string }; // Suhu maksimum tertinggi (°C)
  tnn: { value: number; dateStr: string }; // Suhu minimum terendah (°C)
  dtrMean: number; // Rerata rentang suhu harian (Tmax - Tmin, °C)

  totalRain: number;
  wetDaysCount: number;
  totalDays: number;
}

/**
 * Menghitung seluruh Indeks Iklim Ekstrem ETCCDI
 */
export function calculateEtccdiIndices(records: EtccdiDailyRecord[]): EtccdiIndicesResult {
  if (!records || records.length === 0) {
    return {
      rx1day: { value: 0, dateStr: "-" },
      rx5day: { value: 0, dateStr: "-" },
      sdii: 0,
      r10mm: 0,
      r20mm: 0,
      r50mm: 0,
      r95p: { threshold: 0, sumRain: 0, count: 0 },
      r99p: { threshold: 0, sumRain: 0, count: 0 },
      cdd: 0,
      cwd: 0,
      su35: 0,
      su33: 0,
      tr20: 0,
      txx: { value: 0, dateStr: "-" },
      tnn: { value: 0, dateStr: "-" },
      dtrMean: 0,
      totalRain: 0,
      wetDaysCount: 0,
      totalDays: 0,
    };
  }

  let rx1Val = 0;
  let rx1Date = records[0].dateStr;

  let totalRain = 0;
  let wetDaysCount = 0;
  let r10mm = 0;
  let r20mm = 0;
  let r50mm = 0;

  const wetDayRains: number[] = [];

  let curCdd = 0;
  let maxCdd = 0;
  let curCwd = 0;
  let maxCwd = 0;

  let su35 = 0;
  let su33 = 0;
  let tr20 = 0;
  let maxTx = -Infinity;
  let maxTxDate = "-";
  let minTn = Infinity;
  let minTnDate = "-";

  let sumDtr = 0;
  let dtrCount = 0;

  const n = records.length;

  for (let i = 0; i < n; i++) {
    const r = records[i];
    const p = r.precipitation || 0;
    totalRain += p;

    // RX1day
    if (p > rx1Val) {
      rx1Val = p;
      rx1Date = r.dateStr;
    }

    // Hari basah (P >= 1.0 mm)
    if (p >= 1.0) {
      wetDaysCount++;
      wetDayRains.push(p);
      curCwd++;
      curCdd = 0;
      if (curCwd > maxCwd) maxCwd = curCwd;
    } else {
      curCdd++;
      curCwd = 0;
      if (curCdd > maxCdd) maxCdd = curCdd;
    }

    if (p >= 10.0) r10mm++;
    if (p >= 20.0) r20mm++;
    if (p >= 50.0) r50mm++;

    // Suhu
    if (r.tMax != null && Number.isFinite(r.tMax)) {
      if (r.tMax >= 35.0) su35++;
      if (r.tMax >= 33.0) su33++;
      if (r.tMax > maxTx) {
        maxTx = r.tMax;
        maxTxDate = r.dateStr;
      }
    }

    if (r.tMin != null && Number.isFinite(r.tMin)) {
      if (r.tMin >= 20.0) tr20++;
      if (r.tMin < minTn) {
        minTn = r.tMin;
        minTnDate = r.dateStr;
      }
    }

    if (r.tMax != null && r.tMin != null && Number.isFinite(r.tMax) && Number.isFinite(r.tMin)) {
      sumDtr += r.tMax - r.tMin;
      dtrCount++;
    }
  }

  // RX5day: Rolling 5-day sum
  let rx5Val = 0;
  let rx5Date = "-";
  for (let i = 4; i < n; i++) {
    const sum5 =
      records[i].precipitation +
      records[i - 1].precipitation +
      records[i - 2].precipitation +
      records[i - 3].precipitation +
      records[i - 4].precipitation;
    if (sum5 > rx5Val) {
      rx5Val = sum5;
      rx5Date = records[i].dateStr;
    }
  }

  // SDII (Simple Daily Intensity Index)
  const sdii = wetDaysCount > 0 ? Number((totalRain / wetDaysCount).toFixed(1)) : 0;

  // Persentil P95 dan P99 hari basah
  wetDayRains.sort((a, b) => a - b);
  let p95Threshold = 0;
  let p99Threshold = 0;
  let r95Sum = 0;
  let r95Count = 0;
  let r99Sum = 0;
  let r99Count = 0;

  if (wetDayRains.length >= 10) {
    const p95Idx = Math.floor(wetDayRains.length * 0.95);
    const p99Idx = Math.floor(wetDayRains.length * 0.99);
    p95Threshold = wetDayRains[p95Idx];
    p99Threshold = wetDayRains[p99Idx];

    wetDayRains.forEach((val) => {
      if (val > p95Threshold) {
        r95Sum += val;
        r95Count++;
      }
      if (val > p99Threshold) {
        r99Sum += val;
        r99Count++;
      }
    });
  }

  return {
    rx1day: { value: Number(rx1Val.toFixed(1)), dateStr: rx1Date },
    rx5day: { value: Number(rx5Val.toFixed(1)), dateStr: rx5Date },
    sdii,
    r10mm,
    r20mm,
    r50mm,
    r95p: {
      threshold: Number(p95Threshold.toFixed(1)),
      sumRain: Number(r95Sum.toFixed(1)),
      count: r95Count,
    },
    r99p: {
      threshold: Number(p99Threshold.toFixed(1)),
      sumRain: Number(r99Sum.toFixed(1)),
      count: r99Count,
    },
    cdd: maxCdd,
    cwd: maxCwd,
    su35,
    su33,
    tr20,
    txx: { value: maxTx === -Infinity ? 0 : Number(maxTx.toFixed(1)), dateStr: maxTxDate },
    tnn: { value: minTn === Infinity ? 0 : Number(minTn.toFixed(1)), dateStr: minTnDate },
    dtrMean: dtrCount > 0 ? Number((sumDtr / dtrCount).toFixed(1)) : 0,
    totalRain: Number(totalRain.toFixed(1)),
    wetDaysCount,
    totalDays: n,
  };
}
