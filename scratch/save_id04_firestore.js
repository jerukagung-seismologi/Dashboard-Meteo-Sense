// scratch/save_id04_firestore.js
const crypto = require('node:crypto');

async function getAccessToken() {
  const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !privateKey) {
    throw new Error("Missing client email or private key in environment");
  }

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
  if (!res.ok) {
    throw new Error(`Token error: ${JSON.stringify(data)}`);
  }
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

async function saveStationCalibrationToFirestore(stationId, config) {
  const token = await getAccessToken();
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

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Firestore save error: ${JSON.stringify(json)}`);
  }
  return json;
}

// Konfigurasi Terverifikasi Ilmiah untuk Node ID-04 (Berdasarkan 4.653 jam observasi vs ERA5)
const id04Config = {
  stationId: "id-04",
  enabled: true,
  temperature: {
    enabled: true,
    method: "robust_linear",
    scale: 0.6193,
    offset: 8.71
  },
  humidity: {
    enabled: true,
    method: "offset",
    offset: -2.575
  },
  pressure: {
    enabled: true,
    method: "offset",
    offset: -2.46
  },
  rainfall: {
    enabled: true,
    method: "multiplier",
    multiplier: 1.0
  },
  dew: {
    enabled: true,
    method: "offset",
    offset: -1.62
  }
};

console.log("Menyimpan konfigurasi kalibrasi Node ID-04 ke Firestore...");
saveStationCalibrationToFirestore("id-04", id04Config)
  .then(res => {
    console.log("BERHASIL DISIMPAN KE FIRESTORE!");
    console.log("Document Path:", res.name);
    console.log("Update Time:", res.updateTime);
  })
  .catch(err => {
    console.error("GAGAL SIMPAN:", err.message);
  });
