// scratch/verify_calibrations.js
async function testStation(stationId) {
  console.log(`\nTesting station: ${stationId}`);
  
  // 1. Fetch raw data
  const rawRes = await fetch(`http://localhost:3000/api/sensors?action=latest&sensorId=${stationId}&limit=1&calibration=false&_t=${Date.now()}`);
  const rawData = await rawRes.json();
  const rawRecord = Array.isArray(rawData) ? rawData[0] : (rawData.data && rawData.data[0]);

  // 2. Fetch calibrated data
  const calRes = await fetch(`http://localhost:3000/api/sensors?action=latest&sensorId=${stationId}&limit=1&calibration=true&_t=${Date.now()}`);
  const calData = await calRes.json();
  const calRecord = Array.isArray(calData) ? calData[0] : (calData.data && calData.data[0]);

  if (!rawRecord || !calRecord) {
    console.log(`No data returned for ${stationId}`);
    return;
  }

  console.log(`[RAW]        Suhu: ${rawRecord.temperature}°C, RH: ${rawRecord.humidity}%, Tekanan: ${rawRecord.pressure} hPa`);
  console.log(`[CALIBRATED] Suhu: ${calRecord.temperature}°C, RH: ${calRecord.humidity}%, Tekanan: ${calRecord.pressure} hPa`);
  console.log(`[DELTA]      Suhu: ${(calRecord.temperature - rawRecord.temperature).toFixed(2)}°C, RH: ${(calRecord.humidity - rawRecord.humidity).toFixed(2)}%, Tekanan: ${(calRecord.pressure - rawRecord.pressure).toFixed(2)} hPa`);
}

async function main() {
  for (const id of ["id-01", "id-03", "id-04", "id-05"]) {
    await testStation(id);
  }
}

main().catch(console.error);
