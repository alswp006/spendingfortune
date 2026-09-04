import { addDays, isValidDateKey, todayKST } from '@/lib/date';
import { listDayLogs } from '@/lib/storage';
import { CATEGORY_LABEL } from '@/lib/types';
import type { CategoryId, DayLog } from '@/lib/types';

export interface Stats {
  total: number;
  loggedDays: number;
  byCategory: Record<CategoryId, number>;
  dailyAvg: number;
}

/** 초기 패킷이 쓰던 이름 — 새 코드는 `Stats`를 쓴다 */
export type StatsResult = Stats;

const CATEGORY_IDS = Object.keys(CATEGORY_LABEL) as CategoryId[];

function emptyByCategory(): Record<CategoryId, number> {
  const acc = {} as Record<CategoryId, number>;
  for (const id of CATEGORY_IDS) {
    acc[id] = 0;
  }
  return acc;
}

function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_LABEL, value);
}

/**
 * @AI:NOTE 저장소(0004)가 이미 손상 레코드를 거르지만 한 겹 더 막는다 — localStorage는
 * 다른 버전의 앱·수동 편집으로도 오염될 수 있고, 여기서 throw가 새면 홈·히스토리가
 * 통째로 흰 화면이 된다. 어긋난 레코드는 조용히 건너뛴다(throw·console.error 금지).
 */
function isUsableDayLog(log: unknown): log is DayLog {
  if (!log || typeof log !== 'object') return false;
  const record = log as Record<string, unknown>;
  if (typeof record.total !== 'number' || !Number.isFinite(record.total)) return false;
  if (!Array.isArray(record.entries)) return false;
  return true;
}

/**
 * endDate를 포함한 과거 days일 구간의 지출을 집계한다.
 * loggedDays는 무지출(noSpend) 기록도 1일로 센다 — 기록한 날 자체가 스트릭의 단위다.
 */
export function getStats(endDate: string, days: number): Stats {
  const byCategory = emptyByCategory();
  const end = isValidDateKey(endDate) ? endDate : todayKST();
  const span = Number.isInteger(days) && days > 0 ? days : 0;

  if (span === 0) {
    return { total: 0, loggedDays: 0, byCategory, dailyAvg: 0 };
  }

  // endDate 포함 과거 span일 (오래된 날짜 → endDate 순)
  const dates: string[] = [];
  for (let i = span - 1; i >= 0; i--) {
    dates.push(addDays(end, -i));
  }
  const startDate = addDays(end, -(span - 1));

  const logsByDate = new Map<string, DayLog>();
  for (const log of listDayLogs(startDate, end)) {
    if (log && typeof log.date === 'string') {
      logsByDate.set(log.date, log);
    }
  }

  let total = 0;
  let loggedDays = 0;

  for (const date of dates) {
    const log = logsByDate.get(date);
    if (log === undefined || !isUsableDayLog(log)) continue;

    loggedDays += 1;
    total += log.total;

    for (const entry of log.entries) {
      if (!entry || typeof entry !== 'object') continue;
      const { category, amount } = entry as { category?: unknown; amount?: unknown };
      if (!isCategoryId(category)) continue;
      // Number.isInteger는 NaN·Infinity·소수를 모두 걸러낸다
      if (typeof amount !== 'number' || !Number.isInteger(amount)) continue;
      byCategory[category] += amount;
    }
  }

  const dailyAvg = loggedDays > 0 ? Math.round(total / loggedDays) : 0;

  return { total, loggedDays, byCategory, dailyAvg };
}
