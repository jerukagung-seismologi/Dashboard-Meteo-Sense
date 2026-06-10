import { SensorDate } from "@/lib/FetchingSensorData";

/**
 * Sorts and filters an array of weather observations based on a specific time range.
 * 
 * 1. Sorts data chronologically to ensure unordered or duplicated timestamps are handled properly.
 * 2. Filters out any data older than `now - rangeMs`.
 * 
 * @param data Array of weather observations from the sensor.
 * @param rangeMs The time range in milliseconds to filter by.
 * @returns Sorted and filtered array of observations.
 */
export function filterByTimeRange(
  data: SensorDate[],
  rangeMs: number
): SensorDate[] {
  // Sort data chronologically first to ensure all datasets are ordered
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
  
  const now = Date.now();
  
  // Filter by actual timestamp
  return sortedData.filter(
    item => item.timestamp >= now - rangeMs
  );
}

/**
 * Formats a timestamp into a Plotly-compatible continuous date string (YYYY-MM-DD HH:mm:ss)
 * strictly pinned to the Asia/Jakarta timezone. This forces Plotly to render continuous gaps
 * without automatically shifting to the browser's local timezone.
 * 
 * @param timestamp The UNIX timestamp in milliseconds
 * @returns Formatted string "YYYY-MM-DD HH:mm:ss"
 */
export function getPlotlyTimeJakarta(timestamp: number): string {
  const d = new Date(timestamp);
  
  // Get components in Asia/Jakarta
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  // Format as YYYY-MM-DD HH:mm:ss which Plotly parses natively
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}
