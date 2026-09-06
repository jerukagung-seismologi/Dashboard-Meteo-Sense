// scratch/test_fetch_era5_openmeteo.js
async function testFetchOpenMeteo() {
  const lat = -7.7121;
  const lon = 109.6892;
  const today = new Date();
  const dEnd = today.toISOString().substring(0, 10);
  const dStart = new Date(today.getTime() - 7 * 86400 * 1000).toISOString().substring(0, 10);

  const hourlyParams = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "surface_pressure",
    "pressure_msl",
    "rain",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "direct_radiation",
    "diffuse_radiation",
    "direct_normal_irradiance",
    "shortwave_radiation_instant",
    "cloud_cover",
    "et0_fao_evapotranspiration"
  ].join(",");

  const url = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${dStart}&end_date=${dEnd}&hourly=${hourlyParams}&timezone=Asia%2FJakarta&models=ecmwf_ifs025`;

  console.log("Fetching from Open-Meteo:", url);
  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) {
    console.error("Open-Meteo API Error:", json);
    return;
  }

  const timeList = json.hourly?.time || [];
  console.log(`Berhasil mengambil ${timeList.length} jam data dari Open-Meteo!`);
  if (timeList.length > 0) {
    console.log("Sample jam pertama:", timeList[0], "Suhu:", json.hourly.temperature_2m[0], "RH:", json.hourly.relative_humidity_2m[0]);
    console.log("Sample jam terakhir:", timeList[timeList.length - 1], "Suhu:", json.hourly.temperature_2m[timeList.length - 1], "RH:", json.hourly.relative_humidity_2m[timeList.length - 1]);
  }
}

testFetchOpenMeteo().catch(console.error);
