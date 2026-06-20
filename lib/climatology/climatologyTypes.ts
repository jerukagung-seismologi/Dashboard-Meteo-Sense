// lib/climatology/climatologyTypes.ts

export interface AggregatedPoint {
  timeKey: string; // e.g., "2026-06-20T18" for hourly, "2026-06-20" for daily, "2026-06" for monthly
  timestamp: number; // millisecond timestamp of the period
  sampleCount: number;
  
  temperatureMean: number;
  temperatureMax: number;
  temperatureMin: number;
  temperatureStdDev: number;

  humidityMean: number;
  humidityMax: number;
  humidityMin: number;

  pressureMean: number;
  pressureMax: number;
  pressureMin: number;

  windSpeedMean: number;
  windSpeedMax: number;
  windDirectionDominant: string; // Cardinal string (e.g., "U", "S")
  
  rainfallAccumulation: number;
}

export interface ClimatologyStats {
  periodCount: number;
  totalRecordsCount: number;
  
  temperature: {
    mean: number;
    max: number;
    min: number;
    stdDev: number;
  };
  humidity: {
    mean: number;
    max: number;
    min: number;
  };
  pressure: {
    mean: number;
    max: number;
    min: number;
  };
  wind: {
    meanSpeed: number;
    maxSpeed: number;
    dominantDirection: string;
    distribution: Record<string, number>; // Maps each cardinal direction (U, TL, T, TG, S, BD, B, BL) to count
  };
  rainfall: {
    total: number;
    rainDaysCount: number;
  };
}

export interface ClimatologyResponse {
  sensorId: string;
  range: string;
  startDate: string;
  endDate: string;
  points: AggregatedPoint[];
  stats: ClimatologyStats;
}
