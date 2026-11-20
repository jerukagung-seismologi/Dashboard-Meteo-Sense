// scratch/test-hourly-aggregation.ts
async function test() {
  const now = 1788681510000;
  const start = now - (30 * 86400000);
  const end = now;
  const url = `http://localhost:3000/api/sensors?action=range&sensorId=id-01&start=${start}&end=${end}&calibration=false`;
  
  console.log("Fetching range from API...");
  const t0 = Date.now();
  const res = await fetch(url);
  const rawSensor = await res.json();
  console.log(`Fetched ${rawSensor.length} records in ${Date.now() - t0}ms`);

  // Aggregate into hourly bins
  const hourlyBins = new Map<number, any[]>();
  for (const r of rawSensor) {
    const hourTs = Math.floor(r.timestamp / 3600000) * 3600000;
    if (!hourlyBins.has(hourTs)) {
      hourlyBins.set(hourTs, []);
    }
    hourlyBins.get(hourTs)!.push(r);
  }

  console.log(`Aggregated into ${hourlyBins.size} distinct hourly observation bins!`);
  
  // Sample bin
  const firstHour = Array.from(hourlyBins.keys())[0];
  const sampleItems = hourlyBins.get(firstHour)!;
  const avgTemp = sampleItems.reduce((acc, item) => acc + item.temperature, 0) / sampleItems.length;
  console.log(`Sample Hour: ${new Date(firstHour).toISOString()}, Observations in hour: ${sampleItems.length}, Avg Temp: ${avgTemp.toFixed(2)}°C`);
}

test().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
