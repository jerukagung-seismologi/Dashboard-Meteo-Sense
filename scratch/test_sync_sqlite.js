// scratch/test_sync_sqlite.js
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

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
    scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database"
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
  return data.access_token;
}

async function syncStation(stationId, limit = 100) {
  const db = new DatabaseSync('d:/Github/Firebase_Database_Administrator/databases/meteo_local_cache.db');
  const maxRow = db.prepare('SELECT max(unix_ts) as max_ts FROM aws_measurements WHERE station_id = ?').get(stationId);
  const maxTs = maxRow?.max_ts || 0;
  console.log(`Station ${stationId} current max unix_ts: ${maxTs}`);

  const token = await getAccessToken();
  const startKey = String(maxTs + 1);
  const url = `https://staklimjerukagung-default-rtdb.asia-southeast1.firebasedatabase.app/auto_weather_stat/${stationId}/data.json?access_token=${token}&orderBy="$key"&startAt="${startKey}"&limitToFirst=${limit}`;
  
  const res = await fetch(url);
  const data = await res.json();

  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    console.log(`Tidak ada data baru untuk ${stationId}.`);
    db.close();
    return 0;
  }

  const entries = Object.entries(data);
  console.log(`Menerima ${entries.length} data baru dari RTDB untuk ${stationId}. Memasukkan ke SQLite...`);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO aws_measurements (
      station_id, unix_ts, local_time, rainfall, rainrate, temperature, humidity,
      pressure, wind_speed, wind_direction, solar_radiation, dew_point, battery,
      raw_json, updated_at, volt, dew, lux, soil_temp, tips
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN TRANSACTION");
  let inserted = 0;
  for (const [key, val] of entries) {
    const unixTs = Number(key);
    if (!unixTs) continue;

    const d = new Date((unixTs + 7 * 3600) * 1000);
    const localTime = d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    const nowStr = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

    insertStmt.run(
      stationId,
      unixTs,
      localTime,
      val.rainfall ?? null,
      val.rainrate ?? null,
      val.temperature ?? null,
      val.humidity ?? null,
      val.pressure ?? null,
      val.wind_speed ?? val.windSpeed ?? null,
      val.wind_direction ?? val.windDirection ?? null,
      val.solar_radiation ?? val.solarRadiation ?? null,
      val.dew_point ?? val.dew ?? null,
      val.battery ?? val.volt ?? null,
      JSON.stringify(val),
      nowStr,
      val.volt ?? null,
      val.dew ?? null,
      val.lux ?? null,
      val.soil_temp ?? null,
      val.tips ?? null
    );
    inserted++;
  }
  db.exec("COMMIT");
  db.close();

  console.log(`Sukses memasukkan ${inserted} baris baru ke meteo_local_cache.db!`);
  return inserted;
}

syncStation("id-01", 10).catch(console.error);
