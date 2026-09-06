// scratch/test_rtdb_auth.js
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
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function main() {
  const token = await getAccessToken();
  console.log("Token obtained successfully.");

  const url = `https://staklimjerukagung-default-rtdb.asia-southeast1.firebasedatabase.app/auto_weather_stat/id-01/data.json?access_token=${token}&orderBy="$key"&limitToLast=2`;
  const res = await fetch(url);
  const json = await res.json();
  console.log("RTDB Authenticated query result:", json);
}

main().catch(console.error);
