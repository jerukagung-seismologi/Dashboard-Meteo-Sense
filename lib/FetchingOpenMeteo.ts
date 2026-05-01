import type { WeatherCondition } from "@/components/prakirawan/ForecastFunction"

export interface OpenMeteoHourlyData {
  time: string       // ISO local time, e.g. "2024-06-01T07:00"
  temperature: number
  humidity: number
  weatherCode: number
  condition: WeatherCondition
}

/**
 * Map WMO weather interpretation codes to the internal WeatherCondition type.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
export function wmoCodeToCondition(code: number): WeatherCondition {
  if (code === 0) return "Cerah"
  if (code === 1 || code === 2) return "Cerah Berawan"
  if (code === 3) return "Berawan"
  if (code === 45 || code === 48) return "Kabut"
  if (code >= 51 && code <= 55) return "Hujan Ringan"
  if (code === 56 || code === 57) return "Hujan Ringan"
  if (code === 61 || code === 62) return "Hujan Ringan"
  if (code === 63) return "Hujan Sedang"
  if (code === 64 || code === 65) return "Hujan Lebat"
  if (code === 66 || code === 67) return "Hujan Lebat"
  if (code >= 71 && code <= 77) return "Berawan"
  if (code === 80) return "Hujan Ringan"
  if (code === 81) return "Hujan Sedang"
  if (code === 82) return "Hujan Lebat"
  if (code === 85 || code === 86) return "Hujan Lebat"
  if (code === 95) return "Badai Petir"
  if (code === 96 || code === 99) return "Badai Petir"
  return "Berawan"
}

/**
 * Fetch hourly forecast for a single day from the Open Meteo API.
 *
 * @param latitude   - Decimal latitude
 * @param longitude  - Decimal longitude
 * @param forecastDate - Date string in "YYYY-MM-DD" format (Asia/Jakarta)
 * @returns Array of hourly forecast data for the requested day
 */
export async function fetchOpenMeteoForecast(
  latitude: number,
  longitude: number,
  forecastDate: string
): Promise<OpenMeteoHourlyData[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=temperature_2m,relative_humidity_2m,weather_code` +
    `&timezone=Asia%2FJakarta` +
    `&start_date=${forecastDate}&end_date=${forecastDate}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Open Meteo API error: HTTP ${response.status}`)
  }

  const json = await response.json()
  const { time, temperature_2m, relative_humidity_2m, weather_code } =
    json?.hourly ?? {}

  if (!Array.isArray(time)) {
    throw new Error("Open Meteo: format respons tidak valid (hourly.time hilang)")
  }

  return (time as string[]).map((t: string, i: number) => {
    const code = Number(weather_code?.[i] ?? 0)
    return {
      time: t,
      temperature: Math.round(Number(temperature_2m?.[i] ?? 0)),
      humidity: Math.round(Number(relative_humidity_2m?.[i] ?? 0)),
      weatherCode: code,
      condition: wmoCodeToCondition(code),
    }
  })
}
