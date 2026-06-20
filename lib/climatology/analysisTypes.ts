// lib/climatology/analysisTypes.ts

export interface AnalysisPoint {
  hourUtc: number; // 0 - 23
  timeKeyWib: string; // e.g. "07:00"
  timestamp: number; // UTC epoch start of the hour
  sampleCount: number;

  temperatureMean: number;
  temperatureMax: number;
  temperatureMin: number;

  humidityMean: number;
  humidityMax: number;
  humidityMin: number;

  pressureMean: number;
  pressureMax: number;
  pressureMin: number;
}

export interface ParameterStats {
  min: number;
  mean: number;
  max: number;
  stdDev: number;
  median: number;
}

export interface AnalysisStats {
  temperature: ParameterStats;
  humidity: ParameterStats;
  pressure: ParameterStats;
}

export interface HistogramBin {
  binLabel: string;
  count: number;
  minVal: number;
  maxVal: number;
}

export interface HeatmapData {
  days: string[]; // List of YYYY-MM-DD days
  slots: string[]; // List of HH:MM slots in WIB timezone
  matrix: [number, number, number][]; // [dayIndex, slotIndex, value] triplets
}

export interface DailyHeatmapData {
  hours: string[];
  minutes: string[];
  z: (number | null)[][];
}

export interface DailyAnalysisResponse {
  sensorId: string;
  date: string; // YYYY-MM-DD
  points: AnalysisPoint[]; // 24 points
  stats: AnalysisStats;
  heatmaps?: {
    temperature: DailyHeatmapData;
    humidity: DailyHeatmapData;
    pressure: DailyHeatmapData;
  };
}

export interface WeeklyAnalysisResponse {
  sensorId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  points: (AnalysisPoint & { dayLabelWib: string })[]; // 168 hourly points
  stats: AnalysisStats;
  histograms: {
    temperature: { bins: HistogramBin[]; stats: ParameterStats };
    humidity: { bins: HistogramBin[]; stats: ParameterStats };
    pressure: { bins: HistogramBin[]; stats: ParameterStats };
  };
  heatmaps: {
    temperature: HeatmapData;
    humidity: HeatmapData;
    pressure: HeatmapData;
  };
}
