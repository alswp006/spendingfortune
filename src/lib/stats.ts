import { listDayLogs } from '@/lib/storage';
import type { CategoryId, DayLog } from '@/lib/types';

export interface StatsResult {
  total: number;
  loggedDays: number;
  byCategory: Record<CategoryId, number>;
  dailyAvg: number;
}

const ALL_CATEGORIES: CategoryId[] = ['food', 'cafe', 'shopping', 'transport', 'culture', 'health', 'living', 'etc'];

export function getStats(endDate: string, days: number): StatsResult {
  // Calculate start date: endDate - (days - 1)
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const startDate = start.toISOString().split('T')[0];

  // Fetch all logs in range
  const logs = listDayLogs(startDate, endDate);

  // Initialize accumulators
  let total = 0;
  let loggedDays = 0;
  const byCategory: Record<CategoryId, number> = {} as Record<CategoryId, number>;

  // Initialize all categories to 0
  for (const cat of ALL_CATEGORIES) {
    byCategory[cat] = 0;
  }

  // Process each log
  for (const log of logs) {
    // Skip corrupted records
    if (!isValidDayLog(log)) {
      continue;
    }

    // Count this as a logged day (even if noSpend=true)
    loggedDays += 1;

    // Add total
    const logTotal = typeof log.total === 'number' && !Number.isNaN(log.total) ? log.total : 0;
    total += logTotal;

    // Add by category
    if (Array.isArray(log.entries)) {
      for (const entry of log.entries) {
        if (entry && typeof entry === 'object') {
          const category = (entry as any).category as CategoryId;
          const amount = (entry as any).amount;

          if (category && typeof amount === 'number' && !Number.isNaN(amount) && ALL_CATEGORIES.includes(category)) {
            byCategory[category] += amount;
          }
        }
      }
    }
  }

  // Calculate daily average
  const dailyAvg = loggedDays > 0 ? Math.round(total / loggedDays) : 0;

  return {
    total,
    loggedDays,
    byCategory,
    dailyAvg,
  };
}

function isValidDayLog(log: unknown): log is DayLog {
  if (!log || typeof log !== 'object') {
    return false;
  }

  const record = log as Record<string, unknown>;

  // Check essential fields
  if (typeof record.date !== 'string') return false;
  if (typeof record.noSpend !== 'boolean') return false;

  // total must be a number (or at least coercible)
  if (typeof record.total !== 'number' || Number.isNaN(record.total)) {
    return false;
  }

  // entries must be an array (or empty)
  if (!Array.isArray(record.entries) && record.entries !== undefined) {
    return false;
  }

  return true;
}
