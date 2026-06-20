// lib/climatology/dateRangeBuilder.ts

export interface UTCDateRange {
  start: Date;
  end: Date;
}

export function buildUTCDateRange(
  preset: string,
  year?: number,
  month?: number
): UTCDateRange {
  const now = new Date();
  
  // Set defaults if year/month are missing or invalid
  const targetYear = year && year >= 2000 && year <= 2100 ? year : now.getUTCFullYear();
  const targetMonth = month && month >= 1 && month <= 12 ? month : now.getUTCMonth() + 1;

  let start: Date;
  let end: Date;

  switch (preset) {
    case "daily": {
      // Current UTC day: 00:00:00 to 23:59:59 UTC
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      break;
    }
    case "weekly": {
      // Last 7 UTC days (inclusive of today)
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));
      break;
    }
    case "monthly": {
      // Calendar month UTC
      start = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
      // Day 0 of next month returns the last day of targetMonth
      end = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));
      break;
    }
    case "yearly": {
      // Calendar year UTC
      start = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
      break;
    }
    default: {
      // Fallback to last 30 UTC days
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29, 0, 0, 0, 0));
      break;
    }
  }

  return { start, end };
}
