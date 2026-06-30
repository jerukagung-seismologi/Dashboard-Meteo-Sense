// lib/climatology/climatologyTypes.ts

export interface AggregatedPoint {
  timeKey: string; // e.g. "2026-06-20T18" (hourly, UTC), "2026-06-20" (daily, UTC)
  timestamp: number; // UTC millisecond epoch of the start of this interval
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

  dewPointMean: number;
  dewPointMax: number;
  dewPointMin: number;

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
  dewPoint: {
    mean: number;
    max: number;
    min: number;
  };
  rainfall: {
    total: number;
    rainDaysCount: number;
    maxDailyRainfall: number;
  };
}

export interface ClimatologyResponse {
  sensorId: string;
  preset: string; // "daily" | "weekly" | "monthly" | "yearly"
  startDate: string;
  endDate: string;
  points: AggregatedPoint[];
  stats: ClimatologyStats;
}
