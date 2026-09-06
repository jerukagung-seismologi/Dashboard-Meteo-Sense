// scratch/test_clean_resample_engine.js
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const DB_DIR = "d:/Github/Firebase_Database_Administrator/databases";
const RAW_DB_PATH = path.join(DB_DIR, "meteo_local_cache.db");
const CLEAN_DB_PATH = path.join(DB_DIR, "meteo_clean_data.db");

const SENSOR_KEYS = [
  "rainfall", "rainrate", "temperature", "humidity", "pressure",
  "wind_speed", "wind_direction", "solar_radiation", "dew_point",
  "battery", "volt", "dew", "lux", "soil_temp", "tips"
];

const PHYSICAL_LIMITS = {
  temperature: [-10.0, 55.0],
  humidity: [5.0, 100.0],
  pressure: [850.0, 1100.0],
  wind_speed: [0.0, 75.0],
  wind_direction: [0.0, 360.0],
  rainfall: [0.0, 300.0],
  rainrate: [0.0, 300.0],
  solar_radiation: [0.0, 1500.0],
  battery: [2.5, 15.0],
  volt: [2.5, 15.0],
  dew_point: [-20.0, 45.0],
  dew: [-20.0, 45.0]
};

function formatWibDate(unixTs) {
  if (!unixTs) return "-";
  const d = new Date((unixTs + 7 * 3600) * 1000);
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

function processStationClean(stationId, mode = "incremental", maxGapSeconds = 3600) {
  const t0 = Date.now();
  console.log(`[ENGINE] Mulai memproses stasiun: ${stationId}, mode: ${mode}`);
  const rawDb = new DatabaseSync(RAW_DB_PATH, { readOnly: true });
  const cleanDb = new DatabaseSync(CLEAN_DB_PATH);

  // Get start ts
  let unixStart = 0;
  if (mode === "incremental") {
    const row = cleanDb.prepare("SELECT max(unix_ts) as max_clean FROM aws_clean_measurements WHERE station_id = ?").get(stationId);
    if (row && row.max_clean) {
      unixStart = row.max_clean - 3600; // 1 hr stitch buffer
    }
  }

  const rawRows = rawDb.prepare(
    "SELECT * FROM aws_measurements WHERE station_id = ? AND unix_ts >= ? ORDER BY unix_ts ASC"
  ).all(stationId, unixStart);

  rawDb.close();

  if (!rawRows || rawRows.length === 0) {
    cleanDb.close();
    return { stationId, status: "NO_NEW_DATA", count: 0, durationMs: Date.now() - t0 };
  }

  console.log(`[ENGINE] Raw rows terambil: ${rawRows.length} baris (waktu: ${Date.now() - t0}ms)`);

  // 1. Grid Snapping & Burst Grouping
  const buckets = new Map();
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const snapped = Math.round(r.unix_ts / 60) * 60;
    let list = buckets.get(snapped);
    if (!list) {
      list = [];
      buckets.set(snapped, list);
    }
    list.push(r);
  }

  console.log(`[ENGINE] Unik menit terkumpul: ${buckets.size} menit (waktu: ${Date.now() - t0}ms)`);

  // 2. Burst Aggregation & Physical QC
  const minuteMap = new Map();
  let outliersFixed = 0;

  for (const [snappedTs, list] of buckets.entries()) {
    let aggNode = {};
    let status = "OK";

    if (list.length === 1) {
      const item = list[0];
      for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
        const k = SENSOR_KEYS[kIdx];
        let val = item[k];
        if (typeof val === "number" && !isNaN(val)) {
          const limits = PHYSICAL_LIMITS[k];
          if (limits && (val < limits[0] || val > limits[1])) {
            val = Math.max(limits[0], Math.min(limits[1], val));
            status = "EDITED";
            outliersFixed++;
          }
          aggNode[k] = val;
        } else {
          aggNode[k] = null;
        }
      }
    } else {
      status = "EDITED";
      for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
        const k = SENSOR_KEYS[kIdx];
        let validVals = [];
        for (let j = 0; j < list.length; j++) {
          const v = list[j][k];
          if (typeof v === "number" && !isNaN(v)) validVals.push(v);
        }

        if (validVals.length === 0) {
          aggNode[k] = null;
          continue;
        }

        if (k === "wind_direction") {
          let sumSin = 0, sumCos = 0;
          for (let vIdx = 0; vIdx < validVals.length; vIdx++) {
            const rad = (validVals[vIdx] * Math.PI) / 180;
            sumSin += Math.sin(rad);
            sumCos += Math.cos(rad);
          }
          const meanRad = Math.atan2(sumSin / validVals.length, sumCos / validVals.length);
          const meanDeg = (((meanRad * 180) / Math.PI) + 360) % 360;
          aggNode[k] = Number(meanDeg.toFixed(1));
        } else if (k === "rainfall" || k === "rainrate") {
          aggNode[k] = Number(Math.max(...validVals).toFixed(2));
        } else {
          let sum = 0;
          for (let vIdx = 0; vIdx < validVals.length; vIdx++) sum += validVals[vIdx];
          let meanVal = sum / validVals.length;
          const limits = PHYSICAL_LIMITS[k];
          if (limits && (meanVal < limits[0] || meanVal > limits[1])) {
            meanVal = Math.max(limits[0], Math.min(limits[1], meanVal));
            outliersFixed++;
          }
          aggNode[k] = Number(meanVal.toFixed(2));
        }
      }
    }

    minuteMap.set(snappedTs, { node: aggNode, status });
  }

  // 3. Sensor Series for Linear Interpolation
  const sensorSeries = {};
  const ptrs = {};
  for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
    const k = SENSOR_KEYS[kIdx];
    sensorSeries[k] = [];
    ptrs[k] = 0;
  }

  const sortedMinutes = Array.from(minuteMap.keys()).sort((a, b) => a - b);
  for (let i = 0; i < sortedMinutes.length; i++) {
    const ts = sortedMinutes[i];
    const { node } = minuteMap.get(ts);
    for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
      const k = SENSOR_KEYS[kIdx];
      if (typeof node[k] === "number" && node[k] !== null) {
        sensorSeries[k].push({ ts, val: node[k] });
      }
    }
  }

  // 4. Ultra-Fast Two-Pointer 1-Minute Grid Generation
  const minTs = sortedMinutes[0];
  const nowTs = Math.floor(Date.now() / 1000);
  const maxTs = Math.min(sortedMinutes[sortedMinutes.length - 1], nowTs);

  const cleanRows = [];
  let okCount = 0;
  let editedCount = 0;
  let imputedCount = 0;

  for (let ts = minTs; ts <= maxTs; ts += 60) {
    if (minuteMap.has(ts)) {
      const entry = minuteMap.get(ts);
      if (entry.status === "EDITED") editedCount++;
      else okCount++;

      cleanRows.push({
        station_id: stationId,
        unix_ts: ts,
        status: entry.status,
        node: entry.node
      });
    } else {
      // Missing minute: Two-pointer interpolation across sensors
      let isAnyImputed = false;
      const node = {};

      for (let kIdx = 0; kIdx < SENSOR_KEYS.length; kIdx++) {
        const k = SENSOR_KEYS[kIdx];
        const series = sensorSeries[k];
        if (!series || series.length < 2) {
          node[k] = null;
          continue;
        }

        // Advance pointer to first item >= ts
        let ptr = ptrs[k];
        while (ptr < series.length && series[ptr].ts < ts) {
          ptr++;
        }
        ptrs[k] = ptr;

        if (ptr > 0 && ptr < series.length) {
          const prev = series[ptr - 1];
          const next = series[ptr];
          const dt = next.ts - prev.ts;

          if (dt > 0 && dt <= maxGapSeconds) {
            const frac = (ts - prev.ts) / dt;
            let interp = prev.val + frac * (next.val - prev.val);

            // Bounds
            if (["rainfall", "rainrate", "wind_speed", "solar_radiation", "battery", "volt", "lux", "tips"].includes(k)) {
              interp = Math.max(0.0, interp);
            } else if (k === "humidity") {
              interp = Math.min(100.0, Math.max(5.0, interp));
            } else if (k === "wind_direction") {
              interp = ((interp % 360) + 360) % 360;
            }

            node[k] = Number(interp.toFixed(2));
            isAnyImputed = true;
          } else {
            node[k] = null;
          }
        } else {
          node[k] = null;
        }
      }

      if (isAnyImputed) {
        imputedCount++;
        cleanRows.push({
          station_id: stationId,
          unix_ts: ts,
          status: "IMPUTED",
          node
        });
      }
    }
  }

  console.log(`[ENGINE] Grid selesai: ${cleanRows.length} baris (waktu: ${Date.now() - t0}ms)`);

  // 5. Batch Insert into cleanDb in Transactions of 10,000
  const insertStmt = cleanDb.prepare(`
    INSERT OR REPLACE INTO aws_clean_measurements (
      station_id, unix_ts, local_time, rainfall, rainrate,
      temperature, humidity, pressure, wind_speed, wind_direction,
      solar_radiation, dew_point, battery, status, correction_notes,
      updated_at, volt, dew, lux, soil_temp, tips
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const BATCH_SIZE = 10000;
  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

  for (let i = 0; i < cleanRows.length; i += BATCH_SIZE) {
    cleanDb.exec("BEGIN TRANSACTION");
    const end = Math.min(i + BATCH_SIZE, cleanRows.length);
    for (let j = i; j < end; j++) {
      const r = cleanRows[j];
      const n = r.node;
      insertStmt.run(
        r.station_id,
        r.unix_ts,
        formatWibDate(r.unix_ts),
        n.rainfall ?? null,
        n.rainrate ?? null,
        n.temperature ?? null,
        n.humidity ?? null,
        n.pressure ?? null,
        n.wind_speed ?? null,
        n.wind_direction ?? null,
        n.solar_radiation ?? null,
        n.dew_point ?? null,
        n.battery ?? null,
        r.status,
        r.status === "IMPUTED" ? "Interpolasi Linear Fisis (Gap < 1 Jam)" : null,
        nowStr,
        n.volt ?? null,
        n.dew ?? null,
        n.lux ?? null,
        n.soil_temp ?? null,
        n.tips ?? null
      );
    }
    cleanDb.exec("COMMIT");
  }

  cleanDb.close();
  const totalDuration = Date.now() - t0;
  console.log(`[ENGINE] SUKSES! Total waktu: ${totalDuration}ms`);

  return {
    stationId,
    status: "SUCCESS",
    cleanRows: cleanRows.length,
    okCount,
    editedCount,
    imputedCount,
    outliersFixed,
    durationMs: totalDuration
  };
}

console.log("[STARTING OPTIMIZED TEST]");
const res = processStationClean("id-04", "incremental");
console.log("[HASIL TEST]:", res);
